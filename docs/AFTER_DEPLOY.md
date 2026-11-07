# After you deploy on Render

Do these once, in this order. The website needs nothing else: it is served by the backend, so it already talks to the right address.

## 1. Copy your address
When the deploy is green, Render shows the address at the top of the service page, for example `https://bauet-ict-club.onrender.com`.

## 2. Backend settings (Render → Environment)
Fill the values listed in [`.env.render.example`](../.env.render.example) (the file shows what each one is for).
- `PUBLIC_URL` can stay empty: the server uses Render's own `RENDER_EXTERNAL_URL` for email links, the sitemap and unsubscribe links.
- Set `PUBLIC_URL` only when you add your own domain.

## 3. Mobile app address (one line)
Open `app/env.production.json` and replace the placeholder with your address, **keeping `/api` at the end**:

```json
{
  "API_URL": "https://bauet-ict-club.onrender.com/api"
}
```

Then build the app with that file:

```bash
cd app
flutter build apk --release --dart-define-from-file=env.production.json
```

For testing on a phone without building a release: `flutter run --dart-define-from-file=env.production.json`.

## 4. Check it works
- `https://your-address/` shows the website, `https://your-address/admin` the login.
- Admin → Settings → *Connections*: email, AI and pictures should be green.
- The app should show the same events, notices and committee as the website.

## Good to know
- **One backend** serves the website and the app, so there is nothing to keep in sync.
- The free Render plan sleeps after 15 minutes without visitors; the first request afterwards is slow (the app shows its loading state).
- Pictures need Cloudinary: Render's free disk is erased on every deploy.

## The Android app download
- People get the app at `https://<your-address>/app` (also the "Download the app" button in the top bar and the footer).
- The files live in `client/public/downloads/` (`bauet-ict-club.apk` for almost every phone, `bauet-ict-club-old-phone.apk` for old 32-bit phones).
- To release a new version: wait for the green **Checks** run on GitHub (Actions), download its artifact `bauet-ict-club-phone-apk`, copy the two files into `client/public/downloads/` under the names above, commit and push. Render redeploys by itself.
- **Tell old apps there is a new one:** also edit `client/public/downloads/version.json` in the same commit: `build` = the GitHub run number of the build you copied (the number after `#` in Actions; the APK's version code is 2000 + it for the main file), `notes` = one short line of what is new. Apps with a lower build show "A new version is available" with Update / Later. Set `min` to a build number to make everything older **have** to update (no Later).
- The app finds the server through `app/env.production.json` (`API_URL`). Change it only if the server address changes.
- Updating the app on a phone: install the new file over the old one. If Android refuses, uninstall the old app first (each build is signed with a fresh debug key; a permanent signing key is a later improvement).
