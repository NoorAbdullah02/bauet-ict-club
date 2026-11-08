# Your own domain: complete steps

The site works without a domain at `https://bauet-ict-club.onrender.com`. Do this when you buy a domain (for example `bauetictclub.com`). The onrender.com address keeps working afterwards, so old links and old app versions do not break.

Cost: only the domain itself (a `.com` is roughly 1000-1500 BDT per year). Render, HTTPS (SSL), Neon and everything else stay free.

## 1. Buy the domain
Any registrar (Namecheap, GoDaddy, a `.com.bd` registrar). You only need access to its **DNS settings** page.

## 2. Add it in Render
1. Render -> the service -> **Settings** -> **Custom Domains** -> **Add Custom Domain**.
2. Add `www.yourdomain.com` and also `yourdomain.com`.
3. Render shows the DNS records to create. Keep that page open.

## 3. Add the DNS records (at the registrar)
- `www`: type **CNAME**, value `bauet-ict-club.onrender.com`.
- the bare domain (`yourdomain.com`): the **A** or **ALIAS/ANAME** record that Render shows.
- Wait 10 minutes to a few hours. In Render press **Verify**. Render then issues the free HTTPS certificate by itself.

## 4. Tell the server (Render -> Environment)
- `PUBLIC_URL` = `https://www.yourdomain.com` (no slash at the end). Save and deploy.
- Now email links, ticket links, card share previews and the sitemap use the new address.
- Check: open `https://www.yourdomain.com/sitemap.xml`; the addresses inside must be the new domain.

## 5. The Android app
Do these in the repository, then push (CI builds the APK):
1. `app/env.production.json`: set `API_URL` to `https://www.yourdomain.com/api` (keep `/api`).
2. `app/android/app/src/main/AndroidManifest.xml`: the deep-link `<data android:host="...">` entries: change the host to `www.yourdomain.com` (keep a second set for `bauet-ict-club.onrender.com` if you want both to open the app).
3. Render env `ANDROID_CERT_SHA256` = the SHA-256 fingerprint of the club signing key, colon separated (for example `EC:4D:E1:...`). Get it from a published APK:
   `apksigner verify --print-certs bauet-ict-club.apk` (look for "SHA-256 digest"; add a colon after every two characters). The site then serves `/.well-known/assetlinks.json` and Android opens site links in the app.
4. Push. When CI is green: download the APKs from the newest GitHub release (`apk-<number>`), copy them into `client/public/downloads/`, raise `build` in `version.json`, push. See HANDBOOK.md section 7.

## 6. Other places to update
- UptimeRobot monitor and cron-job.org link: use the new address (the old one also works).
- Firebase, social media pages, the university or club profile: put the new website link.
- If something stores the address (Brevo sender domain, Google sign-in), update it there.

## 7. Check list
- [ ] `https://www.yourdomain.com` opens with the padlock
- [ ] `https://yourdomain.com` goes to the www address (or opens too)
- [ ] a new ticket email has the new address in its button
- [ ] `/sitemap.xml` and `/.well-known/assetlinks.json` show the new address / fingerprint
- [ ] the new app opens, logs in, shows data
- [ ] the old onrender.com address still works

## Keeping the site awake and timed jobs
See HANDBOOK.md section 4 (UptimeRobot on `/robots.txt`, cron-job.org on `/api/jobs/run?key=...`). Use `/robots.txt` and not `/api/health` for the 5-minute ping: it does not touch the database, so Neon's free hours last.
