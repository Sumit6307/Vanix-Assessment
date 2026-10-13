# Multi-stage Dockerfile for Vanix IoT Backend & Mobile Web Build
FROM node:24-alpine AS base
WORKDIR /app

# Step 1: Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Step 2: Copy backend code and dataset
COPY backend/ ./backend/
COPY encrypted_packets.json ./
COPY decrypted_packets.json ./

# Environment defaults
ENV PORT=3000
ENV DB_PATH=/app/backend/data/vanix.db
ENV NODE_ENV=production

EXPOSE 3000

WORKDIR /app/backend
CMD ["node", "src/server.js"]
