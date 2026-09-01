# End-to-end encryption (E2EE) — Phase 4 Wave 6

SRU-Conf v1 implements client-side media encryption with WebRTC **Insertable Streams** (via LiveKit's E2EE worker). This document describes policy gates, browser support, and pilot blockers.

## Overview

- **Room flag:** `Room.e2eeEnabled` (default `false`)
- **Org gate:** `OrgSetting.allowE2eeRooms` (default `false`) — admins enable under **Administration → End-to-end encryption**
- **Key exchange:** Each participant generates a 32-byte key and publishes it on the LiveKit reliable data channel topic `sru-e2ee-keys`. Peers import keys into LiveKit's per-participant key provider.
- **Scope:** Camera and microphone tracks are encrypted. **Screen share is plaintext** with an in-meeting banner (v1 choice documented in code as `E2EE_SCREEN_SHARE_PLAINTEXT`).

## Degraded feature matrix (E2EE rooms)

| Feature | Status | Notes |
|---------|--------|-------|
| Recording | Blocked (409) | Server egress cannot decrypt Insertable Streams |
| Live streaming (RTMP/HLS) | Blocked (409) | Composite egress requires decrypted media |
| Breakout rooms | Blocked (409) | Child token mint and session create rejected |
| Embed iframe | Allowed with warning | Parent receives `sru-embed.e2ee-warning` postMessage |
| Mobile (Expo / mobile browsers) | Not supported v1 | Use desktop Chrome or Edge |
| Safari | Not supported | Missing reliable Insertable Streams APIs |
| Screen share encryption | Not supported v1 | Plaintext with banner |

## Browser support

Supported for join when **all** of the following hold:

- Desktop browser (not mobile UA)
- Not Safari
- `isE2EESupported()` from `livekit-client` (Insertable Streams or RTCRtpScriptTransform)

Prejoin blocks unsupported browsers with an explicit error before token connect.

## API constraints

When `e2eeEnabled` is true:

- `POST /api/v1/rooms/{id}/recording` → **409** `E2EE_INCOMPATIBLE`
- `POST /api/v1/rooms/{id}/streaming` → **409** `E2EE_INCOMPATIBLE`
- `POST /api/v1/rooms/{id}/breakouts` → **409** `E2EE_INCOMPATIBLE`
- Breakout child token mint when parent has E2EE → **409** `E2EE_INCOMPATIBLE`

Enabling E2EE on a room requires org allowance and no active recording, stream, or open breakout session.

## Audit events

- `admin.e2ee_enabled` / `admin.e2ee_disabled` — org toggle
- `room.e2ee_enabled` / `room.e2ee_disabled` — host/co-host room setting

## Pilot blockers (human review required)

Do **not** pilot E2EE until:

1. Two-browser manual verification on desktop Chrome (A/V encrypted, screen share banner visible)
2. Security review of key distribution over data channel (server-visible in v1; no MLS)
3. Explicit customer communication about recording/streaming/breakout/mobile limitations
4. Embed integrators handle `sru-embed.e2ee-warning`

## Implementation map

- Policy gates: `apps/web/lib/e2ee/policy.ts`, `recording.ts`, `streaming.ts`, `breakouts.ts`
- Client crypto: `apps/web/lib/e2ee/keys.ts`, `audio.ts`, `video.ts`, `support.ts`
- UI: `Prejoin.tsx`, `MeetingRoom.tsx`, `RoomSettings.tsx`, admin `E2eeSettingsPanel.tsx`
