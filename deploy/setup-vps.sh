#!/usr/bin/env bash
set -e

# ==============================================================================
#  BAUET ICT Club — 1-Click VPS Production Setup
#  Tested on Ubuntu 22.04 / 24.04 (Oracle Cloud Always Free / Azure VM / Debian)
# ==============================================================================

echo "=================================================="
echo "  🚀 BAUET ICT Club — Automated VPS Deployment"
echo "=================================================="

# Check root or sudo
if [ "$EUID" -ne 0 ]; then
  SUDO="sudo"
else
  SUDO=""
fi

# Update packages and install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker and Docker Compose..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y ca-certificates curl gnupg lsb-release
  $SUDO mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
  $SUDO apt-get update -y
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  $SUDO systemctl enable docker
  $SUDO systemctl start docker
  echo "✅ Docker installed successfully."
fi

# Setup .env file if missing
if [ ! -f .env ]; then
  echo "📝 Generating production .env configuration..."
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
  DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || date +%s%N | head -c 16)
  
  cat <<EOF > .env
NODE_ENV=production
PORT=5000
PUBLIC_URL=https://bauetictclub.eu.org
TRUST_PROXY=1

# Database
POSTGRES_USER=bauet_admin
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=bauet_ict_club

# Security
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=BauetIct2026!

# Telegram Bot (Optional, add your tokens here)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Email & Cloudinary (Optional)
BREVO_API_KEY=
MAIL_FROM=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EOF
  echo "✅ Created .env with generated JWT secret and database password."
fi

# Open firewall ports if ufw is active
if command -v ufw &> /dev/null; then
  if $SUDO ufw status | grep -q "active"; then
    echo "🛡️ Opening ports 80, 443 in firewall..."
    $SUDO ufw allow 80/tcp || true
    $SUDO ufw allow 443/tcp || true
  fi
fi

# Build and start services
echo "🚢 Starting Docker containers..."
$SUDO docker compose build
$SUDO docker compose up -d

echo ""
echo "=================================================="
echo "  🎉 BAUET ICT Club is LIVE on this VPS!"
echo "=================================================="
echo "• Web App & API: Running on port 80/443"
echo "• Database: PostgreSQL 16 (internal docker network)"
echo "• Admin Username: admin"
echo "• Check status: docker compose ps"
echo "• View live logs: docker compose logs -f web"
echo "=================================================="
