# Vastria

Vastria is an AI-powered wardrobe management and outfit recommendation platform built with the MERN stack. It lets users organize their clothes digitally, generate outfit combinations from their existing wardrobe, get wardrobe-improvement suggestions, and chat with an AI stylist.

Live site: `https://vastria.live`

## Features

- JWT-based authentication with email verification and Google sign-in support
- Digital wardrobe management with image upload and metadata tagging
- AI-assisted clothing analysis for uploaded items
- Rule-based outfit generation from the user's existing wardrobe
- Occasion, season, and weather-aware outfit filtering
- Favourite outfits and persistent outfit history
- AI wardrobe analysis with improvement suggestions
- AI chatbot for wardrobe and styling help
- Responsive React frontend with a minimalist card-based wardrobe UI
- Dockerized local development and VM deployment
- GitHub Actions pipeline for build, image publishing, and server deployment

## Tech Stack

- Frontend: React, Vite, React Router, Axios
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- AI: Google Gemini
- Media storage: Cloudinary
- Search/recommendation enrichment: SerpAPI
- Deployment: Docker, Docker Compose, GitHub Actions, Docker Hub, Caddy
- Optional infra in repo: Kubernetes manifests

## Project Structure

```text
Vastria/
├── .github/workflows/ci-cd.yml
├── docker-compose.yml
├── docker-compose.prod.yml
├── k8s/
├── vastria-backend/
│   ├── src/
│   ├── .env.example
│   └── Dockerfile
├── vastria-frontend/
│   ├── src/
│   ├── .env.example
│   ├── nginx.conf
│   └── Dockerfile
└── DEPLOYMENT.md
```

## Core User Flow

1. Users sign up and verify their account
2. They add wardrobe items by uploading images or selecting items from search results
3. Vastria stores clothing attributes such as type, category, style, color, and occasion
4. The app generates outfit combinations from the saved wardrobe
5. Users can save favourite outfits and refresh suggestions after adding new items
6. The AI analysis tab highlights wardrobe strengths, gaps, and product recommendations
7. The chatbot helps with styling, outfit ideas, and wardrobe discovery

## Local Development

### Prerequisites

- Node.js 22+
- MongoDB connection string
- Cloudinary account
- Gemini API key
- SerpAPI key

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Vastria
```

### 2. Create environment files

Backend:

```bash
cp vastria-backend/.env.example vastria-backend/.env
```

Frontend:

```bash
cp vastria-frontend/.env.example vastria-frontend/.env
```

Fill the backend file with real values for:

- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY`
- `SERP_API_KEY`
- `GOOGLE_CLIENT_ID`
- `EMAIL_USER`
- `EMAIL_PASS`

Fill the frontend file with:

- `VITE_GOOGLE_CLIENT_ID`

### 3. Install dependencies

Backend:

```bash
cd vastria-backend
npm install
```

Frontend:

```bash
cd ../vastria-frontend
npm install
```

### 4. Run the app

Backend:

```bash
cd vastria-backend
npm run dev
```

Frontend:

```bash
cd vastria-frontend
npm run dev
```

Development URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

Vite proxies `/api` requests to the backend during local development.

## Local Docker

For a containerized local setup:

1. Create a root `.env` file with:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

2. Start the stack:

```bash
docker compose up --build
```

3. Open:

- Frontend: `http://localhost`
- Backend: `http://localhost:5000`

## Production Deployment

This repo contains two deployment paths:

- `docker-compose.yml` for local/source-based builds
- `docker-compose.prod.yml` for VM deployment using Docker Hub images

Current production flow:

1. Push code to `main`
2. GitHub Actions builds frontend and backend
3. GitHub Actions pushes Docker images to Docker Hub
4. GitHub Actions SSHs into the VM
5. The VM pulls the latest images and restarts the app

Production services are designed to sit behind Caddy:

- frontend on `127.0.0.1:8080`
- backend on `127.0.0.1:5000`
- public traffic handled at `https://vastria.live`

For the full step-by-step deployment walkthrough, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## CI/CD

The GitHub Actions workflow in `.github/workflows/ci-cd.yml` currently:

- builds backend dependencies
- builds the frontend bundle
- builds and pushes Docker images to Docker Hub
- deploys the latest images to the VM over SSH on pushes to `main`

## API Overview

The backend exposes these main route groups:

- `/api/auth`
- `/api/clothing`
- `/api/recommendations`
- `/api/chat`
- `/api/outfits`

Health check:

- `GET /`

## Environment Variables

### Backend

See [vastria-backend/.env.example](./vastria-backend/.env.example).

### Frontend

See [vastria-frontend/.env.example](./vastria-frontend/.env.example).

### Production image deployment

See [.env.prod.example](./.env.prod.example).

## Current Notes

- The app is feature-complete as a POC
- Deployment is live on a VM with HTTPS
- Kubernetes manifests are included as a bonus/learning phase
- Basic CI/CD is in place
- There are currently no formal automated tests in the repo

## Roadmap / Improvements

- Improve typo tolerance in search
- Better Gemini outage handling and graceful fallback UI
- Camera capture support for adding clothes
- Monitoring and alerting
- Stronger production hardening around API exposure and backups

## Why This Project Stands Out

Vastria is not just a CRUD MERN app. It combines:

- wardrobe organization
- outfit logic
- AI-assisted analysis
- product recommendation enrichment
- containerized deployment
- CI/CD automation

That makes it a strong portfolio project across both product engineering and deployment workflows.
