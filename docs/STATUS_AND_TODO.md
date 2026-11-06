# Status and to-do (hand-over)

A snapshot of what exists, what is missing and what should be improved next, so anyone (or any account) can continue from here.
Last updated: 2026-11-06. Everything described as "done" was built and checked as noted; "not verified" means it was not tried in that setting.

## 1. What exists and works

**Website (`client/`, React + Vite + Tailwind)** — live at https://bauet-ict-club.onrender.com
- Public pages: Home, About, Events (+ one page per event with registration), Notices, Projects, Team (per committee session), Ambassadors, Gallery, Awards, FAQ, Contact, Join (Committee, General, Ambassador), Get the app.
- Event registration with a form builder, payments (bKash / Nagad / Rocket with transaction ID), waiting list, tickets with QR codes, check-in, certificates, reminders.
- Admin console (`/admin`): dashboard, applications (approve / reject / select / export PDF, Word, CSV), events and forms studio, inbox, newsletter, committees (launch, transfer people), gallery, notices, projects, FAQ, sponsors, visitors, activity log, trash (30 days), settings, team logins, backup.
- Look and feel (this session): animated aurora background and fading grid, calmer see-through 3D globe in the hero, headline spotlight, new footer, committee page with role cards, navbar that fits phones from 320 px, native pickers (`<select>`) on touch devices.
- Light and dark themes.

**Server (`server/`, Express + PostgreSQL on Neon)**
- REST API, e-mail through Brevo, photos on Cloudinary, AI chat on Groq, scheduled jobs, rate limits, strict CSP and HSTS.
- Sign-in security (this session): bcrypt passwords, new password rules (12+ characters, no common passwords), per-account lockout (5 wrong tries = 15 minutes), optional two-step sign-in with an authenticator app and 8 backup codes, sessions checked against the database on every request (changing the password, deleting a login or "sign out everywhere" ends old sessions at once). Details: [SIGN_IN_SECURITY.md](SIGN_IN_SECURITY.md).
- `npm --prefix server run qa` runs 96 end-to-end checks on an in-memory database (all pass).

**App (`app/`, Flutter)**
- Screens: Home, Events (list + a bottom sheet with details), Notices, Team, Ambassadors, Gallery, Awards, Projects, FAQ, About, Contact, Join hub and the three application flows, AI chat, admin (login with two-step code, applications, committees, data tables, visitors, trash, settings).
- `flutter analyze` is clean and the 7 unit tests pass. GitHub Actions builds a debug APK on every push (artifact `bauet-ict-club-phone-apk`).
- Seen running in a browser at phone size (Flutter web build): Home and the committee application opened and loaded live data.
- **Not verified:** the APK on a real Android phone or an Android emulator (camera / photo picker, back button, notifications).

**Deployment**
- Render web service `bauet-ict-club` (auto-deploy from `master`). Environment variables are set in the Render dashboard; `NODE_ENV` must be `production` (otherwise the site shows "Cannot GET /").
- Neon database, Brevo e-mail, Cloudinary photos, Groq chat. Secrets live only in Render and in a local, git-ignored `.env`.

## 2. What is missing: features the website has and the app does not

Updated 2026-11-06: event page, registration, payment, waiting list, tickets with QR, stand-alone forms, check-in desk (scan or type), event sign-ups (verify / reject / give a seat) and two-step sign-in setup were added to the app. Still not in the app: the forms editor and responses, newsletter / inbox / activity log, team logins, backup, push notifications. The new screens were checked with `flutter analyze` and widget tests; not yet on a real phone.

| Feature | Website | App | Where to build it in the app |
| --- | --- | --- | --- |
| One page per event with a registration form (all question types, conditional questions, multi-page, photo question) | yes | yes (`event_detail_screen.dart`, `widgets/dynamic_form.dart`) | new `event_detail_screen.dart`; port `client/src/components/DynamicForm.jsx`, `client/src/lib/forms.js` |
| Payment box (bKash / Nagad / Rocket, sender number, transaction ID) | yes | yes (`widgets/payment_box.dart`) | port `client/src/components/PaymentBox.jsx` |
| Waiting list, "event full", registration deadline messages | yes | yes | `POST /api/event-registrations/:eventId` already returns everything needed |
| Ticket with QR code, open ticket, cancel ticket | yes | yes (`ticket_screen.dart`, `qr_flutter`; tickets are also saved on the phone under "My tickets") | `GET /api/event-registrations/ticket/:code`; add a QR package (for example `qr_flutter`) |
| Certificate download and verify page | yes | download opens from the ticket; verify page not in the app | `GET /api/event-registrations/certificate/:code`, `.../verify/:code` |
| Stand-alone public forms (`/f/<slug>`) | yes | yes (`public_form_screen.dart`; open a `/f/name` link from "My tickets") | `GET/POST /api/forms/public/:slug` |
| Add to calendar, share event | yes | partly (Google Calendar link only) | `share_plus` package |
| Admin: forms editor and responses | yes | no | `server/routes/forms.js` |
| Admin: check-in desk (type or scan a code) | yes | yes (`admin_checkin_screen.dart`, `mobile_scanner`) | `POST /api/event-registrations/checkin`; `mobile_scanner` package |
| Admin: event registrations list, payment verify / reject, promote from waiting list | yes | yes (`admin_signups_screen.dart`) | `server/routes/eventRegs.js` |
| Admin: newsletter, inbox / messages, activity log | yes | partly (some as data tables) | `server/routes/email.js`, `messages.js`, `audit.js` |
| Admin: team logins (editors), backup | yes | no | `server/routes/team.js`, `backup.js` |
| Admin: launch a new committee, transfer people | yes | no | `server/routes/committees.js` |
| Admin: turn two-step sign-in on or off, sign out other devices | yes | yes (`admin_security_screen.dart`) | `server/routes/auth.js` (`/2fa/*`, `/logout-all`) |
| Push notifications for new events and notices | no | no | needs Firebase Cloud Messaging and a server hook |

Rule from the project guide: when a feature changes in one place, change it in all three (server, website, app).

## 3. Improvements that should be made

**Highest value**
1. Build the missing app screens above, starting with event page, registration and ticket (what ordinary members use most).
2. Test the app on a real phone or an Android emulator (needs the Android SDK; accepting its license is a manual step) and fix what shows up.
3. Rotate every key that was ever pasted into a chat (Neon password, Brevo, Cloudinary, Groq) and update them in Render. Do this once and never share them again.
4. Turn on two-step sign-in for the main admin account and store the backup codes safely.

**Security**
- Rate-limit and log failed two-step attempts (currently counted with the account lock only).
- Rotate `JWT_SECRET` only together with a plan for two-step secrets (they are encrypted with a key derived from it).
- Add automatic dependency checks (`npm audit`, Dependabot) to the GitHub workflow.
- Consider moving the admin token out of `localStorage` into an HttpOnly cookie (needs CSRF protection; a bigger change).

**Quality and performance**
- Hero 3D scene: measure on a low-end phone; keep the "lite" mode and the frame-rate fallback.
- Add end-to-end tests for the website forms (Playwright) and widget tests for the app screens.
- Add a visible "install the app" prompt (PWA) on mobile browsers.
- Accessibility pass (contrast of muted text on the aurora background, focus rings, screen-reader labels on the 3D art).
- Remove the stray `index.html` in the repository root (not used by the site; it is a leftover page).

**Content and operations**
- Add real sponsors, gallery and project items; the demo data should be removed (Admin → Settings → Remove demo data).
- Set `CRON_SECRET` and call `/api/jobs/run` every 10-15 minutes from a free cron service so reminders and the weekly digest run even when the free Render instance sleeps.
- Upgrade the Render plan (or add an uptime ping) to avoid the 50-second cold start.

## 4. How to continue (new account or new machine)

```bash
git clone https://github.com/NoorAbdullah02/bauet-ict-club.git
cd bauet-ict-club
cp .env.example .env          # fill DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD (never commit .env)
npm install
npm run dev                    # API on :5000, site on :5173
npm --prefix server run qa     # 96 checks, no accounts needed
cd app && flutter pub get && flutter analyze && flutter test
```

- Deploy: push to `master`; Render builds and deploys by itself.
- Put the new account on the repository as a collaborator (GitHub → Settings → Collaborators) before pushing.
- The app talks to the server named in `app/env.production.json`.

## 5. Notes
- `.env` is git-ignored and was never committed. The repository contains only `.env.example` files.
- History was rewritten once on 2026-11-06 to remove co-author trailers from commit messages; if you have an older clone, clone again.
