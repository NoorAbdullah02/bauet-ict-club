# 3D baseline — before the React 19 / fiber 9 / three upgrade

Captured **2026-11-27** on the live site (`https://bauet-ict-club.onrender.com`, i.e. `master` `ab19f05`, web build 210). Dependencies were **not** changed for this capture.

## Environment

| | |
|---|---|
| Browser | Freebuff panel (Chromium 130.0.6723.191, Electron 33.4.11), Linux x86_64 |
| Device | 8 logical cores, 8 GB memory, devicePixelRatio 1 |
| Viewports | 1440×900 (desktop scene) and 390×844 (phone, runs the `lite` scene) |
| Themes | site toggle: light and dark (`data-theme` on `<html>`) |
| Method | fresh page load → theme set → canvas present → ~3 s settle → viewport screenshot |

Screenshots: `hero-*` = `/` (hero globe), `orbs-join-*` = `/join`, `general-join-*` = `/join/general`, `committee-join-*` = `/join/committee`.

| Route | Scene | 1440 light | 1440 dark | 390 light | 390 dark | Canvas | Console errors |
|---|---|---|---|---|---|---|---|
| `/` | hero | ✔ | ✔ | ✔ | ✔ | 1 on every load | 0 |
| `/join` | orbs | ✔ | ✔ | ✔ | ✔ | 1 on every load | 0 |
| `/join/general` | general | ✔ | ✔ | ✔ | ✔ | 1 on every load | 0 |
| `/join/committee` | committee | ✔ | ✔ | ✔ | ✔ | 1440: 1 · 390: 0 (by design, `lg` only) | 0 |

## Console / network report

Every one of the 16 loads produced **only the two site branding logs** (`</> BAUET ICT Club`, "Like reading the console? Join us → /join"). No warnings, no errors, no React/three messages. Network: all requests 200 — the app JS/CSS chunks, `Scene3D-*.js`, Google Fonts CSS + woff2, Unsplash and Cloudinary images, `/api/version`, `/api/bootstrap`, `POST /api/analytics/hit` → 204.

## Bundle baseline (`npm --prefix client run build`, master `ab19f05`)

| Chunk | Size | gzip |
|---|---|---|
| `Scene3D-P2qDvNc-.js` | 831.64 kB | 223.00 kB |
| `charts` | 416.73 kB | 119.61 kB |
| `AdminApp` | 385.59 kB | 99.16 kB |
| `pdf` | 359.61 kB | 105.93 kB |
| `index` | 270.20 kB | 86.33 kB |
| `react` | 188.24 kB | 40.39 kB |
| `motion` | 121.39 kB | 40.39 kB |
| `icons` | 73.29 kB | 14.10 kB |

Build prints the usual "chunks larger than 700 kB" warning for `Scene3D`.

## What to ignore when comparing later

- **Counters animate from 0**: the hero stats come from `/api/bootstrap` and count up; captures settle at `1+ / 50+ / 30+ / 5+` on 1440, and stay invisible at 390 (below the fold).
- **Hero subtitle is a typewriter** ("Building Tomorrow's Tech Lea…"), so its text differs between captures.
- **`/join/committee` shows no canvas below 1024 px** — `Backdrop3D` is `hidden lg:block` there; the empty 390 captures are expected.
- **390 px runs the lite scene** (`html.lite`: dpr 1, fewer sparkles) — compare like for like.
- **`/join` orbs are deliberately faint** behind the hero (opacity + mask).
- The "Freebuff" chip in the top-left is the browser-panel overlay, not site UI.

## Re-running for the upgrade

Load the same four routes at 1440×900 and 390×844 in light and dark, wait for the canvas plus a few seconds, capture, and diff each pair against these files. Acceptance: screenshots match in composition and colour, console stays at zero errors/warnings, and `Scene3D` chunk size and first-frame timing do not regress.
