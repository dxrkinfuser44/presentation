#!/bin/bash
# Setup script for presentation dashboard server
# Run this on WSL2 after installing Node.js

set -e

echo "=== Presentation Dashboard Setup ==="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Install Node.js 18+ on your WSL2 system:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Build the project
echo ""
echo "Building the project..."
npm run build

# Verify dist/ was created
if [ ! -d "dist" ]; then
    echo "ERROR: dist/ directory was not created"
    exit 1
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the server:"
echo "  npm start"
echo ""
echo "To start in development mode:"
echo "  npm run dev"
echo ""
echo "The server will be available at:"
echo "  http://localhost:3000"
echo ""
echo "For Tailscale publishing (from Windows PowerShell):"
echo "  tailscale serve --https=443 / http://localhost:3000"
