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

Optional services (leave blank to disable): Cloudinary (photo upload), Brevo (emails), Groq (AI chatbot).
Set `SEED_SAMPLES=true` before `db:init` if you want demo events, notices and awards.

## Flutter app

See `app/README.md`.

## Adding features

New managed lists (sponsors, projects, FAQs...) need two small files and no wiring. See [docs/ADD_A_FEATURE.md](docs/ADD_A_FEATURE.md).
