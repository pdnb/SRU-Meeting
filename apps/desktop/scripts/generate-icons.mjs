import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Minimal 32x32 PNG (solid #2563eb) for local Tauri builds before `tauri icon` is run. */
const PNG_32 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAHElEQVR42mNk+M9Qz0AEYBxVSFUAABJBAQABYQIPAAAAAElFTkSuQmCC",
  "base64",
);

const root = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(root, "..", "src-tauri", "icons");

fs.mkdirSync(iconsDir, { recursive: true });

for (const name of ["32x32.png", "128x128.png", "128x128@2x.png", "icon.png"]) {
  fs.writeFileSync(path.join(iconsDir, name), PNG_32);
}

// ICO/ICNS require proper tooling; copy PNG placeholders for scaffold builds.
fs.writeFileSync(path.join(iconsDir, "icon.ico"), PNG_32);
fs.writeFileSync(path.join(iconsDir, "icon.icns"), PNG_32);

console.log("desktop icons ready (replace with `pnpm tauri icon` before release)");
