import { describe, expect, it, vi } from "vitest";
import {
  attachMobileNoiseSuppression,
  shouldAttachMobileNoiseSuppression,
} from "./noise-suppression";

describe("shouldAttachMobileNoiseSuppression", () => {
  it("only attaches when the native module reports support", () => {
    expect(shouldAttachMobileNoiseSuppression(true)).toBe(true);
    expect(shouldAttachMobileNoiseSuppression(false)).toBe(false);
  });
});

describe("attachMobileNoiseSuppression", () => {
  it("attaches the processor once and enables according to preference", async () => {
    const processor = {
      setEnabled: vi.fn(async (enabled: boolean) => enabled),
    };
    let attached: unknown = null;
    const getProcessor = vi.fn(() => attached);
    const setProcessor = vi.fn(async (next: unknown) => {
      attached = next;
    });

    const result = await attachMobileNoiseSuppression({
      createProcessor: () => processor,
      getProcessor,
      setProcessor,
      enabled: true,
    });

    expect(result).toEqual({ ok: true });
    expect(setProcessor).toHaveBeenCalledWith(processor);
    expect(processor.setEnabled).toHaveBeenCalledWith(true);
  });

  it("returns ok false when processor attach throws", async () => {
    const result = await attachMobileNoiseSuppression({
      createProcessor: () => ({}),
      getProcessor: () => null,
      setProcessor: async () => {
        throw new Error("native module missing");
      },
      enabled: false,
    });
    expect(result).toEqual({ ok: false });
  });
});
