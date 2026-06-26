#!/bin/bash
# Check Node.js installation and provide setup instructions

set -e

echo "=== Node.js Check for Presentation Dashboard ==="
echo ""

# Check if node is available
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    echo "✅ Node.js is installed:"
    echo "   Version: $NODE_VERSION"
    echo "   npm Version: $NPM_VERSION"
    echo ""
    
    # Check if we can run the presentation setup
    if [ -f "/mnt/c/Users/hansi/downloads/presentation/scripts/setup.sh" ]; then
        echo "✅ Presentation setup script found"
        echo "   You can run: ./scripts/setup.sh"
    else
        echo "❌ Presentation setup script not found"
    fi
    
    exit 0
else
    echo "❌ Node.js is not installed"
    echo ""
    echo "This system is running Fedora Linux 43 (WSL)"
    echo ""
    echo "To install Node.js, run one of the following commands:"
    echo ""
    echo "Option 1: Using NodeSource repository (Recommended)"
    echo "  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -"
    echo "  sudo dnf install -y nodejs"
    echo ""
    echo "Option 2: Using NVM (Recommended for version management)"
    echo "  curl -fsSL https://github.com/nvm-sh/nvm/archive/refs/tags/v0.40.0.tar.gz | tar -xz -C /tmp"
    echo "  source /tmp/nvm-0.40.0/bash"
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo ""
    echo "After installing Node.js, run:"
    echo "  cd /mnt/c/Users/hansi/downloads/presentation"
    echo "  ./scripts/setup.sh"
    echo ""
    echo "For detailed instructions, see: WSL_SETUP.md"
    exit 1
fi