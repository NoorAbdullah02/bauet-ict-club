# Roadmap

Based on what strong university tech-club sites have in common (clear join path, dated events with sign-up, project showcase, sponsors, FAQ, newsletter, mobile-friendly, regularly updated) and on what this club needs.

## Done
- Web: multi-page site, 3 join flows with photo upload, committee/ambassador selection per session, Trash with restore, new-committee launch, demo data, admin console, chatbot, dark/light themes.
- Projects, FAQ, sponsors, newsletter, event countdown, add-to-calendar, SEO (sitemap, robots, structured data, page titles, manifest).
- Email (confirmations, results, alerts, newsletter, unsubscribe), Cloudinary (optimised uploads, cleanup), drop-in features system ([ADD_A_FEATURE.md](ADD_A_FEATURE.md)).
- Security: login lockout, strict CSP/HSTS, CORS allow-list, generic errors, signed unsubscribe links, 12h admin tokens.
- Speed: lazy routes and 3D, lite mode for weak devices, off-screen rendering skipped.

## Done on 2026-11-22 (code review round)
Member-card security (proof needed to change a photo or birth date, cloud-scoped uploads), identity-based points and certificates, database-backed card OTP, **Admin → Downloads** (every list as CSV/JSON with date, event and form filters), service-worker logo refresh, six-month committee terms (server-decided dates and handover rule through `POST /api/committees/plan`, any name, admin-set first/last day, extend, older sessions always allowed), spreadsheet views for applications and event/form responses (sort, sticky header, inline cell edit, CSV of what you see, every question plus ticket/seat/payment/check-in columns), 29 ready-made form templates (events, contests, recruitment, services, surveys; several with photo upload) usable from the Forms gallery and from any event's form editor), Excel (.xlsx) downloads next to CSV/PDF/Word for event sign-ups, form responses, applications, visitors, contest teams, committee lists and every list on Admin → Downloads (real workbook: frozen bold header, auto-filter, sized columns, wrapped text; the responses and applications tables also download exactly the filtered and sorted rows they are showing as .xlsx via `POST /api/exports/table`), 355 end-to-end checks. Details: [CODE_REVIEW.md](CODE_REVIEW.md).

## Done since (November 2026)
Event registration with tickets, QR check-in and certificates; Event Studio; Google-Forms-style builder (templates, pages, rules, payment, summary, spreadsheet table with editing); short links; activity log, editor role, team logins, backup; privacy-friendly visit analytics; automatic end-to-end tests in GitHub.

## Next (highest value first)
1. **Live test on the real services** (Neon, Brevo, Cloudinary, phone camera). Nothing else matters more.
2. **Quiz mode** (points, correct answers, score shown) and **grid questions**.
3. **Flutter app parity**: pages, rules, colour, Table edit, Event Studio, short links (or decide the app is for reading and check-in only).
4. **Blog / news** page from the Posts table, **search** (Ctrl+K), **member profile pages**, alumni page.
5. ~~Bangla / English switch for public pages~~ — done (`tools/i18n_bn.py`, `lib/bn.js`, `core/bn.dart`).
6. **PWA**: installable app with offline page — done (`InstallPrompt.jsx`, `sw.js`, `offline.html`); app push notifications also wired.
7. ~~2-step login and a lock after repeated failed logins per account~~ — done (`/api/auth/2fa/*`, per-account lockout).
8. **Performance**: the 3D scene is 830 kB (lazy, but heavy on weak phones); consider a still image on phones, and trim the first-load JavaScript.
9. **Google Sheets sync** for form responses (optional).

## Operations
- Rotate any password that was ever shared in chat (Neon, admin) and set a strong `JWT_SECRET`.
- Back up the Neon database (Neon has point-in-time restore on paid plans; a monthly `pg_dump` is enough for free).
- Every session: Admin → Launch new committee, then select applicants.
