# Project rules

## Commits

Do not add AI attribution to commits: no "Generated with" lines, no `Co-Authored-By: Codebuff`
(or any other agent) trailer. The commit message ends at its own last line.

## Stack

- `server/` — Express + PostgreSQL API. `npm --prefix server run qa` runs the end-to-end suite on an
  in-memory database (no accounts or internet needed).
- `client/` — Vite + React website and admin panel. `npm --prefix client run build` and
  `npm --prefix client test`.
- `app/` — Flutter app. `cd app && flutter analyze && flutter test`; release APK via
  `flutter build apk --release`.

## House style

- Public lists are revalidated (`/api/members`, `/api/events`, ...); the shared `/api/version` number
  tells the website and the app when to refetch. Bump it automatically by writing through the API —
  never cache admin writes on the client.
- A person's photo lives in `members.image_url` and `registrations.photo_url`; both are kept in sync
  by `server/utils/people.js`. Do not update one without the other.
- Pictures shown as round avatars go through `portrait()` (web `client/src/lib/img.js`, app
  `AppConfig.portrait`) so a face stays in frame.
