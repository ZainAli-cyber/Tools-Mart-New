# Deploy: GitHub → Vercel (AI TOOLZ MART)

## One-time: Supabase SQL
Run all `supabase_*.sql` files on your Supabase project (see project README).

## GitHub
```powershell
cd C:\Users\za413\Downloads\tools-mart
git add -A
git commit -m "Update"
git push origin main
```

## Vercel env vars (Production)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

After changing `VITE_*`, redeploy on Vercel.

## Test after deploy
`https://YOUR-APP.vercel.app/api/health` → JSON `{ "status": "ok" }`

## Live updates
Edit code → `git push` → Vercel auto-redeploys (when GitHub is connected).
