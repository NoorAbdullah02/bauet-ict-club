# What you (the owner) need to do

Everything below is something only the owner can do: it needs your accounts, passwords or phone. The code side is done or waits for these items.
Tick each box when finished. Never paste a secret into a chat, an issue or a commit. Secrets go only into the Render dashboard or a GitHub secret.

Last updated: 2026-11-06.

---

## A. Must do now (the site and app need these)

- [ ] **Render environment** (Render → `bauet-ict-club` → Environment). After changing a value Render restarts the service.

  | Name | What to put | Status |
  | --- | --- | --- |
  | `NODE_ENV` | `production` | required, otherwise the site shows "Cannot GET /" |
  | `DATABASE_URL` | Neon connection string (`postgresql://…?sslmode=require`) | required (the live site answers `db: true`, so this is set) |
  | `JWT_SECRET` | 32+ random characters (`openssl rand -hex 32`) | required |
  | `ADMIN_PASSWORD` | 12+ characters, not a common word, not `1245` | required, the site refuses weak passwords |
  | `TRUST_PROXY` | `1` | recommended on Render (the limits are per visitor address; campus Wi-Fi shares one address between many students, so they are generous) |
  | `PUBLIC_URL` | `https://bauet-ict-club.onrender.com` | recommended (links in e-mails, sitemap, QR) |

- [ ] **Change every secret that was ever pasted into a chat** (Neon password, Brevo key, Cloudinary secret, Groq key, old admin password). Make new ones, put them into Render, delete the old ones at the provider.
- [ ] **Turn on two-step sign-in** for the main admin: website → Admin → Sign-in security (or the app → Admin → Sign-in security). Scan the QR with an authenticator app and **save the 8 backup codes somewhere safe** (they are shown once).
- [ ] **Install the app on a phone and tell me what you see.** Download: https://bauet-ict-club.onrender.com/app (or GitHub → Actions → latest run → artifact `bauet-ict-club-phone-apk`, the `arm64-v8a` file for almost every phone). If something is slow, wrong or crashes, tell me the screen name and what happened.

## B. Needed for specific features (each one is optional, but the feature stays off without it)

### B1. E-mail (tickets, confirmations, newsletter, reminders)
- [ ] Create a free Brevo account → API key → verify a sender address.
- [ ] Render env: `BREVO_API_KEY`, `MAIL_FROM` (the verified sender), `ADMIN_NOTIFY_EMAIL` (where alerts go).
- Guide: [SETUP_EMAIL_AND_CLOUDINARY.md](SETUP_EMAIL_AND_CLOUDINARY.md).

### B2. Pictures that survive restarts (gallery, event pictures, profile photos)
- [ ] Create a free Cloudinary account.
- [ ] Render env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Without it, pictures are stored on the server disk and **disappear when Render restarts or redeploys**.

### B3. AI chat
- [ ] Free key from https://console.groq.com/keys → Render env `GROQ_API_KEY`. (Chat still answers from FAQ and events without it.)

### B4. Push notifications (needs Firebase; not built yet, waiting for you)
Do these three steps, then tell me "firebase ready". I build the server, the app and the admin "Send notification" box.
1. [ ] Open https://console.firebase.google.com → create a project (any name, Analytics can be off) → **Add app → Android** → package name exactly `com.bauet.bauet_ict_club` → download **`google-services.json`**.
2. [ ] Put that file's whole text into a GitHub secret: repository → Settings → Secrets and variables → Actions → New secret → name `GOOGLE_SERVICES_JSON`.
3. [ ] Firebase → Project settings → **Service accounts** → **Generate new private key** → open the downloaded JSON, copy everything, and put it into the Render env `FIREBASE_SERVICE_ACCOUNT` (one value, the whole JSON). Do not send this file to anyone.

### B5. Reminders and weekly digest while the free Render server sleeps
- [ ] Render env `CRON_SECRET` = 16+ random characters.
- [ ] Free account at https://cron-job.org → call `https://bauet-ict-club.onrender.com/api/jobs/run?key=YOUR_CRON_SECRET` every 10 to 15 minutes. This also keeps the server awake (otherwise the first visit after a pause takes about 50 seconds).

### B6. Payments (bKash / Nagad / Rocket)
How it works today: the student sends money to **your** number, types the transaction ID in the form, and an admin checks it against the real message and presses Verify or Reject (Admin → Event sign-ups). No account with a payment company is needed.
- [ ] For each paid event: Admin → Events → sign-up form → Payment → amount, which methods, and **the number people send money to** (Send Money or Payment type).
- [ ] Someone on the team must check every payment in the bKash / Nagad / Rocket app and verify it.
- Optional, later: automatic payment (SSLCommerz, ShurjoPay or the official bKash API) needs a **merchant account** with that company (it takes days to approve). When you have it, tell me and I connect it.

## C. Content and tidy-up
- [ ] Admin → Settings → **Remove demo data** (then add your real events, notices, members, gallery, sponsors, projects).
- [ ] Admin → Settings → check that the e-mail, picture and AI lights are green.
- [ ] Add your real social links (Facebook, LinkedIn, GitHub, YouTube) in Admin → Settings so they appear in the footer.
- [ ] Add team members who should help as **editors** (Admin → Team logins, in the app or website).

## D. The app (Android)
- [x] Builds are now signed with a **permanent club key** (GitHub secrets `ANDROID_KEYSTORE_*`; a backup of the key is in `~/bauet-ict-club-signing/` on the machine that made it: copy that folder somewhere safe, it cannot be made again). The first APK signed this way needs the old app removed once; after that every new APK installs over the old one.
- [ ] Putting the app on Google Play needs a developer account (one-time 25 USD) and a permanent signing key.
- [ ] iPhone: an iOS app needs a Mac build and an Apple developer account (99 USD a year). Not set up.

## E. Optional
- [ ] A custom domain (Render → Settings → Custom domains), then set `PUBLIC_URL` to it.
- [ ] Upgrade the Render plan if the 50-second wake-up is a problem.
- [ ] Back up once a month (main admin): website Admin → Settings → Backup, or in the app Admin → Sign-in security → Download backup.

## Scheduled posts and contests: nothing to set up
- A scheduled event or notice appears by itself at its time. The e-mail to subscribers is sent by the next visitor or by the cron call in B5, so keep that cron job running if you use scheduling.
- Contest results: Admin, Contests, the people icon on a row, type each team's place, press **Publish results**. Points go to every team member who gave an e-mail.

---

Where things live: [STATUS_AND_TODO.md](STATUS_AND_TODO.md) (what exists and what is missing), [AFTER_DEPLOY.md](AFTER_DEPLOY.md), [DEPLOY_RENDER.md](DEPLOY_RENDER.md), [SIGN_IN_SECURITY.md](SIGN_IN_SECURITY.md).

---

## Online payment (SSLCommerz) setup, when you get a merchant account
The code is ready and tested with a pretend gateway. Until you add the keys the "Pay online" switch stays off and people only see "Send money by hand".
1. Free test account (sandbox): https://developer.sslcommerz.com/registration/ → you get a test Store ID and Store Password. Put them in Render: `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWD`. Leave `SSLCOMMERZ_SANDBOX` empty (it is the test gateway outside production; set `SSLCOMMERZ_SANDBOX=true` on Render to be sure).
2. Try one event with "Pay online" on, pay with the test card shown on the SSLCommerz page.
3. Real money: get a live merchant account (usually needs trade licence or organisation papers), put the live Store ID / Password in Render and set `SSLCOMMERZ_SANDBOX=false`.
4. In the SSLCommerz merchant panel set the IPN address to `https://bauet-ict-club.onrender.com/api/pay/ssl/ipn`.
