Place the latest Android APK in this folder and keep the filename:

mypos-latest.apk

The login page download button uses this path by default:

/downloads/mypos-latest.apk

Suggested flow:
1. Build APK from frontend/android
2. Rename the generated file to mypos-latest.apk
3. Copy it into this folder
4. Redeploy the frontend so the login page download button serves the latest APK

If you host the APK somewhere else, set:

VITE_ANDROID_APP_DOWNLOAD_URL=https://your-domain.com/path/to/mypos-latest.apk
