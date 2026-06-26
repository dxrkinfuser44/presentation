# Tailscale Serve — Windows Host Proxy

Proxy your local presentation server to your Tailscale network using `tailscale serve` on Windows.

> **Important**: All commands below run on the **Windows host** (PowerShell or cmd). Tailscale must NOT be installed or referenced inside WSL2.

---

## Prerequisites

- Tailscale installed and running on Windows
- Your presentation server running locally (Vite dev server or production server)

## Vite Dev Server (port 5173)

Start the dev server in WSL2:

```bash
npm run dev
```

Then in **Windows PowerShell**, expose it over Tailscale:

```powershell
tailscale serve --https=443 / http://localhost:5173
```

This proxies all requests (`/`) to the Vite dev server at `http://localhost:5173` over HTTPS.

## Production Server (port 3000)

Build and start the production server:

```bash
npm run build
npm start
```

Then in **Windows PowerShell**:

```powershell
tailscale serve --https=443 / http://localhost:3000
```

## Specific Path Routing

If you need to proxy only a specific path:

```powershell
# Proxy /dashboard to a specific port
tailscale serve --https=443 /dashboard http://localhost:3000/dashboard

# Proxy /dev to the Vite dev server
tailscale serve --https=443 /dev http://localhost:5173
```

## Verify the Configuration

Check what is currently being served:

```powershell
tailscale serve status
```

This displays:

- The Tailscale hostname and HTTPS URL
- Which local port each path maps to
- Whether the certificate is active

Example output:

```
https://my-machine.tailnet-name.ts.net/
  - Proxy: http://localhost:3000
```

## Stop Serving

Remove all serve rules:

```powershell
tailscale serve --remove
```

To remove a specific path:

```powershell
tailscale serve --remove /dashboard
```

## HTTPS Certificates

- Tailscale automatically provisions and manages HTTPS certificates
- No manual certificate setup required
- Certificates are trusted by all devices on your tailnet
- Certificates auto-renew before expiry

## Notes

- `tailscale serve` binds to port 443 by default (requires admin privileges or Windows service)
- The local server (Vite or Node) runs on its normal port — Tailscale handles TLS termination
- Access your presentation from any device on your tailnet at `https://<hostname>.<tailnet>.ts.net`
