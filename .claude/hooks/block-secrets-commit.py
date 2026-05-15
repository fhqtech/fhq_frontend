#!/usr/bin/env python3
"""PreToolUse hook: block git add / commit of secrets and credential files."""
import json
import re
import sys

SECRET_PATTERNS = [
    r"(^|/)\.env(\..*)?$",
    r"(^|/)credentials\.json$",
    r"(^|/)service-account.*\.json$",
    r"\.pem$",
    r"\.key$",
    r"(^|/)\.aws/credentials$",
    r"(^|/)\.npmrc$",
    r"(^|/)id_rsa$",
    r"(^|/)id_ed25519$",
]

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool_input = payload.get("tool_input", {}) or {}
cmd = tool_input.get("command", "") or ""

if not re.search(r"\bgit\s+(add|commit)\b", cmd):
    sys.exit(0)

if " -A" in cmd or " --all" in cmd or re.search(r"git\s+add\s+\.(\s|$)", cmd):
    print(
        "blocked: `git add -A` / `git add .` is too broad. Stage files by name to avoid leaking secrets.",
        file=sys.stderr,
    )
    sys.exit(2)

tokens = re.split(r"\s+", cmd.strip())
for tok in tokens:
    if tok.startswith("-") or tok in {"git", "add", "commit"}:
        continue
    for pat in SECRET_PATTERNS:
        if re.search(pat, tok):
            print(
                f"blocked: refusing to stage `{tok}` — matches secret pattern `{pat}`. "
                "If this is intentional, stage with `--confirm-secrets` (manually outside this tool).",
                file=sys.stderr,
            )
            sys.exit(2)

sys.exit(0)
