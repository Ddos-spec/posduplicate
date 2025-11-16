# Environment Variables Reference

Dokumentasi lengkap semua environment variables untuk MyPOS.

---

## 📋 Overview

| Environment | Location | Method |
|-------------|----------|--------|
| **Backend (EasyPanel)** | EasyPanel Dashboard → Service → Environment | Web UI |
| **Backend (Traditional VPS)** | `backend/.env` file | SSH/SFTP |
| **Frontend (Vercel)** | Vercel Dashboard → Settings → Environment Variables | Web UI |
| **Frontend (Local Dev)** | `frontend/.env` file | Local file |

---

## 🔧 Backend Environment Variables

### Required Variables

#### `NODE_ENV`
- **Description:** Application environment mode
- **Type:** String
- **Options:** `development` | `production` | `test`
- **Default:** `development`
- **Production Value:** `production`
- **Example:**
  ```bash
  NODE_ENV=production
  ```
- **Notes:** Affects error verbosity, logging, and optimizations

---

#### `PORT`
- **Description:** Port where the API server listens
- **Type:** Number
- **Default:** `3000`
- **Production Value:** `3000` (EasyPanel handles external routing)
- **Example:**
  ```bash
  PORT=3000
  ```
- **Notes:**
  - EasyPanel: Keep as 3000, panel manages reverse proxy
  - Traditional VPS: Can change if port 3000 is taken

---

#### `DATABASE_URL`
- **Description:** PostgreSQL connection string
- **Type:** String (Connection URI)
- **Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
- **Examples:**

  **EasyPanel (Docker network):**
  ```bash
  DATABASE_URL="postgresql://mypos_user:strong_password@postgres-mypos-db:5432/mypos_db"
  ```

  **Traditional VPS (localhost):**
  ```bash
  DATABASE_URL="postgresql://mypos_user:strong_password@localhost:5432/mypos_db"
  ```

  **External Database (Supabase/Railway):**
  ```bash
  DATABASE_URL="postgresql://user:pass@db.example.com:5432/db?sslmode=require"
  ```

- **Notes:**
  - EasyPanel: Use internal Docker service name (e.g., `postgres-mypos-db`)
  - Password must not contain special chars that need URL encoding
  - SSL mode: Add `?sslmode=require` for external databases

---

#### `JWT_SECRET`
- **Description:** Secret key for signing JWT tokens
- **Type:** String (minimum 32 characters, recommended 64+)
- **Security Level:** 🔴 **CRITICAL** - Never commit to git!
- **Generate:**
  ```bash
  # Method 1: Node.js crypto
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

  # Method 2: OpenSSL
  openssl rand -hex 64

  # Method 3: Password generator
  # Use any password generator with 64+ characters
  ```
- **Example:**
  ```bash
  JWT_SECRET=a1b2c3d4e5f6...64_characters_long
  ```
- **Notes:**
  - **MUST** be different for dev/staging/production
  - Changing this invalidates all existing JWT tokens
  - Store securely (password manager for team access)

---

#### `CORS_ORIGIN`
- **Description:** Allowed origins for CORS (Cross-Origin Resource Sharing)
- **Type:** String (single origin) or Comma-separated list (multiple origins)
- **Security Level:** 🟡 **IMPORTANT** - Controls who can access your API
- **Examples:**

  **Development (allow all):**
  ```bash
  CORS_ORIGIN=*
  ```

  **Production (single origin):**
  ```bash
  CORS_ORIGIN=https://mypos-frontend.vercel.app
  ```

  **Production (multiple origins):**
  ```bash
  CORS_ORIGIN=https://mypos-frontend.vercel.app,https://mypos.com,https://www.mypos.com
  ```

- **Important Rules:**
  - ✅ Exact match required (case-sensitive)
  - ❌ No trailing slash: `https://example.com` NOT `https://example.com/`
  - ❌ No wildcards in production except `*` for all
  - ⚠️ Using `*` in production is a security risk

---

### Optional Variables

#### `JWT_EXPIRES_IN`
- **Description:** JWT token expiration time
- **Type:** String (zeit/ms format)
- **Default:** `24h`
- **Examples:**
  ```bash
  JWT_EXPIRES_IN=24h      # 24 hours
  JWT_EXPIRES_IN=7d       # 7 days
  JWT_EXPIRES_IN=30m      # 30 minutes
  JWT_EXPIRES_IN=1y       # 1 year (not recommended)
  ```
- **Recommendations:**
  - Admin users: `24h` - `7d`
  - Regular users: `7d` - `30d`
  - Public API: `1h` - `24h`

---

#### `MAX_FILE_SIZE_MB`
- **Description:** Maximum file upload size in megabytes
- **Type:** Number
- **Default:** `10`
- **Example:**
  ```bash
  MAX_FILE_SIZE_MB=25
  ```
- **Notes:** Affects product images, receipts, etc.

---

#### `UPLOAD_PATH`
- **Description:** Directory for storing uploaded files
- **Type:** String (relative or absolute path)
- **Default:** `./uploads`
- **Examples:**
  ```bash
  UPLOAD_PATH=./uploads           # Relative
  UPLOAD_PATH=/var/www/uploads    # Absolute
  ```
- **Notes:**
  - EasyPanel: Use relative path, mounted to Docker volume
  - Traditional VPS: Can use absolute path

---

#### `RATE_LIMIT_WINDOW_MS`
- **Description:** Time window for rate limiting (milliseconds)
- **Type:** Number
- **Default:** `60000` (1 minute)
- **Example:**
  ```bash
  RATE_LIMIT_WINDOW_MS=60000      # 1 minute
  ```

---

#### `RATE_LIMIT_MAX_REQUESTS`
- **Description:** Maximum requests per IP within time window
- **Type:** Number
- **Default:** `100`
- **Example:**
  ```bash
  RATE_LIMIT_MAX_REQUESTS=100     # 100 requests/minute
  ```

---

#### `ENABLE_LOGGING`
- **Description:** Enable/disable request logging
- **Type:** Boolean (string)
- **Default:** `true`
- **Example:**
  ```bash
  ENABLE_LOGGING=true
  ```
- **Notes:** Disable in production if using external logging service

---

#### `DB_POOL_MIN` / `DB_POOL_MAX`
- **Description:** PostgreSQL connection pool size
- **Type:** Number
- **Default:** Prisma defaults (min: 2, max: 10)
- **Example:**
  ```bash
  DB_POOL_MIN=5
  DB_POOL_MAX=20
  ```
- **Notes:** Increase for high-traffic applications

---

## 🌐 Frontend Environment Variables

### Required Variables

#### `VITE_API_URL`
- **Description:** Full URL to backend API
- **Type:** String (URL)
- **Format:** `https://your-backend-domain.com/api`
- **Examples:**

  **Local Development:**
  ```bash
  VITE_API_URL=http://localhost:3000/api
  ```

  **Production (EasyPanel):**
  ```bash
  VITE_API_URL=https://mypos-backend.easypanel.host/api
  ```

  **Production (Custom Domain):**
  ```bash
  VITE_API_URL=https://api.mypos.com/api
  ```

  **Production (VPS with IP):**
  ```bash
  VITE_API_URL=http://123.456.789.012:3000/api
  ```

- **Important Notes:**
  - ✅ MUST include `/api` at the end
  - ✅ Use HTTPS in production for security
  - ❌ No trailing slash after `/api`
  - ⚠️ HTTP (not HTTPS) from HTTPS frontend = Mixed Content Error

---

### Optional Variables

#### `VITE_APP_VERSION`
- **Description:** Application version for cache busting
- **Type:** String (semver)
- **Example:**
  ```bash
  VITE_APP_VERSION=1.0.0
  ```

---

#### `VITE_DEBUG`
- **Description:** Enable debug mode (verbose console logs)
- **Type:** Boolean (string)
- **Default:** `false`
- **Example:**
  ```bash
  VITE_DEBUG=true
  ```
- **Notes:** Only use in development

---

#### `VITE_GA_ID`
- **Description:** Google Analytics Measurement ID
- **Type:** String
- **Example:**
  ```bash
  VITE_GA_ID=G-XXXXXXXXXX
  ```

---

#### `VITE_SENTRY_DSN`
- **Description:** Sentry DSN for error tracking
- **Type:** String (URL)
- **Example:**
  ```bash
  VITE_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456
  ```

---

## 🔐 Security Best Practices

### DO's ✅

1. **Use strong secrets**
   - JWT_SECRET: Minimum 64 characters
   - Database passwords: Mix of letters, numbers, symbols

2. **Different secrets per environment**
   ```bash
   # Development
   JWT_SECRET=dev_secret_12345...

   # Production
   JWT_SECRET=prod_secret_98765...
   ```

3. **Use password managers**
   - Store secrets in 1Password, Bitwarden, etc.
   - Share securely with team

4. **Rotate secrets regularly**
   - JWT_SECRET: Every 6-12 months
   - Database passwords: Every 3-6 months

5. **Least privilege CORS**
   ```bash
   # ✅ Good
   CORS_ORIGIN=https://myapp.vercel.app

   # ❌ Bad (in production)
   CORS_ORIGIN=*
   ```

### DON'Ts ❌

1. **Never commit .env to git**
   ```bash
   # .gitignore should include:
   .env
   .env.local
   .env.production
   ```

2. **Never hardcode secrets in code**
   ```javascript
   // ❌ Bad
   const secret = "my-secret-key"

   // ✅ Good
   const secret = process.env.JWT_SECRET
   ```

3. **Never share secrets in plain text**
   - Don't send via email, Slack, WhatsApp
   - Use password managers or encrypted notes

4. **Never use default/weak secrets**
   ```bash
   # ❌ Bad
   JWT_SECRET=secret
   DATABASE_URL=postgresql://admin:admin@localhost/db

   # ✅ Good
   JWT_SECRET=a1b2c3d4e5f6...64chars
   DATABASE_URL=postgresql://secure_user:x7k9m2...@localhost/db
   ```

---

## 📊 Environment-Specific Configurations

### Development

```bash
# Backend (.env)
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://dev_user:dev_pass@localhost:5432/mypos_dev"
JWT_SECRET=dev_secret_minimum_32_characters_long
CORS_ORIGIN=http://localhost:5173

# Frontend (.env)
VITE_API_URL=http://localhost:3000/api
VITE_DEBUG=true
```

### Production (EasyPanel + Vercel)

**Backend (EasyPanel UI):**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://prod_user:STRONG_PASS@postgres-mypos-db:5432/mypos_db
JWT_SECRET=GENERATE_64_CHARS_RANDOM_STRING
CORS_ORIGIN=https://mypos-frontend.vercel.app
```

**Frontend (Vercel UI):**
```bash
VITE_API_URL=https://mypos-backend.easypanel.host/api
```

### Production (Traditional VPS + Vercel)

**Backend (.env on VPS):**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://prod_user:STRONG_PASS@localhost:5432/mypos_db
JWT_SECRET=GENERATE_64_CHARS_RANDOM_STRING
CORS_ORIGIN=https://mypos-frontend.vercel.app
```

**Frontend (Vercel UI):**
```bash
VITE_API_URL=https://api.yourdomain.com/api
```

---

## 🧪 Testing Environment Variables

### Check if variables are loaded

**Backend:**
```javascript
// Add to server.ts temporarily
console.log('Environment Check:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_CONNECTED: !!process.env.DATABASE_URL,
  JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length,
  CORS_ORIGIN: process.env.CORS_ORIGIN
});
```

**Frontend:**
```javascript
// Add to App.tsx temporarily
console.log('API URL:', import.meta.env.VITE_API_URL);
```

---

## 🆘 Troubleshooting

### Problem: Environment variables not loading

**Backend:**
```bash
# Check .env file exists
ls -la backend/.env

# Check dotenv is called early
# server.ts should have at the top:
import dotenv from 'dotenv';
dotenv.config();
```

**Frontend:**
```bash
# Vite only loads VITE_ prefixed variables
# ✅ VITE_API_URL
# ❌ API_URL

# Restart dev server after changing .env
npm run dev
```

### Problem: CORS still blocking after setting CORS_ORIGIN

**Check:**
1. Exact match (no extra spaces, trailing slash)
2. Backend restarted after change
3. Browser cache cleared
4. Protocol matches (http vs https)

### Problem: JWT tokens not working

**Check:**
1. JWT_SECRET is set and same across instances
2. JWT_SECRET minimum 32 characters
3. Clock sync on server (for expiration)

---

## 📝 Templates

### Quick Copy-Paste Templates

**Backend (.env for EasyPanel):**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://mypos_user:CHANGE_THIS_PASSWORD@postgres-mypos-db:5432/mypos_db
JWT_SECRET=GENERATE_WITH_CRYPTO_COMMAND
CORS_ORIGIN=https://YOUR_VERCEL_URL.vercel.app
```

**Frontend (Vercel Environment Variables):**
```
VITE_API_URL=https://YOUR_EASYPANEL_BACKEND_URL/api
```

---

## 📚 Related Documentation

- Backend `.env.example`: [backend/.env.example](./backend/.env.example)
- Frontend `.env.example`: [frontend/.env.example](./frontend/.env.example)
- Deployment Guide: [DEPLOYMENT_EASYPANEL.md](./DEPLOYMENT_EASYPANEL.md)
- Quick Start: [QUICK_START.md](./QUICK_START.md)

---

**Environment Variables Reference v1.0**
Last Updated: 2024
