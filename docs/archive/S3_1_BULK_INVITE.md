# S3.1 — Bulk invite (CSV paste) in AddCandidatesModal

Ticket P0-5 from the launch report. AddCandidatesModal used to be a
single-entry form. This change adds a second tab that accepts a CSV / TSV
paste or file upload, parses + validates rows in-browser, previews them,
and sends every valid row in one request to the existing
`POST /api/interviews/{interview_id}/invite-candidates` endpoint.

## Tabs

- **Individual** — unchanged behaviour. Name + email rows, add / remove.
- **Bulk paste / CSV** — textarea + file picker, preview table, send.

Switching tabs is disabled while a request is in flight (so the user
can't lose context mid-submit).

## CSV parsing rules

Hand-rolled — no new dep. (Confirmed `package.json` had neither
papaparse nor csv-parse already.)

Supported variants:

- **Header row** — auto-detected. If the first row's fields contain no
  `@`, it's treated as a header and skipped. Anything with `@` in the
  second column is treated as data.
- **Separator** — comma by default. If a comma-split of the first row
  yields a single field but a tab-split yields ≥ 2, the parser falls
  back to TSV. (Handy when the user copies from a Google Sheet.)
- **Quoted fields** — RFC-4180-ish: `"Sharma, Priya","p@x.co"` parses
  to two fields, doubled quotes (`""`) inside a quoted field unescape
  to a single quote.
- **Whitespace** — fields are trimmed; the email is lowercased.
- **Empty lines** — dropped before parsing (so a trailing newline
  doesn't show as an "Empty row" error).
- **CRLF vs LF** — normalised.

Intentionally **not** supported: embedded newlines inside quoted fields
(would force a streaming parser; not worth it for Name,Email rows).

### Caps

- `MAX_PASTE_BYTES = 512 KB` — paste larger than this is rejected
  inline with a hint to trim and retry. (Protects the browser from a
  10 MB accidental paste.)
- `MAX_PARSED_ROWS = 2000` — anything beyond this is truncated and the
  user is told. A recruiter inviting 2000+ people at once is almost
  certainly importing the wrong file.

## Per-row validation

Each parsed row gets a status:

- **Ready** — name non-empty AND email matches the shared `EMAIL_RE`
  pattern (the same regex the individual form already uses — single
  source of truth).
- **Missing name** / **Missing email** / **Invalid email** — self-evident.
- **Duplicate in paste** — second + Nth occurrence of an email already
  seen in the same paste. Cross-interview duplicates are caught by the
  backend (see "Submit shape" below) since we don't have the list of
  previously-invited emails on the client.

The preview table shows row index, name, email, and status with a
green check or red error label per row. Invalid rows have a soft red
row tint (`bg-danger/5`).

## Submit shape

One `POST /api/interviews/{id}/invite-candidates` with
`{ candidates: [{ name, email }, …] }` — backend already accepts arrays
(confirmed in `recruiter-assist-backend/funnelhq_api/routers/invitation.py`
and `services/candidate_invitation_service/.../invite_candidates`). No
N requests, no client-side fan-out.

`interviewApi.inviteCandidates` was extended (non-breaking) to accept
an optional `{ signal }` so the modal can pass an `AbortController`.
The "Cancel" button in the footer toggles to "abort in flight" while
submitting; aborting calls `controller.abort()` which the backend will
see as a dropped connection. (Invitations already persisted are NOT
rolled back — the backend doesn't run this in a transaction. Accepted
as a limitation; recruiters can re-paste the leftover rows.)

### Response handling

The backend returns either 200 or 207 Multi-Status, both with the same
payload shape (207 wraps it in `detail`). Fields consumed:

- `successful_invitations` (preferred) / `invitations_created` (legacy
  alias) — count for the success toast
- `failed_invitations` — count for the partial-failure banner
- `errors[]` — per-row `{ index, error, data: { name, email } }`,
  rendered in a list under the form (first 10 + "+N more")
- `emails_sent` / `emails_failed` — surfaced when email delivery
  partially failed (recruiter is told to use "Resend" on the cards)

On full success → success toast + close. On partial failure → error
toast + modal stays open with the per-row list so the recruiter can
read it before dismissing.

## Empty-state UX

- **Empty paste** — dashed-border hint card: "Paste rows above" + the
  format example.
- **Paste parses to 0 valid rows** — red-tinted card: "We couldn't
  find any name + email pairs" + format hint mentioning that the
  header row is optional and tabs work.
- In both cases the "Send" button is disabled.

## Limitations

- No client-side detection of emails already invited to this interview
  (the backend handles it and surfaces the error per row).
- AbortController only cancels the HTTP request — server may still
  finish writing whatever it had already started.
- TSV detection looks only at the first row; mixed comma + tab files
  will partly mis-parse, but those don't exist in practice.
- 500 KB / 2000-row caps are policy, not protocol — easy to raise if
  recruiter feedback says we should.
- File upload accepts `.csv`, `.tsv`, `.txt`. Excel `.xlsx` is NOT
  supported (would need a parser dependency).

## Manual test scenarios

1. **Small clean paste (5–10 rows)** — paste:
   ```
   Priya Sharma, priya@firm.co.in
   Arjun Mehta, arjun@firm.co.in
   Rohan Iyer, rohan@firm.co.in
   ```
   Expect: all rows green, "Send 3 invitations" button enabled,
   success toast, modal closes.

2. **100-row paste** — generate 100 rows, expect smooth preview render
   (table scrolls inside a 260px box), single POST, success.

3. **Mixed valid + malformed** — paste:
   ```
   Name,Email
   Priya Sharma, priya@firm.co.in
   Arjun Mehta, not-an-email
   , rohan@firm.co.in
   Priya Sharma, priya@firm.co.in
   ```
   Expect: header detected, row 1 ok, row 2 "Invalid email", row 3
   "Missing name", row 4 "Duplicate in paste". Send button reads
   "Send 1 invitation".

4. **All garbage** — paste `asdf asdf asdf`. Expect: red-tinted "we
   couldn't find any name + email pairs" card. Send disabled.

5. **Header present / absent** — same data with and without
   `Name,Email` first line. Both should produce the same row count.

6. **Tab-separated** — paste `Priya Sharma\tpriya@firm.co.in` (copy
   from a sheet). Expect: parser auto-falls-back to TSV; preview
   header shows "Tab-separated."

7. **File upload** — pick a 50-row `.csv`. Expect: filename shown
   under the textarea, preview renders.

8. **Cancel mid-flight** — paste 50 valid rows, click Send, then
   click Cancel before the response. Expect: "Send cancelled" toast,
   modal stays open. (Be aware: invitations that already persisted
   before the abort are NOT rolled back.)

9. **Backend partial failure** — paste an email that's already
   invited to this interview. Expect: 207 from backend, per-row error
   list shown under the form, modal stays open.

10. **Oversize paste** — paste a 600 KB blob. Expect: inline error
    message, send blocked.
