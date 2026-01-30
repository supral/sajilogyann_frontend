#!/usr/bin/env bash
#
# deploy.sh - Deploy React frontend for Sajilogyaan LMS
# Run from frontend (bluesheep) directory: ./deploy.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "Deploying Frontend (React)..."

# Check for .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    log_warn ".env not found. Copying .env.example to .env - please set REACT_APP_API_BASE_URL etc."
    cp .env.example .env
  fi
fi

# Install dependencies
if [ -f package-lock.json ]; then
  log_info "Running npm ci..."
  npm ci
else
  log_info "Running npm install..."
  npm install
fi

# Production build
log_info "Building React app (npm run build)..."
npm run build

if [ ! -d build ]; then
  log_error "Build failed: build/ directory not created."
  exit 1
fi

log_ok "Frontend build complete. Output: $SCRIPT_DIR/build"

# Optional: serve build with PM2 (npx serve)
if command -v pm2 &>/dev/null && command -v npx &>/dev/null; then
  if npx serve --help &>/dev/null 2>&1; then
    log_info "Serving build with 'serve' via PM2..."
    pm2 delete frontend 2>/dev/null || true
    pm2 start npx --name frontend -- serve build -s -l 3000
    pm2 save 2>/dev/null || true
    log_ok "Frontend served on port 3000 (PM2 name: frontend)"
  fi
else
  log_info "To serve the React build: install PM2 and 'serve', or point nginx to: $SCRIPT_DIR/build"
fi

log_ok "Frontend deploy complete."
