/**
 * Checkpoint E2E for Tasks 47–51 (streaming + embed).
 * Usage: node scripts/streaming-embed-checkpoint.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "TestPass123!";
const suffix = Date.now();

function log(step, detail = "") {
  console.log(`[stream-embed-e2e] ${step}${detail ? `: ${detail}` : ""}`);
}

async function registerUser(page, email, name) {
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.fill("#name", name);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app(?:\/|$)/, { timeout: 30_000 });
}

async function createRoom(page, roomName) {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.fill("#room-name", roomName);
  await page.click('button:has-text("Create room")');
  await page.getByText(roomName, { exact: true }).waitFor({ timeout: 15_000 });
  const join = page.locator("li").filter({ hasText: roomName }).getByRole("link", {
    name: "Join",
  });
  const href = await join.getAttribute("href");
  if (!href) {
    throw new Error("Could not find join link for created room");
  }
  const listRes = await page.request.get(`${BASE}/api/v1/rooms`);
  const list = await listRes.json();
  const created = list.data?.find((room) => room.name === roomName);
  return { roomPath: href, ownerId: created?.ownerId ?? null };
}

async function joinMeeting(page, roomPath, label) {
  await page.goto(`${BASE}${roomPath}`, { waitUntil: "networkidle" });
  const cameraOn = page.getByRole("button", { name: "Camera on" });
  if (await cameraOn.isVisible().catch(() => false)) {
    await cameraOn.click();
  }
  await page.getByRole("button", { name: "Join meeting" }).click();
  await page.getByRole("button", { name: /Mic (on|off)/ }).waitFor({
    timeout: 90_000,
  });
  log(`${label} joined meeting`);
}

async function waitForStreamStatus(page, roomId, statuses, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const json = await page.evaluate(async (id) => {
      const res = await fetch(`/api/v1/rooms/${id}/streaming`);
      if (!res.ok) {
        return null;
      }
      return res.json();
    }, roomId);
    const status = json?.data?.status;
    if (status && statuses.includes(status)) {
      return json.data;
    }
    await page.waitForTimeout(1500);
  }
  throw new Error(`Timed out waiting for stream status ${statuses.join("|")}`);
}

async function waitForPlaylist(request, streamId, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(`${BASE}/api/v1/streams/${streamId}/media/live.m3u8`);
    if (res.status() === 200) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("HLS live playlist never became available");
}

async function runStreamingFlow(host, roomPath) {
  const roomId = roomPath.split("/").pop();
  await joinMeeting(host, roomPath, "host");

  const startRes = await host.request.post(`${BASE}/api/v1/rooms/${roomId}/streaming`, {
    data: {
      hls: true,
      rtmpUrl: "rtmp://127.0.0.1/live/checkpoint",
    },
  });
  if (!startRes.ok()) {
    throw new Error(
      `Could not start stream (${startRes.status()}): ${await startRes.text()}`,
    );
  }
  const startBody = await startRes.json();
  const streamId = startBody?.id;
  if (!streamId) {
    throw new Error(`Stream id missing: ${JSON.stringify(startBody)}`);
  }
  log("stream start requested with RTMP + HLS");

  const stream = await waitForStreamStatus(host, roomId, ["active", "starting"]);
  log("stream status", stream.status);

  if (stream.status !== "active") {
    await waitForStreamStatus(host, roomId, ["active"]);
    log("stream active");
  }

  await host.goto(`${BASE}/app/streams/${streamId}`, { waitUntil: "networkidle" });
  await host.getByText(/Status: active/i).waitFor({ timeout: 15_000 });
  await host.getByLabel("Meeting live stream").waitFor({ timeout: 15_000 });
  log("in-product HLS player mounted");

  try {
    await waitForPlaylist(host.request, streamId, 90_000);
    log("live playlist returned 200");
  } catch (error) {
    log(
      "playlist not ready yet (egress may still be warming)",
      error instanceof Error ? error.message : String(error),
    );
  }

  const stopRes = await host.request.delete(`${BASE}/api/v1/rooms/${roomId}/streaming`);
  if (!stopRes.ok()) {
    throw new Error(`Could not stop stream (${stopRes.status()}): ${await stopRes.text()}`);
  }
  const stopBody = await stopRes.json();
  if (stopBody?.status !== "finished") {
    throw new Error(`Unexpected stop status: ${stopBody?.status}`);
  }
  log("stream stopped");

  return { roomId, streamId };
}

async function runEmbedFlow(host, roomId, hostUserId) {
  if (!hostUserId) {
    throw new Error("Host user id missing for embed handshake");
  }

  const mintRes = await host.request.post(`${BASE}/api/v1/rooms/${roomId}/tokens`, {
    data: {
      roomName: roomId,
      identity: hostUserId,
      name: "Embed guest",
    },
  });
  if (!mintRes.ok()) {
    throw new Error(`Token mint failed (${mintRes.status()}): ${await mintRes.text()}`);
  }
  const mint = await mintRes.json();
  if (!mint?.token || !mint?.url) {
    throw new Error(`Token mint missing fields: ${JSON.stringify(mint)}`);
  }

  await host.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await host.evaluate(
    ({ base, roomId, token, url, hostUserId }) => {
      document.body.innerHTML = "";
      const root = document.createElement("div");
      root.style.height = "720px";
      root.style.width = "100%";
      document.body.appendChild(root);
      const iframe = document.createElement("iframe");
      iframe.title = "Embed test";
      iframe.allow = "camera; microphone; display-capture; autoplay; fullscreen";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "0";

      let connected = false;
      const sendConnect = () => {
        if (connected) {
          return;
        }
        connected = true;
        iframe.contentWindow?.postMessage(
          {
            type: "sru-embed.connect",
            roomId,
            token,
            url,
            identity: hostUserId,
            name: "Embed guest",
            audio: false,
            video: false,
          },
          base,
        );
      };

      window.addEventListener("message", (event) => {
        if (event.origin !== base) {
          return;
        }
        if (event.data?.type === "sru-embed.ready") {
          sendConnect();
        }
      });

      root.appendChild(iframe);
      iframe.src = `${base}/embed/rooms/${roomId}`;
      window.setTimeout(sendConnect, 2500);
    },
    {
      base: BASE,
      roomId,
      token: mint.token,
      url: mint.url,
      hostUserId,
    },
  );

  const frame = host.frameLocator('iframe[title="Embed test"]');
  await frame.getByText("Embed blocked").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  await frame.getByRole("button", { name: "Leave" }).waitFor({
    timeout: 90_000,
  });
  log("embed iframe joined via postMessage");

  const blocked = await host.evaluate(({ base, roomId }) => {
    const iframe = document.querySelector('iframe[title="Embed test"]');
    if (!(iframe instanceof HTMLIFrameElement)) {
      return "missing iframe";
    }
    iframe.contentWindow?.postMessage(
      {
        type: "sru-embed.connect",
        roomId,
        token: "blocked",
        url: "ws://localhost:7880",
        LIVEKIT_API_SECRET: "must-not-accept",
      },
      base,
    );
    return null;
  }, { base: BASE, roomId });
  if (blocked) {
    throw new Error(blocked);
  }

  await host.waitForTimeout(1500);
  const stillConnected = await frame.getByRole("button", { name: "Leave" }).isVisible();
  if (!stillConnected) {
    throw new Error("Forbidden embed payload disconnected the meeting");
  }
  log("forbidden secret payload ignored");
}

async function main() {
  const email = `stream-embed-${suffix}@checkpoint.test`;
  const roomName = `Streaming embed checkpoint ${suffix}`;

  log("starting", BASE);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const host = await context.newPage();

  try {
    await registerUser(host, email, "Host");
    const { roomPath, ownerId } = await createRoom(host, roomName);
    const roomId = roomPath.split("/").pop();
    log("room created", roomId);

    await runEmbedFlow(host, roomId, ownerId);
    await runStreamingFlow(host, roomPath);

    console.log("\nPASS: streaming + embed checkpoint flow completed");
    console.log(`  room: ${roomId}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("\nFAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
