# AI Toolz Mart — Android Mobile App

One-tap tool access for mobile users (no Chrome extension).

## Ready to build APK

When you see this checklist complete, open Android Studio and build:

- [x] Website logo on splash + app icon + dashboard header
- [x] Brand colors (#0d0908 background, #DC2626 red accents)
- [x] Live support chat (same ChatBotWidget as website)
- [x] Support tickets inbox in app
- [x] Bottom navigation by role (user / reseller / admin)
- [x] Top bar: bell (notifications) + profile (theme, settings, logout)
- [x] Full-screen pages on mobile (no stacked popups)
- [x] One shared login screen for every account
- [x] Push notifications (FCM) — alerts when app is closed or in background

## Push notifications setup

Lock-screen alerts require Firebase + a rebuilt APK.

### 1. Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) → **Add project** (or use existing).
2. **Add app** → Android → package name **`com.aitoolzmart.app`**.
3. Download **`google-services.json`** and place it at:
   ```
   android/app/google-services.json
   ```
   (See `android/app/google-services.json.example` for structure.)

### 2. Server (Vercel)

1. Firebase → **Project settings** → **Service accounts** → **Generate new private key**.
2. In Vercel → **Environment variables**, add:
   | Variable | Value |
   |----------|--------|
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | Paste the **entire** JSON file contents (one line is fine) |

Redeploy after adding the env var.

### 3. Supabase

Run in SQL editor:

```sql
-- see supabase_push_tokens.sql in repo root
```

### 4. Rebuild APK

Push only works in the native app (not the mobile browser). After steps 1–3:

```bash
npm run build:mobile
npm run cap:open:android
```

Build APK in Android Studio, copy to `public/downloads/aitoolzmart.apk`, deploy.

### 5. Test

1. Install APK, sign in, allow notifications when prompted.
2. From admin dashboard, send a broadcast or reply to a support ticket for that user.
3. User should get a **system notification** (sound + lock screen) even when the app is closed.

## Build APK (Windows)

1. Admin saves cookies in **Admin → Cookies** (same as today).
2. User taps **Open** on a tool in the app.
3. App calls `GET /api/extension/launch/:toolId` with the user's login token.
4. Server returns **latest cookies + URL** from Supabase.
5. Native WebView applies cookies and loads the real tool site.

The APK only contains the app shell + native browser. **Cookies are never baked into the APK.**

## Build APK (Windows)

**Requirements:** Node.js, Android Studio (with SDK), Java 17.

```bash
npm install
npm run build:mobile
npm run cap:open:android
```

In Android Studio:
1. Wait for Gradle sync
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Copy `android/app/build/outputs/apk/debug/app-debug.apk` to `public/downloads/aitoolzmart.apk`
4. Deploy to Vercel (or set `MOBILE_APK_URL` env var)

Command line (if Gradle works):
```bash
npm run android:apk
```

## Configuration

| Env | Purpose |
|-----|---------|
| `VITE_PORTAL_URL` | Portal origin for bundled APK API calls (default: tools-mart-latest.vercel.app) |
| `CAPACITOR_SERVER_URL` | Override portal URL in Capacitor config |
| `CAPACITOR_USE_BUNDLED=1` | Ship dashboard inside APK instead of loading remote portal |
| `MOBILE_APK_URL` | Download link shown on dashboard (default: `/downloads/aitoolzmart.apk`) |
| `MOBILE_APK_VERSION` | Version label on download button |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service account JSON for FCM push (Vercel server) |

## Architecture

- **Capacitor 6** wraps the portal (`/reseller` by default via remote URL).
- **ToolLauncherPlugin** (Android Java) opens fullscreen WebView with cookie injection.
- **Desktop web + extension** unchanged — mobile path only runs when `Capacitor.isNativePlatform()`.

## User flow

1. Download APK from dashboard → Mobile App
2. Install on Android (enable "Install unknown apps" if prompted)
3. Sign in with Tools-Mart account
4. Tap Open on any assigned tool → opens in-app with admin session
