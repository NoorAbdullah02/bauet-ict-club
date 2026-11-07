# Custom domain, keep-awake, app links

## 1. Domain (Render, free)
1. Render -> the service -> Settings -> Custom Domains -> Add. Enter `www.yourdomain` (and the bare domain).
2. At the domain registrar add the records Render shows (usually `CNAME www -> bauet-ict-club.onrender.com`, and for the bare domain an ALIAS/ANAME or the A record Render gives). HTTPS is issued automatically.
3. Render env: `PUBLIC_URL=https://www.yourdomain` (card links, share previews, emails). Keep the onrender.com address working.
4. Tell Claude the domain: the app's API address, manifest host and app links get updated and a new APK is built.

## 2. Keep awake without wasting Neon hours
- UptimeRobot: HTTP monitor, 5 min, URL `https://<site>/robots.txt` (does not touch the database).
- Do NOT point a 5-minute monitor at `/api/health` or `/api/jobs/run`: that keeps Neon awake all day and uses the free compute hours.
- Reminders/scheduled posts: cron-job.org every 30-60 min -> `https://<site>/api/jobs/run?key=CRON_SECRET` (CRON_SECRET: 16+ characters).

## 3. Android app links (open site links in the app)
- Render env `ANDROID_CERT_SHA256` = SHA-256 fingerprint of the club signing key (comma separate several).
  Get it with `apksigner verify --print-certs app.apk` or Play Console. Not set = `/.well-known/assetlinks.json` is empty.
- After a domain change the manifest host must be updated and a new APK released.
