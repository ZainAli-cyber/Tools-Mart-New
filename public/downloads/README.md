# Downloads

## Android APK
- **`zynextools.apk`** — install from Dashboard → Mobile App

## Browser extension
- **`zynextools-extension.zip`** — install from Dashboard → Extensions / Installation Guide
- Extension display name: **ZynexTools**

After building APK:
```bash
npm run build:mobile
npm run cap:open:android
# Copy: android/app/build/outputs/apk/debug/app-debug.apk → public/downloads/zynextools.apk
```

After updating the extension folder:
```bash
# Rebuild zip from /extension into public/downloads/zynextools-extension.zip
```
