# 🚀 BAUET ICT Club — VPS Deployment Guide

This guide explains how to deploy the entire BAUET ICT Club platform (Node.js + PostgreSQL 16 + Nginx) onto any Linux VPS (Oracle Cloud Always Free, Microsoft Azure for Students, DigitalOcean, Hetzner, etc.) using Docker Compose.

---

## 1-Minute Automated Deployment

### Step 1: Clone the repository on your VPS
```bash
git clone https://github.com/NoorAbdullah02/bauet-ict-club.git
cd bauet-ict-club
```

### Step 2: Run the automated setup script
```bash
chmod +x deploy/setup-vps.sh
./deploy/setup-vps.sh
```

The script will automatically:
1. Install Docker and Docker Compose plugin (if not already installed).
2. Generate a secure `.env` file with random JWT secrets and database credentials.
3. Open ports 80 and 443 in `ufw` firewall.
4. Build the client, set up PostgreSQL 16, and start Nginx reverse proxy.

---

## Useful Docker Commands

```bash
# Check running containers
docker compose ps

# View live application logs
docker compose logs -f web

# Restart all services
docker compose restart

# Update code to latest version
git pull origin master
docker compose build web
docker compose up -d web
```

---

## Cloudflare & Custom Domain Setup (`bauetictclub.eu.org`)

1. In Cloudflare DNS, add an **A record**:
   - Name: `@` (or `bauetictclub.eu.org`)
   - IPv4 address: `YOUR_VPS_PUBLIC_IP`
   - Proxy status: **Proxied (Orange Cloud)**
2. Add a CNAME record:
   - Name: `www`
   - Target: `bauetictclub.eu.org`
   - Proxy status: **Proxied (Orange Cloud)**
3. In Cloudflare SSL/TLS settings, set SSL mode to **Full** or **Flexible**.
