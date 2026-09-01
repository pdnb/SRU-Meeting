import { Platform } from "react-native";
import RNCallKeep from "react-native-callkeep";
import { callKeepSetupOptions } from "./callkeep-config";

export function isCallKeepSupportedPlatform(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export type IncomingMeetingCall = {
  callUuid: string;
  callerName: string;
  roomId: string;
};

let configured = false;

/** Register CallKit (iOS) / ConnectionService (Android). Requires a dev build. */
export async function setupCallKeep(): Promise<boolean> {
  if (!isCallKeepSupportedPlatform()) {
    return false;
  }
  if (configured) {
    return true;
  }
  try {
    await RNCallKeep.setup(callKeepSetupOptions());
    if (Platform.OS === "android") {
      RNCallKeep.setAvailable(true);
    }
    configured = true;
    return true;
  } catch {
    return false;
  }
}

/** Show the system incoming-call UI (signed device / dev build). */
export function displayIncomingMeetingCall(input: IncomingMeetingCall): void {
  RNCallKeep.displayIncomingCall(
    input.callUuid,
    input.callerName,
    input.callerName,
    "generic",
    true,
  );
}

export function endCallKeepCall(callUuid: string): void {
  RNCallKeep.endCall(callUuid);
}

export { CALLKEEP_APP_NAME, callKeepSetupOptions } from "./callkeep-config";
