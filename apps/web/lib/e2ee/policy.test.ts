import { describe, expect, it } from "vitest";
import {
  assertE2eeCanBeEnabled,
  assertE2eeCompatible,
} from "./policy";

describe("assertE2eeCompatible", () => {
  it("allows features when E2EE is off", () => {
    expect(assertE2eeCompatible({ e2eeEnabled: false }, "recording")).toEqual({
      ok: true,
    });
  });

  it("returns 409 for recording in E2EE rooms", () => {
    const result = assertE2eeCompatible({ e2eeEnabled: true }, "recording");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.code).toBe("E2EE_INCOMPATIBLE");
      expect(result.message).toContain("Recording");
    }
  });
});

describe("assertE2eeCanBeEnabled", () => {
  it("requires org allowance", () => {
    const result = assertE2eeCanBeEnabled({
      allowOrgE2ee: false,
      hasActiveRecording: false,
      hasActiveStream: false,
      hasOpenBreakouts: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("E2EE_DISABLED_FOR_ORG");
    }
  });

  it("blocks when recording is active", () => {
    const result = assertE2eeCanBeEnabled({
      allowOrgE2ee: true,
      hasActiveRecording: true,
      hasActiveStream: false,
      hasOpenBreakouts: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("RECORDING_ACTIVE");
    }
  });
});
