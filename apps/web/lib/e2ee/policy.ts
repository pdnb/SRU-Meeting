import "server-only";

import {
  E2EE_INCOMPATIBLE_CODE,
  e2eeIncompatibleMessage,
  type E2eeFeature,
} from "@sru/shared";

export type E2eeGateResult =
  | { ok: true }
  | { ok: false; status: 409; code: typeof E2EE_INCOMPATIBLE_CODE; message: string };

export function assertE2eeCompatible(
  room: { e2eeEnabled?: boolean | null },
  feature: E2eeFeature,
): E2eeGateResult {
  if (!room.e2eeEnabled) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 409,
    code: E2EE_INCOMPATIBLE_CODE,
    message: e2eeIncompatibleMessage(feature),
  };
}

export function assertE2eeCanBeEnabled(input: {
  allowOrgE2ee: boolean;
  hasActiveRecording: boolean;
  hasActiveStream: boolean;
  hasOpenBreakouts: boolean;
}):
  | { ok: true }
  | {
      ok: false;
      status: 403 | 409;
      code: string;
      message: string;
    } {
  if (!input.allowOrgE2ee) {
    return {
      ok: false,
      status: 403,
      code: "E2EE_DISABLED_FOR_ORG",
      message: "End-to-end encryption is disabled for this organization",
    };
  }
  if (input.hasActiveRecording) {
    return {
      ok: false,
      status: 409,
      code: "RECORDING_ACTIVE",
      message: "Stop recording before enabling end-to-end encryption",
    };
  }
  if (input.hasActiveStream) {
    return {
      ok: false,
      status: 409,
      code: "STREAM_ACTIVE",
      message: "Stop live streaming before enabling end-to-end encryption",
    };
  }
  if (input.hasOpenBreakouts) {
    return {
      ok: false,
      status: 409,
      code: "BREAKOUTS_OPEN",
      message: "Close breakout rooms before enabling end-to-end encryption",
    };
  }
  return { ok: true };
}
