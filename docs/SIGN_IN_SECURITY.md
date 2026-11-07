# Sign-in security

What protects the admin console, and what to do when something goes wrong.

## What is in place
- **Passwords** are stored with bcrypt (cost 12). New passwords need 6+ characters, a mix of letters and numbers or symbols, no common passwords, and must not contain the username.
- **Two-step sign-in (optional, recommended):** Admin → Settings → *Two-step sign-in*. Scan the QR code with Google Authenticator, Microsoft Authenticator or Authy, type the 6-digit code, and save the 8 one-time backup codes. The secret is stored encrypted (AES-256-GCM, key derived from `JWT_SECRET`), so **do not change `JWT_SECRET` after turning 2FA on** (everyone would need a backup code, or `npm run admin:reset` plus a database edit, to get back in).
- **Lockout:** 5 wrong passwords or codes lock that account for 5 minutes (any IP). On top of that, 40 failed attempts per IP per 5 minutes are refused. The first admin is called `ICT-Club` (set `ADMIN_USERNAME` to use another name).
- **Sessions:** a token lasts 12 hours and is checked against the database on every request. Deleting a login, changing its role, changing the password or pressing *Sign out other devices* ends old sessions immediately.
- **Headers and transport:** strict Content-Security-Policy, HSTS, `frame-ancestors 'none'`, CORS limited to your own origin, rate limits on the API, request-size limits.
- **Activity log:** every change made while signed in is recorded for 180 days (Admin → Activity).

## If someone loses their phone
Use a backup code on the sign-in page (each works once). If the backup codes are gone too, the main admin can reset the password with `npm run admin:reset`, then turn two-step off in the database:

```sql
UPDATE admins SET totp_enabled = FALSE, totp_secret = NULL, backup_codes = NULL, token_version = token_version + 1 WHERE username = 'admin';
```

## Keys and secrets
- Never commit `.env`. It is git-ignored; only `.env.example` is in the repository.
- If a key was ever shared in chat or email, create a new one (Neon, Brevo, Cloudinary, Groq) and update it in Render → Environment.
