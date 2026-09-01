import { describe, expect, it, vi } from "vitest";

vi.mock("@livekit/krisp-noise-filter", () => ({
  isKrispNoiseFilterSupported: vi.fn(() => true),
  KrispNoiseFilter: vi.fn(() => ({
    setEnabled: vi.fn(async (enabled: boolean) => enabled),
  })),
}));

vi.mock("@livekit/track-processors", () => ({
  supportsBackgroundProcessors: vi.fn(() => true),
  BackgroundProcessor: vi.fn(() => ({
    switchTo: vi.fn(async () => undefined),
  })),
}));

import {
  NOISE_SUPPRESSION_STORAGE_KEY,
  VIRTUAL_BACKGROUND_STORAGE_KEY,
  applyVirtualBackgroundChoice,
  applyVirtualBackgroundToTrack,
  parseVirtualBackgroundChoice,
  readNoiseSuppressionPreference,
  readVirtualBackgroundPreference,
  removeNoiseSuppressionFromTrack,
  applyNoiseSuppressionToTrack,
  shouldShowBackgroundPerformanceHint,
  writeNoiseSuppressionPreference,
  writeVirtualBackgroundPreference,
} from "./track-processors";

describe("noise suppression preferences", () => {
  it("defaults to off and persists toggles", () => {
    const storage = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    vi.stubGlobal("window", { localStorage });
    vi.stubGlobal("localStorage", localStorage);

    expect(readNoiseSuppressionPreference()).toBe(false);
    writeNoiseSuppressionPreference(true);
    expect(readNoiseSuppressionPreference()).toBe(true);
    expect(storage.get(NOISE_SUPPRESSION_STORAGE_KEY)).toBe("1");
    writeNoiseSuppressionPreference(false);
    expect(readNoiseSuppressionPreference()).toBe(false);
  });
});

describe("virtual background preferences", () => {
  it("defaults to none and persists blur or preset choices", () => {
    const storage = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    vi.stubGlobal("window", { localStorage, location: { origin: "http://localhost" } });
    vi.stubGlobal("localStorage", localStorage);

    expect(readVirtualBackgroundPreference()).toEqual({ type: "none" });
    writeVirtualBackgroundPreference({ type: "blur" });
    expect(readVirtualBackgroundPreference()).toEqual({ type: "blur" });
    expect(storage.get(VIRTUAL_BACKGROUND_STORAGE_KEY)).toBe('{"type":"blur"}');
    writeVirtualBackgroundPreference({ type: "preset", id: "office" });
    expect(readVirtualBackgroundPreference()).toEqual({
      type: "preset",
      id: "office",
    });
    expect(parseVirtualBackgroundChoice('{"type":"preset","id":"unknown"}')).toEqual(
      { type: "none" },
    );
  });

  it("flags low-end devices when an effect is enabled", () => {
    vi.stubGlobal("navigator", { hardwareConcurrency: 4 });
    expect(shouldShowBackgroundPerformanceHint({ type: "blur" })).toBe(true);
    expect(shouldShowBackgroundPerformanceHint({ type: "none" })).toBe(false);
    vi.stubGlobal("navigator", { hardwareConcurrency: 8 });
    expect(shouldShowBackgroundPerformanceHint({ type: "blur" })).toBe(false);
  });
});

describe("noise processor attach/detach", () => {
  it("attaches processor when enabling and disables without unpublishing", async () => {
    const processor = {
      setEnabled: vi.fn(async (enabled: boolean) => enabled),
    };
    const track = {
      getProcessor: vi.fn(() => null as unknown),
      setProcessor: vi.fn(async () => undefined),
    };

    await applyNoiseSuppressionToTrack(
      track as never,
      true,
      processor as never,
    );
    expect(track.setProcessor).toHaveBeenCalledWith(processor);
    expect(processor.setEnabled).toHaveBeenCalledWith(true);

    track.getProcessor.mockReturnValue(processor);
    await removeNoiseSuppressionFromTrack(track as never, processor as never);
    expect(processor.setEnabled).toHaveBeenCalledWith(false);
    expect(track.setProcessor).toHaveBeenCalledTimes(1);
  });

  it("skips setProcessor when already attached", async () => {
    const processor = {
      setEnabled: vi.fn(async (enabled: boolean) => enabled),
    };
    const track = {
      getProcessor: vi.fn(() => processor),
      setProcessor: vi.fn(async () => undefined),
    };

    await applyNoiseSuppressionToTrack(
      track as never,
      true,
      processor as never,
    );
    expect(track.setProcessor).not.toHaveBeenCalled();
    expect(processor.setEnabled).toHaveBeenCalledWith(true);
  });
});

describe("virtual background processor attach", () => {
  it("attaches once and switches modes without republishing", async () => {
    const processor = {
      switchTo: vi.fn(async () => undefined),
    };
    const track = {
      getProcessor: vi.fn(() => null as unknown),
      setProcessor: vi.fn(async () => undefined),
    };

    await applyVirtualBackgroundToTrack(
      track as never,
      { type: "blur" },
      processor as never,
    );
    expect(track.setProcessor).toHaveBeenCalledWith(processor);
    expect(processor.switchTo).toHaveBeenCalledWith({
      mode: "background-blur",
      blurRadius: 10,
    });

    track.getProcessor.mockReturnValue(processor);
    await applyVirtualBackgroundChoice(
      { type: "preset", id: "nature" },
      processor as never,
    );
    expect(track.setProcessor).toHaveBeenCalledTimes(1);
    expect(processor.switchTo).toHaveBeenLastCalledWith({
      mode: "virtual-background",
      imagePath: "http://localhost/backgrounds/nature.jpg",
    });
  });
});
