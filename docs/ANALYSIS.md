# Project analysis and suggestions (November 2026)

## What exists
Website (React), server (Express + PostgreSQL), Flutter app, docs. Admin panel: events (one-page Event Studio), forms (templates, pages, rules, payment, summary, spreadsheet-style table with editing), check-in with QR tickets, certificates, committees, newsletter, visitors, trash, short links (`/s/code`).

## What was verified (in-memory database, `npm run qa`, 52 checks, also run by GitHub on every push)
Login and password change, limits under 20 simultaneous sign-ups, duplicates, bot trap, CSV formula safety, tickets and check-in, answer rules, templates, copies, deletes, short links, link safety. Website build and lint clean. Website `npm audit`: 0.

## NOT verified (needs the real thing)
Neon database, Brevo email, Cloudinary pictures, Groq chat, camera QR scan on a phone, the Flutter app on a phone.

## Known gaps
- Flutter app has none of the newer form features (pages, rules, colour, Table edit, Event Studio, short links).
- Server `npm audit`: 6 findings (nodemailer, archiver chain). Fixes are major upgrades; low real risk (SMTP is optional, ZIP input is admin-only).
- No audit log (who changed what), one admin role, no 2-step login.
- No automatic database backup of our own (rely on Neon history, export CSVs often).
- Free Render plan sleeps; reminders need the `CRON_SECRET` ping (see AFTER_DEPLOY).
- Google Forms features not built: grid questions, quiz mode, jump-to-page by answer, response edit by the person, co-editors, undo/redo, Sheets sync.
- Pattern rules are checked on submit, not on Next.

## Suggestions, in order
1. Deploy, set the real keys, and do the 6-step live test: create event, register, get email, scan QR, download CSV, change password.
2. Rotate the Neon and admin passwords that were shared in chat.
3. Add audit log + an "Editor" role (can edit forms, cannot delete or see payments).
4. Quiz mode, then grid questions.
5. Bring pages/rules/short links to the Flutter app, or decide the app is read-and-check-in only.
6. Monthly: export all responses, check Brevo daily limit (300 on free), check Neon storage.
