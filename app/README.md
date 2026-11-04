# BAUET ICT Club - Mobile App (Flutter)

A native Flutter app that mirrors the club website and talks to the **same Express REST API** (`server/`).

**Features:** animated splash, home (parallax hero, stats, next events, pinned notices, join CTA), events, notices,
team (session chips + leadership banner), gallery (grid + fullscreen pinch-zoom viewer), achievements, contact form,
**Join hub -> Committee flow, Department Ambassador flow (2 steps, photo picker, post picker) and General flow (interest chips, level, optional photo)**,
AI chat assistant, and an **Admin area** (login, dashboard, applications with approve / reject / delete /
*Select for team*, CRUD for events, notices, members, gallery, achievements, and the contact inbox).
Ambassadors screen (grouped by session, department filters). Light + dark themes (toggle in the app bar) using the website's colour system.

> **Status:** this code was written without a Flutter SDK available, so it has **not been compiled or run**.
> Expect to fix a few small analyzer errors on the first `flutter analyze` (typos, API drift between package versions).

## Requirements
- Flutter 3.27+ (Dart 3.4+) - uses `Color.withValues(alpha:)` and records
- Android Studio / Xcode toolchains for your target

## Server address
Development uses `http://10.0.2.2:5000/api` (Android emulator). For your deployed backend put its address in `env.production.json` (keep `/api` at the end) and run with `--dart-define-from-file=env.production.json`. See `docs/AFTER_DEPLOY.md`.

## Setup
The repo contains only the Dart sources, `pubspec.yaml`, and an Android manifest/network config. Generate the rest of the platform scaffolding once:

```bash
cd app
flutter create . --org com.bauet --project-name bauet_ict_club --platforms android,ios
flutter pub get
```

`flutter create .` leaves existing files alone, but double check afterwards that
`android/app/src/main/AndroidManifest.xml` still has:
- `<uses-permission android:name="android.permission.INTERNET" />`
- `android:usesCleartextTraffic="true"` and `android:networkSecurityConfig="@xml/network_security_config"` on `<application>`

(the included `test/widget_test.dart` is a logic smoke test; `flutter test` runs it).

iOS: for a plain-HTTP dev server add to `ios/Runner/Info.plist`
`NSAppTransportSecurity -> NSAllowsArbitraryLoads = true` (dev only), plus
`NSPhotoLibraryUsageDescription` for the photo picker.

## Point the app at your API
Default is `http://10.0.2.2:5000/api` (Android emulator -> your PC). Change it in `lib/core/config.dart`, or override at run time:

```bash
flutter run --dart-define=API_URL=http://192.168.1.20:5000/api   # physical device on the same Wi-Fi
```

Start the backend first (`cd server && npm start`, port 5000). Photo upload for join forms needs the server's Cloudinary env vars.
Admin login uses the same admin accounts as the website.

## Run
```bash
flutter run
```

## Structure
```
lib/
  main.dart            app entry, providers, themes
  core/                config (API url, posts), theme (colour system, fonts), router (go_router), utils
  models/              JSON models
  data/api.dart        Dio client (public + admin endpoints)
  state/app_state.dart theme, cached content, admin session
  widgets/             shell (nav/drawer), common UI, form widgets
  screens/             public screens, join/ flows, admin/ screens
```

## Notes
- Team grouping mirrors the site: sessions sorted newest first (`year*2 + winter`), President / Vice President in the
  leadership banner, other secretaries/treasurer = core, `Chief Executive*` = chiefs, the rest = executives.
- Admin token is stored in `shared_preferences`; a 401/403 response signs you out.
- For production use HTTPS and remove the cleartext config.
