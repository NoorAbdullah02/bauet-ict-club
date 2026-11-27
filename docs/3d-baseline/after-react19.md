# React 19 + fiber 9 upgrade — checked against the baseline

Ran on **2026-11-27**, branch `feat/three-stack` on top of `master` `d262202`. The comparison is against `docs/3d-baseline/` (production build 210, React 18 + fiber 8).

## What changed

| Package | Before | After |
|---|---|---|
| `react` / `react-dom` | 18.3.1 | 19.3.1 |
| `@react-three/fiber` | 8.17.14 | 9.8.2 |
| `@react-three/drei` | 9.121.3 | 10.7.9 |
| `three` | 0.171.0 | 0.187.0 |

`vite` 6 / `@vitejs/plugin-react` 4 stayed put. `npm install` resolves with **no ERESOLVE**; no application code had to change — `Scene3D.jsx`, `Backdrop3D.jsx` and every scene prop worked as-is.

## How it was compared

Baseline is the live product (real data, GPU browser), so an extra control run was added: **the same four routes, both viewports and both themes captured twice on the same machine** — once with the old lockfile's build, once with the new one — through headless Chrome (1440×900 / 390×844, `data-theme` switched with the site's own toggle) against the real server on its in-memory database. That pair isolates the upgrade from data and GPU differences.

## Results — 16 views, both builds

- **Console:** 0 errors, 0 exceptions, 0 failed requests on all 16 new-stack loads (and on the control run). Only the two site branding logs appear.
- **Canvas:** matches the old build view-for-view — 1 canvas on `/`, `/join`, `/join/general`; on `/join/committee` 1 at 1440 and 0 at 390 (the `hidden lg:block` design), same as `docs/3d-baseline/`.
- **No horizontal overflow** on any route at either width.

### Visual difference (old vs new, same machine, mean |Δ| per pixel, 0–255)

| View | Δ | View | Δ |
|---|---|---|---|
| committee-390 light / dark | 0.01 / 0.02 | orbs-join-390 light / dark | 0.50 / 0.61 |
| committee-1440 light / dark | 1.13 / 0.88 | orbs-join-1440 light / dark | 1.24 / 3.45 |
| general-1440 light / dark | 1.60 / 1.69 | hero-1440 light / dark | 1.76 / 3.35 |
| general-390 light / dark | 0.94 / 5.60 | hero-390 light / dark | 3.03 / 7.57 |

Static content (committee at 390, no canvas) is effectively identical; the 3D views differ only by the amount the scene moves between the two captures (rotating globe, floating orbs, sparkle twinkle) and the hero typewriter. Side-by-side inspection of hero, `/join`, `/join/general` and the 390 hero showed the same globe, orbits, dot colours, particle density, gradients and layout — no shifted or missing element, no colour shift.

## Performance

- rAF over 4 s on the hero at 1440×900 with the canvas live, Intel Iris Xe (Electron panel): **old 60 fps, new 59 fps** — unchanged within measurement noise.
- Chunk sizes: `Scene3D` **831.64 → 944.18 kB** (gzip 223.00 → 253.59, +13.7%), `charts` 416.73 → 479.46 kB, `react` 188.24 → 264.82 kB, `icons` unchanged at 51.68 kB. Expected: React 19 + fiber 9 + three 0.187 all grew.

## Fallback and dev-mode checks

- `WEBGL_lose_context.loseContext()` on the live canvas: the 3D layer unmounts to the static gradient, the page keeps its header, hero and sections, and the only console line is three's own "Context Lost" log — the `onLost` path still works under fiber 9.
- Vite dev server (StrictMode, double-mounted effects): one canvas, still mounted after 9 s, no context-loss loop and no duplicate-scene warnings.

## Known caveats

- Production-origin capture after deploy still needs to be re-checked against this baseline; the numbers above are from the local build served by the real server.
- drei 10 has no visual drift on the components used here (`Float`, `Sparkles`, `Stars`, `MeshDistortMaterial`), but texture colour management changed in fiber 9 — irrelevant today because the scenes load no image textures, and relevant the day one is added.
