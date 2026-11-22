# Multi-stage production Dockerfile for BAUET ICT Club
FROM node:22-alpine AS builder

WORKDIR /app

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install server production dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend assets
COPY --from=builder /app/client/dist ./client/dist

# Ensure uploads directory exists
RUN mkdir -p /app/server/uploads

EXPOSE 5000

CMD ["node", "server/index.js"]
