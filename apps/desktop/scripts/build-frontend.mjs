import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(root, "..", "dist");

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(path.join(root, "..", "index.html"), path.join(distDir, "index.html"));

console.log("desktop frontend dist ready");
