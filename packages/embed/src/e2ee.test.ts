import { describe, expect, it } from "vitest";
import { createE2eeWarning, isEmbedE2eeWarning } from "./e2ee";

describe("embed e2ee warning", () => {
  it("creates a postMessage-safe warning payload", () => {
    const warning = createE2eeWarning("room-1");
    expect(isEmbedE2eeWarning(warning)).toBe(true);
    expect(warning.roomId).toBe("room-1");
    expect(warning.matrix.e2eeEnabled).toBe(true);
  });
});
