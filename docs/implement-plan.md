# แผนพัฒนาระบบ Video Conference Platform (Self-hosted)

## 1. ภาพรวมโครงการ (Project Overview)

### 1.1 วัตถุประสงค์

พัฒนาระบบประชุมออนไลน์แบบ **Self-hosted** ที่องค์กรควบคุมข้อมูลได้ 100% รองรับการใช้งานบนเว็บและมือถือ พร้อมเชื่อมต่อกับระบบเดิมขององค์กรผ่าน SSO และ API

### 1.2 ขอบเขตฟีเจอร์หลัก


| #   | ฟีเจอร์                   | ความซับซ้อน | ลำดับความสำคัญ |
| --- | ------------------------- | ----------- | -------------- |
| 1   | Video / Audio Conference  | สูงมาก      | P0 (Must)      |
| 2   | Screen Sharing            | ปานกลาง     | P0             |
| 3   | Chat (public/private)     | ต่ำ         | P0             |
| 4   | Raise Hand / Reactions    | ต่ำ         | P1             |
| 5   | Recording                 | สูง         | P1             |
| 6   | Live Streaming (RTMP/HLS) | สูง         | P2             |
| 7   | Breakout Rooms            | สูง         | P2             |
| 8   | Moderator Controls        | ปานกลาง     | P0             |
| 9   | Password / Lobby          | ต่ำ-ปานกลาง | P0             |
| 10  | Mobile Support            | สูง         | P1             |
| 11  | Self-hosted Deployment    | สูง         | P0             |
| 12  | SSO Integration           | ปานกลาง     | P1             |
| 13  | Public API / Webhook      | ปานกลาง     | P1             |


---



## 2. การเลือกเทคโนโลยีฐาน (Build vs. Adopt)

นี่คือ **การตัดสินใจที่สำคัญที่สุด** ของโครงการ เพราะกระทบต้นทุนและเวลาแบบทวีคูณ

### 2.1 เปรียบเทียบทางเลือก


| ทางเลือก                        | ข้อดี                                                                                                                      | ข้อเสีย                                                                                           | เวลาถึง MVP    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------- |
| **Jitsi Meet** (ต่อยอด)         | ฟรี Apache 2.0, มีครบเกือบทุกฟีเจอร์ (Breakout, Lobby, Recording ผ่าน Jibri, Streaming), มี SDK มือถือ, ชุมชนใหญ่          | Customize UI ลึกๆ ยาก, Jibri กิน resource สูงมาก (1 recording = 1 container), Codebase ใหญ่       | **2-3 เดือน**  |
| **LiveKit** (ต่อยอด)            | Architecture ทันสมัย, Scale ดีมาก (distributed SFU), Egress/Ingress สำเร็จรูป, SDK ครบทุก platform, API/Webhook ออกแบบมาดี | ต้องสร้าง UI ประชุมเองเกือบทั้งหมด, Breakout Room ต้องเขียน logic เอง                             | **3-4 เดือน**  |
| **mediasoup / Pion** (สร้างเอง) | ควบคุมได้ 100%, ปรับแต่งได้ทุกอย่าง, น้ำหนักเบา                                                                            | ต้องเขียน signaling, recording, scaling, simulcast เองทั้งหมด, ต้องมีทีมที่เชี่ยวชาญ WebRTC จริงๆ | **9-14 เดือน** |
| **BigBlueButton**               | เหมาะกับการศึกษามาก, มี whiteboard/breakout ครบ                                                                            | ผูกกับ use case ห้องเรียน, ปรับแต่งยาก, Scale ยาก                                                 | 2 เดือน        |




### 2.2 ข้อเสนอแนะ

> **แนะนำ: LiveKit เป็นแกนกลาง** หากต้องการ Product ที่มี Branding ของตัวเอง ควบคุม API ได้เต็มที่ และวางแผน scale ระยะยาว
>
> **แนะนำ: Jitsi Meet** หากเป้าหมายคือ "ใช้งานได้เร็วที่สุด" และยอมรับ UI ที่ปรับแต่งได้จำกัด

แผนที่เหลือในเอกสารนี้อ้างอิงสถาปัตยกรรมแบบ **LiveKit-based** (ปรับใช้กับ Jitsi ได้เช่นกัน)

---



## 3. สถาปัตยกรรมระบบ (System Architecture)



### 3.1 องค์ประกอบหลัก

```text
┌─────────────────────────────────────────────────────────┐
│  Clients: Web (React) │ iOS │ Android │ Electron Desktop │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS / WSS / WebRTC (SRTP-DTLS)
┌───────────────▼─────────────────────────────────────────┐
│  Edge Layer: Nginx / Traefik + Load Balancer            │
└───────────────┬─────────────────────────────────────────┘
                │
     ┌──────────┼──────────────┬─────────────┬────────────┐
     ▼          ▼              ▼             ▼            ▼
┌─────────┐ ┌────────┐  ┌────────────┐ ┌─────────┐ ┌──────────┐
│ App API │ │ SFU    │  │ Egress     │ │ Ingress │ │ Chat WS  │
│ (Nest/  │ │ Nodes  │  │ (Record/   │ │ (RTMP   │ │ Service  │
│  Go)    │ │(LiveKit│  │  Stream)   │ │  in)    │ │          │
└────┬────┘ └───┬────┘  └─────┬──────┘ └─────────┘ └────┬─────┘
     │          │             │                          │
     └──────────┴─────────────┴──────────────────────────┘
                │
   ┌────────────┼────────────┬──────────┬──────────────┐
   ▼            ▼            ▼          ▼              ▼
┌────────┐ ┌────────┐  ┌─────────┐ ┌────────┐ ┌────────────┐
│Postgres│ │ Redis  │  │ MinIO/S3│ │Keycloak│ │ Prometheus │
│  (DB)  │ │(state) │  │ (files) │ │ (SSO)  │ │  + Grafana │
└────────┘ └────────┘  └─────────┘ └────────┘ └────────────┘
                            │
                       ┌────▼────┐
                       │ COTURN  │ (TURN/STUN สำหรับ NAT traversal)
                       └─────────┘
```



### 3.2 หลักการออกแบบสำคัญ

- **SFU (Selective Forwarding Unit)** ไม่ใช่ MCU — ประหยัด CPU ฝั่ง server มาก รองรับผู้ร่วมประชุมได้มากกว่า
- **Simulcast + SVC (VP9/AV1)** — ส่งหลาย resolution พร้อมกัน ให้ผู้รับที่เน็ตช้าเลือกสตรีมคุณภาพต่ำได้อัตโนมัติ
- **Stateless API + Stateful SFU** — API scale แนวนอนได้อิสระ ส่วน room state เก็บใน Redis
- **แยก Egress ออกจาก SFU** — การอัดวิดีโอกิน CPU สูง ห้ามรันปนกับ media server เด็ดขาด

---



## 4. รายละเอียดการพัฒนารายฟีเจอร์



### 4.1 Video / Audio Conference `P0`

**Technical Design**

- Codec: **VP8/VP9** (video), **Opus** (audio) — เพิ่ม **AV1** สำหรับ client รุ่นใหม่
- **Adaptive Bitrate (ABR)** ปรับตาม bandwidth estimation
- **Active Speaker Detection** ผ่าน audio level (RFC 6464)
- **Dynacast** — หยุดส่งสตรีมที่ไม่มีใครดู (ประหยัด bandwidth 40-60%)
- Layout: Grid View / Speaker View / Sidebar View

**Acceptance Criteria**

- รองรับ 50 participants พร้อมกล้องเปิดในห้องเดียว โดย latency < 300ms
- Audio-only mode รองรับ 200+ คน



### 4.2 Screen Sharing `P0`

- ใช้ `getDisplayMedia()` API
- ส่ง **แยก track** จาก camera track (ผู้ชมเห็นทั้งหน้าคนพูดและจอพร้อมกัน)
- ตั้ง encoding แยก: ความละเอียดสูง + framerate ต่ำ (สำหรับ slide) หรือ framerate สูง (สำหรับวิดีโอ)
- รองรับแชร์เสียงระบบ (system audio) บน Chrome/Edge
- **ข้อจำกัด:** iOS Safari แชร์จอไม่ได้ ต้องใช้ Broadcast Extension ในแอป native



### 4.3 Chat `P0`

- WebSocket-based, ข้อความเก็บใน PostgreSQL
- รองรับ: ข้อความสาธารณะ, ข้อความส่วนตัว (DM), แนบไฟล์, emoji, mention (@)
- **Data Channel** สำหรับข้อความ realtime + REST API สำหรับ history
- Retention policy กำหนดได้ (ลบอัตโนมัติหลัง X วัน)



### 4.4 Raise Hand / Reactions `P1`

- ใช้ **participant metadata** (JSON) sync ผ่าน SFU — เบาและ realtime
- Moderator เห็น **คิวลำดับการยกมือ** เรียงตามเวลา
- Reactions ลอย: 👍 ❤️ 😂 👏 พร้อม auto-dismiss ใน 5 วินาที



### 4.5 Recording `P1`

**สองโหมด**


| โหมด             | วิธีทำงาน                                    | เหมาะกับ               |
| ---------------- | -------------------------------------------- | ---------------------- |
| **Composite**    | Headless Chrome render layout → FFmpeg → MP4 | ดูย้อนหลังทั่วไป       |
| **Track Egress** | อัดแยก track ต่อคน                           | ตัดต่อ post-production |


- Output → **MinIO / S3** พร้อม signed URL หมดอายุ
- แจ้งเตือนผู้ร่วมประชุมทุกคนเมื่อเริ่มอัด (**บังคับตาม PDPA**)
- Auto-transcode เป็น HLS สำหรับดูย้อนหลัง
- **Resource:** 1 recording ≈ 2 vCPU + 2GB RAM → ต้องมี worker pool แยก



### 4.6 Live Streaming `P2`

- **Egress → RTMP push** ไป YouTube Live / Facebook Live / Custom RTMP
- รองรับหลายปลายทางพร้อมกัน (multi-destination)
- **HLS output** สำหรับสตรีมบนเว็บองค์กรเอง (latency 6-15 วินาที)
- ทางเลือก latency ต่ำ: **WHEP / LL-HLS** (2-4 วินาที)



### 4.7 Breakout Rooms `P2`

**Logic Design**

- Breakout = **Room แยกจริง** ที่ผูก `parent_room_id`
- แบ่งกลุ่มได้: อัตโนมัติ (สุ่ม/เท่ากัน), กำหนดเอง, ให้ผู้ใช้เลือกเอง
- ฟีเจอร์: ตั้งเวลานับถอยหลัง, Broadcast ข้อความถึงทุกห้อง, "ขอความช่วยเหลือ", ดึงกลับห้องหลักทั้งหมด
- Moderator เข้า-ออกห้องย่อยได้อิสระ
- **จุดที่ต้องระวัง:** การย้ายห้องต้อง reconnect — ควรทำ pre-warm connection เพื่อลด downtime ให้เหลือ < 2 วินาที



### 4.8 Moderator Controls `P0`


| สิทธิ์           | รายละเอียด                         |
| ---------------- | ---------------------------------- |
| Mute/Unmute      | ปิดไมค์รายคน / ทั้งห้อง (Mute All) |
| Video Control    | ปิดกล้องผู้เข้าร่วม                |
| Kick / Ban       | เตะออก + ห้ามเข้าซ้ำ               |
| Promote / Demote | เลื่อนขั้นเป็น co-host             |
| Lock Room        | ล็อกไม่ให้คนเข้าเพิ่ม              |
| Spotlight / Pin  | ปักหมุดผู้พูด                      |
| Control Sharing  | อนุญาต/ห้ามแชร์จอ, ห้ามแชท         |
| End Meeting      | จบห้องสำหรับทุกคน                  |


> ทุก action ต้อง **validate ฝั่ง server** เสมอ ห้ามเชื่อ client (ป้องกัน privilege escalation)



### 4.9 Password / Lobby `P0`

- **Password:** Hash ด้วย Argon2id, ตรวจสอบก่อนออก JWT token
- **Lobby (Waiting Room):** ผู้เข้าค้างในสถานะ `pending` → Moderator กด Approve/Deny
- **Knocking:** ส่ง notification realtime ไปหา moderator
- ตัวเลือกเพิ่ม: จำกัดเฉพาะผู้ใช้ที่ล็อกอิน, จำกัดเฉพาะ email domain ที่กำหนด



### 4.10 Mobile Support `P1`

**กลยุทธ์แนะนำ: Hybrid**

- **PWA / Mobile Web** — ครอบคลุมผู้ใช้ทั่วไปที่ไม่อยากติดตั้งแอป
- **Native App** (React Native + LiveKit SDK) สำหรับฟีเจอร์ที่เว็บทำไม่ได้:
  - **PiP (Picture-in-Picture)** ใช้งานต่อขณะสลับแอป
  - **Background audio** ประชุมต่อขณะล็อกหน้าจอ
  - **CallKit (iOS) / ConnectionService (Android)** รับสายเหมือนสายโทรศัพท์
  - **Push Notification** แจ้งเตือนเชิญประชุม
- ปรับ resolution ต่ำอัตโนมัติเมื่อใช้ 4G/5G เพื่อประหยัดแบตและดาต้า



### 4.11 Self-hosted Deployment `P0`

**สองรูปแบบ**

1. **Docker Compose** — สำหรับองค์กรเล็ก/POC (single node, ติดตั้งใน 30 นาที)
2. **Kubernetes + Helm Chart** — สำหรับ production scale

**สิ่งที่ต้องเตรียม**

- **Network:** เปิด UDP 50000-60000 (media), TCP 443, TURN 3478/5349
- **TURN Server (coturn)** จำเป็นมาก — ผู้ใช้ ~15-20% อยู่หลัง firewall ที่บล็อก UDP
- ติดตั้งแบบ **Air-gapped** ได้ (มี offline image bundle)
- Auto SSL ผ่าน Let's Encrypt หรือใส่ cert เอง



### 4.12 SSO Integration `P1`

- รองรับ **OIDC** (Keycloak, Azure AD/Entra ID, Google Workspace, Okta) และ **SAML 2.0**
- รองรับ **LDAP / Active Directory** สำหรับองค์กรไทยหลายแห่งที่ยังใช้ AD
- **JIT Provisioning** — สร้างบัญชีอัตโนมัติเมื่อล็อกอินครั้งแรก
- **Role Mapping** — map AD group → role ในระบบ (เช่น `IT-Admin` → moderator)
- รองรับ **SCIM 2.0** สำหรับ sync/deprovision ผู้ใช้ (Phase หลัง)



### 4.13 Public API & Webhook `P1`

**REST API (ตัวอย่าง)**

```http
POST   /api/v1/rooms                  # สร้างห้อง
GET    /api/v1/rooms/{id}             # ดูข้อมูลห้อง
DELETE /api/v1/rooms/{id}             # ปิดห้อง
POST   /api/v1/rooms/{id}/tokens      # ออก JWT เข้าห้อง
GET    /api/v1/rooms/{id}/participants
POST   /api/v1/rooms/{id}/recording/start
POST   /api/v1/rooms/{id}/streaming/start
GET    /api/v1/recordings/{id}        # ดาวน์โหลดไฟล์อัด
POST   /api/v1/rooms/{id}/breakouts
```

**Webhook Events**

```json
{
  "event": "participant_joined",
  "room": { "id": "rm_abc123", "name": "weekly-standup" },
  "participant": { "id": "u_001", "name": "สมชาย", "role": "moderator" },
  "timestamp": 1756598400
}
```

Events: `room_started`, `room_finished`, `participant_joined`, `participant_left`, `recording_started`, `recording_finished`, `streaming_started`

**เพิ่มเติม**

- **Embed SDK** (JS) ให้ฝังห้องประชุมใน iframe ของเว็บลูกค้า
- Auth: API Key + HMAC signature, Rate limiting ต่อ key
- เอกสาร OpenAPI 3.0 + Swagger UI

---



## 5. แผนการดำเนินงาน (Roadmap)



### Phase 0 — Discovery & Setup (สัปดาห์ 1-3)

- สรุป Requirement + User Story ทั้งหมด
- **PoC เปรียบเทียบ LiveKit vs Jitsi** ตัดสินใจขั้นสุดท้าย
- ออกแบบ Database Schema, API Contract, UX Wireframe
- ตั้ง Git repo, CI/CD, Dev environment



### Phase 1 — Core MVP (สัปดาห์ 4-12)

- Video/Audio Conference + Screen Sharing
- Chat + Raise Hand
- Moderator Controls + Password/Lobby
- Web UI (Desktop) + Auth พื้นฐาน
- **Deliverable:** ประชุมได้จริง 25 คน/ห้อง



### Phase 2 — Enterprise Features (สัปดาห์ 13-22)

- Recording + Storage Management
- SSO (OIDC/SAML) + RBAC
- Public API + Webhook + Admin Dashboard
- PWA + Mobile Web optimization
- **Deliverable:** Pilot ใช้งานจริงในองค์กรกลุ่มเล็ก



### Phase 3 — Advanced & Scale (สัปดาห์ 23-34)

- Breakout Rooms
- Live Streaming (RTMP/HLS)
- Native Mobile App (iOS/Android)
- Multi-node SFU + Auto-scaling
- Load Testing 500+ concurrent users
- **Deliverable:** Production Release 1.0



### Phase 4 — Polish & Growth (สัปดาห์ 35+)

- Virtual Background / Noise Suppression (RNNoise, Krisp-like)
- Whiteboard, Polls, Q&A
- AI Transcription / สรุปการประชุมอัตโนมัติ
- E2EE (End-to-End Encryption) ด้วย Insertable Streams
- Analytics Dashboard

> **รวมประมาณ 8-9 เดือน** ถึง Production Release 1.0

---



## 6. ทีมงานและทรัพยากร



### 6.1 โครงสร้างทีมที่แนะนำ


| ตำแหน่ง                      | จำนวน | หน้าที่หลัก                           |
| ---------------------------- | ----- | ------------------------------------- |
| Tech Lead / Architect        | 1     | ออกแบบระบบ, ตัดสินใจเทคนิค            |
| Backend Engineer (Go/Node)   | 2     | API, Signaling, Business Logic        |
| WebRTC Engineer              | 1     | SFU tuning, media pipeline, debugging |
| Frontend Engineer (React/TS) | 2     | Web UI, Admin Dashboard               |
| Mobile Engineer              | 1-2   | React Native / Native                 |
| DevOps / SRE                 | 1     | K8s, CI/CD, Monitoring, Deployment    |
| QA Engineer                  | 1     | Test automation, Load testing         |
| UX/UI Designer               | 1     | Design system, Prototype              |


**รวม 10-11 คน** (ลดเหลือ 6-7 คนได้หากยอมยืดเวลาเป็น 12 เดือน)

### 6.2 Infrastructure Sizing (ประมาณการ)


| ระดับ  | Concurrent Users | Spec                                               |
| ------ | ---------------- | -------------------------------------------------- |
| Small  | ≤ 100            | 1 SFU: 8 vCPU/16GB, 1 App: 4 vCPU/8GB              |
| Medium | ≤ 500            | 3 SFU nodes, 2 App, 2 Egress worker, LB            |
| Large  | 2,000+           | 8-12 SFU (auto-scale), K8s cluster, CDN สำหรับ HLS |


> **Bandwidth คือต้นทุนหลัก** — คำนวณคร่าวๆ: 1 participant ≈ 1.5-3 Mbps (up+down) → 500 คน ≈ 1 Gbps

---



## 7. Non-Functional Requirements



### 7.1 Performance

- Join time < 3 วินาที
- End-to-end audio latency < 200ms (ในภูมิภาคเดียวกัน)
- Packet loss tolerance: ใช้ได้ปกติที่ loss ≤ 5%
- Uptime SLA 99.5%



### 7.2 Security

- **Transport:** TLS 1.3, DTLS-SRTP สำหรับ media (เข้ารหัสโดยปริยาย)
- **Token:** JWT อายุสั้น, scope-based permission
- **At-rest:** เข้ารหัสไฟล์บันทึกใน storage
- **Audit Log:** เก็บทุก action ของ moderator/admin
- **PDPA Compliance:** ขอ consent ก่อนบันทึก, สิทธิ์ลบข้อมูล, Data retention policy
- **Pen Test** ก่อน Production Release



### 7.3 Observability

- **Metrics:** Prometheus + Grafana (participant count, packet loss, jitter, CPU/BW)
- **Logs:** Loki หรือ ELK
- **Tracing:** OpenTelemetry
- **Alerting:** Alertmanager → Slack/LINE Notify
- **Client-side QoS reporting** — เก็บ WebRTC stats จาก client เพื่อ debug ปัญหาผู้ใช้รายบุคคล

---



## 8. ความเสี่ยงและแนวทางรับมือ


| ความเสี่ยง                        | ผลกระทบ | แนวทางรับมือ                                                         |
| --------------------------------- | ------- | -------------------------------------------------------------------- |
| ทีมขาดประสบการณ์ WebRTC           | สูงมาก  | ใช้ framework สำเร็จ (LiveKit/Jitsi), จ้าง consultant ช่วง PoC       |
| คุณภาพวิดีโอไม่เสถียรบนเน็ตไทย/4G | สูง     | Simulcast + ABR + TURN over TCP/443, ทดสอบ network throttling        |
| ต้นทุน Bandwidth บานปลาย          | สูง     | Dynacast, จำกัด resolution ตามขนาดห้อง, ประเมิน cost ตั้งแต่ Phase 1 |
| Recording กิน resource จนล่ม      | ปานกลาง | แยก worker pool, queue-based, จำกัดจำนวน concurrent recording        |
| iOS Safari ข้อจำกัดเยอะ           | ปานกลาง | ทดสอบ Safari ทุก sprint, มี Native App เป็นทางออก                    |
| Scope creep                       | สูง     | Freeze scope รายเฟส, มี Change Request process                       |


---



## 9. สรุป (Summary)

โครงการนี้เป็นระบบขนาดกลาง-ใหญ่ที่มีความซับซ้อนสูงในส่วน **Media Layer** จุดชี้ขาดความสำเร็จมี 4 ข้อ:

1. **อย่าเขียน WebRTC SFU เอง** — ต่อยอดจาก LiveKit หรือ Jitsi จะย่นเวลาได้ 6-9 เดือน
2. **ลงทุนกับ TURN Server และการทดสอบเครือข่ายจริง** — ระบบที่ "ทำงานได้ใน office LAN" มักพังบน 4G และหลัง corporate firewall
3. **แยก Recording/Streaming ออกจาก SFU ตั้งแต่วันแรก** — เป็นสาเหตุอันดับหนึ่งที่ทำให้ระบบล่มตอนใช้งานจริง
4. **ทำ MVP ให้เร็ว แล้ว Pilot กับผู้ใช้จริง** — ปัญหา UX ของระบบประชุมค้นพบได้จากการใช้จริงเท่านั้น

**Timeline โดยรวม:** 8-9 เดือนถึง Production v1.0 ด้วยทีม 10 คน หรือ 12 เดือนด้วยทีม 6-7 คน