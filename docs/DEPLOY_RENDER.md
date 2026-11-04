# Deploy on Render (website and backend in one service)

The Express server serves the built website, so you deploy **one** web service. The website and `/api` share the same address, so there is nothing to configure for CORS.

## 1. Before you start
- A **Neon** database: copy its connection string (it ends with `?sslmode=require`).
- Optional but recommended: a **Brevo** API key and verified sender, a **Cloudinary** account, a **Groq** key. See [SETUP_EMAIL_AND_CLOUDINARY.md](SETUP_EMAIL_AND_CLOUDINARY.md).
- Pictures need Cloudinary on Render: the free service's disk is wiped on every deploy and restart.

## 2. Create the service
**Easiest:** Render dashboard → *New* → *Blueprint* → pick this GitHub repository. Render reads `render.yaml`.

**By hand:** *New* → *Web Service* → this repository, branch `main`:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm run build:render` |
| Start command | `npm start` |
| Health check path | `/robots.txt` |

## 3. Environment variables
| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `JWT_SECRET` | long random text (32+ characters) |
| `DATABASE_URL` | your Neon connection string |
| `ADMIN_PASSWORD` | admin password (12+ characters). Username is `admin` |
| `PUBLIC_URL` | your Render address, for example `https://bauet-ict-club.onrender.com` |
| `BREVO_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | email |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | pictures |
| `GROQ_API_KEY` | AI assistant |

The tables and the first admin account are created automatically the first time the server starts. Open `https://your-service.onrender.com/admin` and sign in.

## 4. After the first deploy
- Admin → Settings → *Connections*: email, AI and pictures should show green.
- Admin → Settings → *Load demo data* if you want sample content; *Remove demo data* when you are done.
- The free plan sleeps after 15 minutes without visitors, so the first visit after a pause is slow. A paid plan, or a free uptime pinger on `/robots.txt`, avoids that.
- Every push to `main` redeploys automatically.

## Run it like production on your own computer
```bash
npm run build:render
NODE_ENV=production npm start
```
