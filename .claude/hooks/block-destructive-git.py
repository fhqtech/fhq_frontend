#!/usr/bin/env python3
"""PreToolUse hook: block destructive git operations unless --confirm-destructive present."""
import json
import re
import sys

DESTRUCTIVE_PATTERNS = [
    (r"git\s+push\s+.*(--force\b|--force-with-lease\b|\s-f\b)", "git push --force"),
    (r"git\s+reset\s+--hard\b", "git reset --hard"),
    (r"git\s+clean\s+-[a-zA-Z]*f", "git clean -f"),
    (r"git\s+checkout\s+\.", "git checkout ."),
    (r"git\s+restore\s+\.", "git restore ."),
    (r"git\s+branch\s+-D\b", "git branch -D"),
    (r"git\s+rebase\s+.*--root\b", "git rebase --root"),
    (r"git\s+filter-branch\b", "git filter-branch"),
    (r"git\s+update-ref\s+-d\b", "git update-ref -d"),
]

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

cmd = (payload.get("tool_input", {}) or {}).get("command", "") or ""
if "--confirm-destructive" in cmd:
    sys.exit(0)

for pat, label in DESTRUCTIVE_PATTERNS:
    if re.search(pat, cmd):
        print(
            f"blocked: `{label}` is destructive. Re-run with `--confirm-destructive` in the command "
            "if you really want this. Prefer a non-destructive alternative if possible.",
            file=sys.stderr,
        )
        sys.exit(2)

sys.exit(0)
