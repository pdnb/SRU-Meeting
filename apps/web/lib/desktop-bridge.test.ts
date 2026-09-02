import { describe, expect, it } from "vitest";
import { isDesktopShell } from "./desktop-bridge";

describe("desktop-bridge", () => {
  it("returns false without Tauri global", () => {
    expect(isDesktopShell()).toBe(false);
  });
});
