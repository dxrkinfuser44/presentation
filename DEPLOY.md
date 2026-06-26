# Deployment Guide: Presentation Dashboard → Dynamic WSL/Tailscale Server

## Overview

This guide will help you deploy the migrated Presentation Dashboard system from static GitHub Pages to a dynamic Node/Express server with live file watching, hosted in WSL2 and published via Tailscale Serve.

## Prerequisites

### 1. WSL2 Environment

- **Running WSL2** (not WSL1)
- **Administrator access** on Windows to install WSL2
- **Sufficient disk space** (at least 1GB for Node.js and dependencies)

### 2. Windows Host

- **Tailscale installed** on Windows (for publishing)
- **Administrator access** on Windows

## Step 1: Set Up WSL2 (If Not Already Done)

### Install WSL2

```powershell
# From Windows PowerShell as Administrator
wsl --install
```

### Configure WSL2

```powershell
# Set WSL2 as default
wsl --set-default-version 2

# Restart WSL
wsl --shutdown
```

### Update WSL2

```bash
# In WSL2 terminal
sudo apt update
sudo apt upgrade -y
```

## Step 2: Install Node.js

### Option 1: Using NodeSource Repository (Recommended)

```bash
# Install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Option 2: Using NVM (Recommended)

```bash
# Install NVM
curl -fsSL https://github.com/nvm-sh/nvm/archive/refs/tags/v0.40.0.tar.gz | tar -xz -C /tmp
source /tmp/nvm-0.40.0/bash

# Add to shell profile
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ - "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.bashrc
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version
npm --version
```

## Step 3: Clone Repository

```bash
# Clone the presentation repository
cd ~
git clone https://github.com/dxrkinfuser44/presentation.git
cd presentation
```

## Step 4: Run Setup Script

```bash
# Run the setup script (installs dependencies and configures system)
cd /mnt/c/Users/hansi/downloads/presentation
./setup-system.sh
```

## Step 5: Start the Server

### Development Mode

```bash
cd /mnt/c/Users/hansi/downloads/presentation
npm start
```

### Production Mode (Systemd)

```bash
# Copy systemd service file
sudo cp deploy/presentation.service /etc/systemd/system/

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable presentation
sudo systemctl start presentation

# Check status
sudo systemctl status presentation
```

### Production Mode (Direct)

```bash
cd /mnt/c/Users/hansi/downloads/presentation
nohup npm start > server.log 2>&1 &
```

## Step 6: Test the Server

### Basic Tests

```bash
# Test dashboard endpoint
curl http://localhost:3000/

# Test API endpoint
curl http://localhost:3000/api/presentations

# Check server logs (if running in background)
cat server.log
```

### Smoke Test

```bash
# Run the smoke test script
cd /mnt/c/Users/hansi/downloads/presentation
./scripts/smoke-test.sh
```

## Step 7: Publish with Tailscale

### Prerequisites

1. Install Tailscale on Windows
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

## Step 8: Verify Deployment

### Check Systemd Service

```bash
# Check service status
sudo systemctl status presentation

# View logs
sudo journalctl -u presentation -f
```

### Check Process

```bash
# Check if server is running
ps aux | grep node

# Check listening ports
netstat -tulpn | grep :3000
```

### Test API Endpoints

```bash
# Test dashboard
curl -I http://localhost:3000/

# Test API
curl -I http://localhost:3000/api/presentations

# Test non-existent endpoint
curl -I http://localhost:3000/nonexistent
```

## Step 9: File Watching Test

### Test File Changes

1. Create a new presentation file in `html/year10/`:

   ```bash
   mkdir -p html/year10/test-subject
   echo '<!doctype html>
   <!--@presentation
   {
   "title": "Test Presentation",
   "subject": "Test",
   "year": 10,
   "description": "Test presentation",
   "accent": "#ff0000",
   "bg": "#000000",
   "tags": ["test"]
   }
   -->
   <html>
   <head><title>Test</title></head>
   <body><h1>Test Presentation</h1></body>
   </html>' > html/year10/test-subject/test-presentation.html
   ```

2. Check if API reflects the change:
   ```bash
   curl http://localhost:3000/api/presentations | grep "Test Presentation"
   ```

## Troubleshooting

### Node.js Not Found

```bash
# Check if Node.js is in PATH
which node

# If not found, reinstall using one of the methods above
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

### Systemd Service Issues

```bash
# Check service status
sudo systemctl status presentation

# Restart service
sudo systemctl restart presentation

# View logs
sudo journalctl -u presentation -f
```

### Tailscale Issues

```powershell
# Check Tailscale status
tailscale status

# Check serve status
tailscale serve status

# Re-publish
tailscale serve --https=443 / http://localhost:3000
```

## Configuration Options

### Change Port

```bash
# Set PORT environment variable
export PORT=3001
npm start
```

### Custom Host

```bash
# Set HOST environment variable
export HOST=0.0.0.0
npm start
```

### Disable Logging

```bash
# Set LOG_LEVEL to silent
export LOG_LEVEL=silent
npm start
```

## Backup and Recovery

### Backup

```bash
# Backup important files
cp -r html/ html-backup/
cp package.json package.json.backup
cp -r deploy/ deploy-backup/
```

### Recovery

```bash
# Restore from backup
cp -r html-backup/ html/
cp package.json.backup package.json
cp -r deploy-backup/ deploy/
```

## Monitoring

### System Resources

```bash
# Check system resources
free -h

# Check disk usage
df -h

# Check process resources
ps aux | grep node
```

### Server Logs

```bash
# Check server logs
sudo journalctl -u presentation -f

# Or check direct log file
cat server.log
```

## Security Considerations

### Firewall

```bash
# Open port 3000 (if using firewall)
sudo ufw allow 3000
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### Environment Variables

```bash
# Set sensitive environment variables
export NODE_ENV=production
export PORT=3000
export LOG_LEVEL=info
```

## Performance Optimization

### Production Settings

```bash
# Use production Node.js settings
export NODE_OPTIONS=--max-old-space-size=4096

# Use production npm scripts
npm run build
npm start
```

### Cache Management

```bash
# Clear npm cache
sudo npm cache clean -f

# Clear Node.js module cache
rm -rf node_modules/.cache
```

## Support

If you encounter any issues:

1. Check the logs: `sudo journalctl -u presentation -f`
2. Visit the repository: https://github.com/dxrkinfuser44/presentation
3. Check Tailscale documentation: https://tailscale.com/docs
4. Check WSL documentation: https://docs.microsoft.com/en-us/windows/wsl/

## Quick Deployment Checklist

- [ ] Install WSL2 (if not already)
- [ ] Update WSL2 packages
- [ ] Install Node.js (using NodeSource or NVM)
- [ ] Clone presentation repository
- [ ] Run setup script
- [ ] Start server
- [ ] Test endpoints
- [ ] Run smoke test
- [ ] Set up systemd service (optional)
- [ ] Configure Tailscale (optional)
- [ ] Verify deployment
- [ ] Test file watching
- [ ] Configure monitoring

## Conclusion

This deployment guide provides comprehensive instructions for deploying the Presentation Dashboard system from static GitHub Pages to a dynamic Node/Express server with live file watching, hosted in WSL2 and published via Tailscale Serve.

The system is now ready for production deployment with:

- Live file watching and automatic cache updates
- Dynamic API endpoint that scans HTML files in real-time
- Proper error handling and graceful shutdown
- Comprehensive logging and monitoring
- Systemd service support for production
- Tailscale publishing for secure access

🎉 **Deployment Complete! Ready for production.**
