# Roadmap

Based on what strong university tech-club sites have in common (clear join path, dated events with sign-up, project showcase, sponsors, FAQ, newsletter, mobile-friendly, regularly updated) and on what this club needs.

## Done
- Web: multi-page site, 3 join flows with photo upload, committee/ambassador selection per session, Trash with restore, new-committee launch, demo data, admin console, chatbot, dark/light themes.
- Projects, FAQ, sponsors, newsletter, event countdown, add-to-calendar, SEO (sitemap, robots, structured data, page titles, manifest).
- Email (confirmations, results, alerts, newsletter, unsubscribe), Cloudinary (optimised uploads, cleanup), drop-in features system ([ADD_A_FEATURE.md](ADD_A_FEATURE.md)).
- Security: login lockout, strict CSP/HSTS, CORS allow-list, generic errors, signed unsubscribe links, 12h admin tokens.
- Speed: lazy routes and 3D, lite mode for weak devices, off-screen rendering skipped.

## Next (highest value first)
1. **Event registration** (RSVP with capacity and a confirmation email) and a check-in list for the day.
2. **Blog / news** page from the existing Posts table.
3. **Search** (Ctrl+K) across pages, events, projects and members.
4. **Certificates**: generate a PDF for participants and committee members.
5. **Attendance by QR code** at workshops, with a per-member activity count.
6. **Member profile pages** (skills, projects, links) and an alumni page.
7. **Bangla / English switch** for public pages.
8. **PWA offline** (service worker) and push notifications for new events.
9. **Privacy-friendly analytics** (visits per page, join funnel) on the admin dashboard.

## Operations
- Rotate any password that was ever shared in chat (Neon, admin) and set a strong `JWT_SECRET`.
- Back up the Neon database (Neon has point-in-time restore on paid plans; a monthly `pg_dump` is enough for free).
- Every session: Admin → Launch new committee, then select applicants.
