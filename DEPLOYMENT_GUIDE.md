# Deployment Guide - MyPOS Fullstack

Panduan deployment untuk **Frontend (Vercel)** + **Backend (VPS)**

---

## Arsitektur Deployment

```
┌─────────────────┐         ┌──────────────────┐
│  Vercel (CDN)   │         │   VPS Server     │
│                 │         │                  │
│  React Frontend │ ──────> │  Express API     │
│  (Static Files) │  HTTPS  │  + PostgreSQL    │
└─────────────────┘         └──────────────────┘
```

---

## 📋 Persiapan

### Yang Dibutuhkan:
- ✅ VPS dengan Ubuntu/Debian (minimal 1GB RAM)
- ✅ Domain (opsional, bisa pakai IP VPS)
- ✅ Akun GitHub
- ✅ Akun Vercel (gratis, login pakai GitHub)

---

## 🚀 PART 1: Deploy Backend ke VPS

### Step 1: Persiapan VPS

```bash
# SSH ke VPS
ssh root@YOUR_VPS_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Setup PostgreSQL

```bash
# Login ke PostgreSQL
sudo -u postgres psql

# Buat database dan user (di dalam psql)
CREATE DATABASE mypos_db;
CREATE USER mypos_user WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE mypos_db TO mypos_user;
\q
```

### Step 3: Clone & Setup Backend

```bash
# Clone repository (atau upload via SFTP)
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git mypos
cd mypos/backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
nano .env
```

### Step 4: Configure Backend Environment

Edit file `.env` di VPS:

```bash
# .env di VPS
NODE_ENV=production
PORT=3000

# Database (sesuaikan dengan kredensial PostgreSQL kamu)
DATABASE_URL="postgresql://mypos_user:your_strong_password@localhost:5432/mypos_db"

# JWT Secret (generate random string)
JWT_SECRET=generate_random_string_minimal_32_karakter

# CORS Origin (akan diisi setelah deploy Vercel)
# Untuk sementara isi dengan wildcard dulu
CORS_ORIGIN=*
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 5: Build & Run Backend

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npx prisma migrate deploy

# Build backend
npm run build

# Start dengan PM2
pm2 start dist/server.js --name mypos-backend

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Step 6: Test Backend

```bash
# Check status
pm2 status

# Test API
curl http://localhost:3000/health

# Lihat logs
pm2 logs mypos-backend
```

**Expected response:**
```json
{
  "status": "OK",
  "message": "MyPOS API is running",
  "timestamp": "2024-01-..."
}
```

### Step 7: Setup Firewall (Penting!)

```bash
# Allow port 3000 untuk API
sudo ufw allow 3000/tcp

# Allow SSH (jangan lupa!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

---

## 🌐 PART 2: Deploy Frontend ke Vercel

### Step 1: Push Code ke GitHub

```bash
# Di local machine
cd frontend

# Pastikan vercel.json sudah ada (sudah dibuat otomatis)
# Commit & push
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

### Step 2: Deploy ke Vercel

1. **Buka [Vercel.com](https://vercel.com)** dan login dengan GitHub

2. **Import Repository:**
   - Click "Add New Project"
   - Pilih repository kamu
   - Click "Import"

3. **Configure Project:**
   ```
   Project Name: mypos-frontend (atau terserah kamu)
   Framework Preset: Vite
   Root Directory: frontend  ⚠️ PENTING!
   ```

4. **Environment Variables:**
   - Click "Environment Variables"
   - Tambahkan:
     ```
     Name:  VITE_API_URL
     Value: http://YOUR_VPS_IP:3000/api
     ```

   Contoh: `http://123.456.789.012:3000/api`

5. **Click "Deploy"** dan tunggu beberapa menit

### Step 3: Dapatkan Vercel URL

Setelah deploy selesai, kamu akan dapat URL seperti:
```
https://mypos-frontend-xxxx.vercel.app
```

**Copy URL ini!** Kita perlu update CORS di backend.

---

## 🔗 PART 3: Update CORS Backend

### Update CORS Origin di VPS

```bash
# SSH ke VPS
ssh root@YOUR_VPS_IP

# Edit .env
cd /var/www/mypos/backend
nano .env
```

**Update baris CORS_ORIGIN:**
```bash
# Ganti dari wildcard ke Vercel URL kamu
CORS_ORIGIN=https://mypos-frontend-xxxx.vercel.app
```

**Restart backend:**
```bash
pm2 restart mypos-backend
```

---

## ✅ Testing Deployment

### 1. Test Backend
```bash
curl http://YOUR_VPS_IP:3000/health
```

### 2. Test Frontend
Buka browser ke: `https://your-project.vercel.app`

### 3. Test Full Flow
- Coba login di frontend
- Lihat network tab di browser (F12)
- Pastikan request ke API berhasil (status 200)

---

## 🔧 Troubleshooting

### Frontend tidak bisa connect ke Backend

**Problem:** CORS Error di browser console

**Solution:**
```bash
# Di VPS, pastikan CORS_ORIGIN sudah benar
cat /var/www/mypos/backend/.env | grep CORS_ORIGIN

# Harus match dengan Vercel URL
CORS_ORIGIN=https://your-exact-vercel-url.vercel.app

# Restart backend
pm2 restart mypos-backend
```

### Backend tidak jalan di VPS

**Check logs:**
```bash
pm2 logs mypos-backend --lines 100
```

**Common issues:**
- Database connection gagal → Check DATABASE_URL di .env
- Port sudah dipakai → `sudo lsof -i :3000` untuk check
- Permission error → `sudo chown -R $USER:$USER /var/www/mypos`

### Vercel build failed

**Check:**
1. Environment variable `VITE_API_URL` sudah diset
2. Root Directory = `frontend`
3. Framework = Vite
4. Build command di `package.json` sudah benar

---

## 🎯 Post-Deployment

### Setup SSL untuk Backend (Opsional tapi Recommended)

Jika punya domain:

```bash
# Install Nginx & Certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Configure Nginx as reverse proxy
sudo nano /etc/nginx/sites-available/mypos
```

**Nginx config:**
```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mypos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

**Update Vercel Environment Variable:**
```
VITE_API_URL=https://api.yourdomain.com/api
```

---

## 📊 Monitoring

### PM2 Monitoring
```bash
# Status
pm2 status

# Logs realtime
pm2 logs

# Resource usage
pm2 monit
```

### Database Backup
```bash
# Backup PostgreSQL
pg_dump -U mypos_user mypos_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U mypos_user mypos_db < backup_20240101.sql
```

---

## 💰 Estimasi Biaya

- **VPS:** Rp 50.000 - 200.000/bulan (Vultr, DigitalOcean, Niagahoster)
- **Vercel:** Gratis (Hobby plan)
- **Domain:** Rp 100.000/tahun (opsional)

**Total: ~Rp 50.000 - 200.000/bulan**

---

## 📝 Checklist Deployment

### Backend (VPS)
- [ ] VPS setup & Node.js installed
- [ ] PostgreSQL installed & database created
- [ ] Backend code uploaded
- [ ] `.env` configured dengan DATABASE_URL & JWT_SECRET
- [ ] Prisma migrate & build success
- [ ] PM2 running & auto-restart enabled
- [ ] Firewall configured
- [ ] API accessible via `http://VPS_IP:3000/health`

### Frontend (Vercel)
- [ ] Code pushed ke GitHub
- [ ] Vercel project created
- [ ] Root Directory = `frontend`
- [ ] Environment variable `VITE_API_URL` set
- [ ] Deploy successful
- [ ] Website accessible

### Integration
- [ ] CORS_ORIGIN di backend updated dengan Vercel URL
- [ ] Backend restarted after CORS update
- [ ] Login works dari frontend
- [ ] API calls successful (check Network tab)

---

## 🆘 Need Help?

### Useful Commands

```bash
# VPS Backend
pm2 restart mypos-backend    # Restart backend
pm2 logs mypos-backend        # View logs
pm2 stop mypos-backend        # Stop backend
pm2 delete mypos-backend      # Remove from PM2

# PostgreSQL
sudo systemctl status postgresql   # Check status
sudo systemctl restart postgresql  # Restart
psql -U mypos_user -d mypos_db    # Access database

# Vercel (from CLI)
npm i -g vercel              # Install Vercel CLI
vercel --prod                # Deploy to production
vercel env ls                # List environment variables
```

---

**Deployment Guide v1.0**
Dibuat untuk setup: Frontend (Vercel) + Backend (VPS)
