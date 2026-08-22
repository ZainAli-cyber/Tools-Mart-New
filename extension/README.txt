AI TOOLZ MART ACCESS — VERSION 1.3.0

INSTALL
1. Extract this ZIP to a permanent folder.
2. Open chrome://extensions or edge://extensions.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the folder containing manifest.json.
6. Open the extension and sign in with your Tools-Mart account.
7. If you already had an older version loaded, remove it and load this folder again (or click Reload on chrome://extensions).

WHAT'S NEW (1.3)
- Panel unlock for *.toolaccess.click: temporary Referer (and Origin when allowed)
  rewrite via declarativeNetRequest when admin sets Panel unlock referrer.
- Still applies admin cookie JSON (dual-write on toolaccess hosts) before open.
- Real-domain tools (e.g. ChatGPT) are unchanged — no Referer spoof unless configured.

SECURITY
- This extension does not contain or inject shared tool passwords or cookies in the package.
- Your password is sent only to the Portal URL you configure and is not saved.
- Supabase access and refresh tokens are kept in Chrome extension storage.
- Access is determined by your plan, expiry, status, and assigned tools.
- For tools set to On one click, the portal asks the extension to apply session cookies
  (and optional unlock Referer) to the destination, then open the URL.
  Cookie JSON is stored in the database, not in this package.
- toolaccess.click destinations require this extension (cookies + Referer unlock).

HONESTY
- Unlock works when the panel checks Referer/Origin and/or session cookies.
- If the panel only accepts signed tokens from Pak SEO login, admin must paste
  cookies copied from an already unlocked toolaccess session, plus set unlock referrer.

MOBILE
Standard Chrome on Android and iPhone does not support unpacked extensions.
Use desktop Chrome or Microsoft Edge.
