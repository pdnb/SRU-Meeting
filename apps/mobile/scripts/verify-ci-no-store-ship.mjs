#!/usr/bin/env node
/**
 * CI guard: mobile store submission is manual only (Task 59).
 * Fails if workflow files contain eas submit / store deploy commands.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../../..");
const WORKFLOWS = join(ROOT, ".github/workflows");

const BLOCKED = [
  /\beas\s+submit\b/i,
  /\bfastlane\s+(deliver|supply|upload_to_app_store|upload_to_play_store)\b/i,
  /\bxcodebuild\s+-exportArchive\b.*\bupload\b/i,
];

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      files.push(...walk(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

let failed = false;
for (const file of walk(WORKFLOWS)) {
  const text = readFileSync(file, "utf8");
  for (const pattern of BLOCKED) {
    if (pattern.test(text)) {
      console.error(`Store ship blocked in CI: ${file} matches ${pattern}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("CI workflows do not ship mobile store builds.");
