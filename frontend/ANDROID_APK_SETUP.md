# Android APK Setup

This project now includes a Capacitor Android shell under [android](D:/code/posduplicate/frontend/android).

## What is ready

- Existing React frontend is wrapped with Capacitor.
- Android project is generated and can be opened in Android Studio.
- Login page already shows a `Download MyPOS App` button.
- Native app builds can use a dedicated API URL via `VITE_MOBILE_API_URL`.
- Backend CORS defaults now allow Capacitor's `https://localhost` origin.

## Environment variables

Set these before building the Android app:

- `VITE_API_URL=https://api.yourdomain.com/api`
- `VITE_MOBILE_API_URL=https://api.yourdomain.com/api`
- `VITE_ANDROID_APP_DOWNLOAD_URL=https://your-frontend-domain/downloads/mypos-latest.apk`

For local Android emulator builds, you can use:

- `VITE_MOBILE_API_URL=http://10.0.2.2:3000/api`

## Useful commands

Run from [frontend](D:/code/posduplicate/frontend):

```bash
npm run android:sync
npm run android:open
npm run android:build:debug
```

## Distribution flow

1. Build the APK from the Android project.
2. Take the generated file from `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
3. Rename it to `mypos-latest.apk`.
4. Copy it into [frontend/public/downloads](D:/code/posduplicate/frontend/public/downloads).
5. Redeploy the frontend.
6. Clients can then download the APK from the login page button.

## Important note

Local APK compilation requires a Java JDK and Android SDK toolchain. Once `JAVA_HOME`, Android SDK, and `frontend/android/local.properties` are configured, you can build the APK locally with the commands above.
