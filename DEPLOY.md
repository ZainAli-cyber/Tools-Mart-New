# Deploy: GitHub → Vercel (ZynexTools)

## One-time: Supabase SQL
Run all `supabase_*.sql` files on your Supabase project (see project README).

## GitHub
```powershell
cd C:\Users\za413\Downloads\tools-mart
git add -A
git commit -m "Update"
git push origin main
```

## Environment variables

### Local development (`npm run dev`)
Copy `.env.example` → `.env` and fill in values. Restart the dev server after edits.

### Vercel Production (required for live site)
Set these under **Project → Settings → Environment Variables → Production**, then **Redeploy**:

| Variable | Used for |
|----------|----------|
| `VITE_SUPABASE_URL` | Browser login + portal |
| `VITE_SUPABASE_ANON_KEY` | Browser login + portal |
| `SUPABASE_URL` | API routes (same URL as above) |
| `SUPABASE_ANON_KEY` | API auth + tool launch |
| `SUPABASE_SERVICE_ROLE_KEY` | **Admin writes** — cookie save, orders, device limits, settings |
| `APP_URL` | `https://www.zynextools.com` |
| `VITE_PORTAL_URL` | `https://www.zynextools.com` |
| `GEMINI_API_KEY` | AI tools (optional) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Push notifications (optional) |

**Important**
- `.env` on your PC only affects **local** dev — not www.zynextools.com.
- The app ships with **built-in Supabase URL + anon key** so members can **log in and launch tools** even if Vercel env is incomplete.
- **`SUPABASE_SERVICE_ROLE_KEY` is still required on Vercel** for admin actions (Cookies save, Orders approve, Device limits toggle). Without it, the member site may work but admin panel writes fail.

Never commit `.env` or paste `service_role` into GitHub.

## Test after deploy
- `https://www.zynextools.com/api/health` → `{ "status": "ok" }`
- Member login → open a tool (e.g. ChatGPT) — should not show “Supabase authentication is not configured”
- Admin → Cookies → Save — should succeed after service role key is set

## Live updates
Edit code → `git push` → Vercel auto-redeploys (when GitHub is connected).

## Android APK
Website/API updates apply immediately. Rebuild the APK only when native Android code changes.
