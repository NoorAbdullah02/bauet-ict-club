# Email and Cloudinary setup

Both are optional. Without them the site still works: emails are skipped and photos are saved on the server's disk.
After editing `.env`, restart `npm run dev`. Admin → Settings → **Connections** shows whether each one is connected.

## Email (Gmail, free)

1. Use a Gmail account for the club (for example `ictclubbauet@gmail.com`) and turn on **2-step verification**.
2. Google Account → Security → **App passwords** → create one (16 letters).
3. In `.env`:
   ```
   SMTP_USER=ictclubbauet@gmail.com
   SMTP_PASS=abcdefghijklmnop        # the app password, not the normal password
   ADMIN_NOTIFY_EMAIL=ictclubbauet@gmail.com
   PUBLIC_URL=https://your-website-address
   JWT_SECRET=<long random text>     # also signs the unsubscribe links, so keep it fixed
   ```
4. Admin → Settings → Connections → type your address → **Test**.

What gets sent automatically:

| Event | Applicant / visitor | Club |
| --- | --- | --- |
| Application submitted | "We received your application" | "New application" alert |
| Admin selects an applicant | "Congratulations, you are selected as … for …" | |
| Admin rejects an applicant | polite "thank you for applying" | |
| Contact form | "We got your message" | the message, with reply-to set to the visitor |
| Newsletter signup | welcome mail with unsubscribe link | |
| Admin → Newsletter | your message to every subscriber, each with its own signed unsubscribe link | |

Emails are queued and sent one by one with one retry, so a slow mail server never slows the website. Gmail allows about 500 mails per day, which is plenty for a club.
To use another provider set `SMTP_HOST` and `SMTP_PORT` (465 uses SSL), or set `BREVO_API_KEY` and a `MAIL_FROM` that you verified in Brevo.

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
