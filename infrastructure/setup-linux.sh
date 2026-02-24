#!/bin/bash
# Dindigul Bank Portal - Native Linux Setup Script
# This script prepares the environment for running without Docker.

echo -e "\e[36m--- Dindigul Bank Portal Native Setup ---\e[0m"

# 1. Check for Node.js
if command -v node &> /dev/null; then
    echo -e "\e[32m[OK] Node.js is installed ($(node -v))\e[0m"
else
    echo -e "\e[31m[ERROR] Node.js is not installed. Please install it.\e[0m"
    exit 1
fi

# 2. Check for PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo -e "\e[32m[OK] PostgreSQL service is running.\e[0m"
else
    echo -e "\e[33m[WARNING] PostgreSQL service is not running. Ensure you have PostgreSQL installed and running locally.\e[0m"
fi

# 3. Install Root Dependencies
echo "Installing root dependencies..."
npm install

# 4. Install Server Dependencies & Build
echo "Setting up backend..."
cd server
npm install
npx prisma generate
npm run build
cd ..

# 5. Build Frontend
echo "Building frontend..."
npm run build

# 6. Environment Variables
if [ ! -f server/.env ]; then
    echo "Creating .env from .env.example..."
    cp server/.env.example server/.env
    echo -e "\e[33m[ACTION] Please update server/.env with your local PostgreSQL credentials.\e[0m"
fi

echo -e "\n\e[36m--- Setup Complete ---\e[0m"
echo -e "To run the application natively:"
echo "1. Ensure PostgreSQL is running and database 'dindigul_db' is created."
echo "2. Run 'npx prisma migrate deploy' in the server directory."
echo "3. Use PM2: 'pm2 start infrastructure/ecosystem.config.js'"
echo "4. Use systemd (Linux only): 'sudo cp infrastructure/api.service /etc/systemd/system/'"
