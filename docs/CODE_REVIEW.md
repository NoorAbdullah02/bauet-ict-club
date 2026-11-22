# Code review — BAUET ICT Club (website + server + app)

Reviewed: 2026-11-22 · branch `master` @ `29b44ab` · 203 commits
Scope: `server/` (Express + PostgreSQL), `client/src` (React + Vite + Tailwind), `app/lib` (Flutter),
plus workflows, deploy config, docs and the published binaries. About 43,000 lines of own code.

Everything marked "verified" below was run on this machine during the review. Anything I could not
run (a real phone, the live Neon/Brevo/Cloudinary/Groq services) is listed at the end as **not verified** —
it is not claimed as working.

---

## 1. Checks that were run

| Check | Command | Result |
| --- | --- | --- |
| Server end-to-end suite (in-memory DB) | `npm --prefix server run qa` | **302 passed, 0 failed** |
| Website production build | `npm --prefix client run build` | **built in 7.3 s** (warnings: chunks over 700 kB) |
| Every server file parses | `node --check` on all `server/**/*.js` | **pass** |
| App static analysis | `cd app && flutter analyze --no-fatal-infos` | **No issues found** |
| App unit/widget tests | `cd app && flutter test` | **21 passed** |
| Dependency audit | `npm audit --omit=dev` in `server/` and `client/` | **0 vulnerabilities (both)** |
| Secrets committed | `git grep` for key patterns | **none** (only regex code in `server/utils/push.js`) |

That is a healthy baseline. The rest of this document is about what the checks do *not* catch.

## 1a. Status after the fixes made on 2026-11-22

Fixed in the code (and covered by the suite, which grew from 302 to **315 passing checks**):
3.2 (certificates/points by identity), 3.4 (database-backed card OTP, 5 tries, neutral answers), 3.5 (photos only from
the club's own Cloudinary cloud), 3.10 partly (dead `birth_date` write removed), 3.12 partly (`/logos/*` now refreshed by
the service worker). 3.1 is fixed in the way that matters: the public card code can no longer change anything — see the
revised note in 3.1. Admin → **Downloads** was added (new feature, not a finding).

Still open: 3.1's residual (committee card codes are public by design), 3.3 (stale APK on the website), 3.6 (unused bundled
fonts), 3.7 (no website tests), 3.8 (APKs in git), 3.9 (docs, partly updated), 3.11 (unbounded exports), 3.13 (accessibility).

---

## 2. Verdict

**Solid, unusually well-documented project with a few real privacy/data-exposure bugs and some
process debt.** The server is the strongest part: whitelisted CRUD columns, parameterised SQL,
soft delete with a 20-day trash, session invalidation against the database, strict CSP, per-account
lockout, a 302-check harness that runs in CI, and a written handbook. The website is large but
consistent. The app is clean under `flutter analyze` and genuinely at feature parity for most of the site.

The problems are concentrated in two places: **the member-card feature** (codes are handed out to
anyone, and points/certificates are matched by *name*), and **release hygiene** (the APK and
`version.json` on the website are two weeks behind the code, 56 MB of binaries live in git, and the
docs have drifted away from reality).

| Area | Grade | Note |
| --- | --- | --- |
| Server architecture & security | A− | Very careful; the card module is the exception |
| Website | B+ | Big and consistent, zero automated tests |
| Flutter app | B+ | Clean analysis, good offline behaviour, unused font assets |
| Data modelling / migrations | B | Good indexes; ad-hoc `initDb` instead of migrations |
| Testing | B− | Server 302, app 21, website **0** |
| Docs | B | Excellent content, but stale in several sections |
| Release / repo hygiene | C+ | Stale APK, binaries in git, manual publish step |

---

## 3. Findings

Ordered by value to fix. Severity is about real-world impact for a university club site, not CVSS purity.

### 3.1 HIGH — every committee member's card code is public (fixed 2026-11-22, by separating "issued" from "allowed to change")

`server/routes/card.js`, `GET /:id` (numeric branch) and the advisor branch:

```js
const code = cardCode(String(m.id));           // HMAC over a sequential id
res.json({ member: {...}, stats, code, verified: same(given, code) });
```

The signed code is returned in the response **even when the caller sent no code at all**. Member ids
and advisor ids are sequential, so:

```
GET /api/card/1 … /api/card/400   →  a valid, "genuine" code for every member and advisor
```

The same code is the only credential required by `PATCH /:id/photo` and `PATCH /:id/birthdate`, so
anyone can fetch a member's code and then change that member's card photo or date of birth. The r-card branch (approved applicants) does this correctly — it only returns the code when the caller
already knows it.

**What was done:** the card code stays readable for committee members and advisors, because the Team page
links to the card with no code and still has to draw the QR (and the check-in desk must be able to confirm
"this card was issued by the club"). What the code can no longer do is *change* anything: `PATCH /:id/photo`
and `PATCH /:id/birthdate` now need a 30-minute edit token from the e-mail OTP (or the secret code of an
applicant card, or an admin login), and the profile page asks for the 6-digit code the first time someone
changes a photo or a birth date. The remaining truth is worth saying plainly in the handbook: a committee
card proves the card is genuine, not that the person holding it is that member — the check-in desk should
match the photo on the card.

### 3.2 HIGH — points and certificates are matched by name, not identity — **FIXED 2026-11-22**

`server/routes/card.js`, `getMemberStats(email, name)`:

- attendance, awards and certificates are looked up with
  `LOWER(email) = LOWER($1) OR LOWER(full_name) = LOWER($2)`;
- for committee members the email is `null`, so **only the name** is used;
- certificates are also matched on `cert_name`.

Result: two members named "Nusrat Jahan" (very common in a Bangladeshi university) see each other's
certificates — including the `ticket` code of each certificate, which opens `/ticket/:code` and
`/certificate/:code` (the PDF). That is a data leak *and* a wrong number on a public card.

**Fix:** never match by name alone for anything that carries a token or personal data. The `members`
table has no `email` and no `registration_id` column today, but it does have `student_id`, so the
cheapest correct fix is to store `registration_id` on the member row when an admin selects/approves
an applicant (`routes/registrations.js` `/:id/select` already knows both ids) and to look up points and
certificates by that id — with `student_id` as a second key for members added by hand. Names stay for
display only.

### 3.3 HIGH (operational) — the download on the website is behind the code — **still open**

- `client/public/downloads/bauet-ict-club.apk`, `…-old-phone.apk` and `version.json` are dated
  **2026-11-08, build 143**.
- `app/` has commits from **2026-11-19** (custom domain deep links, DOB removal, card link in the
  selection email, certificates) that are not in that APK.
- CI now publishes APKs to GitHub **releases**, not to `client/public/downloads/`, and
  `docs/HANDBOOK.md` step 7 asks a human to copy them across by hand.

So a student who taps "Download for Android" today installs a two-week-old build, and installed apps
that ask `version.json` are told they are up to date (`build 143`). Anyone who relies on the app for
the 19 November features does not have them.

**Fix (pick one):**
1. Make CI upload the two APKs + a regenerated `version.json` into `client/public/downloads/` and
   commit them (fully automatic, but keeps binaries in git — see 3.8), **or**
2. Serve the download from the newest GitHub release: have `/downloads/version.json` generated by the
   server from a stored build number, and point the button at
   `…/releases/latest/download/bauet-ict-club.apk`. Removes both the staleness and the repo bloat.

### 3.4 MEDIUM — the card OTP flow — **FIXED 2026-11-22**

`server/routes/card.js`:

- `const otpStore = new Map()` — an **in-memory** store. On Render the process restarts on every
  deploy and sleeps on the free plan; every restart silently kills pending codes. If the service is
  ever scaled past one instance, verification fails at random.
- `/otp/verify` has **no attempt counter**. Only the 120/h per-IP limiter stands between a guesser and
  a 6-digit code that lives 10 minutes.
- `entry.code !== code` is a plain comparison (use `timingSafeEqual` like the rest of the codebase).
- `/otp/request` answers `404 "No approved membership found with this email address."` — this
  **confirms membership** for any e-mail address, which is exactly what the rest of the project works
  hard to avoid (`/auth/forgot` always answers the same).
- `mail.deliver(...)` is fire-and-forget; failures are invisible.
- A leaked or guessed card code can be *changed* only by re-running the OTP, so rotation is fine.

**Fix:** move the OTP to a table (`card_otps`, hashed code, attempts, expires_at), cap attempts at 5
per code, return the same "if this address has a membership, a code was sent" message, and clear the
record on success. ~1 hour of work; the QA harness already covers this style of flow elsewhere.

### 3.5 MEDIUM — card photo update accepts any Cloudinary URL — **FIXED 2026-11-22**

`PATCH /:id/photo` validates `photo_url` against
`/^(https:\/\/res\.cloudinary\.com\/|\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$)/`.
Any Cloudinary account on the internet passes, so a card can be made to display an unrelated (or
offensive) photo hosted by a third party. `registrations.js` has the same loose pattern.
**Fix:** require the club's cloud name (`res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/`) — it is already
in `process.env`.

### 3.6 MEDIUM — the app ships ~1.3 MB of fonts it never uses and still downloads fonts — **still open**

`app/pubspec.yaml` lists `assets/google_fonts/` (30 TTF files), but there is **no `fonts:` family
declaration**, and the only place `allowRuntimeFetching = false` appears is
`app/test/dynamic_form_test.dart`. So:

- the bundled fonts are dead weight in the APK, and
- `google_fonts` still fetches from Google on first use — the exact "offline first launch shows plain
  fonts" item that `docs/STATUS_AND_TODO.md` lists as pending.

**Fix:** declare the families in `pubspec.yaml` (`family: BarlowCondensed, fonts: - asset: …`) and add
`GoogleFonts.config.allowRuntimeFetching = false;` in `main()` **before** `runApp`. Then either
verify each family resolves or delete the unused files. This closes an open to-do for ~20 lines.

### 3.7 MEDIUM — the website has no automated tests at all — **still open**

`client/package.json` has no test runner, no ESLint and no config; `git ls-files` shows zero test
files under `client/`. The website is 131 files and the largest surface in the project, and it is the
only part of the stack that CI only *builds*. A broken form field, a stale store key or a broken route
ships silently.

**Fix (cheap and high value):** add Vitest + React Testing Library and cover the six things that have
already broken before: `DynamicForm` validation and conditional questions, `PaymentBox` (online vs
manual), the admin login/2FA branches, `store.fetchAll` fallback when `/bootstrap` fails, ticket
lookup, and `lib/forms.js` visibility rules. Ten tests would cover most of the risk. Add
`npm run dependabot`/`npm audit` as a CI step too — the audit is clean today and should stay that way.

### 3.8 MEDIUM — 56 MB of APKs in git, 114 MiB pack — **still open**

`client/public/downloads/` holds two APKs (26 MB + 30 MB) that are rewritten on every release, so
every release adds another ~56 MB to history permanently (`git count-objects -vH` → `size-pack 114.04 MiB`).
Cloning the repository for a new contributor already costs more than the whole source tree.

**Fix:** follow 3.3 option 2 (serve from releases), or move APKs to Git LFS *before* the next
release. Do **not** rewrite history just for this; it is not worth the churn, but stop growing it.

### 3.9 MEDIUM — docs have drifted from the code — **partly fixed 2026-11-22** (check counts, push notifications, 2FA, Bangla switch, PWA)

Not cosmetic: the hand-over docs are the on-boarding path for the next maintainer, and several
statements are now false.

| Doc | Says | Reality |
| --- | --- | --- |
| `docs/STATUS_AND_TODO.md` | "Last updated 2026-11-06", "96 checks pass" | 302 checks; last commits 2026-11-19 |
| same | push notifications "no / no", "needs Firebase" | `app/lib/core/push.dart`, `server/utils/push.js`, `firebase_messaging` all wired |
| same / `ROADMAP.md` | "2-step login" is still to do | implemented (`/auth/2fa/*`, `Security.jsx`, `admin_security_screen.dart`) |
| `ROADMAP.md` | Bangla/English switch is "next" | `tools/i18n_bn.py` → `lib/bn.js` + `core/bn.dart` |
| `docs/PROJECT_GUIDE.md` | `admin/config.js` holds the post list | still true, but the list is now duplicated in `app/lib/core/config.dart` and `server/utils/positions.js` |
| `docs/ANALYSIS.md` | "server npm audit: 6 findings" | 0 |
| `docs/AFTER_DEPLOY.md` | publish APK from the run's *Artifacts* | workflow now uses GitHub *releases* |

**Fix:** one pass over `STATUS_AND_TODO.md` + `ROADMAP.md` after this review, and add a "last
verified by running X on date Y" line at the top of each doc.

### 3.10 LOW — duplicated rules in three languages — **partly fixed** (dead `birth_date` removed; the lists still live in three places)

- Post names live in `server/utils/positions.js` (authority), `client/src/admin/config.js` (~line 46)
  and `app/lib/core/config.dart` (~line 28).
- Form logic is implemented three times: `server/utils/forms.js` (210 lines, authoritative),
  `client/src/lib/forms.js` (77 lines) and `app/lib/core/forms.dart` (172 lines). They already differ:
  pattern/rule validation exists only on the client.

The 19 November commit "Remove date of birth from all registration forms" touched several files and
still left `birth_date: null` in `server/routes/registrations.js` (`validate()` and the `INSERT`),
which is now a dead field in a live insert. That is the cost of triplication.

**Fix:** `tools/` already contains a Python generator (`i18n_bn.py`) that writes both the website and
the app translation files — use the same pattern to emit the post list from `server/utils/positions.js`.
For forms, accept the duplication but add a QA test that the three field-shape definitions agree
(names/types of the default fields), so drift fails CI. Remove the dead `birth_date` from registrations.

### 3.11 LOW — unbounded queries and filtering in Node

- `GET /api/registrations` returns every application ever; `GET /api/messages` every message;
  `GET /api/event-registrations/by-event/:id` every sign-up.
- `selectRows()` in `registrations.js` loads **all** applications into memory and filters them in
  JavaScript for every PDF/Word/CSV export.
- `points.js table()` re-computes the entire leaderboard per request (only the top 25 is public).

At club scale this is fine (hundreds of rows). It becomes a problem at 5–10k applications, and it keeps
a free Neon instance awake longer than needed. **Fix when it hurts:** `LIMIT`/`OFFSET` + a real `WHERE`
clause in `selectRows`, index on `registrations(status, type, created_at)`, and a 60-second cache on
the leaderboard.

### 3.12 LOW — smaller things worth a cleanup pass

| Where | Issue |
| --- | --- |
| `server/routes/auth.js` `/reset` | hashes the new password with cost **10**; every other path uses **12** |
| `server/routes/auth.js` `/login` | logs the typed username and the password *length* to the server log (`console.warn`) — avoidable PII |
| `server/routes/card.js` | `cardCode` falls back to the literal `'dev-secret'` when `JWT_SECRET` is unset, while `middleware/auth.js` generates a random secret — two different fallbacks for the same secret |
| `client/public/sw.js` | **fixed 2026-11-22**: `/logos/*` is served from the cache and refreshed in the background; the cache name is now `v2` |
| `client/src/App.jsx` | a `MutationObserver` over `#root` rescans `.spot/.section-header/...` on every DOM insertion, plus a 2.5 s failsafe timer per tagged node — watch the cost while typing in the admin form editor on a low-end phone |
| `app/lib/core/crash.dart` | `Firebase.initializeApp()` with no options relies on platform config; fine on Android with `google-services.json`, silently no-ops elsewhere (acceptable, but say so in the comment) |
| `app/lib/state/app_state.dart` | admin token kept in `SharedPreferences` (plain XML). `flutter_secure_storage` would be stronger now that admin screens live in the same app |
| build output | `Scene3D` is 831 kB (223 kB gzip) and is the single biggest JS cost; `charts` 417 kB is admin-only and already lazy — the roadmap note to swap the 3D scene for a still image on phones is still the right call |
| `client/src/context/store.js` | admin JWT in `localStorage` (known trade-off, documented). The strict prod CSP (`script-src 'self'`) is what keeps this acceptable — do not relax it |
| `server/routes/dataset.js` | caches in module scope; with more than one Render instance each instance keeps its own 10-minute copy (harmless) |

### 3.13 Accessibility — untested, and the app is far behind

A quick count (not an audit): the website has 181 `aria-label`, 25 `aria-hidden`, 5 `aria-live`, every `<img>` has an
`alt`, and `global.css` has a visible `:focus-visible` ring — that is a good start. The app is the gap: **3 of 59 screens**
use `Semantics`/`semanticLabel`, so a screen reader cannot describe most buttons, the QR code or the member card.

What a WCAG 2.2 AA pass would cover: contrast of muted text over the aurora background, form errors announced
(`role="alert"` + `aria-describedby`), a keyboard alternative for the drag-to-reorder question list, a skip link, status
never shown by colour alone, and in the app: labels on icon buttons, `semanticLabel` on pictures and the QR, tap targets
≥ 48 dp, and a layout check at the phone's largest font setting. Tools: axe DevTools / Lighthouse for the site, TalkBack +
large font on a real phone for the app. Estimated 1–2 days for the website, 2–3 days for the app.

---

## 4. What is genuinely good (keep doing this)

- **Auth is careful.** Tokens are checked against `admins.token_version` on every request (8 s cache),
  so deleting a login, demoting a role, changing a password or "sign out everywhere" ends sessions
  immediately. The role comes from the database, never from the token. Editor restrictions are
  enforced centrally in `middleware/auth.js` (`EDITOR_BLOCKED`), not per route.
- **Public endpoints resist enumeration.** `/auth/forgot` answers identically for existing and
  non-existing accounts and rate-limits per 2 minutes; login runs a dummy bcrypt compare for unknown
  users so timing does not leak usernames; sign-up is capped at 3 accounts with e-mail proof and MX
  checks. (The card OTP is the one place this discipline slipped — see 3.4.)
- **No SQL injection surface in the CRUD layer.** `columns` are whitelisted, table names are checked
  against `IDENT`, and values are always parameters.
- **Deletes are safe.** Everything soft-deletes into the Trash with a 20-day window; replacing an image
  cleans up the old Cloudinary file.
- **The QA harness is real.** 302 assertions against pg-mem, no accounts needed, run in CI. That is
  more than most club projects ever get.
- **Operational maturity.** Health check, `CRON_SECRET` job endpoint, transient-DB retry wrapper,
  pool error handler so a dropped Neon connection does not crash the process, backup workflow, HSTS,
  CSP, `TRUST_PROXY`, `X-Robots-Tag` on admin, sitemap and per-event JSON-LD.
- **Offline behaviour in the app.** `/bootstrap` first, per-list fallback second, `SharedPreferences`
  cache third, plus cached tickets and member cards — thoughtful for campus data.
- **Docs.** `HANDBOOK.md` and `PROJECT_GUIDE.md` are better than most commercial repos. They just need
  the refresh in 3.9.

---

## 5. Suggested order of work

1. **Stop leaking card codes** (3.1) — 3 lines, highest impact.
2. **Fix name-based certificate/points matching** (3.2) — identity by registration id.
3. **Harden the card OTP** (3.4) — table, 5 attempts, neutral answers.
4. **Fix the release path** (3.3 + 3.8) — serve the APK from GitHub releases, generate `version.json`,
   stop committing binaries.
5. **Wire the bundled fonts** (3.6) — closes an open to-do, improves first launch.
6. **Add website tests** (3.7) — Vitest + RTL, ten tests, add `npm audit` to CI.
7. **Refresh the docs** (3.9) and delete the dead `birth_date` (3.10).
8. Then the low-severity cleanups in 3.12 as a single "hygiene" PR.

Nothing here requires a rewrite, a new framework or a schema migration beyond one small OTP table.

---

## 5a. Feature added in this round: Admin → Downloads

Not a finding — a requested feature. `GET /api/downloads` lists every dataset the club keeps (applications, members,
advisors, subscribers, messages, point awards, event sign-ups, events, notices, contests, contest teams, forms, form
responses, gallery, achievements, posts, projects, resources, FAQ, sponsors, jobs, activity log, short links, visitor log)
with its row count; `GET /api/downloads/:key?format=csv|json` returns the file. Optional `from` / `to` dates (on
`created_at`), `event=<id>` for sign-ups and `form=<id>` for responses. CSV uses the existing formula-injection-safe
writer with a UTF-8 BOM (Bangla names open correctly in Excel); JSON keeps the real nested shape (answers, payment).
Only `superadmin` and `admin` may call it — an `editor` gets 403, because these files contain phone numbers and payment
details — and the full ZIP backup stays main-admin-only. The page is Admin → System → Downloads, with a data-handling
warning and, for the main admin, the backup button in the same place.

---

## 6. Not verified in this review

- Any live service: Neon, Brevo, Cloudinary, Groq, SSLCommerz sandbox, Firebase — the checks above all
  ran against the in-memory harness or a local build.
- The Flutter app on a real Android phone or emulator (camera scan, photo picker, notifications,
  back-button behaviour, install-over-update).
- Any UI in a browser: I did not open the site, click through the admin console, or look at pages at
  phone size. Findings about React components come from reading the code and the build output.
- Load behaviour beyond the existing rate limits; no profiling was run, so no performance numbers are
  claimed here.
