# BAUET ICT Club — Oracle Cloud Free Tier (Always Free) & VPS Deployment

This guide deploys the full BAUET ICT Club platform (React client + Node.js API + PostgreSQL 16 + Nginx) on **Oracle Cloud Infrastructure (OCI) Always Free** (Ubuntu 22.04 / 24.04, both **AMD `VM.Standard.E2.1.Micro` 1 GB RAM** and **ARM64 Ampere `VM.Standard.A1.Flex`**) or any Linux VPS.

---

## Step 1: Open Ports 80 & 443 in Oracle Cloud Console (Required Once)

Oracle VMs block web traffic at the cloud network firewall until you add Ingress Rules:
1. Open **Oracle Cloud Console → Networking → Virtual Cloud Networks → your VCN → Subnets → Default Security List**.
2. Click **Add Ingress Rules** and add two rules:
   - **Rule 1 (HTTP):** Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port `80`
   - **Rule 2 (HTTPS):** Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port `443`

---

## Step 2: 1-Command Automated Install on the Oracle VM

SSH into your Oracle Ubuntu VM (`ssh ubuntu@YOUR_ORACLE_PUBLIC_IP`) and run:

```bash
git clone https://github.com/NoorAbdullah02/bauet-ict-club.git
cd bauet-ict-club
chmod +x deploy/setup-vps.sh
./deploy/setup-vps.sh
```

What `setup-vps.sh` handles automatically for Oracle Free Server:
1. **Low-RAM protection (E2.1.Micro):** Automatically creates a 2 GB `/swapfile` if RAM < 2.2 GB so the frontend production build never hits Out-of-Memory.
2. **Docker + Multi-Arch:** Installs Docker and builds natively on both Oracle **ARM64 (`aarch64`)** and **AMD64 (`x86_64`)**.
3. **Oracle `iptables` + `ufw`:** Inserts persistent `ACCEPT` rules for ports 80 and 443 ahead of Oracle Ubuntu's default `REJECT` rule.
4. **Environment & Secrets:** Creates `.env` with auto-generated `JWT_SECRET`, `POSTGRES_PASSWORD`, `CRON_SECRET`, and detects your server IP for `PUBLIC_URL`. *(Note: When `PUBLIC_URL` starts with `http://`, the server automatically disables forced HTTPS-upgrade headers so raw-IP access works immediately before you add a domain.)*
5. **Automatic Cron:** Registers a local 15-minute cron job calling `/api/jobs/run` for event reminders, scheduled publishing, remote jobs sync, and Telegram backups.

---

## Step 3: Attach Domain (`bauetictclub.eu.org`) & HTTPS

1. In Cloudflare DNS:
   - **A record:** `@` → `YOUR_ORACLE_PUBLIC_IP` (Proxied)
   - **CNAME record:** `www` → `bauetictclub.eu.org` (Proxied)
   - Cloudflare **SSL/TLS → Overview**: set mode to **Full** (or **Full (strict)** after issuing Let's Encrypt cert via Certbot).
2. Update `.env` on the server:
   ```env
   PUBLIC_URL=https://bauetictclub.eu.org
   ```
   Then restart web:
   ```bash
   docker compose up -d web
   ```

---

## Step 4: Point the Flutter Android App to Oracle Server

Update `app/env.production.json`:
```json
{
  "API_URL": "https://bauetictclub.eu.org/api"
}
```
*(Or while testing on IP before adding a domain, pass `--dart-define=API_URL=http://YOUR_ORACLE_IP/api` — `AndroidManifest.xml` already permits cleartext HTTP for setup testing.)*

Build release APKs:
```bash
cd app
flutter build apk --release --split-per-abi --dart-define-from-file=env.production.json
```

---

## Useful Operations

```bash
# Container status & health
docker compose ps

# Live logs
docker compose logs -f web

# Update to latest GitHub code with minimal downtime
git pull origin master
docker compose build web
docker compose up -d web

# Update .env and reload
docker compose up -d web
```