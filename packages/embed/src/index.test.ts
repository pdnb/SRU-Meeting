import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { embedRoomUrl, mount } from "./index";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const name of entries) {
    if (name === "node_modules" || name === "dist") {
      continue;
    }
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      files.push(...collectSourceFiles(path));
      continue;
    }
    if (/\.(ts|tsx|js|json|md)$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

describe("embedRoomUrl", () => {
  it("points the iframe at the hosted embed room page", () => {
    expect(embedRoomUrl("https://meet.example.com", "room-1")).toBe(
      "https://meet.example.com/embed/rooms/room-1",
    );
    expect(embedRoomUrl("https://meet.example.com/", "room-1")).toBe(
      "https://meet.example.com/embed/rooms/room-1",
    );
  });
});

describe("mount", () => {
  it("creates an iframe without bundling LiveKit into the parent page", () => {
    const appended: HTMLElement[] = [];
    const container = {
      appendChild(node: HTMLElement) {
        appended.push(node);
        return node;
      },
      removeChild(node: HTMLElement) {
        const index = appended.indexOf(node);
        if (index >= 0) {
          appended.splice(index, 1);
        }
        return node;
      },
    } as unknown as HTMLElement;

    const previousDocument = globalThis.document;
    globalThis.document = {
      createElement(tag: string) {
        if (tag !== "iframe") {
          throw new Error(`unexpected element ${tag}`);
        }
        return {
          tagName: "IFRAME",
          src: "",
          title: "",
          allow: "",
          setAttribute() {},
          style: {} as CSSStyleDeclaration,
        } as unknown as HTMLIFrameElement;
      },
    } as Document;

    try {
      const handle = mount({
        container,
        roomId: "room-1",
        baseUrl: "https://meet.example.com",
      });
      expect(appended).toHaveLength(1);
      expect(handle.iframe.src).toBe(
        "https://meet.example.com/embed/rooms/room-1",
      );
      expect(handle.iframe.allow).toContain("camera");
      expect(handle.iframe.allow).toContain("microphone");
      handle.destroy();
      expect(appended).toHaveLength(0);
    } finally {
      globalThis.document = previousDocument;
    }
  });
});

describe("embed package secrets", () => {
  it("does not ship LIVEKIT_API_SECRET or LiveKit SDK deps", () => {
    const pkg = JSON.parse(
      readFileSync(join(PKG_ROOT, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const depNames = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ];
    expect(depNames.some((name) => name.includes("livekit"))).toBe(false);

    const shipped = collectSourceFiles(PKG_ROOT).filter(
      (file) => !file.endsWith(".test.ts") && !file.includes("vitest.config"),
    );
    for (const file of shipped) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/LIVEKIT_API_SECRET/);
      expect(text, file).not.toMatch(/livekit-server-sdk/);
      expect(text, file).not.toMatch(/livekit-client/);
      expect(text, file).not.toMatch(/@livekit\//);
    }
  });
});
