# Deploy SRU-Meeting บน Coolify

คู่มือนี้อธิบายการ deploy แพลตฟอร์ม SRU-Meeting บน [Coolify](https://coolify.io/) v4 สำหรับองค์กรขนาดเล็กถึงกลาง โดยใช้ **Docker Compose Build Pack** จาก Git repository

**SRU-Meeting on Coolify** — deploy the full stack (Next.js web, Postgres, Redis, MinIO, LiveKit, coturn, egress) using the Compose file at [`infra/coolify/docker-compose.yml`](../infra/coolify/docker-compose.yml).

---

## สิ่งที่ต้องเตรียม

| รายการ | รายละเอียด |
|--------|------------|
| **Coolify** | v4.0.0-beta.411 ขึ้นไป (รองรับ magic env vars จาก Git) |
| **Server** | Linux VM/bare metal — **ไม่ใช่** Windows Docker Desktop |
| **CPU / RAM** | อย่างน้อย 4 vCPU, 8 GB RAM (แนะนำ 8 vCPU, 16 GB ถ้ามี recording) |
| **Disk** | ≥ 50 GB SSD (Postgres + MinIO recordings) |
| **Domain** | 2 โดเมนย่อย (หรือ 2 FQDN จาก wildcard ของ Coolify) |
| **Firewall** | เปิดพอร์ตด้านล่างบน public IP ของเซิร์ฟเวอร์ |

### พอร์ตที่ต้องเปิด (production)

| พอร์ต | โปรโตคอล | บริการ |
|-------|----------|--------|
| 80, 443 | TCP | Coolify Traefik → Next.js web (`https://meeting.example.com`) |
| 7880, 7881 | TCP | LiveKit signaling + ICE/TCP (`wss://livekit.example.com`) |
| 50000–50100 | UDP | LiveKit WebRTC media (keep range small for Docker) |
| 3478, 5349 | TCP + UDP | coturn TURN/STUN |
| 49160–49200 | UDP | coturn relay |

> **หมายเหตุ:** Compose สำหรับ local dev (`infra/docker-compose.yml`) ใช้ UDP mux 7882 เพราะข้อจำกัดของ Windows — **อย่า** copy การตั้งค่านั้นไป production บน Coolify

---

## สถาปัตยกรรมบน Coolify

```text
Internet
   │
   ▼
Coolify Traefik (443)
   ├── https://meeting.example.com  ──► web:3000 (Next.js)
   └── wss://livekit.example.com    ──► livekit:7880

Docker network (Compose stack)
   ├── web ──► postgres, redis, minio
   ├── livekit ◄──► redis, coturn
   └── egress ──► livekit, minio, redis

Host ports (ไม่ผ่าน Traefik)
   ├── UDP 50000–50100  → LiveKit ICE
   └── 3478/5349/49160–49200 → coturn
```

---

## Deploy via API

สำหรับ deploy โดยไม่คลิก UI — ใช้สคริปต์ [`infra/coolify/deploy-api.ps1`](../infra/coolify/deploy-api.ps1):

1. สร้าง API token ใน Coolify → **Keys & Tokens**
2. ตั้ง DNS A record ของ web + LiveKit ชี้ `SERVER_PUBLIC_IP` และเปิด firewall ตามตารางด้านบน
3. รัน:

```powershell
$env:COOLIFY_URL = "https://coolify.example.com"
$env:COOLIFY_TOKEN = "<api-token>"
.\infra\coolify\deploy-api.ps1 `
  -ProjectName "sru-meeting" `
  -ServerPublicIp "x.x.x.x" `
  -WebDomain "https://meeting.example.ac.th:3000" `
  -LivekitDomain "https://livekit.example.ac.th:7880" `
  -OrgAdminEmails "admin@org.ac.th"
```

สคริปต์จะ:

1. `GET /projects`, `GET /servers` — เลือก project/server
2. `POST /applications/public` — `build_pack=dockercompose`, compose ที่ `infra/coolify/docker-compose.yml`
3. `PATCH` domains ของ `web` / `livekit`
4. ตั้ง `SERVER_PUBLIC_IP`, `LIVEKIT_API_KEY`, `ORG_ADMIN_EMAILS`, `TURN_REALM`
5. `POST /deploy` แล้ว poll จนเสร็จ
6. สร้าง scheduled tasks (webhook tick + retention)

หลัง deploy สำเร็จ ให้สร้าง MinIO bucket ตามขั้นตอนด้านล่าง (SSH ครั้งเดียว)

Template env: [`infra/coolify/.env.coolify.example`](../infra/coolify/.env.coolify.example)

---

## ขั้นตอน deploy (แบบ all-in-one Compose — UI)

### 1. เพิ่ม Server ใน Coolify

1. ติดตั้ง Coolify บน Linux server ([เอกสาร official](https://coolify.io/docs/get-started/installation))
2. ใน Coolify → **Servers** → เพิ่ม server ที่จะ deploy
3. ตั้ง wildcard domain (เช่น `*.coolify.example.com`) หรือเตรียม DNS A record ชี้ public IP

### 2. สร้าง Project และ Application

1. **Projects** → **+ Add** → ตั้งชื่อ เช่น `sru-meeting`
2. **+ Add New Resource** → **Private Repository** (GitHub / GitLab / Gitea)
3. เลือก repo `SRU-Meeting` และ branch
4. **Build Pack:** เลือก **Docker Compose**
5. **Docker Compose location:** `infra/coolify/docker-compose.yml`
6. **Base directory:** `/` (root ของ repo)

Coolify จะอ่าน Compose แล้วแสดง services: `web`, `postgres`, `redis`, `minio`, `livekit`, `coturn`, `egress`

### 3. ตั้งค่า Environment Variables

Coolify สร้างรหัสผ่านอัตโนมัติจาก magic variables (`SERVICE_PASSWORD_*`, `SERVICE_USER_*`, …) — ดู [Coolify Compose docs](https://coolify.io/docs/knowledge-base/docker/compose)

ตั้งค่า **บังคับ** ในแท็บ Environment Variables:

| ตัวแปร | ค่า | หมายเหตุ |
|--------|-----|----------|
| `SERVER_PUBLIC_IP` | IP public ของเซิร์ฟเวอร์ | ใช้กับ LiveKit ICE และ coturn |
| `LIVEKIT_API_KEY` | `sru` (หรือชื่อที่ต้องการ) | ต้องตรงกับ key ใน `livekit.yaml` content |
| `ORG_ADMIN_EMAILS` | `admin@org.ac.th` | email แรกที่ register จะเป็น org_admin |
| `TURN_REALM` | `meeting.example.com` | optional — realm ของ coturn |

Magic variables ที่ Compose ใช้ (Coolify สร้างให้อัตโนมัติเมื่อ deploy ครั้งแรก):

- `SERVICE_PASSWORD_POSTGRES` — รหัส Postgres
- `SERVICE_USER_MINIO` / `SERVICE_PASSWORD_MINIO` — MinIO root
- `SERVICE_PASSWORD_64_LIVEKIT` — LiveKit API secret (≥ 32 ตัวอักษร)
- `SERVICE_PASSWORD_TURN` — รหัส TURN user `sru`
- `SERVICE_REALBASE64_64_AUTH` — `AUTH_SECRET` ของ Auth.js
- `SERVICE_PASSWORD_64_CRON` — `INTERNAL_CRON_SECRET`
- `SERVICE_URL_WEB` — URL ของ web (หลังกำหนด domain)
- `SERVICE_FQDN_LIVEKIT` — FQDN ของ LiveKit (หลังกำหนด domain)

### 4. กำหนด Domain ให้ services

ใน Coolify UI → แต่ละ service → **Domains**:

| Service | Domain ตัวอย่าง | หมายเหตุ |
|---------|-----------------|----------|
| **web** | `https://meeting.example.com` | container port **3000** → ใส่ `https://meeting.example.com:3000` ถ้า Coolify ถาม port |
| **livekit** | `https://livekit.example.com:7880` | ใช้ WSS — แอปจะได้ `LIVEKIT_URL=wss://livekit.example.com` |

Traefik ของ Coolify terminate TLS ให้ web และ LiveKit signaling

**SSO / SAML:** หลังได้ domain จริง ให้ตั้งค่าเพิ่มใน Environment Variables:

```env
AUTH_URL=https://meeting.example.com
SAML_CALLBACK_URL=https://meeting.example.com/api/auth/saml/acs
# + provider-specific vars จาก apps/web/.env.example
```

### 5. Deploy

1. กด **Deploy**
2. Coolify จะ build image จาก [`infra/coolify/Dockerfile`](../infra/coolify/Dockerfile) แล้ว start stack
3. รอ healthcheck ของทุก service เป็นสีเขียว
4. เปิด `https://meeting.example.com` — ลงทะเบียนบัญชีแรก (email ใน `ORG_ADMIN_EMAILS` จะได้ org_admin)

Container `web` รัน `prisma migrate deploy` อัตโนมัติก่อน `next start`

### 6. สร้าง MinIO bucket (ครั้งแรก)

Compose ไม่สร้าง bucket ให้ — รันครั้งเดียวหลัง deploy สำเร็จ:

```bash
# บน Coolify server (หรือ exec เข้า minio container)
docker exec -it <minio-container> mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
docker exec -it <minio-container> mc mb local/sru-chat --ignore-existing
docker exec -it <minio-container> mc anonymous set none local/sru-chat
```

Bucket `sru-chat` ใช้ทั้ง chat attachments และ recordings (`S3_BUCKET` / `S3_RECORDINGS_BUCKET`)

### 7. ตั้ง Cron jobs ใน Coolify

Webhook retry และ retention ต้องถูกเรียกเป็นระยะ — ใช้ **Scheduled Tasks** ใน Coolify:

| Task | Schedule | Command |
|------|----------|---------|
| Webhook tick | `*/5 * * * *` | `curl -sf -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" https://meeting.example.com/api/internal/webhooks/tick` |
| Retention | `0 3 * * *` | `curl -sf -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" https://meeting.example.com/api/internal/retention` |

ใช้ค่า `INTERNAL_CRON_SECRET` เดียวกับ `SERVICE_PASSWORD_64_CRON` ที่ Coolify สร้าง

(ถ้าใช้ `deploy-api.ps1` สคริปต์จะสร้าง scheduled tasks ให้อัตโนมัติหลัง deploy)

---

## ทางเลือก: แยก Web ออกจาก Media stack

ถ้าต้องการ **rolling update** บน web โดยไม่ restart LiveKit:

1. **Stack A (Compose):** `postgres`, `redis`, `minio`, `livekit`, `coturn`, `egress` — ลบ service `web` ออกจาก compose ชั่วคราว หรือใช้ compose แยก
2. **Stack B (Dockerfile):** Application แยก ชี้ [`infra/coolify/Dockerfile`](../infra/coolify/Dockerfile), build pack **Dockerfile**
3. เปิด **Connect to Predefined Network** บน web app แล้วชี้ `DATABASE_URL` ไปที่ hostname ของ postgres ใน stack A (เช่น `postgres-<uuid>`)

Coolify ยัง **ไม่รองรับ zero-downtime** สำหรับ Compose deploy ทั้ง stack — แยก web ออกจึงเป็นทางเลือกที่ดีกว่าสำหรับ production

---

## ตัวแปรสภาพแวดล้อม (web) — อ้างอิง

ค่าหลักถูก inject จาก Compose แล้ว รายการเต็มอยู่ใน [`apps/web/.env.example`](../apps/web/.env.example)

| ตัวแปร | Production |
|--------|------------|
| `DATABASE_URL` | จาก Compose → `postgres:5432` |
| `AUTH_SECRET` | `SERVICE_REALBASE64_64_AUTH` |
| `AUTH_URL` | `https://meeting.example.com` |
| `LIVEKIT_URL` | `wss://livekit.example.com` |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | คู่ key จาก Coolify magic vars |
| `S3_*` | MinIO ภายใน stack |
| `INTERNAL_CRON_SECRET` | สำหรับ cron endpoints |
| `EMBED_ALLOWED_ORIGINS` | โดเมนที่ embed iframe ได้ |

---

## Desktop app (Windows)

หลัง web ขึ้น production แล้ว build MSI ต่อ org:

```powershell
$env:SRU_SERVER_URL = "https://meeting.example.com"
pnpm build:desktop
```

ดู [apps/desktop/README.md](../apps/desktop/README.md)

---

## Troubleshooting

| อาการ | สาเหตุที่พบบ่อย | แก้ไข |
|-------|-----------------|-------|
| Sign-in ไม่ได้ | `AUTH_SECRET` / `AUTH_URL` ผิด | ตรวจ domain และ magic var |
| เข้าห้องได้ แต่ไม่มีเสียง/ภาพ | UDP 50000–50100 ถูก block | เปิด firewall + ตรวจ `SERVER_PUBLIC_IP` |
| LiveKit token error | key/secret ไม่ตรง | `LIVEKIT_API_KEY` + `SERVICE_PASSWORD_64_LIVEKIT` ต้องตรงทั้ง web, livekit, egress |
| Recording ไม่ upload | ไม่มี bucket | รันขั้นตอนสร้าง MinIO bucket |
| TURN ล้มเหลว | `SERVER_PUBLIC_IP` ผิด | ใช้ public IP จริง ไม่ใช่ private |
| Deploy ล้มที่ migrate | DB ยังไม่พร้อม | รอ postgres healthy แล้ว redeploy |
| Compose downtime ยาว | พฤติกรรมปกติของ Coolify v4 | แยก web เป็น Dockerfile app |

### ตรวจ LiveKit

```bash
curl -s https://livekit.example.com/
# คาดหวัง: OK
```

### ตรวจ web health

```bash
curl -s -o /dev/null -w "%{http_code}" https://meeting.example.com/
# คาดหวัง: 200 หรือ 307
```

---

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|------|--------|
| [`infra/coolify/docker-compose.yml`](../infra/coolify/docker-compose.yml) | Compose สำหรับ Coolify |
| [`infra/coolify/Dockerfile`](../infra/coolify/Dockerfile) | Build Next.js monorepo |
| [`infra/coolify/deploy-api.ps1`](../infra/coolify/deploy-api.ps1) | Deploy ผ่าน Coolify REST API |
| [`infra/docker-compose.yml`](../infra/docker-compose.yml) | Local dev เท่านั้น |
| [`infra/helm/sru-meeting/`](../infra/helm/sru-meeting/) | ทางเลือก Kubernetes |

---

## ความปลอดภัย

- **อย่า** commit `.env` หรือ secrets ลง Git
- ใช้ Coolify encrypted env vars สำหรับ SSO/LDAP credentials
- MinIO, Postgres, Redis **ไม่** publish port ออก host — อยู่ใน Docker network เท่านั้น
- หมุน `SERVICE_PASSWORD_*` เป็นระยะ และ rebuild stack
- เปิด `ORG_ADMIN_EMAILS` เฉพาะ email ที่ไว้ใจ

---

## อ้างอิง

- [Coolify — Docker Compose](https://coolify.io/docs/knowledge-base/docker/compose)
- [LiveKit — Self-hosting deployment](https://docs.livekit.io/transport/self-hosting/deployment/)
- [LiveKit — Ports and firewall](https://docs.livekit.io/transport/self-hosting/ports-firewall/)
- [infra/README.md](../infra/README.md) — local stack และพอร์ต
