# ---------- Stage 1: Build ----------
# WHY multi-stage? The final image only contains the compiled code,
# not all the dev tools (npm, source, etc.). This makes images smaller & more secure.

FROM node:22-alpine AS build

# Set working directory inside the container
WORKDIR /app

# Copy package files FIRST (Docker caches this layer — if dependencies
# haven't changed, Docker won't re-run npm install, saving build time)
COPY package.json package-lock.json* ./

# Install production dependencies only
# Note: using 'npm install' instead of 'npm ci' for cross-version npm compatibility
RUN npm install --omit=dev

# Copy the rest of the source code
COPY . .

# ---------- Stage 2: Production ----------
FROM node:22-alpine

# Security: don't run as root in production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only what we need from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./

# Switch to non-root user
USER appuser

# Express listens on this port
EXPOSE 5000

# Health check — Docker/K8s can auto-restart unhealthy containers
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

# Start the server
CMD ["node", "src/server.js"]
