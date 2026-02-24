# Dindigul Bank Portal - Native Windows Setup Script
# This script prepares the environment for running without Docker.

Write-Host "--- Dindigul Bank Portal Native Setup ---" -ForegroundColor Cyan

# 1. Check for Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js is installed ($nodeVersion)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js is not installed. Please install it from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 2. Check for PostgreSQL
if (Get-Service "postgresql*" -ErrorAction SilentlyContinue) {
    Write-Host "[OK] PostgreSQL service found." -ForegroundColor Green
} else {
    Write-Host "[WARNING] PostgreSQL service not found. Ensure you have PostgreSQL installed and running locally on port 5432." -ForegroundColor Yellow
}

# 3. Install Root Dependencies
Write-Host "Installing root dependencies..." -ForegroundColor Gray
npm install

# 4. Install Server Dependencies & Build
Write-Host "Setting up backend..." -ForegroundColor Gray
cd server
npm install
npx prisma generate
npm run build
cd ..

# 5. Build Frontend
Write-Host "Building frontend..." -ForegroundColor Gray
npm run build

# 6. Environment Variables
if (-not (Test-Path "server/.env")) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Gray
    Copy-Item "server/.env.example" "server/.env"
    Write-Host "[ACTION] Please update server/.env with your local PostgreSQL credentials." -ForegroundColor Yellow
}

Write-Host "`n--- Setup Complete ---" -ForegroundColor Cyan
Write-Host "To run the application natively:" -ForegroundColor White
Write-Host "1. Ensure PostgreSQL is running and database 'dindigul_db' is created."
Write-Host "2. Run 'npx prisma migrate deploy' in the server directory."
Write-Host "3. Use PM2 to manage processes: 'pm2 start infrastructure/ecosystem.config.js'"
Write-Host "4. Or run manually:"
Write-Host "   - Backend: 'cd server; npm start'"
Write-Host "   - Frontend: 'npm run dev' (for development) or 'npm run preview' (for production test)"
