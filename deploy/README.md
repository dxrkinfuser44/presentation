# Presentation Dashboard - Systemd Deployment

## Prerequisites

- Node.js installed at `/usr/bin/node` (or adjust `ExecStart` in the service file)
- The presentation dashboard repo cloned on the server

## Installation

### 1. Edit the service file

Open `presentation.service` and set the required values:

- **User**: Set to the Linux user that should own the process (e.g. `www-data`, `ubuntu`)
- **WorkingDirectory**: Set to the absolute path where the repo is cloned (e.g. `/opt/presentation`)

### 2. Copy the service file

```bash
sudo cp deploy/presentation.service /etc/systemd/system/presentation.service
```

### 3. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable presentation
sudo systemctl start presentation
```

### 4. Verify it is running

```bash
sudo systemctl status presentation
```

### 5. View logs

```bash
# Recent logs
sudo journalctl -u presentation

# Follow logs in real time
sudo journalctl -u presentation -f
```

## Managing the service

| Action      | Command                               |
| ----------- | ------------------------------------- |
| Stop        | `sudo systemctl stop presentation`    |
| Restart     | `sudo systemctl restart presentation` |
| Disable     | `sudo systemctl disable presentation` |
| Edit config | `sudo systemctl edit presentation`    |
