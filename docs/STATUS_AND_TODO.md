# Status and to-do (hand-over)

A snapshot of what exists, what is missing and what should be improved next, so anyone (or any account) can continue from here.
Last updated: 2026-11-06. **What only the owner can do (keys, accounts, Firebase, payments): [WHAT_YOU_NEED_TO_DO.md](WHAT_YOU_NEED_TO_DO.md).** Everything described as "done" was built and checked as noted; "not verified" means it was not tried in that setting.

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

**Added on 2026-11-06 (website, server and app together; 201 QA checks pass)**
- Bangla / English switch (English stays the default; website footer and app menu). One dictionary, `tools/i18n_bn.py`, builds the website and app translation files. Menus, buttons, headings and common labels are translated; text typed by admins (events, notices) is shown as written.
- Theme can follow the phone setting (light, dark, automatic).
- Draft and scheduled events and notices: hidden from the public (website, app, search, sitemap, chat) until they go live; admins see them with a Draft or "Goes live" tag. The "new event / notice" e-mail goes out when they go live. Visibility needs no cron job; the e-mail is sent by the next public visit or the cron call.
- Points, badges and leaderboard: 10 points per event a person was checked in at (people are told apart by e-mail), extra points given by an admin, public leaderboard with masked names, points card on the ticket page.
- Contests and hackathons: contest pages, team sign-up (size limits, deadline, unique names and e-mails), admin sees teams, gives places, publishes results (1st 50, 2nd 30, 3rd 20, others 5 points to every member), spreadsheet export, teams and awards can be edited and deleted.
- Job and internship board (club openings with drafts and scheduling) plus a Remote jobs tab fed by Remotive and Remote OK (read every 6 hours, stored in our database, shown with the source name and a normal link to the original page, as their terms ask; `REMOTE_JOBS=off` turns it off).
- Event Studio in the app: a whole event (details, how people register, seats, publish time) on one page, then straight to the sign-up form.
- Admin login says what is missing; Insights opens on the busiest event; the app Insights too.

**Deployment**
- Render web service `bauet-ict-club` (auto-deploy from `master`). Environment variables are set in the Render dashboard; `NODE_ENV` must be `production` (otherwise the site shows "Cannot GET /").
- Neon database, Brevo e-mail, Cloudinary photos, Groq chat. Secrets live only in Render and in a local, git-ignored `.env`.

## 2. What is missing: features the website has and the app does not

Added 2026-11-06 (website and app): **event insights** (sign-ups, who came, department / batch, money; admin only), **resource library** (/resources: slides, notes, tutorials), white theme by default, in the app a "Your ticket" card on Home and tickets / member cards that open without internet (the copy saved last time); **two ways to pay**, chosen per event or form by the admin: send money by hand (bKash / Nagad / Rocket, an admin verifies) and / or pay online through SSLCommerz (the server checks every payment with the gateway; needs a merchant account, see WHAT_YOU_NEED_TO_DO.md); site search, month calendar view (with Google Calendar), digital member card with a signed QR code (also checked in the check-in desk), feedback form e-mailed the day after an event (picker in the event form editor, "send now" button), and Google structured data (JSON-LD) on every event page.

Updated 2026-11-06: event page, registration, payment, waiting list, tickets with QR, certificate check, stand-alone forms, check-in desk (scan or type), event sign-ups (verify / reject / give a seat), two-step sign-in setup, forms (create, edit questions, responses, copy, open / close), newsletter, inbox with reply, team logins, activity log, short links and transfer of people were added to the app. Still not in the app: push notifications (needs Firebase) and the one-page "Event Studio" (the app edits the event and its sign-up form with a shortcut between them). Everything else on the website exists in the app: downloads and backup, the full form editor, payment in both ways, picture editor, search, calendar, member card. The new screens passed `flutter analyze`, widget tests and the CI APK build; the admin screens were not clicked through on a phone.

| Feature | Website | App | Where to build it in the app |
| --- | --- | --- | --- |
| One page per event with a registration form (all question types, conditional questions, multi-page, photo question) | yes | yes (`event_detail_screen.dart`, `widgets/dynamic_form.dart`) | new `event_detail_screen.dart`; port `client/src/components/DynamicForm.jsx`, `client/src/lib/forms.js` |
| Payment box (bKash / Nagad / Rocket, sender number, transaction ID) | yes | yes (`widgets/payment_box.dart`) | port `client/src/components/PaymentBox.jsx` |
| Waiting list, "event full", registration deadline messages | yes | yes | `POST /api/event-registrations/:eventId` already returns everything needed |
| Ticket with QR code, open ticket, cancel ticket | yes | yes (`ticket_screen.dart`, `qr_flutter`; tickets are also saved on the phone under "My tickets") | `GET /api/event-registrations/ticket/:code`; add a QR package (for example `qr_flutter`) |
| Certificate download and verify page | yes | download opens from the ticket; verify page not in the app | `GET /api/event-registrations/certificate/:code`, `.../verify/:code` |
| Stand-alone public forms (`/f/<slug>`) | yes | yes (`public_form_screen.dart`; open a `/f/name` link from "My tickets") | `GET/POST /api/forms/public/:slug` |
| Add to calendar, share event | yes | partly (Google Calendar link only) | `share_plus` package |
| Admin: forms editor and responses | yes | yes, basic (`admin_forms_screen.dart`: questions, options, required, order, link name, limit, open / close, responses) | `server/routes/forms.js` |
| Admin: check-in desk (type or scan a code) | yes | yes (`admin_checkin_screen.dart`, `mobile_scanner`) | `POST /api/event-registrations/checkin`; `mobile_scanner` package |
| Admin: event registrations list, payment verify / reject, promote from waiting list | yes | yes (`admin_signups_screen.dart`) | `server/routes/eventRegs.js` |
| Admin: newsletter, inbox / messages, activity log | yes | yes (`admin_newsletter_screen.dart`, `admin_inbox_screen.dart`, `admin_activity_screen.dart`) | `server/routes/email.js`, `messages.js`, `audit.js` |
| Admin: team logins (editors), backup | yes | team logins yes (`admin_team_screen.dart`); backup download no | `server/routes/team.js`, `backup.js` |
| Admin: launch a new committee, transfer people | yes | yes (launch existed; `admin_transfer_screen.dart`) | `server/routes/committees.js` |
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
