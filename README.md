# SRU-Meeting

แพลตฟอร์มประชุมออนไลน์แบบ **Self-hosted** สำหรับองค์กรที่ต้องการควบคุมข้อมูลและโครงสร้างพื้นฐานเอง รองรับการเข้าร่วมผ่านเว็บ แอปเดสก์ท็อป (Windows) มือถือ และการฝัง (embed) พร้อม SSO, Public API และ Webhook สำหรับเชื่อมต่อระบบเดิม

**SRU-Meeting** is a self-hosted video conference platform built on [LiveKit](https://livekit.io/). Organizations run media and metadata on their own infrastructure while users join from the web, a Windows desktop app, mobile apps, or embedded iframes.

---

## Features

| Area | Capabilities |
|------|--------------|
| **Meetings** | Video/audio, screen share, grid/speaker/sidebar layouts, up to 25 participants per room |
| **Collaboration** | Public & private chat, file attachments, raise hand, reactions, polls, Q&A, collaborative whiteboard |
| **Moderation** | Host controls, mute/kick, lobby & knocking, room password, join policies |
| **Breakouts** | Create/assign/move participants, timers, broadcast, recall-all |
| **Recording & VOD** | Composite & track egress, PDPA consent, HLS playback, signed downloads |
| **Live streaming** | RTMP destinations, HLS live playlist, org player |
| **Enterprise auth** | Credentials, OIDC (Keycloak, Microsoft Entra, Google, Okta), SAML 2.0, LDAP/AD, SCIM 2.0 |
| **Integrations** | API keys + HMAC, signed webhooks, Swagger UI at `/docs`, iframe embed with `postMessage` |
| **Admin & compliance** | Org RBAC, audit log, retention & deletion, analytics dashboard, QoS reporting |
| **Media polish** | Krisp noise suppression, virtual backgrounds, optional E2EE (Insertable Streams) |
| **Mobile** | Expo app (dev build) with grid, mute, PiP, CallKit/ConnectionService |
| **Desktop** | Tauri thin shell (WebView2, Windows v1) — tray, deep links, native lobby notifications, SSO via system browser |
| **Deployment** | Docker Compose for local/small org; Coolify guide; optional Helm charts for Kubernetes |

---

## Architecture

```text
Clients (Next.js web · Tauri desktop · Expo mobile · embed iframe)
        │ HTTPS / WSS / WebRTC
        ▼
Edge (Nginx / Traefik)          — optional locally; Compose ports are enough for dev
        │
        ├── Next.js Route Handlers ── PostgreSQL, Redis, MinIO (S3)
        │       └── /api/auth/desktop/* — SSO ticket exchange for desktop shell
        └── LiveKit SFU + coturn   ── Redis (room state)
                └── Egress worker  ── recordings → MinIO
```

| Component | Role |
|-----------|------|
| `apps/web` | Next.js 15 App Router — UI, `/api/v1/*`, Auth.js, Prisma |
| `packages/shared` | Zod schemas and shared types (`@sru/shared`) |
| `packages/embed` | Embed handshake helpers (`@sru/embed`) |
| `apps/mobile` | Expo / React Native client |
| `apps/desktop` | Tauri 2 thin shell (WebView2) — tray, deep links, desktop SSO bridge |
| `apps/worker-transcribe` | Transcription worker stub (STT provider TBD) |
| `infra/` | Docker Compose, LiveKit/coturn/egress config, Helm charts, load tests |

LiveKit JWTs are minted **only on the server** with `livekit-server-sdk`. `LIVEKIT_API_SECRET` never ships in the client bundle.

---

## Prerequisites

- **Node.js** ≥ 18.18 (CI uses Node 24)
- **pnpm** 10.28.0 (`corepack enable && corepack prepare pnpm@10.28.0 --activate`)
- **Docker Desktop** (WSL2 backend on Windows) for the local media stack
- **Git**

---

## Quick start (local development)

### 1. Clone and install

```powershell
git clone <repo-url> SRU-Meeting
cd SRU-Meeting
pnpm install
```

### 2. Start the media stack

```powershell
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
```

Wait until all services are healthy. LiveKit health check:

```powershell
curl.exe http://127.0.0.1:7880/
```

See [infra/README.md](infra/README.md) for port mappings, Windows UDP/TURN notes, and troubleshooting.

### 3. Configure environment

```powershell
copy apps\web\.env.example apps\web\.env.local
```

Set at minimum:

- `AUTH_SECRET` — long random string (required for sign-in)
- Other values in `.env.example` match the local Compose stack by default

### 4. Database migrations

```powershell
pnpm --filter web prisma migrate dev
```

### 5. Run the web app

```powershell
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Register a local account, create a room, and join from a second browser tab to verify A/V.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server (`apps/web`, Turbopack) |
| `pnpm dev:desktop` | Tauri dev shell (WebView2 → local web; requires Rust + WebView2) |
| `pnpm build` | Production build |
| `pnpm build:desktop` | Windows MSI per org (set `SRU_SERVER_URL`) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check (all packages) |
| `pnpm test` | Unit tests (all packages) |
| `pnpm --filter web prisma …` | Prisma CLI |
| `pnpm --filter mobile start` | Expo dev server (requires dev build) |

---

## Project structure

```text
SRU-Meeting/
├── apps/
│   ├── web/                 # Next.js app (main product)
│   ├── mobile/              # Expo / React Native
│   ├── desktop/             # Tauri / Windows thin shell
│   └── worker-transcribe/   # Transcription worker
├── packages/
│   ├── shared/              # @sru/shared — Zod contracts
│   └── embed/               # @sru/embed — iframe handshake
├── infra/
│   ├── docker-compose.yml   # Local LiveKit, Postgres, Redis, coturn, MinIO, egress
│   ├── helm/                # Kubernetes charts (optional production)
│   └── loadtest/            # Load-test runner
├── docs/                    # Specs (implement-plan, e2ee)
└── tasks/                   # Implementation plan & task checklist
```

---

## API & documentation

- **Swagger UI:** [http://localhost:3000/docs](http://localhost:3000/docs) (OpenAPI at `/api/v1/openapi.json`)
- **Embed:** `/embed/rooms/[id]` with parent-origin allowlist (`EMBED_ALLOWED_ORIGINS`)
- **SCIM 2.0:** `/scim/v2/Users`, `/scim/v2/Groups`
- **Webhooks:** HMAC-signed delivery with retry tick at `/api/internal/webhooks/tick`

API authentication uses `X-Api-Key`, `X-Api-Timestamp`, and `X-Api-Signature` headers for programmatic access.

---

## Deployment

| Environment | Guide |
|-------------|-------|
| **Local / small org** | [infra/README.md](infra/README.md) — Docker Compose (default) |
| **Coolify (self-hosted PaaS)** | [docs/coolify-deployment.md](docs/coolify-deployment.md) — Docker Compose Build Pack |
| **Kubernetes** | [infra/helm/sru-meeting/README.md](infra/helm/sru-meeting/README.md) — Helm for web, Postgres, Redis, MinIO; separate charts for LiveKit, coturn, egress |
| **Load testing** | [infra/loadtest/README.md](infra/loadtest/README.md) |

Compose does **not** bind port 3000 — you can run the Next.js app alongside the stack.

For production, plan for TURN/TLS on **TCP 443**, LiveKit ICE UDP range **50000–60000** (Linux), and never commit real secrets.

---

## Mobile app

The Expo app joins using tokens minted by the web API — LiveKit secrets are never embedded in the mobile client.

```powershell
pnpm --filter mobile test
pnpm --filter mobile start
```

Requires a **development build** (`expo-dev-client`); LiveKit WebRTC does not run in Expo Go. See [apps/mobile/README.md](apps/mobile/README.md).

---

## Desktop app (Windows)

Tauri thin shell (WebView2) for org-deployed SRU Meeting. The app loads your organization's web UI and adds:

- System tray (show/hide, sign in, quit)
- Native lobby knock notifications (web → Tauri bridge)
- Deep links: `sru-meeting://rooms/{id}` and SSO callback `sru-meeting://auth/callback?ticket=…`
- SSO via system browser → one-time ticket → WebView session

LiveKit secrets stay on the server — the desktop bundle only knows `{SRU_SERVER_URL}`.

**Prerequisites:** Rust stable, Microsoft C++ Build Tools, WebView2 Runtime (preinstalled on Windows 11), plus the running web app and Compose stack for A/V tests.

```powershell
pnpm dev                    # web API (separate terminal)
pnpm dev:desktop            # Tauri shell → WebView2 loads /app
pnpm build:desktop          # per-org MSI (set SRU_SERVER_URL first)
```

Per-org builds bake the server URL at compile time:

```powershell
$env:SRU_SERVER_URL = "https://meeting.company.ac.th"
pnpm build:desktop
```

See [apps/desktop/README.md](apps/desktop/README.md) for SSO flow, deep links, icon generation, and the WebView2 A/V validation checklist.

---

## Cron / background jobs

Webhook retries and retention are not Compose sidecars. Call from cron with `Authorization: Bearer $INTERNAL_CRON_SECRET`:

```powershell
curl.exe -X POST -H "Authorization: Bearer $env:INTERNAL_CRON_SECRET" http://localhost:3000/api/internal/webhooks/tick
curl.exe -X POST -H "Authorization: Bearer $env:INTERNAL_CRON_SECRET" http://localhost:3000/api/internal/retention
```

---

## CI

GitHub Actions runs on push/PR to `main`: lint, typecheck, unit tests. CI does **not** start Docker or LiveKit — it uses a dummy `DATABASE_URL` for Prisma generate only.

---

## Further reading

| Document | Contents |
|----------|----------|
| [docs/implement-plan.md](docs/implement-plan.md) | Full product specification (Thai) |
| [docs/e2ee.md](docs/e2ee.md) | End-to-end encryption policy and limits |
| [tasks/plan.md](tasks/plan.md) | Phased implementation plan |
| [tasks/todo.md](tasks/todo.md) | Task checklist |
| [infra/README.md](infra/README.md) | Compose stack, ports, credentials, Windows notes |
| [docs/coolify-deployment.md](docs/coolify-deployment.md) | Deploy on Coolify v4 (Compose Build Pack) |

---

## Tech stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 4, `@livekit/components-react`
- **Backend:** Next.js Route Handlers, Prisma 6, PostgreSQL, Auth.js (NextAuth v5)
- **Realtime media:** LiveKit SFU, coturn, LiveKit Egress
- **Storage:** MinIO (S3-compatible) for chat files and recordings
- **Validation:** Zod 4 (`@sru/shared`)
- **Mobile:** Expo, `@livekit/react-native`
- **Desktop:** Tauri 2 (WebView2 thin shell, Windows v1)
- **Whiteboard:** tldraw
- **Package manager:** pnpm workspaces

---

## License

Private / internal project — no license file is published yet. Contact the repository owner for usage terms.
