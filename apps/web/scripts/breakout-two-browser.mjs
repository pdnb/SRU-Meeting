/**
 * Local two-browser breakout checkpoint (Tasks 41–46).
 * Usage: node scripts/breakout-two-browser.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "TestPass123!";
const suffix = Date.now();

function log(step, detail = "") {
  console.log(`[breakout-e2e] ${step}${detail ? `: ${detail}` : ""}`);
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
  return href;
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

async function openBreakouts(hostPage) {
  await hostPage.getByRole("button", { name: "Breakouts" }).click();
  await hostPage.getByRole("button", { name: "Open breakouts" }).click();
  await hostPage.getByRole("button", { name: "Recall everyone" }).waitFor({
    timeout: 30_000,
  });
  log("host opened breakouts");
}

async function main() {
  const hostEmail = `host-${suffix}@breakout.test`;
  const guestEmail = `guest-${suffix}@breakout.test`;
  const roomName = `Breakout checkpoint ${suffix}`;

  log("starting", BASE);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });

  const hostContext = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const guestContext = await browser.newContext({
    permissions: ["camera", "microphone"],
  });

  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  try {
    log("register host", hostEmail);
    await registerUser(host, hostEmail, "Host");

    log("register guest", guestEmail);
    await registerUser(guest, guestEmail, "Guest");

    const roomPath = await createRoom(host, roomName);
    const parentRoomId = roomPath.split("/").pop();
    log("room created", parentRoomId);

    await Promise.all([
      joinMeeting(host, roomPath, "host"),
      joinMeeting(guest, roomPath, "guest"),
    ]);

    await openBreakouts(host);

    const joinBreakout = guest.getByRole("button", { name: /^Join / });
    await joinBreakout.waitFor({ timeout: 30_000 });
    await joinBreakout.click();
    await guest.waitForURL(new RegExp(`/app/rooms/(?!${parentRoomId})`), {
      timeout: 60_000,
    });
    const childUrl = guest.url();
    const childRoomId = childUrl.split("/").pop();
    log("guest landed in child", childRoomId);

    await host.getByRole("button", { name: "Recall everyone" }).click();
    await host.getByText("Everyone was recalled to this room.").waitFor({
      timeout: 30_000,
    });

    await guest.waitForURL(new RegExp(`/app/rooms/${parentRoomId}`), {
      timeout: 60_000,
    });
    log("guest returned to parent after recall");

    console.log("\nPASS: two-browser breakout flow completed");
    console.log(`  parent: ${parentRoomId}`);
    console.log(`  child:  ${childRoomId}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("\nFAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
