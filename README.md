# Dindigul Regional Office Portal

A secure, modular regional office management portal for bank branches, featuring MIS dashboards, correspondence management, assets tracking, and more.

## Prerequisites

- **Node.js**: v18.x or later (v20+ recommended)
- **PostgreSQL**: v14.x or later
- **npm**: v10.x or later

## Project Structure

- `/src`: Frontend application (React, TypeScript, Vite, Tailwind CSS)
- `/server`: Backend server (Node.js, Express, Prisma, PostgreSQL)

## Setup Instructions

### 1. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dindigul"
JWT_SECRET="your_very_secure_random_secret"
FRONTEND_URL="http://localhost:5173"
PORT=5000
```

Initialize the database:

```bash
npx prisma db push
```

### 2. Frontend Setup

```bash
npm install
```

Create a `.env` file in the root directory:

```env
VITE_API_URL="http://localhost:5000/api"
VITE_STATIC_URL="http://localhost:5000"
```

### 3. Running the Application

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
npm run dev
```

## Security & Hardening

This project has been hardened with the following features:
- **Centralized Authentication**: Robust `AuthService` handling MFA and lockout.
- **Environment Validation**: Fails fast if critical secrets are missing.
- **Structured Error Handling**: Global middleware with standardized error codes.
- **Observability**: Structured logging using Pino.
- **Declarative Routing**: Configuration-driven frontend views with access control.

## Testing

Run backend tests:

```bash
cd server
npm test
```
