# BAUET ICT Club: the complete handbook

One page that explains **what the project is, what was set up, how to do every task again, and what to do when something breaks**. Written in simple words. No secret values are written here: secrets live only in Render, GitHub and your own password manager.

> **Rule number one:** never paste a key, password or token into a chat, an issue or a file in this repository. If one was shown anywhere by mistake, make a new one and delete the old one (see section 12).

---

## 1. What this project is

| Part | What | Where it lives |
|---|---|---|
| Website | React + Vite, served by the backend | `client/` |
| Backend | Express + PostgreSQL (Neon) | `server/` |
| Android app | Flutter, same features as the website | `app/` |
| Docs | These guides | `docs/` |

One repository holds all three and they are kept in step. Live address: `https://bauet-ict-club.onrender.com` (Render free plan: it sleeps after 15 minutes of silence and wakes in about a minute).

Every push to `master` redeploys the website and server on Render by itself (autoDeploy) and runs the checks in GitHub Actions.

---

## 2. Accounts and where each secret lives

| Service | Used for | Free? | Where you manage it |
|---|---|---|---|
| GitHub | Code, checks, APK build, weekly backup | yes | github.com/NoorAbdullah02/bauet-ict-club |
| Render | Runs website + server | yes (sleeps) | dashboard.render.com |
| Neon | PostgreSQL database | yes (limited compute hours) | console.neon.tech |
| Cloudinary | Photos | yes | cloudinary.com |
| Brevo | Emails (tickets, notices) | yes (300/day) | app.brevo.com |
| Groq | AI assistant | yes | console.groq.com |
| Firebase | Phone notifications + crash reports | yes | console.firebase.google.com |
| UptimeRobot | Keeps Render awake | yes | uptimerobot.com |
| cron-job.org | Runs reminders and scheduled posts | yes | cron-job.org |

---

## 3. Render environment variables (Render → service → Environment)

After adding or changing one, press **Save, rebuild, and deploy**.

**Required**

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | long random text (32+ characters) |
| `ADMIN_PASSWORD` | password of the first admin (`admin`) |
| `NODE_ENV` | `production` (if it is `development` the site shows "Cannot GET /") |
| `TRUST_PROXY` | `1` |

**Features (set the ones you use)**

| Key | Feature |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | phone notifications (the whole service-account `.json`) |
| `PUSH_ENABLED` | `false` stops notifications without removing the key |
| `GROQ_API_KEY` | AI assistant |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | photo upload |
| `BREVO_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | email |
| `CRON_SECRET` | lets cron-job.org run reminders (16+ characters) |
| `PUBLIC_URL` | public address for card links, previews, sitemap |
| `ANDROID_CERT_SHA256` | app links (fingerprint of the app signing key, optional) |

All keys are explained in `.env.example`.

**Make a random secret without showing it on screen** (copies it; paste with Ctrl+V):

```bash
openssl rand -hex 16 | xclip -selection clipboard
```

---

## 4. Keep the site awake and run the timed jobs

**Why:** on the free plan the server sleeps. Reminders and scheduled posts need something to wake it.

**A. UptimeRobot** (keeps it awake)
1. uptimerobot.com → Add New Monitor → type **HTTP(s)**.
2. URL: `https://bauet-ict-club.onrender.com/robots.txt`, interval **5 minutes**.
3. Do **not** use `/api/health` here: it touches the database and keeps Neon awake all day, which uses up the free compute hours.

**B. cron-job.org** (reminders and scheduled posts)
1. Set `CRON_SECRET` on Render (section 3) and redeploy.
2. cron-job.org → Create cronjob.
3. URL: `https://bauet-ict-club.onrender.com/api/jobs/run?key=YOUR_CRON_SECRET`
4. Schedule: every **30 minutes**. Press **Test run**: success means the secret is right.

What `/api/jobs/run` does: publishes posts whose publish time has come, sends the "event tomorrow / today" and "contest deadline" phone reminders (each only once), refreshes the job feed.

---

## 5. Backups

Details: [BACKUP.md](BACKUP.md).

- **By hand:** Admin → Security → **Download full backup** (main admin only). One ZIP, one JSON file per table.
- **Automatic, every Monday 03:30 (Bangladesh time):** GitHub Actions workflow *Weekly backup* (`.github/workflows/backup.yml`). The file is encrypted and kept 90 days.

**One-time setup**
1. https://github.com/NoorAbdullah02/bauet-ict-club/settings/secrets/actions → **New repository secret**:
   - `BACKUP_DATABASE_URL` = Neon connection string
   - `BACKUP_PASSPHRASE` = a long phrase only you know. **Write it down somewhere safe: without it a backup cannot be opened.**
2. Actions → *Weekly backup* → **Run workflow** (try it once).
3. Open the run → **Artifacts** → `bauet-db-backup`.

**Open a backup** (run in the folder holding the downloaded file):

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -in bauet-backup.tar.gz.enc | tar -xz
```
It asks for the passphrase (typing it there keeps it out of your shell history).

Not inside a backup: pictures (they stay on Cloudinary), password hashes, 2FA secrets, phone tokens.
There is no one-click restore: the JSON files are the safe copy; ask for a restore script when you need one.

---

## 6. Phone notifications (Firebase)

Details: [PUSH_NOTIFICATIONS.md](PUSH_NOTIFICATIONS.md).

- People choose topics in the app (Alerts button): events, notices, jobs, contests, projects. **Urgent notices go to everybody.** Messages are sent in Bangla for people who chose Bangla.
- Automatic: new event / notice / job / contest / project; event reminders (day before in the evening, day of in the morning); contest deadline reminders.
- Admin → **Settings → Phone notifications**: shows what is configured, a **test** button, and a **write and send** form.
- If the panel is not green: the `FIREBASE_SERVICE_ACCOUNT` variable is missing or damaged. The panel says which of the three parts (project id, client email, private key) is missing. Paste the whole `.json` content as one value.
- The app's own Firebase file is `app/android/app/google-services.json`.

---

## 7. Building and publishing the Android app

Everything is automatic in GitHub Actions (`.github/workflows/checks.yml`):

1. Push to `master`.
2. The *Flutter app* job analyses, tests and builds the APK, signed with the **permanent club key** (GitHub secrets `ANDROID_KEYSTORE_*`). The same key on every build is what lets a new APK install **over** the old app.
3. Download the APK from the run's **Artifacts** (`bauet-ict-club-phone-apk`).
4. Publish: copy into `client/public/downloads/` as `bauet-ict-club.apk` (arm64, almost every phone) and `bauet-ict-club-old-phone.apk` (armeabi-v7a), then update `client/public/downloads/version.json`:
   ```json
   { "build": 115, "min": 0, "name": "1.0.0", "notes": "what is new" }
   ```
   `build` must be **higher** than the number baked into installed apps (it is the GitHub run number). Push: the website now serves the new APK.
5. Installed apps check `version.json` when opened and show a "new version available" prompt (needs internet). `min` forces an update for builds below it.

**If the build fails with "Artifact storage quota has been hit":** GitHub's free artifact storage is full. Delete old artifacts (repo → Actions → ... or `gh api -X DELETE repos/NoorAbdullah02/bauet-ict-club/actions/artifacts/<id>`). The workflow now keeps the debug APK 1 day and the phone APK 7 days so it does not fill again.

The app works offline for pages it has already loaded (cache on the phone); first load, login, payments, admin work and the AI assistant need internet. Fonts are bundled in the app (`app/assets/google_fonts/`).

---

## 8. Everything the project can do (so you remember)

- **Public site and app:** events (with registration, tickets with QR, waiting list, optional payment), notices, projects, resources, jobs, remote jobs, contests, leaderboard, gallery, awards, team and advisors, ambassadors, FAQ, contact, **Club data** (`/data`: counts and charts, nothing personal), search, AI assistant, Bangla / English, dark / light.
- **Member card:** portrait card with QR; download picture, share, open from QR.
- **Tickets:** link in the confirmation email. Lost it? Web `/ticket` or app → My tickets → *Lost your ticket?*: enter the email, the tickets are emailed to that address only (always the same answer, so nobody can check who signed up).
- **Admin (website `/admin` and in the app):** manage every list, forms, registrations, check-in by QR, certificates, payments, newsletter, visitors and insights, activity log, trash, editors, two-step sign-in, backup, phone notifications.
- **Server safety:** rate limits, lock after wrong passwords, two-step sign-in, helmet headers.
- **Tests:** `cd server && npm run qa` runs 264 checks on an in-memory database with no accounts. Run it before every push. In the app: `cd app && flutter analyze lib`.

---

## 9. Changing things safely

1. Edit.
2. `cd server && npm run qa` and `cd app && flutter analyze lib`.
3. `cd client && npx vite build`.
4. Commit and push to `master`. Watch Actions.
5. App texts in Bangla: edit `tools/i18n_bn.py`, then `python3 tools/i18n_bn.py`. Never edit `app/lib/core/bn.dart` or `client/src/lib/bn.js` by hand.
6. New managed list: [ADD_A_FEATURE.md](ADD_A_FEATURE.md).

---

## 10. Moving to your own domain later

See [DOMAIN.md](DOMAIN.md). Short version: add the domain in Render → Custom Domains, add the DNS records Render shows, set `PUBLIC_URL`, update `app/env.production.json` and the host in `app/android/app/src/main/AndroidManifest.xml`, set `ANDROID_CERT_SHA256`, then build and publish a new APK. The onrender.com address keeps working.

---

## 11. When something breaks

| Problem | Likely cause | Fix |
|---|---|---|
| "Cannot GET /" | `NODE_ENV` is `development` on Render | set `production`, redeploy |
| Site slow at first open | free plan was asleep | wait ~1 minute; set UptimeRobot (section 4) |
| Reminders / scheduled posts late | nothing woke the server | cron-job.org (section 4) |
| Phone panel not green | Firebase key missing or damaged | read the message in the panel, paste the full `.json` again |
| AI answers only from local data | `GROQ_API_KEY` missing, or the model was retired | set the key; the server tries other models by itself |
| Emails do not arrive | Brevo key or sender not set / not verified | `BREVO_API_KEY`, `MAIL_FROM` (verified sender) |
| New APK will not install over the old | signed with a different key | always build through GitHub (permanent key) |
| App build fails at upload "quota" | GitHub storage full | delete old artifacts (section 7) |
| Neon says compute hours used up | something pings the database all day | keep UptimeRobot on `/robots.txt` only |
| Push to GitHub rejected for workflow files | token lacks `workflow` scope | `gh auth refresh -h github.com -s workflow` |

---

## 12. Safety checklist (do this now and after any leak)

- A secret was shown in chat, email or a screenshot → make a new one, put it in Render / GitHub, **delete the old one** at the source (Neon password reset, Groq / Cloudinary / Brevo key regenerate, Firebase: delete the old service-account key in Google Cloud → IAM → Service accounts → Keys).
- Delete downloaded key files (`*-firebase-adminsdk-*.json`) from Downloads once the value is in Render.
- Never commit `.env`, keystores or service-account files.
- Turn on two-step sign-in for admin accounts (Admin → Settings).
- Keep the backup passphrase and the Android keystore password in a password manager. Losing the keystore means new APKs can no longer update old installs.

---

## 13. Still to do / ideas

- Delete old GitHub artifacts, then publish the newest APK (`version.json` build 115 or higher).
- Check on a phone: large text sizes, bundled fonts, Club data page.
- Optional: custom domain + app links, event attendance report, more offline pages in the app, member accounts (log in once, see tickets and card on any phone), certificates for contests, Google Play, iPhone web push.

More detail: [STATUS_AND_TODO.md](STATUS_AND_TODO.md), [PROJECT_GUIDE.md](PROJECT_GUIDE.md), [DEPLOY_RENDER.md](DEPLOY_RENDER.md), [AFTER_DEPLOY.md](AFTER_DEPLOY.md), [SIGN_IN_SECURITY.md](SIGN_IN_SECURITY.md).
