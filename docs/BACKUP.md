# Backups

**By hand:** Admin -> Security -> Download full backup (main admin only). One ZIP, one JSON file per table.

**Automatic (weekly, free):** GitHub Actions "Weekly backup" runs every Monday 03:30 Bangladesh time. Setup once:
1. GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret:
   - `BACKUP_DATABASE_URL` = the Neon connection string
   - `BACKUP_PASSPHRASE` = a long phrase only you know (write it down: without it the backup cannot be opened)
2. Actions -> Weekly backup -> Run workflow (to try it once).
3. Download: repo -> **Releases** -> the newest `backup-...` -> the `.tar.gz.enc` file (the 12 newest are kept).

If the run says **"this database has no tables"**, the secret `BACKUP_DATABASE_URL` points at the wrong database: copy the exact `DATABASE_URL` value from Render -> Environment and save the secret again.

**Open a backup:**
```bash
openssl enc -d -aes-256-cbc -pbkdf2 -in bauet-backup.tar.gz.enc | tar -xz
```
It asks for the passphrase (typing it there keeps it out of your shell history).

Not inside: pictures (they stay on Cloudinary), password hashes, 2FA secrets, phone push tokens.
