import { describe, expect, it } from "vitest";
import { CALLKEEP_APP_NAME, callKeepSetupOptions } from "./callkeep-config";

describe("callKeepSetupOptions", () => {
  it("configures CallKit app name on iOS", () => {
    expect(callKeepSetupOptions().ios.appName).toBe(CALLKEEP_APP_NAME);
  });

  it("configures ConnectionService foreground service on Android", () => {
    const android = callKeepSetupOptions().android;
    expect(android.foregroundService.channelId).toBe("com.sru.meeting.calls");
    expect(android.alertDescription).toMatch(/system call/i);
  });
});
