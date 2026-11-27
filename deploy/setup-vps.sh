#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
#  BAUET ICT Club — 1-Click Oracle Cloud Free Tier & Linux VPS Setup
#  Tested on Ubuntu 22.04 / 24.04 (Oracle Always Free AMD Micro & ARM64 Ampere)
# ==============================================================================

echo "=================================================="
echo "  BAUET ICT Club — Oracle Free Server / VPS Setup"
echo "=================================================="

if [ "$EUID" -ne 0 ]; then
  SUDO="sudo"
else
  SUDO=""
fi

# 1. Ensure >= 2 GB swap on low-RAM VMs (Oracle E2.1.Micro 1 GB RAM needs swap for Vite build)
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
TOTAL_SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
if [ "${TOTAL_RAM_MB:-0}" -lt 2200 ] && [ "${TOTAL_SWAP_MB:-0}" -lt 1024 ] && [ ! -f /swapfile ]; then
  echo "Detected ${TOTAL_RAM_MB}MB RAM with low swap; creating 2GB /swapfile for safe builds..."
  $SUDO fallocate -l 2G /swapfile 2>/dev/null || $SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  $SUDO chmod 600 /swapfile
  $SUDO mkswap /swapfile >/dev/null
  $SUDO swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab >/dev/null
  fi
  echo "Swap enabled (2GB)."
fi

# 2. Install Docker & Docker Compose plugin + curl (supports both amd64 and Oracle Ampere arm64)
if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker and Docker Compose..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y ca-certificates curl gnupg lsb-release
  $SUDO mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt-get update -y
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  $SUDO systemctl enable docker
  $SUDO systemctl start docker
  echo "Docker installed."
fi

# 3. Generate production .env if missing
PUBLIC_IP=$(curl -fsS --max-time 4 https://checkip.amazonaws.com 2>/dev/null || curl -fsS --max-time 4 https://api.ipify.org 2>/dev/null || echo "")
DEFAULT_PUBLIC_URL="${PUBLIC_URL:-}"
if [ -z "$DEFAULT_PUBLIC_URL" ]; then
  if [ -n "$PUBLIC_IP" ]; then
    DEFAULT_PUBLIC_URL="http://${PUBLIC_IP}"
  else
    DEFAULT_PUBLIC_URL="https://bauetictclub.eu.org"
  fi
fi

if [ ! -f .env ]; then
  echo "Generating production .env (PUBLIC_URL=${DEFAULT_PUBLIC_URL})..."
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
  DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || date +%s%N | head -c 16)
  CRON_SECRET=$(openssl rand -hex 24 2>/dev/null || date +%s%N | sha256sum | head -c 48)
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-BauetIct2026!}"

  cat <<EOF > .env
NODE_ENV=production
PORT=5000
PUBLIC_URL=${DEFAULT_PUBLIC_URL}
CORS_ORIGINS=
TRUST_PROXY=1

# Database (uses built-in Postgres container by default; set DATABASE_URL to override with Neon/external DB)
POSTGRES_USER=bauet_admin
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=bauet_ict_club

# Security
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
CRON_SECRET=${CRON_SECRET}

# AI Assistant (Groq) & Email (Brevo)
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
BREVO_API_KEY=
MAIL_FROM=
ADMIN_NOTIFY_EMAIL=

# Cloudinary Image Storage (leave blank to store on server disk volume)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Telegram / Discord Alerts
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=

# Phone Push Notifications (optional)
FIREBASE_SERVICE_ACCOUNT=
PUSH_ENABLED=
EOF
  chmod 600 .env
  echo "Created .env cleanly."
fi

# Read CRON_SECRET and PUBLIC_URL from .env safely
ENV_CRON_SECRET=$(grep -E '^CRON_SECRET=' .env | cut -d= -f2- | tr -d '\r' || true)
ENV_PUBLIC_URL=$(grep -E '^PUBLIC_URL=' .env | cut -d= -f2- | tr -d '\r' || true)

# 4. Open ports 80 & 443 in UFW AND Oracle Ubuntu default iptables
if command -v ufw >/dev/null 2>&1 && $SUDO ufw status | grep -q "active"; then
  echo "Opening ports 80 and 443 in UFW..."
  $SUDO ufw allow 80/tcp || true
  $SUDO ufw allow 443/tcp || true
fi

if command -v iptables >/dev/null 2>&1; then
  # Oracle Cloud Ubuntu images enforce a default INPUT REJECT rule in iptables even when UFW is off.
  if $SUDO iptables -C INPUT -j REJECT --reject-with icmp-host-prohibited 2>/dev/null || [ -f /etc/iptables/rules.v4 ]; then
    echo "Configuring Oracle iptables rules for HTTP (80) and HTTPS (443)..."
    $SUDO iptables -C INPUT -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
      $SUDO iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
      $SUDO iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
    $SUDO iptables -C INPUT -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || \
      $SUDO iptables -I INPUT 5 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || \
      $SUDO iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
    if command -v netfilter-persistent >/dev/null 2>&1; then
      $SUDO netfilter-persistent save >/dev/null 2>&1 || true
    elif [ -d /etc/iptables ]; then
      $SUDO iptables-save | $SUDO tee /etc/iptables/rules.v4 >/dev/null || true
    fi
  fi
fi

# 5. Schedule background jobs locally every 15 minutes (event reminders, scheduled posts, daily Telegram backup)
if [ -n "$ENV_CRON_SECRET" ] && command -v crontab >/dev/null 2>&1; then
  CRON_JOB="*/15 * * * * curl -fsS \"http://127.0.0.1/api/jobs/run?key=${ENV_CRON_SECRET}\" >/dev/null 2>&1"
  EXISTING_CRON=$($SUDO crontab -l 2>/dev/null || true)
  CLEAN_CRON=$(printf '%s\n' "$EXISTING_CRON" | grep -v '/api/jobs/run' || true)
  printf '%s\n%s\n' "$CLEAN_CRON" "$CRON_JOB" | sed '/^$/d' | $SUDO crontab -
  echo "Installed 15-minute cron schedule for reminders and backups."
fi

# 6. Build and launch stack
echo "Building and starting Docker containers..."
$SUDO docker compose build
$SUDO docker compose up -d

FINAL_URL="${ENV_PUBLIC_URL:-http://${PUBLIC_IP:-localhost}}"
echo ""
echo "=================================================="
echo "  BAUET ICT Club is LIVE on this server!"
echo "=================================================="
echo "• Site & Admin URL   : ${FINAL_URL} (Admin: ${FINAL_URL}/admin)"
echo "• Admin Username     : admin"
echo "• Database           : PostgreSQL 16 (Docker volume postgres_data)"
echo "• Oracle Console     : Ensure OCI VCN Security List allows Ingress TCP 80 & 443 from 0.0.0.0/0"
echo "• Flutter APK Build  : cd app && flutter build apk --release --split-per-abi --dart-define=API_URL=${FINAL_URL}/api"
echo "• Logs & Status      : docker compose ps && docker compose logs -f web"
echo "=================================================="