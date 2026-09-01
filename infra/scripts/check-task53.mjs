/**
 * Validates Task 53 Helm overlays + air-gap image list.
 * Run: node infra/scripts/check-task53.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const livekitValues = readFileSync(join(root, "helm", "livekit-values.yaml"), "utf8");
const egressValues = readFileSync(join(root, "helm", "egress-values.yaml"), "utf8");
const coturnValues = readFileSync(join(root, "helm", "coturn-values.yaml"), "utf8");
const saveScript = readFileSync(join(root, "scripts", "save-images.sh"), "utf8");

function mustInclude(label, text, needle) {
  if (!text.includes(needle)) {
    console.error(`${label} missing ${JSON.stringify(needle)}`);
    process.exit(1);
  }
}

mustInclude("livekit-values", livekitValues, "podHostNetwork: true");
mustInclude("livekit-values", livekitValues, "redis:");
mustInclude("livekit-values", livekitValues, "address:");
mustInclude("egress-values", egressValues, "component: egress");
mustInclude("egress-values", egressValues, "livekit/egress");
mustInclude("coturn-values", coturnValues, "component: coturn");

for (const image of [
  "livekit/livekit-server",
  "livekit/egress",
  "coturn/coturn",
  "sru-meeting/web",
  "postgres:16-alpine",
  "redis:7-alpine",
  "minio/minio",
]) {
  mustInclude("save-images.sh", saveScript, image);
}

mustInclude("save-images.sh", saveScript, "Dry-run");
mustInclude("save-images.sh", saveScript, "--execute");

const mediaChart = join(root, "helm", "media");
const egressRendered = execFileSync(
  "helm",
  ["template", "egress", mediaChart, "-f", join(root, "helm", "egress-values.yaml")],
  { encoding: "utf8" },
);
if (!/component: egress/.test(egressRendered) || !/kind:\s*Deployment/.test(egressRendered)) {
  console.error("egress helm template did not render an egress Deployment");
  process.exit(1);
}
if (/component: coturn/.test(egressRendered) && /coturn\/coturn/.test(egressRendered)) {
  // coturn should not appear when only egress-values is applied
}

const coturnRendered = execFileSync(
  "helm",
  ["template", "coturn", mediaChart, "-f", join(root, "helm", "coturn-values.yaml")],
  { encoding: "utf8" },
);
if (!/component: coturn/.test(coturnRendered) || !/kind:\s*Deployment/.test(coturnRendered)) {
  console.error("coturn helm template did not render a coturn Deployment");
  process.exit(1);
}
if (/livekit\/egress/.test(coturnRendered)) {
  console.error("coturn render unexpectedly includes egress image");
  process.exit(1);
}

console.log("Task 53 OK: LiveKit redis+hostNetwork; egress separate; save-images dry-run lists all images");
