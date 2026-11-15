# Deploy: GitHub → Hostinger Node.js (ZynexTools)

Keep the **existing Supabase project**. Hostinger only runs the Node web app.

## Hostinger build settings

| Setting | Value |
|---------|--------|
| Type | `nodejs` |
| App type | `express` |
| Node | `22` |
| Build script | `build` |
| Output directory | `dist` |
| Entry file | `dist/server.cjs` |
| Repo | `ZainAli-cyber/Tools-Mart-New` / branch `main` |

`npm start` → `node dist/server.cjs` (Hostinger sets `PORT`).

## Environment variables (Node.js → full replace)

Set before the first successful build (Vite bakes `VITE_*` at build time):

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `VITE_SUPABASE_URL` | Same as live Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_URL` | Same URL |
| `SUPABASE_ANON_KEY` | Same anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for admin writes |
| `APP_URL` | `https://<site>` (temp hostingersite, then `https://www.zynextools.com`) |
| `VITE_PORTAL_URL` | Same as `APP_URL` |

Optional: `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `MOBILE_APK_URL`, `MOBILE_APK_VERSION`.

Do **not** create Hostinger MySQL for Zynex while Supabase is in use.

## Temporary site → real domain

1. Deploy and verify on `https://*.hostingersite.com` (`/api/health`, login, tool open, admin save).
2. Keep Vercel on `www.zynextools.com` until signed off.
3. Add `zynextools.com` / `www` on Hostinger + DNS.
4. Update `APP_URL` + `VITE_PORTAL_URL`, then **rebuild** Node so baked `VITE_*` match.
5. Pause or remove the Vercel project.

## GitHub

hPanel → Git must be connected once so `hosting_deploy` can reach `Tools-Mart-New`.
