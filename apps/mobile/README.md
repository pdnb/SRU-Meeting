# Mobile (Expo)

Joins LiveKit using a token **minted by the web API**. LiveKit API secrets are never hardcoded in this app.

## Requirements

- Local web app (`pnpm --filter web dev`) with `/api/v1/dev/token` available (non-production).
- Compose LiveKit (`ws://127.0.0.1:7880`) as returned by the mint response.
- A **development build** (`expo-dev-client`) — LiveKit WebRTC does not run in Expo Go.

## Run

```bash
pnpm --filter mobile test
pnpm --filter mobile start
```

Optional: set `EXPO_PUBLIC_WEB_API_URL` (default `http://127.0.0.1:3000`). On an Android emulator pointing at the host machine, use `http://10.0.2.2:3000`.

## Join flows

1. **Mint token and join** — POST to `{apiBase}/api/v1/dev/token` with room + identity.
2. **Paste token** — paste JWT + LiveKit URL from an already-minted web response. Empty/invalid tokens show an error and do not connect.

## In-meeting (Task 57)

- Participant **grid** with camera tiles (`src/MeetingGrid.tsx`)
- **Mute / unmute** toggles the local microphone track
- **Moderator** badge appears only when `roomAdmin` is already in the join JWT (no second client grant)

## Noise suppression (Task 62)

- Uses `@livekit/react-native-krisp-noise-filter` on the local microphone track after join (`src/useMobileNoiseSuppression.ts`)
- **Reduce noise** toggle in the meeting toolbar; preference is kept for the app session via `src/noise-suppression.ts`
- Requires a **dev build** rebuild after adding the Krisp native module (same as LiveKit WebRTC — not Expo Go)

| Platform | Noise suppression | Notes |
| --- | --- | --- |
| iOS (dev build) | Supported | Native Krisp module in rebuilt dev client |
| Android (dev build) | Supported | Rebuild after install |
| Expo Go | Not supported | WebRTC + Krisp require a dev build |
| Web | Supported | See `apps/web` Task 60 controls |

Unsupported builds hide the toggle and continue with the raw microphone — no crash. Virtual backgrounds remain **web-only** (Task 61).

### Manual check

1. Mint a token and join with mic enabled.
2. Tap **Reduce noise** — the button should show **Noise reduction on** without disconnecting.
3. Mute/unmute still works with the filter attached.

## PiP + background audio (Task 58)

Logic lives in `src/pip.ts` and is wired from `MeetingGrid` / `App.tsx`.

### iOS

- `app.json` declares `UIBackgroundModes`: `audio`, `voip`, `picture-in-picture`.
- `configureMeetingAudioSession()` runs **before** `LiveKitRoom` connects (communication audio category).
- The **active speaker** camera tile gets `VideoTrack` `iosPIP` with `startAutomatically: true`. If nobody is speaking, **local camera** is used.
- PiP requires iOS 15+ and a dev build with the PiP background capability. Audio continues while locked when a mic or remote audio track is active.

### Android

- `app.json` requests foreground-service permissions for camera/mic/media playback (needed for reliable background calls).
- Audio uses `AndroidAudioTypePresets.communication` via `AudioSession.configureAudio`.
- **PiP video is iOS-only** in LiveKit's React Native SDK today (`iosPIP` on `VideoTrack`). On Android, backgrounding keeps **audio** when the OS grants it; add a foreground service (see LiveKit RN example app) for production-grade background survival.
- Rebuild the dev client after changing `app.json` permissions.

### Manual check

1. Join a room on a device with camera + mic enabled.
2. Lock the screen or switch apps — audio should continue (platform permitting).
3. On iOS, verify PiP shows the active speaker or your camera when backgrounding.

## CallKit / ConnectionService + push (Task 59)

Requires **Apple/Google signing** and a **dev build** on a physical device (not Expo Go).

### CallKit / ConnectionService

- `src/callkeep.ts` wraps `react-native-callkeep` (CallKit on iOS, ConnectionService on Android).
- `setupCallKeep()` runs at app start; rebuild after adding `@config-plugins/react-native-callkeep` to `app.json`.
- Incoming system call UI: `displayIncomingMeetingCall({ callUuid, callerName, roomId })` — test on a signed device profile.

### Push invites

- `src/push.ts` validates payloads via `parsePushInvitePayload`.
- Allowed shape: `{ "type": "room_invite", "roomId": "..." }` (+ optional `roomName`, `inviterName`).
- **Never** include `token`, `livekitApiSecret`, or other LiveKit secrets in push data — mint tokens from the web API after the user answers.

### CI / store ship

- `eas.json` defines **development** builds only (no `submit` profile).
- CI runs `scripts/verify-ci-no-store-ship.mjs` to block `eas submit` / fastlane store deploy in workflows.
- Production App Store / Play releases are manual outside CI.
