import { describe, expect, it } from "vitest";
import {
  IOS_PIP_OPTIONS,
  backgroundAudioConfiguration,
  selectPipParticipantIdentity,
  shouldEnableIosPip,
} from "./pip-logic";

describe("selectPipParticipantIdentity", () => {
  const participants = ["alice", "bob", "carol"];

  it("prefers the active speaker when they have a camera tile", () => {
    expect(
      selectPipParticipantIdentity({
        speakingIdentities: ["bob", "alice"],
        localIdentity: "alice",
        participantIdentities: participants,
      }),
    ).toBe("bob");
  });

  it("falls back to local camera when nobody is speaking", () => {
    expect(
      selectPipParticipantIdentity({
        speakingIdentities: [],
        localIdentity: "alice",
        participantIdentities: participants,
      }),
    ).toBe("alice");
  });

  it("falls back to the first participant tile when local is absent", () => {
    expect(
      selectPipParticipantIdentity({
        speakingIdentities: [],
        localIdentity: "zoe",
        participantIdentities: participants,
      }),
    ).toBe("alice");
  });
});

describe("shouldEnableIosPip", () => {
  it("enables PiP only on the selected participant tile", () => {
    expect(shouldEnableIosPip("bob", "bob")).toBe(true);
    expect(shouldEnableIosPip("alice", "bob")).toBe(false);
  });
});

describe("backgroundAudioConfiguration", () => {
  it("uses communication audio on Android", () => {
    expect(
      backgroundAudioConfiguration().android?.audioTypeOptions.audioMode,
    ).toBe("inCommunication");
  });
});

describe("IOS_PIP_OPTIONS", () => {
  it("auto-starts PiP when backgrounding on iOS", () => {
    expect(IOS_PIP_OPTIONS.enabled).toBe(true);
    expect(IOS_PIP_OPTIONS.startAutomatically).toBe(true);
  });
});
