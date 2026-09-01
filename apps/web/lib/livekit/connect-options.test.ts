import { describe, expect, it } from "vitest";
import {
  connectOptionsForLiveKitUrl,
  isLocalLiveKitUrl,
  networkPrefersLowBandwidth,
  roomOptionsForNetwork,
} from "./connect-options";

describe("connect options", () => {
  it("treats loopback LiveKit URLs as local", () => {
    expect(isLocalLiveKitUrl("ws://localhost:7880")).toBe(true);
    expect(isLocalLiveKitUrl("ws://127.0.0.1:7880")).toBe(true);
    expect(isLocalLiveKitUrl("wss://meet.example.org")).toBe(false);
  });

  it("forces TURN relay only on local LiveKit URLs", () => {
    expect(connectOptionsForLiveKitUrl("ws://localhost:7880").rtcConfig).toEqual(
      { iceTransportPolicy: "relay" },
    );
    expect(
      connectOptionsForLiveKitUrl("wss://meet.example.org").rtcConfig,
    ).toBeUndefined();
  });
});

describe("4G encoding defaults", () => {
  it("uses a 360p camera preset on 4G or save-data", () => {
    expect(networkPrefersLowBandwidth({ effectiveType: "4g" })).toBe(true);
    expect(networkPrefersLowBandwidth({ saveData: true })).toBe(true);
    expect(networkPrefersLowBandwidth({ effectiveType: "wifi" })).toBe(false);
    const options = roomOptionsForNetwork({ effectiveType: "4g" });
    expect(options.videoCaptureDefaults?.resolution?.height).toBe(360);
  });
});
