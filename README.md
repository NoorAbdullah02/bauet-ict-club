# BAUET ICT Club

React + Vite + Tailwind client (`client/`), Express + PostgreSQL API (`server/`), Flutter app (`app/`).

## Run locally

1. Put your settings in a `.env` file in the **project root** (copy `.env.example`). At minimum: `DATABASE_URL`, `JWT_SECRET`.
2. Install everything (root, client and server) with one command:
   ```bash
   npm install
   ```
3. Create the tables and seed the committee data (run once; prints/uses the admin password from `ADMIN_PASSWORD`):
   ```bash
   npm run db:init
   ```
4. Start the API (port 5000) and the site (port 5173) together:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 — the admin console is at `/admin` (username `admin`).

Optional services (leave blank to disable): Cloudinary (photo upload), Brevo API (emails), Groq (AI chatbot).
Set `SEED_SAMPLES=true` before `db:init` if you want demo events, notices and awards.

## Flutter app

See `app/README.md`. Website, server and app live in this one repository and are kept in step: see [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md) for the layout, the parity table and the checks to run before you push.

## Adding features

New managed lists (sponsors, projects, FAQs...) need two small files and no wiring. See [docs/ADD_A_FEATURE.md](docs/ADD_A_FEATURE.md).

## Email, photos and roadmap

- [Email and Cloudinary setup](docs/SETUP_EMAIL_AND_CLOUDINARY.md)
- [Roadmap](docs/ROADMAP.md)
- [Status and to-do (what exists, what is missing, what to improve)](docs/STATUS_AND_TODO.md)
- [Sign-in security](docs/SIGN_IN_SECURITY.md)
