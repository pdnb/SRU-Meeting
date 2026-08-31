import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

// Next.js 15 Route Handlers:
// https://nextjs.org/docs/app/api-reference/file-conventions/route
// Serve the OpenAPI 3 document as JSON (YAML source, parse at request time).
// https://spec.openapis.org/oas/v3.0.3.html#format
// yaml.parse: https://eemeli.org/yaml/#yaml-parse

export const runtime = "nodejs";

function yamlCandidates(): string[] {
  const cwd = process.cwd();
  return [
    join(cwd, "packages", "shared", "openapi", "v1.yaml"),
    join(cwd, "..", "..", "packages", "shared", "openapi", "v1.yaml"),
    join(cwd, "..", "shared", "openapi", "v1.yaml"),
  ];
}

async function resolveOpenApiYamlPath(): Promise<string> {
  for (const candidate of yamlCandidates()) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try the next layout (repo root vs apps/web)
    }
  }

  throw new Error("OpenAPI v1 YAML was not found relative to process.cwd()");
}

export async function GET() {
  const raw = await readFile(await resolveOpenApiYamlPath(), "utf8");
  const document: unknown = parse(raw);

  if (typeof document !== "object" || document === null) {
    return Response.json(
      {
        error: {
          code: "OPENAPI_PARSE_ERROR",
          message: "OpenAPI document must be a YAML object",
        },
      },
      { status: 500 },
    );
  }

  return Response.json(document);
}
