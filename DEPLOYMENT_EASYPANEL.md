# Deployment Guide - EasyPanel + Vercel

Panduan deployment modern untuk **Frontend (Vercel)** + **Backend (EasyPanel/Docker)**

---

## 🎯 Arsitektur Deployment

```
┌──────────────────┐         ┌─────────────────────────┐
│  Vercel (CDN)    │         │   EasyPanel (Docker)    │
│                  │         │                         │
│  React Frontend  │ ──────> │  Backend API Container  │
│  (Static Files)  │  HTTPS  │  + PostgreSQL Database  │
└──────────────────┘         └─────────────────────────┘
     Global CDN                    Onidel Cloud SG
                                   (Ubuntu 24.04)
```

---

## ✨ Keunggulan Setup Ini

✅ **No SSH Required** - Semua via web dashboard
✅ **Docker Containerized** - Isolated & reproducible
✅ **Auto SSL/HTTPS** - Let's Encrypt built-in
✅ **Easy Scaling** - Increase resources via UI
✅ **Built-in Monitoring** - CPU, RAM, disk usage
✅ **Automated Backups** - Database backup via panel
✅ **Zero Downtime** - EasyPanel handles deployments

---

## 📋 Persiapan

### Yang Dibutuhkan:
- ✅ EasyPanel dashboard access
- ✅ Domain (optional, EasyPanel provides subdomain)
- ✅ GitHub account & repository
- ✅ Vercel account (gratis, login via GitHub)

---

## 🚀 PART 1: Deploy Backend ke EasyPanel

### Step 1: Persiapan Repository

**Di local machine, pastikan files ini ada:**
```bash
backend/
  ├── Dockerfile          ✅ (sudah dibuat)
  ├── .dockerignore       ✅ (sudah dibuat)
  ├── .env.example        ✅ (template)
  ├── package.json
  ├── prisma/
  └── src/
```

**Commit & push ke GitHub:**
```bash
git add .
git commit -m "Add Docker configuration for EasyPanel"
git push origin main
```

### Step 2: Create PostgreSQL Database di EasyPanel

1. **Login ke EasyPanel Dashboard**
   - URL: `https://your-easypanel-url.com`

2. **Create New Service → Database**
   - Type: **PostgreSQL**
   - Name: `mypos-db`
   - Version: `16` (latest stable)
   - Username: `mypos_user` (atau custom)
   - Password: Generate strong password
   - Database: `mypos_db`

3. **Save & Deploy**
   - EasyPanel akan create container PostgreSQL
   - Catat **connection string** (akan muncul di dashboard)

**Format connection string:**
```
postgresql://mypos_user:PASSWORD@postgres-mypos-db:5432/mypos_db
```

> **Note:** `postgres-mypos-db` adalah internal Docker network name

### Step 3: Deploy Backend Application

1. **Create New Service → App**
   - Name: `mypos-backend`
   - Type: **Git Source** (GitHub)

2. **Connect GitHub Repository**
   - Repository: `your-username/your-repo`
   - Branch: `main`
   - Build Path: `/backend` ⚠️ **PENTING!**

3. **Build Configuration**
   - Build Method: **Dockerfile** (auto-detected)
   - Dockerfile Path: `./Dockerfile` (default)
   - Port: `3000`

4. **Environment Variables** (via UI)

   Click "Environment" tab dan tambahkan:

   | Key | Value | Notes |
   |-----|-------|-------|
   | `NODE_ENV` | `production` | |
   | `PORT` | `3000` | Internal port |
   | `DATABASE_URL` | `postgresql://mypos_user:PASSWORD@postgres-mypos-db:5432/mypos_db` | Copy from DB service |
   | `JWT_SECRET` | *(generate random)* | Use password generator |
   | `CORS_ORIGIN` | `*` | Update after Vercel deploy |

   **Generate JWT Secret:**
   ```bash
   # Di local terminal
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. **Domain Configuration** (Optional)
   - EasyPanel akan provide subdomain: `mypos-backend.easypanel.host`
   - Atau add custom domain via "Domains" tab

6. **Deploy!**
   - Click "Deploy" button
   - EasyPanel will:
     - Pull dari GitHub
     - Build Docker image
     - Run Prisma migrations
     - Start container
     - Setup reverse proxy + SSL

### Step 4: Run Database Migrations

**Option 1: Via EasyPanel Terminal**

1. Go to service `mypos-backend`
2. Click "Terminal" tab
3. Run commands:
   ```bash
   npx prisma migrate deploy
   ```

**Option 2: Via Initial Deploy Hook**

Add to `package.json`:
```json
{
  "scripts": {
    "start": "npx prisma migrate deploy && node dist/server.js"
  }
}
```

### Step 5: Verify Backend Deployment

1. **Check Logs**
   - Go to service → "Logs" tab
   - Look for: `🚀 MyPOS API Server running on port 3000`

2. **Test Health Endpoint**
   - Copy service URL dari dashboard
   - Test: `https://mypos-backend.yourdomain.com/health`

   **Expected response:**
   ```json
   {
     "status": "OK",
     "message": "MyPOS API is running",
     "timestamp": "2024-..."
   }
   ```

3. **Check Metrics**
   - Go to "Metrics" tab
   - Verify CPU/RAM usage normal
   - Check database connections

---

## 🌐 PART 2: Deploy Frontend ke Vercel

### Step 1: Push Code ke GitHub

```bash
# Di local machine
cd frontend

# Pastikan vercel.json ada
ls vercel.json  # ✅ should exist

# Commit & push
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Deploy ke Vercel

1. **Buka [Vercel.com](https://vercel.com)** dan login dengan GitHub

2. **Import Repository:**
   - Click "Add New Project"
   - Select repository: `your-repo`
   - Click "Import"

3. **Configure Project:**
   ```
   Project Name:     mypos-frontend
   Framework Preset: Vite
   Root Directory:   frontend  ⚠️ PENTING!
   Build Command:    npm run build (default)
   Output Directory: dist (default)
   ```

4. **Environment Variables:**

   Click "Environment Variables" dan add:

   | Name | Value | Example |
   |------|-------|---------|
   | `VITE_API_URL` | `https://your-backend-url.com/api` | `https://mypos-backend.easypanel.host/api` |

   > **Gunakan URL dari EasyPanel backend service!**

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Get deployment URL: `https://mypos-frontend.vercel.app`

### Step 3: Custom Domain (Optional)

**Di Vercel:**
- Settings → Domains → Add Domain
- Follow DNS configuration

**Di EasyPanel:**
- Service → Domains → Add Domain
- Configure DNS A record

---

## 🔗 PART 3: Connect Frontend ↔ Backend

### Update CORS di Backend

1. **Login ke EasyPanel Dashboard**

2. **Go to `mypos-backend` service**

3. **Environment Variables → Edit**

4. **Update `CORS_ORIGIN`:**
   ```
   Before: *
   After:  https://mypos-frontend.vercel.app
   ```

   > Multiple origins: `https://app.vercel.app,https://custom.com`

5. **Redeploy Service**
   - Click "Redeploy" button
   - Or enable "Auto Deploy on Env Change"

### Verify Integration

1. **Open Frontend:** `https://mypos-frontend.vercel.app`
2. **Open Browser DevTools** (F12) → Network tab
3. **Try Login**
4. **Check:**
   - ✅ Request goes to correct backend URL
   - ✅ No CORS errors in console
   - ✅ Response status 200 OK
   - ✅ JWT token received & stored

---

## 🔧 Advanced Configuration

### Auto Deploy on Git Push

**EasyPanel:**
1. Service → Settings → Git Integration
2. Enable "Auto Deploy on Push"
3. Select branch: `main`
4. Every `git push` will trigger rebuild

**Vercel:**
- Auto-enabled by default
- Push to `main` = production deploy
- Push to other branch = preview deploy

### Database Backup

1. **EasyPanel Dashboard → Databases**
2. Select `mypos-db`
3. Go to "Backups" tab
4. Configure:
   - Schedule: Daily at 2 AM
   - Retention: 7 days
   - Destination: EasyPanel storage / S3

### Monitoring & Alerts

**EasyPanel:**
1. Service → Monitoring
2. Set alerts:
   - CPU > 80% → Email notification
   - RAM > 90% → Restart container
   - Health check fails → Email + Slack

**Vercel:**
- Dashboard → Analytics (free tier)
- Uptime monitoring built-in

### Scaling Resources

**If backend is slow:**

1. **EasyPanel → Service → Resources**
2. Adjust:
   ```
   CPU:    0.5 → 1.0 core
   RAM:    512MB → 1GB
   Disk:   1GB → 2GB
   ```
3. Click "Update" → Auto-restart

**Database scaling:**
1. PostgreSQL service → Resources
2. Increase RAM for better performance
3. Enable connection pooling

---

## 🐛 Troubleshooting

### Backend Won't Start

**Check EasyPanel Logs:**
```
Service → Logs → Error logs
```

**Common Issues:**

1. **Database connection failed**
   ```
   Fix: Check DATABASE_URL in env vars
   Verify postgres service is running
   ```

2. **Prisma migration failed**
   ```
   Fix: Run migration manually in Terminal
   npx prisma migrate deploy
   ```

3. **Port binding error**
   ```
   Fix: Ensure PORT=3000 in env vars
   Check Dockerfile EXPOSE 3000
   ```

### CORS Errors

**Error in browser console:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Fix:**
1. EasyPanel → Backend service → Environment
2. Update `CORS_ORIGIN` dengan exact Vercel URL
3. No trailing slash!
   ```
   ✅ https://mypos-frontend.vercel.app
   ❌ https://mypos-frontend.vercel.app/
   ```
4. Redeploy backend

### Vercel Build Failed

**Check build logs:**
- Vercel Dashboard → Deployments → Latest → Logs

**Common issues:**

1. **Root directory wrong**
   ```
   Settings → Root Directory = frontend
   ```

2. **API URL not set**
   ```
   Settings → Environment Variables
   Add: VITE_API_URL
   ```

3. **Build command failed**
   ```
   Check package.json scripts
   Ensure all dependencies in package.json
   ```

### Database Connection Pool Exhausted

**Symptoms:** Slow queries, timeout errors

**Fix:**

1. **Increase database resources**
   - EasyPanel → postgres-mypos-db → Resources
   - RAM: 512MB → 1GB

2. **Add connection pooling** (future enhancement)
   - Use PgBouncer sidecar container
   - Or external service like Supabase Pooler

---

## 📊 Performance Optimization

### Backend

1. **Enable Docker build cache**
   - EasyPanel handles this automatically
   - Rebuild faster dengan layer caching

2. **Database indexing**
   ```bash
   # Via terminal or migration
   CREATE INDEX idx_user_email ON users(email);
   CREATE INDEX idx_product_tenant ON products(tenant_id);
   ```

3. **Add Redis for caching** (optional)
   - EasyPanel → New Service → Redis
   - Connect to backend for session storage

### Frontend

1. **Vercel Edge Network**
   - Already optimized globally
   - Static assets cached on CDN

2. **Image optimization**
   - Use Vercel Image Optimization
   - Or external CDN (Cloudinary)

3. **Code splitting**
   - Already handled by Vite
   - Check bundle size: `npm run build`

---

## 💰 Cost Estimation

| Service | Provider | Plan | Cost |
|---------|----------|------|------|
| **Frontend** | Vercel | Hobby (Free) | Rp 0 |
| **Backend + DB** | EasyPanel | Self-hosted | - |
| **VPS** | Onidel Cloud | 4GB RAM | ~Rp 150K/bulan |
| **Domain** | Cloudflare/Niagahoster | .com | ~Rp 100K/tahun |

**Total: ~Rp 150K/bulan** 🎉

---

## ✅ Deployment Checklist

### Backend (EasyPanel)
- [ ] PostgreSQL database created
- [ ] Backend service created from GitHub
- [ ] Build path set to `/backend`
- [ ] Environment variables configured
- [ ] JWT_SECRET generated (64+ chars)
- [ ] DATABASE_URL points to postgres service
- [ ] Prisma migrations run successfully
- [ ] Health endpoint returns 200 OK
- [ ] Logs show no errors
- [ ] SSL certificate active

### Frontend (Vercel)
- [ ] Repository imported to Vercel
- [ ] Root directory set to `frontend`
- [ ] Framework preset: Vite
- [ ] Environment variable `VITE_API_URL` set
- [ ] Deployment successful
- [ ] Website loads without errors
- [ ] API calls work (check Network tab)

### Integration
- [ ] CORS_ORIGIN updated with Vercel URL
- [ ] Backend redeployed after CORS update
- [ ] Login works end-to-end
- [ ] No CORS errors in console
- [ ] Data persists in database

---

## 🎓 Next Steps

### Production-Ready Enhancements

1. **Setup monitoring**
   - Add Sentry for error tracking
   - Setup UptimeRobot for uptime monitoring

2. **Database backups**
   - Enable EasyPanel automated backups
   - Test restore procedure

3. **CI/CD Pipeline**
   - GitHub Actions for tests
   - Auto-deploy on PR merge

4. **Security hardening**
   - Enable rate limiting
   - Add helmet.js for security headers
   - Setup fail2ban on VPS

---

## 📚 Resources

- **EasyPanel Docs:** https://easypanel.io/docs
- **Vercel Docs:** https://vercel.com/docs
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/

---

## 🆘 Support

**Quick Commands Reference:**

```bash
# EasyPanel Terminal (in backend service)
npm run build              # Rebuild app
npx prisma migrate deploy  # Run migrations
npx prisma studio          # Open DB GUI
pm2 logs                   # View logs (if using PM2)

# Vercel CLI (local)
npm i -g vercel           # Install CLI
vercel                    # Deploy preview
vercel --prod             # Deploy production
vercel logs               # View logs
```

---

**Deployment Guide - EasyPanel Edition v1.0**

Optimized for: EasyPanel (Docker) + Vercel (Frontend)
Infrastructure: Onidel Cloud Singapore | Ubuntu 24.04 | 4GB RAM
