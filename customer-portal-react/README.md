# Customer Portal React Frontend (cutomer-portal-react)

Customer Web Portal for the CoreBanking System built with React, Vite, and TypeScript.

---

## Environment Configuration

This frontend connects to the Spring Boot CoreBanking backend. All API and WebSocket endpoints are driven by environment variables.

### Environment Variables Reference

| Variable | Description | Default (Local Dev) |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the Spring Boot backend | `http://localhost:8080` |
| `VITE_WS_URL` | *(Optional)* WebSocket URL for real-time notifications | Derived from `VITE_API_BASE_URL` |

---

## Local Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Verify or update `VITE_API_BASE_URL`:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```

3. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

---

## Production Build & Deployment

> **Important (Vite Note):** Vite bakes environment variables into static assets at build time (`npm run build`). Always set `VITE_API_BASE_URL` to your production backend URL before building.

### Build Steps

1. Configure production `.env` (or set environment variable):
   ```bash
   # Example: Linux / macOS
   export VITE_API_BASE_URL="https://api.yourbank.com"

   # Example: Windows PowerShell
   $env:VITE_API_BASE_URL = "https://api.yourbank.com"
   ```

2. Run the production build:
   ```bash
   npm run build
   ```

3. The compiled static output is located in `dist/`. Deploy the `dist/` folder to any static web server (Nginx, Apache, Cloudflare Pages, AWS S3, etc.).
