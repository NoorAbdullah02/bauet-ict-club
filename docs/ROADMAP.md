# Roadmap

Based on what strong university tech-club sites have in common (clear join path, dated events with sign-up, project showcase, sponsors, FAQ, newsletter, mobile-friendly, regularly updated) and on what this club needs.

## Done
- Web: multi-page site, 3 join flows with photo upload, committee/ambassador selection per session, Trash with restore, new-committee launch, demo data, admin console, chatbot, dark/light themes.
- Projects, FAQ, sponsors, newsletter, event countdown, add-to-calendar, SEO (sitemap, robots, structured data, page titles, manifest).
- Email (confirmations, results, alerts, newsletter, unsubscribe), Cloudinary (optimised uploads, cleanup), drop-in features system ([ADD_A_FEATURE.md](ADD_A_FEATURE.md)).
- Security: login lockout, strict CSP/HSTS, CORS allow-list, generic errors, signed unsubscribe links, 12h admin tokens.
- Speed: lazy routes and 3D, lite mode for weak devices, off-screen rendering skipped.

## Done since (November 2026)
Event registration with tickets, QR check-in and certificates; Event Studio; Google-Forms-style builder (templates, pages, rules, payment, summary, spreadsheet table with editing); short links; activity log, editor role, team logins, backup; privacy-friendly visit analytics; automatic end-to-end tests in GitHub.

## Next (highest value first)
1. **Live test on the real services** (Neon, Brevo, Cloudinary, phone camera). Nothing else matters more.
2. **Quiz mode** (points, correct answers, score shown) and **grid questions**.
3. **Flutter app parity**: pages, rules, colour, Table edit, Event Studio, short links (or decide the app is for reading and check-in only).
4. **Blog / news** page from the Posts table, **search** (Ctrl+K), **member profile pages**, alumni page.
5. **Bangla / English switch** for public pages.
6. **PWA**: installable app with offline page and push notifications for new events.
7. **2-step login** and a lock after repeated failed logins per account.
8. **Performance**: the 3D scene is 830 kB (lazy, but heavy on weak phones); consider a still image on phones, and trim the first-load JavaScript.
9. **Google Sheets sync** for form responses (optional).

## Operations
- Rotate any password that was ever shared in chat (Neon, admin) and set a strong `JWT_SECRET`.
- Back up the Neon database (Neon has point-in-time restore on paid plans; a monthly `pg_dump` is enough for free).
- Every session: Admin → Launch new committee, then select applicants.
