#!/usr/bin/env python3
"""PostToolUse hook (advisory, exit 0): warn on Title Case headlines and ALL CAPS in user-facing files."""
import json
import re
import sys

USER_FACING_PATH_RE = re.compile(
    r"src/(pages|components/(landing|tag|interview|auth|fitment|tour|workspace))/.*\.tsx?$"
)

ACRONYM_WHITELIST = {
    "TAG", "GST", "GDPR", "NSQF", "BFSI", "CFO", "CTO", "COO", "API", "URL",
    "JSON", "HTTP", "HTTPS", "OK", "UI", "UX", "PII", "DPDP", "GCP", "AWS",
    "CI", "CD", "IT", "TDS", "PAN", "OTP", "STT", "TTS", "LLM", "AI", "ML",
    "IND", "AS", "IFRS", "GAAP", "SEBI", "LODR", "DTAA", "BEPS", "AP",
    "NBFC", "Q&A", "FAQ", "MoU", "PR", "IPO", "M&A",
}

TITLE_CASE_HEADLINE_RE = re.compile(
    r">\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,})\s*<"
)

ALL_CAPS_RE = re.compile(r"\b([A-Z]{4,})\b")


def is_acronym(word: str) -> bool:
    return word in ACRONYM_WHITELIST


try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool_name = payload.get("tool_name", "")
if tool_name not in {"Edit", "Write", "MultiEdit"}:
    sys.exit(0)

tool_input = payload.get("tool_input", {}) or {}
path = tool_input.get("file_path", "") or ""
if not USER_FACING_PATH_RE.search(path):
    sys.exit(0)

new_content = tool_input.get("new_string") or tool_input.get("content") or ""
if not new_content:
    sys.exit(0)

warnings = []

for m in TITLE_CASE_HEADLINE_RE.finditer(new_content):
    headline = m.group(1)
    words = headline.split()
    if all(is_acronym(w) for w in words):
        continue
    warnings.append(f"  Title-Case headline detected: {headline!r}")

for m in ALL_CAPS_RE.finditer(new_content):
    word = m.group(1)
    if is_acronym(word):
        continue
    warnings.append(f"  ALL CAPS word detected: {word!r}")

if warnings:
    print(
        "sentence-case advisory ({}):".format(path),
        file=sys.stderr,
    )
    for w in warnings[:10]:
        print(w, file=sys.stderr)
    print(
        "FunnelHQ brand voice is sentence case. Acronyms (TAG, GST, GDPR, etc.) are fine. "
        "This is a warning only — change not blocked.",
        file=sys.stderr,
    )

sys.exit(0)
