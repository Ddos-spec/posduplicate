# 📋 Deployment Checklist

Checklist untuk deploy MyPOS: **Frontend (Vercel) + Backend (VPS)**

---

## Pre-Deployment

- [ ] Akun Vercel sudah dibuat (login dengan GitHub)
- [ ] VPS sudah ready (Ubuntu/Debian recommended)
- [ ] Domain sudah ada (optional, bisa pakai IP VPS)
- [ ] Repository sudah di push ke GitHub

---

## Backend Setup (VPS)

### System Setup
- [ ] SSH ke VPS berhasil
- [ ] Node.js 18.x installed: `node -v`
- [ ] PostgreSQL installed: `psql --version`
- [ ] PM2 installed: `pm2 -v`

### Database Setup
- [ ] PostgreSQL database created
- [ ] Database user created dengan password kuat
- [ ] Permissions granted ke user
- [ ] Connection test berhasil

### Backend Configuration
- [ ] Code di-upload ke VPS (git clone/SFTP)
- [ ] `backend/.env` created dari `.env.example`
- [ ] `DATABASE_URL` configured dengan credentials yang benar
- [ ] `JWT_SECRET` generated (64 char random string)
- [ ] `CORS_ORIGIN` set (bisa set `*` dulu, update setelah Vercel deploy)
- [ ] Dependencies installed: `npm install`
- [ ] Prisma generated: `npm run prisma:generate`
- [ ] Migrations run: `npx prisma migrate deploy`
- [ ] Build successful: `npm run build`

### PM2 Setup
- [ ] PM2 started: `pm2 start dist/server.js --name mypos-backend`
- [ ] PM2 startup configured: `pm2 startup` + `pm2 save`
- [ ] Backend running: `pm2 status`
- [ ] Logs clean (no errors): `pm2 logs`

### Networking
- [ ] Firewall configured (port 3000, 22)
- [ ] Health endpoint accessible: `curl http://localhost:3000/health`
- [ ] API accessible from outside: `curl http://VPS_IP:3000/health`

---

## Frontend Setup (Vercel)

### Preparation
- [ ] Code committed & pushed ke GitHub
- [ ] `frontend/vercel.json` exists
- [ ] `frontend/.env.example` documented

### Vercel Configuration
- [ ] Repository imported ke Vercel
- [ ] Project name set
- [ ] Framework Preset: **Vite** ✓
- [ ] Root Directory: **frontend** ✓ (PENTING!)
- [ ] Build Command: `npm run build` (default)
- [ ] Output Directory: `dist` (default)

### Environment Variables
- [ ] Environment variable added:
  - Name: `VITE_API_URL`
  - Value: `http://YOUR_VPS_IP:3000/api`
- [ ] Environment applied to: Production, Preview, Development

### Deployment
- [ ] Deploy triggered
- [ ] Build successful (no errors)
- [ ] Deployment URL received
- [ ] Website accessible

---

## Post-Deployment Integration

### Update Backend CORS
- [ ] Copy Vercel deployment URL
- [ ] Update `backend/.env` on VPS:
  ```
  CORS_ORIGIN=https://your-project.vercel.app
  ```
- [ ] Restart backend: `pm2 restart mypos-backend`
- [ ] Verify CORS: Check browser console (no CORS errors)

---

## Testing

### Backend Tests
- [ ] Health endpoint: `GET http://VPS_IP:3000/health`
  - Response: `{"status":"OK",...}`
- [ ] API root: `GET http://VPS_IP:3000/`
  - Response: API info with endpoints
- [ ] CORS headers present in response
- [ ] Database connection working (check logs)

### Frontend Tests
- [ ] Website loads: `https://your-project.vercel.app`
- [ ] Static assets load (images, CSS, JS)
- [ ] React app initializes (no blank screen)
- [ ] Routing works (try different pages)

### Integration Tests
- [ ] Login page loads
- [ ] Login form submits
- [ ] API request visible in Network tab (F12)
- [ ] No CORS errors in console
- [ ] Successful login redirects to dashboard
- [ ] Data loads from API
- [ ] Images/uploads display (if any)
- [ ] Logout works

---

## Security Checklist

### Backend
- [ ] `.env` file is NOT committed to git
- [ ] JWT_SECRET is strong random string (min 64 chars)
- [ ] Database password is strong
- [ ] CORS_ORIGIN is specific (not `*` in production)
- [ ] Rate limiting enabled (if implemented)
- [ ] HTTPS enabled (if using domain + SSL)

### Frontend
- [ ] No sensitive data in client-side code
- [ ] Environment variables use `VITE_` prefix only
- [ ] No API keys exposed in frontend
- [ ] Error messages don't leak sensitive info

### VPS
- [ ] SSH key authentication (disable password login)
- [ ] Firewall enabled with minimal ports open
- [ ] Regular security updates enabled
- [ ] Non-root user for app (optional but recommended)

---

## Monitoring Setup

- [ ] PM2 monitoring: `pm2 monit`
- [ ] Error logs checked: `pm2 logs mypos-backend --err --lines 50`
- [ ] Database backup strategy in place
- [ ] Disk space monitoring configured
- [ ] Uptime monitoring (optional: UptimeRobot, etc.)

---

## Documentation

- [ ] Deployment documented (Vercel URL, VPS IP)
- [ ] Credentials stored securely (password manager)
- [ ] Environment variables documented
- [ ] Rollback procedure documented
- [ ] Team members have access (if applicable)

---

## Optional Enhancements

- [ ] Custom domain for Vercel (Settings > Domains)
- [ ] SSL for backend (Nginx + Let's Encrypt)
- [ ] CDN for uploads (Cloudinary, AWS S3)
- [ ] Database backups automated (cron job)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Performance monitoring (Sentry, LogRocket)

---

## Troubleshooting Quick Reference

### CORS Error
```bash
# Check backend CORS_ORIGIN
cat backend/.env | grep CORS_ORIGIN
# Should match Vercel URL exactly
pm2 restart mypos-backend
```

### Database Connection Error
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
# Check DATABASE_URL format
cat backend/.env | grep DATABASE_URL
```

### Vercel Build Failed
- Check Root Directory = `frontend`
- Check Framework Preset = Vite
- Check build logs in Vercel dashboard
- Verify `package.json` build script

### Backend Not Responding
```bash
# Check PM2 status
pm2 status
# Check logs
pm2 logs mypos-backend --lines 100
# Restart
pm2 restart mypos-backend
```

---

## Success Criteria

✅ Backend health endpoint returns 200 OK
✅ Frontend loads without errors
✅ Login functionality works end-to-end
✅ No CORS errors in browser console
✅ Data persists in database
✅ PM2 shows backend running with no restarts

---

## Support Resources

- 📚 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed step-by-step
- 🚀 [QUICK_START.md](./QUICK_START.md) - Quick reference
- 🌐 [Vercel Docs](https://vercel.com/docs)
- 🔧 [PM2 Docs](https://pm2.keymetrics.io/docs)

---

**Last Updated:** 2024
**Deployment Type:** Frontend (Vercel) + Backend (VPS)
