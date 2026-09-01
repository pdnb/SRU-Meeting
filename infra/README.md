# Local media stack

**Docker Compose is the local / small-org default.** Use this file for day-to-day development. Kubernetes/Helm (`infra/helm/sru-conf`) is optional for production-style deploys and does **not** replace Compose for local work.

One-command local data and media plane for SRU-Conf: LiveKit, Redis, Postgres, coturn, MinIO, and an isolated LiveKit Egress worker (recording).

```powershell
docker compose -f infra/docker-compose.yml up -d
```

Wait until every service is healthy:

```powershell
docker compose -f infra/docker-compose.yml ps
```

LiveKit HTTP health (official `GET /` on the signal port — body `OK`, status `200`):

```powershell
curl.exe http://127.0.0.1:7880/
```

Stop:

```powershell
docker compose -f infra/docker-compose.yml down
```

This stack does **not** bind port `3000`. You can keep `pnpm --filter web dev` running at the same time.

## Windows Docker Desktop

Use **Docker Desktop for Windows** with the **WSL2** backend (Settings → General → Use the WSL 2 based engine). Hyper-V / Windows containers are not used by this Compose file.

`network_mode: host` is a Linux-only LiveKit production pattern. It does **not** work on Docker Desktop for Windows, so this file publishes ports instead.

After `up -d`, confirm Docker Desktop is running and that **Settings → Resources → WSL integration** is enabled for your distro if Compose commands run from WSL. From PowerShell, `docker version` should show both client and engine.

This file remaps a few **host** ports so Compose can sit next to common Windows tools (Laragon Redis on 6379, installer Postgres on 5432, Laravel Herd on 9001). Container ports stay standard; only the published host ports change (5433, 6380, 9002).

### UDP 50000–60000 (LiveKit ICE) — Windows failure and fallback

LiveKit’s documented ICE/UDP range is **50000–60000** ([ports and firewall](https://docs.livekit.io/transport/self-hosting/ports-firewall/)). This repo **tried** to publish that range on Windows Docker Desktop:

```text
127.0.0.1:50000-60000:50000-60000/udp
```

Docker Engine failed with:

```text
exposing port UDP 127.0.0.1:53046 -> 127.0.0.1:0: listen udp4 127.0.0.1:53046:
bind: An attempt was made to access a socket in a way forbidden by its access permissions.
```

Cause: Windows **excluded UDP port ranges** (WinNAT / Hyper-V / Docker Desktop) overlap 50000–60000. On this host (`netsh interface ipv4 show excludedportrange protocol=udp`):

- 50000–50059 (administered)
- 52663–53690 (several 100-port blocks)

Those ranges change after reboots and Hyper-V/WinNAT activity, so carving a “safe subset” of 50000–60000 is not reliable on Windows.

**Local fallback (what Compose uses now):** official LiveKit **UDP mux** `rtc.udp_port: 7882` ([config sample](https://github.com/livekit/livekit/blob/master/config-sample.yaml)). When `udp_port` is set, `port_range_start` / `port_range_end` are unused. Host mapping is `127.0.0.1:7882:7882/udp`.

**If mux UDP still fails for media:**

1. ICE-over-TCP **7881** (already published).
2. coturn TURN **3478/tcp** (preferred on Windows Docker Desktop) then **3478/udp**.
3. Production firewall path: **TCP 443** TURN/TLS (not bound locally — see below).

On this host, Docker Desktop does not complete ICE/UDP to `127.0.0.1:7882`. LiveKit therefore advertises its Compose address `172.19.0.10`, coturn is allowed to relay to `172.19.0.0/16`, and the local web client forces `iceTransportPolicy: "relay"` so media uses TURN/TCP. Do not copy that relay-only client setting to production.

**Linux / production:** restore `rtc.port_range_start: 50000` and `port_range_end: 60000`, drop `udp_port`, and publish or host-network 50000–60000/udp. Do not use this Windows mux as a production design.

This is a Phase 0 checkpoint item: review with a human before assuming two-browser A/V will work through Docker Desktop NAT.

### TCP 443 (TURN over TLS / firewall path)

This local stack does **not** bind host port 443 (no TLS certificates, and 443 needs admin rights).

In production, LiveKit documents **TURN/TLS on 443** so WebRTC can look like ordinary HTTPS to corporate firewalls ([deployment](https://docs.livekit.io/transport/self-hosting/deployment/)). Plan for:

- **TCP 443** — TURN over TLS (and HTTPS / WSS in front of the app)
- **UDP 443** — optional TURN/UDP on 443 where HTTP/3-style UDP is allowed

Locally, use **3478** (TURN/UDP+TCP) and keep **5349** published as the usual TURN/TLS port. Point a later reverse proxy or load balancer at 443 when you leave localhost.

### TURN 3478 / 5349 (coturn)

| Port | Protocol | Role |
|------|----------|------|
| 3478 | UDP + TCP | TURN/STUN (active locally) |
| 5349 | UDP + TCP | TURN/TLS port (published; TLS not enabled in this local file — no certs) |
| 49160–49200 | UDP | coturn relay (small range; official image warns Docker is poor with huge relay ranges) |

Local TURN user (localhost only): `sru` / `sru_turn_local`.

## Ports (host)

Published on **127.0.0.1** only so the stack is not reachable from other machines.

| Host port | Service | Use |
|-----------|---------|-----|
| 7880/tcp | LiveKit | HTTP API + WebSocket (`LIVEKIT_URL=ws://localhost:7880`). Health: `GET /` |
| 7881/tcp | LiveKit | ICE/TCP fallback |
| 7882/udp | LiveKit | ICE/UDP mux (Windows fallback). Official range 50000–60000 could not be published — see above. |
| 3478/tcp+udp | coturn | TURN |
| 5349/tcp+udp | coturn | TURN/TLS port (reserved) |
| 49160–49200/udp | coturn | TURN relay |
| 5433/tcp | Postgres | Prisma / app (`DATABASE_URL`). Container still uses 5432. Host 5432 is often already taken on Windows. |
| 6380/tcp | Redis | Optional host debug. LiveKit uses `redis:6379` on the Compose network. Host 6379 is often taken (Laragon). |
| 9000/tcp | MinIO | S3 API |
| 9002/tcp | MinIO | Console UI (container 9001). Host 9001 is often taken (Laravel Herd). |

The **egress** worker has no host ports. It talks to LiveKit over Redis on the Compose network and uploads recordings to MinIO. Health is internal (`health_port: 8081`).

Webhook retries and chat/recording retention are not a Compose sidecar. Call these from cron (Bearer `INTERNAL_CRON_SECRET`):

```powershell
curl.exe -X POST -H "Authorization: Bearer $env:INTERNAL_CRON_SECRET" http://localhost:3000/api/internal/webhooks/tick
curl.exe -X POST -H "Authorization: Bearer $env:INTERNAL_CRON_SECRET" http://localhost:3000/api/internal/retention
```

Do not publish MinIO, Postgres, or Redis on `0.0.0.0`.

## Local credentials (not production)

These match `.env.example`. They are **local-dev placeholders**. The API key name is the official LiveKit `--dev` key (`devkey`); the secret is longer than `--dev`'s `secret` because LiveKit 1.13.6 requires 32+ characters.

| Name | Value |
|------|--------|
| `DATABASE_URL` | `postgresql://sru:sru_local_dev@localhost:5433/sru_conf` |
| `LIVEKIT_URL` | `ws://localhost:7880` |
| `LIVEKIT_API_KEY` | `devkey` (official `--dev` key name) |
| `LIVEKIT_API_SECRET` | `sru_livekit_local_dev_secret_do_not_use` (32+ chars; local only) |
| Postgres user / db | `sru` / `sru_conf` |
| MinIO API | `http://127.0.0.1:9000` |
| MinIO console | `http://127.0.0.1:9002` |
| MinIO root | `sru_minio` / `sru_minio_local_dev` |

Copy `.env.example` to `apps/web/.env.local` before the Next app talks to this stack. Never commit `.env.local` or production secrets.

`AUTH_SECRET` is required for local sign-in. Set a long random value in `apps/web/.env` or `.env.local`. Never commit a production secret.

## Lobby deny policy

When a room has the lobby enabled:

1. A joiner without `admitted` status does **not** receive a LiveKit JWT and cannot publish media.
2. **Deny** sets `lobbyStatus` to `denied`. Further token mint is rejected with `LOBBY_DENIED`.
3. The denied user may send a **new knock** (`POST /api/v1/rooms/{id}/lobby` without a decision, or join again). That sets status back to `pending`.
4. **Admit** sets `admitted` and the existing room is reused — the client requests a token and joins the same LiveKit room.

## MinIO (chat files now, recordings later)

- API **9000**, console **9001** inside the container (host console is **9002**).
- Default bucket policy is **private**. Do not run `mc anonymous set public` or make buckets world-listable.
- This Compose file does not create buckets. Later tasks create a private bucket for attachments/recordings.
- Browser console login uses the root user above. That user is for local admin only.

## Images

| Service | Image |
|---------|--------|
| LiveKit | `livekit/livekit-server:v1.13.6` |
| Redis | `redis:7-alpine` |
| Postgres | `postgres:16-alpine` |
| coturn | `coturn/coturn:4.17` |
| MinIO | `minio/minio:latest` |

## Kubernetes (Helm)

**Compose remains the local / small-org default.** Helm is optional for production-style clusters.

| Path | Role |
|------|------|
| `infra/helm/sru-conf` | Web, Postgres, Redis, MinIO |
| `infra/helm/livekit-values.yaml` | Overlay for official `livekit/livekit-server` (Redis + `podHostNetwork`, one SFU pod per node) |
| `infra/helm/media` + `egress-values.yaml` / `coturn-values.yaml` | Egress and coturn as **separate** workloads from the SFU |
| `infra/scripts/save-images.sh` | Air-gap image list (dry-run by default) |

```powershell
helm template sru infra/helm/sru-conf
helm template egress infra/helm/media -f infra/helm/egress-values.yaml
helm template coturn infra/helm/media -f infra/helm/coturn-values.yaml
node infra/helm/sru-conf/check.mjs
node infra/scripts/check-task53.mjs
bash infra/scripts/save-images.sh
```

LiveKit SFU install example (after adding the LiveKit Helm repo):

```powershell
helm upgrade --install livekit livekit/livekit-server -f infra/helm/livekit-values.yaml
```

A room pins to one SFU node; with `hostNetwork`, schedule at most one `livekit-server` pod per node.

## Troubleshooting

- **`compose up` fails on UDP 50000–60000** — expected on Windows Docker Desktop when WinNAT excludes ports in that range. This file already uses mux **7882/udp**. See the UDP section.
- **Health `406 Not Acceptable`** — LiveKit is up but node stats are stale (official handler). Retry after a few seconds.
- **Signaling works, no audio/video** — UDP mux **7882**, advertised `node_ip`, or Windows Firewall. Try ICE/TCP **7881** and TURN **3478**. Confirm Windows Firewall is not blocking those ports for Docker Desktop.
- **WSL2 vs PowerShell** — run Compose from the same environment you use for `curl` (`127.0.0.1` is the Windows host when using Docker Desktop).
