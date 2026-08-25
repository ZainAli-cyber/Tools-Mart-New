# Mobile APK download

Place the built Android APK here as **`aitoolzmart.apk`**.

Users download from **Dashboard → Mobile App**.

After building:
```bash
npm run build:mobile
npm run cap:open:android
# Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
# Copy: android/app/build/outputs/apk/debug/app-debug.apk → public/downloads/aitoolzmart.apk
```

Or set `MOBILE_APK_URL` on Vercel to an external URL (Google Drive direct link, etc.).
