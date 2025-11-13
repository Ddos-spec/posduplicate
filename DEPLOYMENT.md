# MyPOS - Deployment Guide

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed
- npm or yarn package manager

### 1. Database Setup

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mypos;

# Exit psql
\q

# Run migrations
psql -U postgres -d mypos < database/migration_multi_tenant.sql

# Seed data
psql -U postgres -d mypos < database/seed_multi_tenant.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
# Edit backend/.env and update:
# - DATABASE_URL with your PostgreSQL credentials
# - JWT_SECRET with a secure random string

# Generate Prisma client
npx prisma generate

# Start server
npm run dev
```

Backend will run on `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## 🔑 Demo Accounts

After seeding, you can login with:

- **Owner Account**
  - Email: `owner@kebuliutsman.com`
  - Password: `password123`

- **Cashier Account**
  - Email: `kasir@kebuliutsman.com`
  - Password: `password123`

## 📦 Production Deployment

### Build Frontend

```bash
cd frontend
npm run build
```

Dist files will be in `frontend/dist/`

### Build Backend

```bash
cd backend
npm run build  # If you have build script
```

### Environment Variables (Production)

**Backend (.env)**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mypos"
JWT_SECRET="your-super-secret-jwt-key-CHANGE-THIS"
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

**Frontend (.env.production)**:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start npm --name "mypos-api" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker (Alternative)

```bash
# Build and run
docker-compose up -d
```

## 🔧 Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/mypos/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Database Backup

```bash
# Backup
pg_dump -U postgres mypos > backup.sql

# Restore
psql -U postgres mypos < backup.sql
```

## 🔄 Updates & Maintenance

```bash
# Pull latest changes
git pull

# Update dependencies
cd backend && npm install
cd frontend && npm install

# Rebuild frontend
cd frontend && npm run build

# Restart backend
pm2 restart mypos-api
```

## 🛠 Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check user permissions

### Port Already in Use
- Change PORT in backend/.env
- Update VITE_API_URL in frontend/.env

### CORS Error
- Verify CORS_ORIGIN in backend/.env matches frontend URL
- Check browser console for specific errors

## 📞 Support

For issues or questions, check the README.md or contact the development team.
