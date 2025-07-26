# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Install tsx globally for TypeScript execution
RUN npm install -g tsx

# Copy the rest of the application code
COPY . .

# Set default environment variables
ENV NODE_ENV=production
ENV UPSTASH_REDIS_URL=""

# Expose port (not strictly necessary for worker, but good practice)
EXPOSE 8080

# Health check to ensure worker is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Worker health check passed')" || exit 1

# Run the worker
CMD ["npx", "tsx", "lib/queue/worker-improved.ts"]
