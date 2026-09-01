#!/usr/bin/env node
/**
 * Small-N join-time runner against local Compose LiveKit.
 * This is NOT a 500-user load test — see README.md.
 *
 * Usage:
 *   node infra/loadtest/run.mjs --help
 *   node infra/loadtest/run.mjs --dry-run
 *   node infra/loadtest/run.mjs --participants 3
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");

/** Mirrors apps/web/lib/loadtest-join.ts (JOIN_BUDGET_MS = 3000). */
const JOIN_BUDGET_MS = 3000;

function assertJoinUnderBudget(joinMs, budgetMs = JOIN_BUDGET_MS) {
  if (!Number.isFinite(joinMs) || joinMs < 0) {
    return { ok: false, message: `Invalid join time ${String(joinMs)}` };
  }
  if (joinMs > budgetMs) {
    return {
      ok: false,
      message: `Join took ${joinMs}ms; budget is ${budgetMs}ms`,
    };
  }
  return { ok: true };
}

function summarizeJoinSamples(samplesMs, budgetMs = JOIN_BUDGET_MS) {
  if (samplesMs.length === 0) {
    return { ok: false, maxMs: 0, count: 0, failures: 0 };
  }
  let maxMs = 0;
  let failures = 0;
  for (const sample of samplesMs) {
    if (sample > maxMs) maxMs = sample;
    if (!assertJoinUnderBudget(sample, budgetMs).ok) failures += 1;
  }
  return { ok: failures === 0, maxMs, count: samplesMs.length, failures };
}

function printHelp() {
  console.log(`sru-meeting loadtest — Compose LiveKit join-time check (small N)

Usage:
  node infra/loadtest/run.mjs --help
  node infra/loadtest/run.mjs --dry-run
  node infra/loadtest/run.mjs [--participants N] [--room NAME]

Options:
  --help             Show this help
  --dry-run          Print plan only; do not connect
  --participants N   Concurrent joins (default: 1, max: 10)
  --room NAME        LiveKit room name (default: loadtest-room)
  --url URL          LiveKit URL (default: ws://127.0.0.1:7880)
  --api-key KEY      API key (default: LIVEKIT_API_KEY or Compose devkey)
  --api-secret SEC   API secret (default: LIVEKIT_API_SECRET or Compose local secret)

This runner measures join latency against local Compose. It is NOT a 500-user
run (that is Task 55). Spec §7.1 gate used here: join under ${JOIN_BUDGET_MS}ms at small N.

Unit tests for the same gate live in apps/web/lib/loadtest-join.test.ts.
`);
}

function parseArgs(argv) {
  const opts = {
    help: false,
    dryRun: false,
    participants: 1,
    room: "loadtest-room",
    url: process.env.LIVEKIT_URL ?? "ws://127.0.0.1:7880",
    apiKey: process.env.LIVEKIT_API_KEY ?? "devkey",
    apiSecret:
      process.env.LIVEKIT_API_SECRET ??
      "sru_livekit_local_dev_secret_do_not_use",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--participants") {
      opts.participants = Number.parseInt(argv[++i] ?? "1", 10);
    } else if (arg === "--room") {
      opts.room = argv[++i] ?? opts.room;
    } else if (arg === "--url") {
      opts.url = argv[++i] ?? opts.url;
    } else if (arg === "--api-key") {
      opts.apiKey = argv[++i] ?? opts.apiKey;
    } else if (arg === "--api-secret") {
      opts.apiSecret = argv[++i] ?? opts.apiSecret;
    } else {
      throw new Error(`Unknown argument: ${arg} (try --help)`);
    }
  }
  if (
    !Number.isFinite(opts.participants) ||
    opts.participants < 1 ||
    opts.participants > 10
  ) {
    throw new Error("--participants must be between 1 and 10 (small N only)");
  }
  return opts;
}

async function loadLiveKit() {
  const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
  const clientPath = requireFromWeb.resolve("livekit-client");
  const sdkPath = requireFromWeb.resolve("livekit-server-sdk");
  const clientMod = await import(pathToFileURL(clientPath).href);
  const sdkMod = await import(pathToFileURL(sdkPath).href);
  const client = clientMod.default ?? clientMod;
  const sdk = sdkMod.default ?? sdkMod;
  if (typeof client.Room !== "function") {
    throw new Error("Could not load livekit-client Room from apps/web");
  }
  return {
    Room: client.Room,
    RoomEvent: client.RoomEvent,
    AccessToken: sdk.AccessToken,
  };
}

async function mintToken(AccessToken, opts, identity) {
  const at = new AccessToken(opts.apiKey, opts.apiSecret, {
    identity,
    ttl: "5m",
  });
  at.addGrant({
    roomJoin: true,
    room: opts.room,
    canPublish: true,
    canSubscribe: true,
  });
  return at.toJwt();
}

async function joinOnce(lk, opts, identity) {
  const token = await mintToken(lk.AccessToken, opts, identity);
  const room = new lk.Room();
  const started = performance.now();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out joining as ${identity}`));
    }, 15_000);
    room.once(lk.RoomEvent.Connected, () => {
      clearTimeout(timer);
      resolve();
    });
    room.connect(opts.url, token).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  const joinMs = Math.round(performance.now() - started);
  await room.disconnect();
  return joinMs;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  console.log("SRU-Meeting Compose loadtest (small N — not a 500-user run)");
  console.log(`  url:           ${opts.url}`);
  console.log(`  room:          ${opts.room}`);
  console.log(`  participants:  ${opts.participants}`);
  console.log(`  join budget:   ${JOIN_BUDGET_MS}ms`);
  console.log(`  mode:          ${opts.dryRun ? "dry-run" : "execute"}`);

  if (opts.dryRun) {
    console.log("Dry-run only — no LiveKit connections.");
    return;
  }

  const lk = await loadLiveKit();
  const samples = [];
  for (let i = 0; i < opts.participants; i += 1) {
    const identity = `loadtest-${i + 1}-${Date.now()}`;
    const joinMs = await joinOnce(lk, opts, identity);
    samples.push(joinMs);
    const check = assertJoinUnderBudget(joinMs);
    console.log(
      `  join ${identity}: ${joinMs}ms ${check.ok ? "OK" : `FAIL — ${check.message}`}`,
    );
  }

  const summary = summarizeJoinSamples(samples);
  console.log(
    `Summary: max=${summary.maxMs}ms count=${summary.count} failures=${summary.failures}`,
  );
  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
