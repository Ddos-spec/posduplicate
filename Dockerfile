# Multi-stage build for MyPOS
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies (skip postinstall to avoid prisma error)
RUN npm install --ignore-scripts
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd backend && npx prisma generate

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy backend package files and install production dependencies only
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy built backend
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma

# Copy built frontend (server.ts expects it at ../frontend/dist)
COPY --from=builder /app/frontend/dist ../frontend/dist

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
