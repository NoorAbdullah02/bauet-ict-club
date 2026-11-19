# BAUET ICT Club — Complete VPS Deployment Guide (উবুন্টু / লিনাক্স ভিপিএস সেটআপ)

> [!NOTE]
> এই গাইডটি অনুসরণ করে তুমি যেকোনো **Ubuntu 22.04 বা 24.04 LTS VPS** (DigitalOcean, Hetzner, Contabo, AWS Lightsail, Linode, ইত্যাদিতে) এই পুরো প্রজেক্টটি খুব সহজে এবং প্রোডাকশন-গ্রেডে ডিপ্লয় করতে পারবে।

---

## ভিপিএস (VPS) এ ডিপ্লয় করার সুবিধা কী?

1. **জিরো কোল্ড স্টার্ট (No 50s Delay):** রেন্ডারের ফ্রি প্ল্যান ১৫ মিনিট পর স্লিপ মোডে চলে যায়। কিন্তু ভিপিএস-এ সাইট ২৪/৭ রিয়েল-টাইমে লাইভ থাকবে।
2. **ফ্রি পোস্টগ্রিস ডেটাবেস:** ভিপিএস-এর ভেতরেই PostgreSQL চালাতে পারবে (Neon-এর লিমিটেশন থাকবে না)।
3. **লোকাল ক্রন জব:** রিমাইন্ডার এবং শিডিউল পোস্টের জন্য আলাদা `cron-job.org` লাগবে না, ভিপিএস ক্রনট্যাব নিজে নিজেই হ্যান্ডেল করবে।
4. **আনলিমিটেড ট্রাফিক ও ব্যান্ডউইথ:** সাধারণ $4-$6/মাসের একটি 2GB RAM ভিপিএস দিয়ে হাজার হাজার স্টুডেন্ট একসাথে স্মুথলি ব্যবহার করতে পারবে।
5. **ফ্রি SSL:** Let's Encrypt দিয়ে অটো-রিনিউয়িং ফ্রি HTTPS সিকিউরিটি।

---

## ধাপ ১: ভিপিএস সার্ভার আপডেট ও প্রয়োজনীয় প্যাকেজ ইনস্টলেশন

তোমার কম্পিউটারের টার্মিনাল থেকে SSH দিয়ে ভিপিএস-এ ঢুকো:
```bash
ssh root@YOUR_SERVER_IP
```

এরপর সিস্টেম আপডেট করো:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx build-essential
```

---

## ধাপ ২: Node.js (v20 বা v22 LTS) ইনস্টলেশন

NodeSource অফিসিয়াল স্ক্রিপ্ট দিয়ে Node.js ইনস্টল করো:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ইনস্টল ঠিক আছে কিনা চেক করো:
node -v
npm -v
```

প্রসেস ম্যানেজার **PM2** ইনস্টল করো (যা সার্ভার ক্র্যাশ করলে নিজে নিজে রিস্টার্ট করবে):
```bash
sudo npm install -g pm2
```

---

## ধাপ ৩: PostgreSQL ডেটাবেস সেটআপ

তুমি চাইলে তোমার বর্তমান **Neon DB** ব্যবহার করতে পারো (শুধু `.env`-এ `DATABASE_URL` বসিয়ে দিলেই হবে)। 
অথবা ভিপিএস-এর নিজস্ব লোকাল PostgreSQL ব্যবহার করতে পারো:

```bash
# PostgreSQL ইনস্টল:
sudo apt install -y postgresql postgresql-contrib

# Postgres সার্ভিসে ঢোকা:
sudo -u postgres psql
```

Postgres কনসোলের ভেতরে নিচের কমান্ডগুলো দাও:
```sql
CREATE DATABASE bauet_ict_club;
CREATE USER ict_admin WITH ENCRYPTED PASSWORD 'TomarStrongPassword123';
GRANT ALL PRIVILEGES ON DATABASE bauet_ict_club TO ict_admin;
ALTER DATABASE bauet_ict_club OWNER TO ict_admin;
\q
```

---

## ধাপ ৪: প্রজেক্ট ক্লোন ও ডিপেন্ডেন্সি ইনস্টল

```bash
# প্রোডাকশন ডিরেক্টরিতে প্রজেক্ট নেওয়া:
cd /var/www
git clone https://github.com/NoorAbdullah02/bauet-ict-club.git
cd bauet-ict-club

# সব ডিপেন্ডেন্সি ইনস্টল:
npm install
```

---

## ধাপ ৫: পরিবেশ ভেরিয়েবল (.env) ফাইল তৈরি

```bash
cp .env.example .env
nano .env
```

নিচের মতো করে মানগুলো সেট করো:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://ict_admin:TomarStrongPassword123@localhost:5432/bauet_ict_club
JWT_SECRET=super_strong_random_secret_32_chars_minimum
ADMIN_PASSWORD=YourAdminPassword2026
PUBLIC_URL=https://your-domain.com

# অপশনাল (Brevo ইমেইল, Cloudinary ফটো এবং Groq AI এর কি)
CLOUDINARY_CLOUD_NAME=dj2orxdkg
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
MAIL_FROM=ictclubbauet@gmail.com
ADMIN_NOTIFY_EMAIL=ictclubbauet@gmail.com
GROQ_API_KEY=...
```
`Ctrl + O`, `Enter` দিয়ে সেভ করো, তারপর `Ctrl + X` দিয়ে বের হও।

---

## ধাপ ৬: ডেটাবেস ইনিশিয়ালাইজ ও ফ্রন্টএন্ড বিল্ড

```bash
# ডেটাবেস টেবিল ও ইনিশিয়াল অ্যাডমিন তৈরি:
npm run db:init

# প্রোডাকশন ক্লায়েন্ট ফ্রন্টএন্ড বিল্ড:
npm run build
```

---

## ধাপ ৭: PM2 দিয়ে ব্যাকএন্ড সার্ভার চালু করা

```bash
# ব্যাকএন্ড রান করা:
pm2 start server/index.js --name "bauet-ict-club"

# সার্ভার রিবুট হলেও যেন নিজে নিজে চালু হয়:
pm2 save
pm2 startup
```
(টার্মিনালে `pm2 startup` যে কমান্ডটা কপি করতে বলবে, সেটা রান করে দেবে)।

---

## ধাপ ৮: Nginx রিভার্স প্রক্সি কনফিগারেশন

```bash
sudo nano /etc/nginx/sites-available/bauet-ict-club
```

নিচের কনফিগারেশনটি পেস্ট করো (তোমার ডোমেইন নাম দিয়ে `your-domain.com` রিপ্লেস করো):
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 20M;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

কনফিগারেশন এনাবল করো:
```bash
sudo ln -s /etc/nginx/sites-available/bauet-ict-club /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ধাপ ৯: ফ্রি SSL (HTTPS) সার্টিফিকেট অ্যাক্টিভেশন

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
নির্দেশনা অনুযায়ী তোমার ইমেইল দেবে এবং শর্তাবলি Agree (`Y`) করবে। Certbot নিজে নিজেই Nginx এ HTTPS কনফিগার করে দেবে এবং অটো-রিনিউয়িং সেট করে দেবে!

---

## ধাপ ১০: ভিপিএস ফায়ারওয়াল (UFW) সেটআপ

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## ধাপ ১১: স্বয়ংক্রিয় ব্যাকআপ ও শিডিউল জবস (Cron)

ভিপিএস-এ প্রতি ১৫ মিনিট পর পর ইভেন্ট রিমাইন্ডার এবং জব সিন্ক চালাতে:
```bash
crontab -e
```
একদম নিচে যোগ করো:
```bash
*/15 * * * * curl -s http://127.0.0.1:5000/api/jobs/run?key=YOUR_CRON_SECRET > /dev/null
```

---

## পরবর্তী সময়ে নতুন কোড আপডেট দেওয়ার ১-লাইন কমান্ড

ভবিষ্যতে যখনই তুমি গিটহাবে নতুন কোড পুশ করবে, ভিপিএস-এ এসে শুধু এই স্ক্রিপ্ট চালাবে:
```bash
cd /var/www/bauet-ict-club && git pull origin master && npm --prefix client run build && pm2 reload bauet-ict-club
```
পুরো সাইট ০ সেকেন্ড ডাউনটাইম সহ সাথে সাথে আপডেট হয়ে যাবে! 🎉
