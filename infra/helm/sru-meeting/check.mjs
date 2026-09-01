/**
 * Guards Helm values against committed local Compose credentials.
 * Run: node infra/helm/sru-meeting/check.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const chartDir = dirname(fileURLToPath(import.meta.url));
const valuesPath = join(chartDir, "values.yaml");
const values = readFileSync(valuesPath, "utf8");

const forbidden = [
  "sru_local_dev",
  "sru_minio_local_dev",
  "sru_livekit_local_dev_secret_do_not_use",
  "sru_turn_local",
];

for (const needle of forbidden) {
  if (values.includes(needle)) {
    console.error(`values.yaml must not contain Compose credential ${needle}`);
    process.exit(1);
  }
}

if (!values.includes("REPLACE_ME")) {
  console.error("values.yaml should use REPLACE_ME placeholders for secrets");
  process.exit(1);
}

const rendered = execFileSync(
  "helm",
  ["template", "sru", chartDir],
  { encoding: "utf8" },
);

const required = [
  { label: "web Deployment", re: /kind:\s*Deployment[\s\S]*?component: web/ },
  { label: "postgres StatefulSet", re: /kind:\s*StatefulSet[\s\S]*?component: postgres/ },
  { label: "redis Deployment", re: /kind:\s*Deployment[\s\S]*?component: redis/ },
  { label: "minio StatefulSet", re: /kind:\s*StatefulSet[\s\S]*?component: minio/ },
];

for (const item of required) {
  if (!item.re.test(rendered)) {
    console.error(`helm template missing ${item.label}`);
    process.exit(1);
  }
}

console.log("helm chart OK: web, postgres, redis, minio; values have no Compose secrets");
