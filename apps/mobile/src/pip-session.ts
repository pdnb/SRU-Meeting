import { AudioSession } from "@livekit/react-native";
import { backgroundAudioConfiguration } from "./pip-logic";

/** Configure and start the native audio session before joining a room. */
export async function configureMeetingAudioSession(): Promise<void> {
  await AudioSession.configureAudio(backgroundAudioConfiguration());
  await AudioSession.startAudioSession();
}

/** Stop the meeting audio session when leaving a room. */
export async function stopMeetingAudioSession(): Promise<void> {
  await AudioSession.stopAudioSession();
}
