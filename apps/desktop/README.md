# SRU Meeting Desktop (Tauri)

Windows thin shell for [SRU Meeting](../web/). The app loads your organization's deployed web UI in **WebView2** and adds:

- System tray (show/hide, sign in, quit)
- Native notifications when someone knocks on the lobby (via web → Tauri bridge)
- Deep links: `sru-meeting://rooms/{id}` and SSO callback `sru-meeting://auth/callback?ticket=…`
- SSO via system browser → one-time ticket → WebView session

LiveKit secrets stay on the server. The desktop app only loads `{SRU_SERVER_URL}`.

## Prerequisites

- **Node.js** ≥ 18.18, **pnpm** 10.28.0
- **Rust** stable (`rustup`) and **Microsoft C++ Build Tools** (Windows)
  - Install [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the **Desktop development with C++** workload
  - If `cargo build` fails with `link: extra operand`, Git's `link.exe` is ahead of MSVC on `PATH` — use the **x64 Native Tools Command Prompt** or ensure `%ProgramFiles%\Microsoft Visual Studio\...\VC\Tools\MSVC\...\bin\Hostx64\x64` precedes Git on `PATH`
- **WebView2 Runtime** (usually preinstalled on Windows 11)
- Running SRU Meeting web app (`pnpm dev` → `http://127.0.0.1:3000`) and Compose media stack for A/V tests

## Configure server URL

Per-org builds bake the server URL at compile time:

```powershell
$env:SRU_SERVER_URL = "https://meeting.company.ac.th"
pnpm --filter desktop build
```

Default (dev): `http://127.0.0.1:3000`

## Run (development)

```powershell
pnpm install
pnpm dev                    # web API (separate terminal)
pnpm dev:desktop            # Tauri shell → WebView2 loads /app
```

## Build MSI (per org)

```powershell
$env:SRU_SERVER_URL = "https://meeting.company.ac.th"
pnpm build:desktop
```

Output: `apps/desktop/src-tauri/target/release/bundle/msi/`

Before release, replace placeholder icons:

```powershell
pnpm --filter desktop tauri icon path\to\512.png
```

## SSO (system browser)

1. Tray → **Sign in** (or use an OIDC provider from the web login page in the WebView).
2. For IdP redirect in the **system browser**, open:
   `{SRU_SERVER_URL}/api/auth/desktop/start?provider={providerId}`
3. After IdP login, the browser redirects to `sru-meeting://auth/callback?ticket=…`
4. The app loads `/api/auth/desktop/session?ticket=…` in WebView2 and establishes the session cookie.

Register redirect URIs with your IdP:

- `{AUTH_URL}/api/auth/callback/{provider}` (existing web)
- Web relay completes at `/api/auth/desktop/complete` → deep link back to the app

## Deep links

| URL | Action |
|-----|--------|
| `sru-meeting://rooms/{roomId}` | Open `/join/{roomId}` |
| `sru-meeting://auth/callback?ticket=…` | Complete desktop SSO |

Test from PowerShell:

```powershell
Start-Process "sru-meeting://rooms/your-room-id"
```

## WebView2 + LiveKit PoC (hard gate)

Before shipping, validate WebRTC on WebView2:

1. Start Compose + `pnpm dev`
2. `pnpm dev:desktop`
3. Sign in and join a room from the desktop shell
4. Open the same room in a second browser tab — confirm camera, mic, and screen share
5. Optional: enable E2EE in room settings (WebView2 is Chromium-based on Windows)

If A/V fails in WebView2, do not ship the thin shell; revisit Electron or a native LiveKit client.

## Validation checklist (v1)

- [ ] MSI installs on Windows 11
- [ ] Tray show/hide works
- [ ] Credentials login in WebView works
- [ ] SSO: system browser → deep link → session in WebView
- [ ] `sru-meeting://rooms/{id}` opens join flow
- [ ] Lobby knock shows native notification (moderator in meeting)
- [ ] Two-client A/V over WebView2
- [ ] No LiveKit API secrets in the desktop bundle

## Limitations (v1)

- **Windows only** — macOS/Linux out of scope
- Lobby notifications require the app to be running (web polls + Tauri bridge; no background push)
- Tray SSO for IdP uses `/api/auth/desktop/start` from the system browser; credentials/LDAP use in-app `/login`
- Auto-start and global hotkeys are not implemented

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm --filter desktop dev` | Tauri dev (WebView2 → local web) |
| `pnpm --filter desktop build` | Release MSI |
| `pnpm --filter desktop test` | Unit tests |
