# Email and Cloudinary setup

Both are optional. Without them the site still works: emails are skipped and photos are saved on the server's disk.
After editing `.env`, restart `npm run dev`. Admin → Settings → **Connections** shows whether each one is connected.

## Email (Brevo API, free)

The site sends mail through the **Brevo API**: no SMTP password, works from any host.

1. Sign up at https://www.brevo.com (free plan: 300 mails per day).
2. **Senders & IP > Senders**: add the club address (for example `ictclubbauet@gmail.com`) and click the verification link Brevo emails you.
3. **SMTP & API > API keys**: create a key and copy it.
4. Put these in `.env` and restart the server:
   ```
   BREVO_API_KEY=xkeysib-...
   MAIL_FROM=ictclubbauet@gmail.com      # exactly the sender you verified
   ADMIN_NOTIFY_EMAIL=ictclubbauet@gmail.com
   ```
5. Open Admin → Settings → Connections. *Email via BREVO* turns green when the key works; use the test box to send yourself a mail.

Applicants get confirmation and result emails, the club gets alerts, subscribers get new event/notice/project mails and the newsletter, and the application exports can be emailed as PDF/Word attachments.

Mails are queued and sent one by one with one retry, so a slow provider never slows the website.

### Using Gmail SMTP instead (optional)
Leave `BREVO_API_KEY` empty and set `SMTP_USER` and `SMTP_PASS` (a Gmail *app password*, 2-step verification required). Brevo is used whenever its key is present.

## Cloudinary (photos)

1. Create a free account at cloudinary.com → Dashboard.
2. In `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
3. Settings → Connections should show "on Cloudinary".

How images are handled:

- The browser shrinks big phone photos before upload (faster, less storage).
- The server checks the real file type (JPG, PNG, WebP only), then Cloudinary stores it in `bauet-ict-club/<people|applicants|covers|logos>`: faces are auto-cropped square for people, other images are limited to 1600px, everything is delivered as the best format and quality (`f_auto,q_auto`).
- Replacing a photo or deleting it from the Trash removes the old file from Cloudinary, unless another record still uses it.


## Automatic emails and exports

- **New event / notice / project:** every newsletter subscriber gets an email (with an unsubscribe link) the moment you add one in the admin panel. Set `NOTIFY_SUBSCRIBERS=false` in `.env` to switch this off. Expired notices are not mailed.
- **Applications export:** Admin → Applications → *Export PDF* / *Export Word* downloads the current filter (tick *All types* for every applicant). *Email PDF* / *Email Word* sends the same file as an attachment to the address you type, or to `ADMIN_NOTIFY_EMAIL` when left blank. *View all details* on a card shows every field.

## Using the admin from another device

Run `npm run dev` on your PC. It prints a *Network* address such as `http://192.168.0.12:5173`; open it on your phone or another laptop on the same Wi-Fi and log in with the same admin username and password. To reach it from anywhere, deploy the site and use the deployed address.


## AI assistant (chat bubble)

1. Create a free key at https://console.groq.com/keys and put it in `.env` as `GROQ_API_KEY=...` (optionally `GROQ_MODEL`).
2. Restart the server. Admin → Settings → Connections shows *AI assistant on*.
3. The assistant reads your live **events, notices, committee, projects, collaborations and FAQ** every minute, so keep those up to date and it stays correct. It never sees applicant data, and it says it is not sure instead of guessing.
4. Without a key (or if Groq is down) visitors still get an answer from the FAQ, events and committee, so the chat never shows an error.
