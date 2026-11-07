# Project guide: website, server and app together

Everything lives in this one repository so any change can be made, tested and pushed in one place.

| Folder | What it is | Run |
| --- | --- | --- |
| `client/` | Website and admin console (React, Vite, Tailwind) | `npm run dev` (port 5173) |
| `server/` | API (Express, PostgreSQL), email, uploads, exports, AI chat | `npm run dev` (port 5000) |
| `app/` | Mobile app (Flutter), same API as the website | `cd app && flutter run` |
| `docs/` | Setup, roadmap and how-tos | |

`npm run dev` in the project root starts the server and the website together.
Open the printed *Network* address on a phone or another laptop on the same Wi-Fi and log in with the same admin account.

## Keep website and app the same

Every feature exists in three places. When you change one, change the others:

| Feature | Server | Website (`client/src`) | App (`app/lib`) |
| --- | --- | --- | --- |
| Data models and routes | `server/index.js`, `server/routes/*`, `server/features/*` | `context/store.js` | `data/api.dart`, `models/models.dart` |
| Public pages | | `pages/`, `components/` | `screens/` |
| Admin tables and forms | | `admin/config.js` | `screens/admin/admin_crud_screen.dart` (`kTables`) |
| Applications review (details, confirm, bulk, export) | `routes/registrations.js`, `utils/exporters.js` | `components/AdminApplications.jsx` | `screens/admin/admin_applications_screen.dart` |
| Picture upload and resize | `routes/upload.js`, `utils/images.js` | `components/ImageEditor.jsx`, `admin/ui.jsx` | `screens/admin/admin_widgets.dart` (`ImageUploadField`) |
| Visitors | `routes/analytics.js`, `utils/analyticsJobs.js` | `admin/Visitors.jsx`, `lib/track.js` | `screens/admin/admin_visitors_screen.dart` |
| Advisors (teachers who guide the club; shown above the committee; each has a card at `/card/a<ID>`) | `server/features/advisors.js`, `server/routes/card.js` | `client/src/features/advisors.js` (admin), `components/Team.jsx` | `screens/team_screen.dart`, `kTables['advisors']` in `admin_crud_screen.dart` |
| Post names and order (President, VP Administration, VP Technical...) | `utils/positions.js` | `lib/sessions.js`, `admin/config.js` | `core/config.dart`, `screens/team_screen.dart` |

Adding a new managed list (for example Partners or Blog): see [ADD_A_FEATURE.md](ADD_A_FEATURE.md). It needs one server file and one client file; then add the same table to `kTables` in the app.

## A new committee every semester (two per year)

The club has two committees a year: **Summer** and **Winter**. To start the next one:

1. Admin → **Committee** → **Launch new committee**. Pick *Summer* or *Winter* and the year (for example *Winter 2027*).
2. Choose how to start: *Start empty*, *Keep the leadership* (copies the President and Vice Presidents) or *Copy everyone* from the previous committee.
3. Fill the rest of the team in any of these ways:
   - **Applications → Select for session** (applicants get an email; you can also change the post they get).
   - **Committee → Add Member** to add someone who never applied.
   - **Committee → Transfer people** to copy or move chosen people from an older committee into the new one.
4. Nothing else to publish: the newest committee automatically becomes the *current committee* on the Home and Team pages, and older ones stay in the session list on the Team page.

## Rules the server enforces

- One President and at most two Vice Presidents per committee session: Vice President (Administration) first, then Vice President (Technical). Other posts can have several people.
- Every department can apply and hold posts.
- Deleted items go to the Trash for 20 days; permanent delete also removes the picture from Cloudinary.

## Emails (Brevo API)

The applicant gets an email when they apply, are approved, rejected or selected. The club gets one for new applications and messages. Subscribers get one when an event, notice or project is added (turn off with `NOTIFY_SUBSCRIBERS=false`). Setup: [SETUP_EMAIL_AND_CLOUDINARY.md](SETUP_EMAIL_AND_CLOUDINARY.md).

## Applications export

Admin → Applications: export PDF, Word or CSV (tick *All types* for everyone), or email the PDF/Word as an attachment. Tick applicants to export or act on only those. The post an applicant asked for can be changed on the card; *Select for session* can also place them in a different post, and the selection email says so. Bangla names are supported in the PDF.

## Forms, event registration and payments

- **Admin → Forms** is a full-page editor like Google Forms (click a question to edit it, drag to reorder, changes save by themselves, Preview, and Questions / Responses / Settings tabs). You do **not** need Google Forms at all: make the form here and share its link `/f/<name>`. It builds any form: short and long answers, email, mobile, number, dropdown, multiple choice, checkboxes (each can add an "Other" the person types), date, time, yes/no, rating scale, picture upload, headings, and "show this question only if…" conditions. Each form has its own link `/f/<name>`, a limit, a closing time, an optional fee, a thank-you message and a summary with charts.
- **Every event** has its own page and registration link `/events/<id>` with the same builder (Admin → Events → the form icon). The link previews correctly on Facebook and WhatsApp. Open registrations, the limit and the closing time are set there too.
- **Payments:** the admin turns on a fee and enters the bKash, Nagad or Rocket number. People send money, then enter their number and the **transaction ID**; one ID can be used only once. The admin verifies or rejects each payment in the responses list and the person gets an email.
- **Emails for each registration:** the person gets an email about that exact event or form, with the admin's own note. For paid ones they first get "we are checking your payment", then "confirmed".
- **Downloads, one per event / form / committee / application list:** CSV, PDF, Word and a ZIP that also holds every uploaded picture in full quality (choose Original, JPG or PNG).
- **Events page:** Upcoming (soonest first), Past events (newest first) grouped by semester, search, semester and category filters; every committee's events stay available.

## Tickets, check-in, certificates and reminders

- Everyone who registers for an event gets a **ticket**: a 10-character code and a QR code, shown right after registering, in the confirmation email and at `/ticket/<code>` (paid events get the ticket at once; the place is confirmed when the payment is verified).
- **Admin → Events → the scanner icon** opens the **check-in desk**: type the code, or scan the QR code with the phone camera (Chrome and Edge; other browsers type the code). It shows how many people are in, warns about unverified payments, and lets you undo.
- **Certificates:** turn them on in the event's form settings (title, who signs). People who are checked in can download a PDF certificate with a QR code; scanning it opens `/verify/<code>`, which confirms the name and event. *Email certificates* on the check-in desk sends everyone their link (once each).
- **Reminders:** the day before an event, every confirmed registrant gets a reminder with their ticket link (switch off with `EVENT_REMINDERS=false`).
- **QR code for any link:** the *QR code* button in the form editor gives a poster-size PNG of the registration or form link.
- **Spam:** public forms have a hidden trap field that bots fill; their submissions are dropped without being saved.

## Visitors

Admin → Visitors shows people per day and per week, page views, top pages, devices, where they came from and the IP address of every visitor (search by IP or page, export CSV). The website reports each page it shows to `POST /api/analytics/hit`; bots, the admin area and "Do Not Track" visitors are not counted. IP addresses are deleted after `ANALYTICS_RETENTION_DAYS` days (default 180), and every Monday the admin gets last week's numbers by email. Because IP addresses are personal data, mention visitor statistics in your privacy notice.

## AI assistant

Set `GROQ_API_KEY`. The assistant answers from your live events, notices, committee, projects and FAQ, and falls back to built-in answers if no key is set.

## Demo data

Admin → Settings → *Load demo data* fills every section (events, notices, gallery, posts, projects, members, applications, messages) with illustrated sample content; *Remove demo data* deletes only the demo rows. Demo subscribers never receive email.

## Automatic checks on GitHub

`.github/workflows/checks.yml` runs on every push to `master`: it builds the website, checks the server files and, for the app, runs `flutter analyze`, the Flutter tests and builds a debug APK (download it from the run's *Artifacts*). Open the repository's **Actions** tab to see the result; this is how the app gets compiled even if Flutter is not installed on your computer.

## Checks before you push

```bash
npm --prefix client run build      # website compiles
node --check server/index.js       # server parses
cd app && flutter analyze          # app (needs Flutter installed)
```

The Flutter app has not been compiled in the environment where it was written. Run `flutter analyze` first and fix whatever it reports.
