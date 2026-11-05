# Deep-dive analysis (November 2026)

## Size
Website 92 files / 8.2k lines, server 43 files / 4.3k lines, Flutter app 44 files / 8.5k lines. 23 pages, 72 API handlers, 18 tables.

## Verified (in-memory Postgres test bench, not the real services)
- 152 feature checks and 526 fuzz/junk requests: 0 server errors.
- Race conditions (limit, duplicate sign-up) serialised. CSV formula injection, SSRF through picture URLs, bad ids/bodies handled.
- Contrast WCAG AA, keyboard and screen-reader basics. Website lint: 0 errors.

## Not verified (needs your real services)
Neon (real Postgres), Brevo delivery, Cloudinary uploads, Groq chat, phone camera QR scan, Flutter on a real phone.

## Findings and what was done
| Risk | Status |
|---|---|
| Admin could change password only from the command line | **Fixed**: Settings -> Change password (needs current password, min 10 chars) |
| No health endpoint | **Fixed**: `GET /api/health` (also checks database) |
| Render free plan sleeps after 15 min, so reminders/digests never run | **Fixed**: `GET /api/jobs/run?key=CRON_SECRET` from cron-job.org every 10-15 min wakes it and runs the jobs (safe to repeat) |
| `npm audit` (server): nodemailer (only used if you configure SMTP; Brevo API is the default path) and archiver/glob chain (ZIP downloads, admin-only input) | **Open, low real risk**: fixes are major upgrades with API changes; do in a separate tested step |
| No automatic database backup | **Open**: Neon keeps point-in-time history on its plan; also export CSVs before each semester change |
| Brevo free plan 300 emails/day | Watch on big events; reminders and receipts share it |
| Single admin role, no 2-step login, no audit log | **Open**: strong unique password now possible; audit log is the next feature |
| Old `index.html` at repo root (first prototype) | Safe to delete when you agree |
