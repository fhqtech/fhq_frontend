#!/usr/bin/env python3
"""PreToolUse hook: block psql / alembic / firestore writes against production-shaped targets."""
import json
import re
import sys

DB_COMMAND_RE = re.compile(
    r"\b(psql|pg_dump|pg_restore|alembic\s+(upgrade|downgrade|stamp|revision)|firebase\s+firestore:delete|gcloud\s+firestore)\b"
)

PROD_HINTS = [
    r"funnelhq-prod\b",
    r"recruiter-assist-prod\b",
    r"-prod[.-]",
    r"\.prod\.",
    r"prod\.funnelhq",
    r"PROD_DATABASE_URL",
]

LOCAL_OK = [
    r"@localhost\b",
    r"@127\.0\.0\.1\b",
    r"@db:5432\b",
    r"@postgres:5432\b",
    r"staging\b",
    r"dev\b",
    r"funnelhq-dev\b",
    r"funnelhq-staging\b",
]

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

cmd = (payload.get("tool_input", {}) or {}).get("command", "") or ""

if not DB_COMMAND_RE.search(cmd):
    sys.exit(0)

for pat in PROD_HINTS:
    if re.search(pat, cmd, re.IGNORECASE):
        print(
            f"blocked: command targets production (matched `{pat}`). "
            "Run against localhost / staging / funnelhq-dev. "
            "Prod migrations go through CI/CD with Workload Identity, never from a workstation.",
            file=sys.stderr,
        )
        sys.exit(2)

if "alembic" in cmd and not any(re.search(p, cmd) for p in LOCAL_OK):
    if any(env_var in cmd for env_var in ["DATABASE_URL=", "FIRESTORE_PROJECT_ID="]):
        if not re.search(r"=([\"']?)(localhost|127\.0\.0\.1|.*-dev|.*-staging)", cmd):
            print(
                "blocked: alembic command with an explicit DB URL that doesn't look local/staging. "
                "Add a local DSN or rely on the .env loaded by the app.",
                file=sys.stderr,
            )
            sys.exit(2)

sys.exit(0)
