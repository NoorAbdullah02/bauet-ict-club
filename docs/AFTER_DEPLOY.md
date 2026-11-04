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
