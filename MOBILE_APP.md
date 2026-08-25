# AI Toolz Mart — Android Mobile App

One-tap tool access for mobile users (no Chrome extension).

## Ready to build APK

When you see this checklist complete, open Android Studio and build:

- [x] Website logo on splash + app icon + dashboard header
- [x] Brand colors (#0d0908 background, #DC2626 red accents)
- [x] Live support chat (same ChatBotWidget as website)
- [x] Support tickets inbox in app
- [x] Bottom navigation: Home · Tools · Chat · Tickets · Profile
- [x] Tools open in native in-app browser with fresh admin cookies

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

## Architecture

- **Capacitor 6** wraps the portal (`/reseller` by default via remote URL).
- **ToolLauncherPlugin** (Android Java) opens fullscreen WebView with cookie injection.
- **Desktop web + extension** unchanged — mobile path only runs when `Capacitor.isNativePlatform()`.

## User flow

1. Download APK from dashboard → Mobile App
2. Install on Android (enable "Install unknown apps" if prompted)
3. Sign in with Tools-Mart account
4. Tap Open on any assigned tool → opens in-app with admin session
