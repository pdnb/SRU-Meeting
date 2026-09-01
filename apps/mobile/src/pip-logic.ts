/** Pure PiP / background-audio helpers (no React Native native imports). */

/** iOS PiP options for the active-speaker (or local) camera tile. */
export const IOS_PIP_OPTIONS = {
  enabled: true,
  startAutomatically: true,
  preferredSize: {
    width: 9,
    height: 16,
  },
} as const;

/** Android communication preset shape used by configureMeetingAudioSession. */
export const MEETING_ANDROID_AUDIO_OPTIONS = {
  manageAudioFocus: true,
  audioMode: "inCommunication",
  audioFocusMode: "gain",
  audioAttributesUsageType: "voiceCommunication",
  audioAttributesContentType: "speech",
  audioStreamType: "voiceCall",
} as const;

export type MeetingAudioConfiguration = {
  android?: {
    audioTypeOptions: typeof MEETING_ANDROID_AUDIO_OPTIONS;
  };
  ios?: {
    defaultOutput?: "speaker" | "earpiece";
  };
};

export function backgroundAudioConfiguration(): MeetingAudioConfiguration {
  return {
    android: {
      audioTypeOptions: MEETING_ANDROID_AUDIO_OPTIONS,
    },
    ios: {
      defaultOutput: "speaker",
    },
  };
}

/**
 * Pick which participant camera should drive PiP.
 * Prefers the active speaker, then local camera, then first remote tile.
 */
export function selectPipParticipantIdentity(input: {
  speakingIdentities: string[];
  localIdentity: string;
  participantIdentities: string[];
}): string {
  for (const identity of input.speakingIdentities) {
    if (input.participantIdentities.includes(identity)) {
      return identity;
    }
  }
  if (input.participantIdentities.includes(input.localIdentity)) {
    return input.localIdentity;
  }
  return input.participantIdentities[0] ?? input.localIdentity;
}

export function shouldEnableIosPip(
  participantIdentity: string,
  pipIdentity: string,
): boolean {
  return participantIdentity === pipIdentity;
}
