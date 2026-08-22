<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3f829afc-f658-467b-bf46-2538625a49bb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase account authentication

Accounts use Supabase Auth, not browser-stored passwords.

1. Copy `.env.example` to `.env` and set the Supabase URL and anon key. The
   service role key is only needed for creating accounts from the admin and
   reseller panels. Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.
2. Open the Supabase SQL Editor, paste the whole of
   `supabase_account_auth_migration.sql`, and run it. This adds the account
   columns, enables role-based RLS, and creates the three portal logins.

   This step cannot be automated from the app. Adding columns requires
   database-owner rights that the anon key does not have, and the project has
   email confirmation enabled, so logins created through the client API stay
   unconfirmed. The SQL marks the seeded logins as confirmed.
3. Verify with `npm run verify:logins`. It should report Admin, Reseller and
   Customer as OK with their Customer IDs.
4. Restart the server with `npm run dev`.

Seeded logins:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@toolsportal.com | admin123 |
| Reseller | arhamresellar@gmail.com | 12345678 |
| Customer | arhamsheikhx5555@gmail.com | 12345678 |

Change these passwords before going live.

The migration enables role-based RLS. Customers can read only their profile,
resellers can access only members they own, and admins can manage all accounts.
