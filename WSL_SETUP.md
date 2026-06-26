# WSL Setup Guide: Fedora 43 (WSL) + Node.js + Presentation Dashboard

## System Information

- **Distribution**: Fedora Linux 43 (WSL)
- **Package Manager**: dnf
- **Architecture**: x86_64

## Prerequisites

### 1. Enable WSL2 (if not already)

If you're running WSL1, you need to:

1. Open PowerShell as Administrator
2. Run: `wsl --shutdown`
3. Run: `wsl --install`
4. Restart your terminal

### 2. Update Fedora Packages

```bash
# Update package database
sudo dnf update -y

# Install required packages for Node.js development
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y git curl wget
```

## Install Node.js

### Option 1: Using NodeSource Repository (Recommended)

```bash
# Install NodeSource repository for Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version
```

### Option 2: Using Fedora Repository

```bash
# Install Node.js 20 from Fedora repos
sudo dnf install -y nodejs20 nodejs20-devel

# Create symlink for node command
 sudo ln -s /usr/bin/nodejs20 /usr/bin/node
 sudo ln -s /usr/bin/npm20 /usr/bin/npm

# Verify installation
node --version
npm --version
```

### Option 3: Using NVM (Recommended for version management)

```bash
# Install NVM
curl -fsSL https://github.com/nvm-sh/nvm/archive/refs/tags/v0.40.0.tar.gz | tar -xz -C /tmp
source /tmp/nvm-0.40.0/bash

# Add to your shell profile
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ - "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.bashrc

# Reload shell
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version
npm --version
```

## Install Presentation Dashboard Dependencies

### Clone Repository (if not already done)

```bash
# Clone the presentation repository
cd ~
git clone https://github.com/dxrkinfuser44/presentation.git
cd presentation
```

### Install Dependencies

```bash
# Install npm dependencies (requires sudo for system packages)
sudo npm install
```

## Start the Server

### Development Mode

```bash
cd /mnt/c/Users/hansi/downloads/presentation
npm run dev
```

### Production Mode

```bash
cd /mnt/c/Users/hansi/downloads/presentation
npm start
```

## Verify Installation

### Test the Server

```bash
# Test dashboard endpoint
curl http://localhost:3000/

# Test API endpoint
curl http://localhost:3000/api/presentations

# Check server logs (if running in background)
# Use journalctl if using systemd
sudo journalctl -u presentation -f
```

### Smoke Test

```bash
# Run the smoke test script
cd /mnt/c/Users/hansi/downloads/presentation
./scripts/smoke-test.sh
```

## Systemd Service Setup (Optional)

### Create Systemd Service

```bash
# Create deploy directory if it doesn't exist
mkdir -p /mnt/c/Users/hansi/downloads/presentation/deploy

# Copy the service file (adjust paths as needed)
sudo cp /mnt/c/Users/hansi/downloads/presentation/deploy/presentation.service /etc/systemd/system/

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable presentation
sudo systemctl start presentation

# Check status
sudo systemctl status presentation
```

### Service File Content

```ini
[Unit]
Description=Presentation Dashboard
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/mnt/c/Users/hansi/downloads/presentation
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

## Tailscale Publishing (Windows Host)

### Prerequisites

1. Install Tailscale on your Windows host
2. Sign in to your Tailnet

### Publish with Tailscale

```powershell
# From Windows PowerShell
tailscale serve --https=443 / http://localhost:3000
```

### Verify Tailscale Status

```powershell
# Check if Tailscale is serving
tailscale serve status
```

### Stop Serving

```powershell
# Stop Tailscale serving
tailscale serve --remove
```

## Troubleshooting

### Node.js Not Found

```bash
# Check if Node.js is in PATH
which node

# If not found, reinstall using one of the methods above
```

### npm Installation Issues

```bash
# Clear npm cache if needed
sudo npm cache clean -f

# Reinstall npm
sudo npm install -g npm@latest
```

### Permission Issues

```bash
# Use sudo for system-wide installations
sudo npm install

# For local development, use npm install --user
npm install --user
```

### Server Not Starting

```bash
# Check if port 3000 is already in use
netstat -tulpn | grep :3000

# Kill any existing server
pkill -f "node server/index.js"

# Start again
npm start
```

## Additional Notes

### WSL2 vs WSL1

- **WSL2** is recommended for better performance and compatibility
- **WSL1** may have limitations with some Node.js features
- This setup guide assumes WSL2

### File Permissions

- Ensure the presentation directory has proper permissions
- Use `chmod` if needed: `chmod +x scripts/*.sh`

### Environment Variables

- Set `PORT` environment variable if you want to use a different port:
  ```bash
  export PORT=3001
  npm start
  ```

### Backup

- Always backup your HTML files before making changes
- The server automatically watches for changes, but it's good practice to have backups

## Quick Start Checklist

- [ ] Install WSL2 (if not already)
- [ ] Update Fedora packages
- [ ] Install Node.js (using NodeSource or NVM)
- [ ] Clone presentation repository
- [ ] Install npm dependencies
- [ ] Test server with `npm start`
- [ ] Run smoke test
- [ ] Set up systemd service (optional)
- [ ] Configure Tailscale (optional)

## Support

If you encounter any issues:

1. Check the logs: `journalctl -u presentation -f`
2. Visit the repository: https://github.com/dxrkinfuser44/presentation
3. Check Tailscale documentation: https://tailscale.com/docs

This setup guide should get you up and running with the presentation dashboard server in no time!
