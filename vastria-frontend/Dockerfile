# ---------- Stage 1: Build the React app ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json package-lock.json* ./

# Install ALL dependencies (need devDependencies for building)
# Note: using 'npm install' instead of 'npm ci' for cross-version npm compatibility
RUN npm install

# Copy source code
COPY . .

# Build argument: passed at build time for the Google Client ID
# WHY build arg? Vite bakes env vars into the JS bundle at build time,
# so we can't use runtime env vars for VITE_* variables.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build the production bundle
RUN npm run build

# ---------- Stage 2: Serve with Nginx ----------
# WHY Nginx? It's a fast, lightweight web server perfect for serving
# static files. The final image is ~25MB instead of ~1GB with Node.
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config (handles SPA routing + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React files from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx listens on port 80
EXPOSE 80

# Start Nginx in the foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
