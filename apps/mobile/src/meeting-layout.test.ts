import { describe, expect, it } from "vitest";
import { gridColumnsForCount } from "./meeting-layout";

describe("gridColumnsForCount", () => {
  it("uses more columns as participant count grows", () => {
    expect(gridColumnsForCount(1)).toBe(1);
    expect(gridColumnsForCount(2)).toBe(2);
    expect(gridColumnsForCount(6)).toBe(3);
    expect(gridColumnsForCount(12)).toBe(4);
  });
});
