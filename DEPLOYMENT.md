# 🚀 MyPOS - Panduan Deployment ke VPS

## Level Kekacauan: 3/10 ⭐⭐⭐  
**Project ini SUDAH SIAP production!** Tinggal ikuti step by step.

---

## 📋 Yang Sudah Disiapkan:

✅ Root `package.json` dengan build scripts  
✅ Backend serve frontend build di production  
✅ CORS configuration untuk production  
✅ `.env.example` template  
✅ Prisma migrations ready  
✅ Image upload dengan multer  

---

## 🛠️ Setup VPS

### 1. Install Dependencies
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Nginx & PM2
sudo apt install nginx -y
sudo npm install -g pm2
```

### 2. Clone Repository
```bash
cd /var/www
git clone https://github.com/username/mypos.git
cd mypos
npm run install:all
```

### 3. Setup Database
```bash
sudo -u postgres psql
CREATE DATABASE mypos_db;
CREATE USER mypos_user WITH PASSWORD 'secure_password';
GRANT ALL ON DATABASE mypos_db TO mypos_user;
\q
```

### 4. Configure Environment
```bash
cd backend
cp .env.example .env
nano .env
```

Edit:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://mypos_user:secure_password@localhost:5432/mypos_db"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CORS_ORIGIN=https://yourdomain.com
```

### 5. Build & Migrate
```bash
npm run build
npm run prisma:migrate
cd backend && npm run create:admin
```

### 6. Start with PM2
```bash
pm2 start backend/dist/server.js --name mypos-api
pm2 save
pm2 startup
```

### 7. Nginx Config
```bash
sudo nano /etc/nginx/sites-available/mypos
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mypos /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### 8. SSL (Optional)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

## 🔄 Update Deployment

```bash
cd /var/www/mypos
git pull
npm run install:all
npm run build
npm run prisma:migrate
pm2 restart mypos-api
```

---

## 📝 Checklist

- [ ] VPS ready (Ubuntu 20.04+)
- [ ] PostgreSQL installed & database created
- [ ] Environment variables configured
- [ ] Project built successfully
- [ ] PM2 running
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Test: Login works
- [ ] Test: Transaction works
- [ ] Test: Image upload works

---

**Selesai!** Access: https://yourdomain.com 🎉
