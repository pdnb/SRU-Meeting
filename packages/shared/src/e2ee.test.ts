import { describe, expect, it } from "vitest";
import {
  buildE2eePolicyMatrix,
  e2eeIncompatibleMessage,
  E2EE_INCOMPATIBLE_CODE,
} from "./e2ee";

describe("buildE2eePolicyMatrix", () => {
  it("returns empty features when E2EE is off", () => {
    expect(buildE2eePolicyMatrix(false)).toEqual({
      e2eeEnabled: false,
      features: [],
    });
  });

  it("marks recording, streaming, breakouts, mobile, and safari unavailable", () => {
    const matrix = buildE2eePolicyMatrix(true);
    const blocked = matrix.features
      .filter((row) => !row.available)
      .map((row) => row.feature);
    expect(blocked).toEqual(
      expect.arrayContaining([
        "recording",
        "streaming",
        "breakouts",
        "mobile",
        "safari",
        "screen_share_encrypted",
      ]),
    );
    expect(
      matrix.features.find((row) => row.feature === "embed")?.available,
    ).toBe(true);
  });
});

describe("e2eeIncompatibleMessage", () => {
  it("names the blocked feature", () => {
    expect(e2eeIncompatibleMessage("recording")).toContain("Recording");
    expect(e2eeIncompatibleMessage("breakouts")).toContain("Breakout");
  });

  it("exports stable conflict code", () => {
    expect(E2EE_INCOMPATIBLE_CODE).toBe("E2EE_INCOMPATIBLE");
  });
});
