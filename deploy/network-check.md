# Network Check — WSL2 to Windows Port Forwarding

Verify the presentation server is reachable from the Windows host before layering Tailscale on top.

---

## WSL2 Networking Modes

WSL2 supports two networking modes that affect how ports are forwarded between the Linux VM and the Windows host.

### NAT Mode (Default)

- WSL2 runs a **NAT (Network Address Translation)** network by default.
- The Linux VM gets its own IP address on a virtual subnet (e.g. `172.x.x.x`).
- Windows automatically forwards `localhost` traffic to the WSL2 VM for commonly used ports.
- **If forwarding breaks**, you must bind to `0.0.0.0` (not `127.0.0.1`) so the Windows host can reach the server through the NAT gateway.
- `tailscale serve` running on Windows can proxy to `http://localhost:<port>` because of this automatic forwarding.

### Mirrored Mode (Windows 11 22H2+)

- WSL2 shares the **Windows network stack** directly — no NAT layer.
- The WSL2 instance uses the same IP address as the Windows host.
- `0.0.0.0` binding works, but forwarding rules are simpler since there is no NAT boundary.
- Enabled by adding `networkingMode=mirrored` to `.wslconfig`.

---

## Check Your Current Networking Mode

On **Windows**, check the WSL2 configuration file:

```
%USERPROFILE%\.wslconfig
```

Typical path: `C:\Users\<YourUsername>\.wslconfig`

### If the file exists

Look for a `networkingMode` key under `[wsl2]`:

```ini
[wsl2]
networkingMode=mirrored
```

- `networkingMode=mirrored` → Mirrored mode (no NAT)
- No `networkingMode` key, or `networkingMode=nat` → NAT mode (default)
- `networkingMode=none` → No networking

### If the file does not exist

WSL2 defaults to **NAT mode**.

### Quick Check from WSL2

You can also verify the mode from inside WSL2:

```bash
cat /etc/resolv.conf
```

- If `nameserver` points to a `172.x.x.x` or `192.168.x.x` address → **NAT mode**
- If `nameserver` is missing or points to `127.0.0.1` → **Mirrored mode**

---

## Why `0.0.0.0` Binding Matters

The server must listen on `0.0.0.0:<port>` (not `127.0.0.1:<port>`).

| Binding          | NAT Mode                                                            | Mirrored Mode               |
| ---------------- | ------------------------------------------------------------------- | --------------------------- |
| `127.0.0.1:3000` | Only reachable from inside WSL2. Windows cannot reach it.           | Works (same network stack). |
| `0.0.0.0:3000`   | Reachable from Windows via `localhost:3000` through NAT forwarding. | Works.                      |

**For NAT mode (default)**, `127.0.0.1` binds to the WSL2 VM's loopback only. Windows host cannot route to it. Binding to `0.0.0.0` makes the server accept connections on all interfaces, allowing the Windows-side `localhost` forwarding to reach it.

The `server/index.js` should use:

```javascript
app.listen(PORT, '0.0.0.0', () => { ... });
```

---

## Port Availability Check

Before starting the server, verify port 3000 is free on both sides.

### WSL2 side (Linux)

```bash
ss -tlnp | grep :3000
# or
netstat -tlnp 2>/dev/null | grep :3000
```

If a process is listed, kill it or change the port.

### Windows side (PowerShell)

```powershell
netstat -ano | findstr :3000
```

If a process is listed, note its PID and kill it, or choose a different port.

---

## Test Command — Windows Side

Once the server is running in WSL2, run this from **Windows PowerShell** to confirm WSL2→Windows forwarding works:

```powershell
curl http://localhost:3000
```

### Expected Result (Working)

A **200 OK** response with HTML content. You should see the dashboard HTML, something like:

```html
<!DOCTYPE html>
<html>
  ...
  <title>Presentation Dashboard</title>
  ...
</html>
```

The response body should contain the dashboard page markup.

### What to Expect if Not Working

| Symptom                                              | Likely Cause                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `curl: (7) Failed to connect to localhost port 3000` | Server not running, or bound to `127.0.0.1` instead of `0.0.0.0`.     |
| `Connection refused`                                 | Server not started yet, or firewall blocking.                         |
| `The connect failed`                                 | WSL2 networking not working; check `.wslconfig` and restart WSL2.     |
| Response but blank page                              | Server is reachable but serving wrong content (check `dist/` exists). |

---

## Troubleshooting

### 1. Server binds to 127.0.0.1 instead of 0.0.0.0

**Fix**: Ensure `server/index.js` calls:

```javascript
app.listen(PORT, "0.0.0.0");
```

Restart the server after fixing.

### 2. Port 3000 is in use

**WSL2**: `kill $(lsof -ti:3000)` or use a different port.

**Windows**: `taskkill /PID <PID> /F` or change the port.

### 3. WSL2 localhost forwarding not working (NAT mode)

Restart the WSL2 networking stack:

```powershell
# From Windows PowerShell (admin)
wsl --shutdown
```

Then restart WSL2 and the server.

### 4. Firewall blocking port 3000 (Windows)

Add a Windows Firewall rule:

```powershell
New-NetFirewallRule -DisplayName "WSL2 Presentation Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 5. Switch to mirrored mode (if available)

If your Windows version supports it, add to `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Then restart WSL2:

```powershell
wsl --shutdown
```

This eliminates the NAT layer entirely and makes port forwarding automatic.

### 6. Verify server is actually listening inside WSL2

```bash
# Inside WSL2
ss -tlnp | grep :3000
# Should show: LISTEN 0.0.0.0:3000 ...
```

If it shows `127.0.0.1:3000`, the server is not bound correctly.

---

## Summary Checklist

- [ ] WSL2 networking mode identified (NAT or mirrored)
- [ ] `server/index.js` binds to `0.0.0.0:<PORT>`
- [ ] Port 3000 is free on both WSL2 and Windows
- [ ] Server started and listening on `0.0.0.0:3000`
- [ ] `curl http://localhost:3000` from PowerShell returns 200 with HTML
- [ ] (Optional) Firewall rule added for port 3000
- [ ] Ready to layer Tailscale serve on top
