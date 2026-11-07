# Phone notifications (push)

New event, notice or project: members who installed the app get a notification on their phone (free, Firebase Cloud Messaging).

## How it works
- The app asks the person once (Android 13+) and sends the phone's notification address (a "token") to `POST /api/push/register`. The side menu has an **Alerts on / off** switch.
- When the club adds an event, notice or project, the server (`server/utils/push.js`, called from `utils/notify.js`, the same moment the newsletter goes out) sends the news to every registered phone. Phones that no longer have the app are forgotten automatically.
- Tapping the notification opens the page (`/events`, `/notices`...). With the app open, the lists just refresh.
- No extra npm package: the server signs a request with the service-account key (Node `crypto`) and calls Google's HTTP v1 API with `fetch`.

## One-time setup (the club's Google account)
1. Firebase console → project **bauet-ict-club** (Spark, no cost) → add the Android app with package `com.bauet.bauet_ict_club`. Download `google-services.json` and put it at `app/android/app/google-services.json` (already in the repository; it is not a secret).
2. Project settings → **Service accounts** → **Generate new private key**. This file **is secret**: never commit it or paste it in a chat.
3. Render → the service → **Environment** → add `FIREBASE_SERVICE_ACCOUNT` with the whole content of that `.json` file (or its base64). Save and deploy.
4. Build and install the new APK (the GitHub workflow adds the Firebase Gradle plugin with `tools/android_firebase.py`).

Without step 3 the server never sends anything and everything else works as before. `PUSH_ENABLED=false` turns sending off.

## Checking it works
- Server log after adding an event: `Push "New event: ...": 3 sent, 0 removed of 3`.
- Nothing arrives? Check the phone allowed notifications, the app version has Firebase in it (build after the workflow change), and `FIREBASE_SERVICE_ACCOUNT` is valid JSON (the server logs "Push notifications are off: ..." when it is not).

## Not built yet
- "Tomorrow: your event" reminders by notification (the e-mail reminder goes to each registrant; phones are not linked to a person yet).
- Notification text in Bangla (the app saves the language with the token, so the server can use it later).
