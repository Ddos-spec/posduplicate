# Quick Start - EasyPanel + Vercel

Panduan super singkat untuk deployment MyPOS modern stack.

---

## 🎯 Deployment Methods

Pilih sesuai setup kamu:

### 🐳 **Modern Stack (RECOMMENDED)**
**EasyPanel (Docker) + Vercel**
- ✅ No SSH required
- ✅ Web UI untuk semua
- ✅ Auto SSL/HTTPS
- ✅ Easy scaling

👉 **[Lihat panduan EasyPanel](#easypanel-deployment)**

### 🖥️ **Traditional Stack**
**Bare Metal VPS + Vercel**
- Manual SSH setup
- PM2 process manager
- Nginx reverse proxy

👉 **[Lihat DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

---

## 🐳 EasyPanel Deployment

### 1️⃣ Backend di EasyPanel

**A. Create PostgreSQL Database**
- EasyPanel → New Service → Database → PostgreSQL
- Name: `mypos-db`
- Note connection string: `postgresql://user:pass@postgres-mypos-db:5432/db`

**B. Deploy Backend App**
- New Service → App → Git Source
- Repository: Your GitHub repo
- **Build Path: `/backend`** ⚠️
- Build Method: Dockerfile (auto-detect)
- Port: 3000

**C. Set Environment Variables** (via UI)

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |
| `DATABASE_URL` | `postgresql://...` | From database service |
| `JWT_SECRET` | *(generate)* | Use: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `CORS_ORIGIN` | `*` | Update after Vercel |

**D. Deploy!**
- Click "Deploy" button
- Wait 2-3 minutes
- Copy backend URL: `https://mypos-backend.easypanel.host`

---

### 2️⃣ Frontend di Vercel

**A. Import to Vercel**
- Vercel.com → New Project → Import from GitHub
- Select your repository

**B. Configure**
```
Root Directory:   frontend  ⚠️ PENTING!
Framework Preset: Vite
```

**C. Add Environment Variable**
```
Name:  VITE_API_URL
Value: https://mypos-backend.easypanel.host/api
```
*(Ganti dengan URL backend dari EasyPanel)*

**D. Deploy**
- Click "Deploy"
- Copy Vercel URL: `https://mypos-frontend.vercel.app`

---

### 3️⃣ Connect Backend ↔ Frontend

**Update CORS di EasyPanel:**
1. Go to backend service
2. Environment Variables → Edit
3. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://mypos-frontend.vercel.app
   ```
4. Redeploy service

---

## ✅ Verification

### Test Backend
```bash
curl https://mypos-backend.easypanel.host/health
```
**Expected:** `{"status":"OK",...}`

### Test Frontend
Buka: `https://mypos-frontend.vercel.app`

### Test Integration
1. Open frontend
2. F12 → Network tab
3. Try login
4. Check: No CORS errors, API calls succeed

---

## 🔧 Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| **CORS Error** | Update `CORS_ORIGIN` di EasyPanel env vars (exact match, no trailing slash) |
| **Database Error** | Check `DATABASE_URL` format: `postgresql://user:pass@postgres-mypos-db:5432/db` |
| **Vercel Build Failed** | Root Directory = `frontend`, Framework = Vite |
| **Backend Won't Start** | Check EasyPanel logs, verify Dockerfile exists |

---

## 📚 Full Documentation

- **EasyPanel Setup:** [DEPLOYMENT_EASYPANEL.md](./DEPLOYMENT_EASYPANEL.md) ← Modern stack
- **Traditional VPS:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) ← Legacy setup
- **Checklist:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

## 🎓 Pro Tips

**EasyPanel:**
- Enable "Auto Deploy on Push" untuk CI/CD otomatis
- Setup database backups di Backups tab
- Monitor resources di Metrics tab

**Vercel:**
- Gunakan preview deployments untuk testing (auto-created dari PR)
- Setup custom domain di Settings → Domains
- Check Analytics untuk performance insights

---

**Quick Start - EasyPanel Edition v2.0**

Optimized for: Modern Docker-based deployment 🐳
