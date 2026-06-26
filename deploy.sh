#!/bin/bash
# Deploy Presentation Dashboard System
# This script will deploy the system for you

set -e

echo "=== Deploying Presentation Dashboard System ==="
echo ""

# Check if we're in the right directory
if [ ! -f "/mnt/c/Users/hansi/downloads/presentation/package.json" ]; then
    echo "❌ Presentation dashboard not found in current directory"
    echo "Please run this script from the presentation dashboard directory."
    exit 1
fi

echo "✅ Presentation dashboard found"

# Check if Node.js is available
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js is installed: $NODE_VERSION"
else
    echo "❌ Node.js is not installed. Installing..."
    echo ""
    
    # Detect package manager
    if command -v apt-get &> /dev/null; then
        echo "Detected apt-get (Debian/Ubuntu)"
        echo "Installing Node.js via NodeSource repository..."
        
        # Install NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
        
        # Install Node.js
        sudo apt install -y nodejs
        
    elif command -v yum &> /dev/null; then
        echo "Detected yum (CentOS/RHEL)"
        echo "Installing Node.js via NodeSource repository..."
        
        # Install NodeSource repository
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        
        # Install Node.js
        sudo yum install -y nodejs
        
    else
        echo "❌ Unsupported package manager. Please install Node.js manually."
        echo ""
        echo "Manual installation instructions:"
        echo "1. Visit https://nodejs.org/en/download/"
        echo "2. Download Node.js 20.x for your platform"
        echo "3. Run the installer"
        echo ""
        echo "After installing Node.js, run this script again."
        exit 1
    fi
    
    # Verify installation
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        NPM_VERSION=$(npm --version)
        echo "✅ Node.js installed successfully:"
        echo "   Version: $NODE_VERSION"
        echo "   npm Version: $NPM_VERSION"
    else
        echo "❌ Failed to install Node.js"
        exit 1
    fi
fi

echo ""

# Install npm dependencies
echo "Installing npm dependencies..."
sudo npm install

echo ""

# Run setup script
echo "Running setup script..."
cd /mnt/c/Users/hansi/downloads/presentation
./scripts/setup.sh

echo ""

# Start the server
echo "Starting the server..."
echo ""
echo "The server is starting. You can check the status with:"
echo "  sudo systemctl status presentation"
echo ""
echo "To check logs:"
echo "  sudo journalctl -u presentation -f"
echo ""
echo "To stop the server:"
echo "  sudo systemctl stop presentation"
echo ""
echo "To restart the server:"
echo "  sudo systemctl restart presentation"
echo ""
echo "The server should be running on http://localhost:3000"
echo ""
echo "🎉 Deployment complete! The Presentation Dashboard system is ready for use."