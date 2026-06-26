#!/bin/bash
# Setup system for Presentation Dashboard
# This script will install Node.js and set up the environment

set -e

echo "=== Setting up Presentation Dashboard System ==="
echo ""

# Check if we're in WSL
if grep -q "microsoft" /proc/version 2>/dev/null; then
    echo "✅ Detected WSL environment"
else
    echo "⚠️  Not running in WSL. This setup is optimized for WSL."
fi

# Check if Node.js is available
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js is already installed: $NODE_VERSION"
else
    echo "❌ Node.js is not installed. Installing..."
    echo ""
    
    # Detect package manager
    if command -v dnf &> /dev/null; then
        echo "Detected dnf (Fedora/RHEL)"
        echo "Installing Node.js via NodeSource repository..."
        
        # Install NodeSource repository
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        
        # Install Node.js
        sudo dnf install -y nodejs
        
    elif command -v apt-get &> /dev/null; then
        echo "Detected apt-get (Debian/Ubuntu)"
        echo "Installing Node.js via NodeSource repository..."
        
        # Install NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
        
        # Install Node.js
        sudo apt-get install -y nodejs
        
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

# Check if we're in the presentation directory
if [ ! -f "/mnt/c/Users/hansi/downloads/presentation/package.json" ]; then
    echo "❌ Presentation dashboard not found in current directory"
    echo "Please run this script from the presentation dashboard directory."
    exit 1
fi

echo "✅ Presentation dashboard found"

# Install npm dependencies
echo ""
echo "Installing npm dependencies..."
sudo npm install

echo ""

# Check if setup script exists
if [ -f "/mnt/c/Users/hansi/downloads/presentation/scripts/setup.sh" ]; then
    echo "✅ Setup script found. Running..."
    echo ""
    
    # Run the setup script
    cd /mnt/c/Users/hansi/downloads/presentation
    ./scripts/setup.sh
    
else
    echo "❌ Setup script not found. Running basic setup..."
    echo ""
    
    # Basic setup
    cd /mnt/c/Users/hansi/downloads/presentation
    
    # Create server directory if it doesn't exist
    mkdir -p server/routes server/middleware
    
    # Check if key files exist
    if [ ! -f "server/index.js" ]; then
        echo "❌ server/index.js not found. Please check the implementation."
        exit 1
    fi
    
    echo "✅ Basic setup completed"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "The Presentation Dashboard system is now ready!"
echo ""
echo "To start the server:"
echo "  cd /mnt/c/Users/hansi/downloads/presentation"
echo "  npm start"
echo ""
echo "To test the server:"
echo "  curl http://localhost:3000/"
echo "  curl http://localhost:3000/api/presentations"
echo ""
echo "To run the smoke test:"
echo "  ./scripts/smoke-test.sh"
echo ""
echo "For detailed instructions, see:"
echo "  cat WSL_SETUP.md"
echo ""
echo "For systemd service setup:"
echo "  sudo cp deploy/presentation.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable presentation"
echo "  sudo systemctl start presentation"
echo ""
echo "For Tailscale publishing (Windows):"
echo "  tailscale serve --https=443 / http://localhost:3000"
echo ""
echo "🎉 System setup complete!"