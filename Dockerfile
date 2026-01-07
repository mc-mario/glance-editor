# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend (for any potential transpilation)
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/src ./src

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Create config directory
RUN mkdir -p /app/config && chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 8081

# Environment variables
ENV NODE_ENV=production
ENV EDITOR_PORT=8081
ENV CONFIG_PATH=/app/config/glance.yml
ENV GLANCE_URL=http://glance:8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8081/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "src/server.js"]
