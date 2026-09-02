# Coolify deployment

Production Docker Compose and Dockerfile for [Coolify](https://coolify.io/) v4.

**Full guide:** [docs/coolify-deployment.md](../../docs/coolify-deployment.md)

| File | Purpose |
|------|---------|
| `docker-compose.yml` | All-in-one stack for Coolify Compose Build Pack |
| `Dockerfile` | Next.js web image (monorepo build) |
| `deploy-api.ps1` | Deploy via Coolify REST API (public Git) |
| `.env.coolify.example` | Template for `COOLIFY_URL` / `COOLIFY_TOKEN` |

Coolify settings:

- **Docker Compose location:** `/infra/coolify/docker-compose.yml` (leading `/` required by Coolify API)
- **Build pack:** Docker Compose

### Deploy via API

```powershell
$env:COOLIFY_URL = "http://coolify.example.com:8000"
$env:COOLIFY_TOKEN = "<api-token>"
.\infra\coolify\deploy-api.ps1 `
  -ProjectName "SRU-Meeting" `
  -ServerPublicIp "x.x.x.x" `
  -WebDomain "https://meeting.example.ac.th:3000" `
  -LivekitDomain "https://livekit.example.ac.th:7880" `
  -OrgAdminEmails "admin@org.ac.th"
```

See [docs/coolify-deployment.md](../../docs/coolify-deployment.md#deploy-via-api).
