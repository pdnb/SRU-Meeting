export const CALLKEEP_APP_NAME = "SRU Conf";

export type CallKeepSetupOptions = {
  ios: { appName: string };
  android: {
    alertTitle: string;
    alertDescription: string;
    cancelButton: string;
    okButton: string;
    imageName: string;
    additionalPermissions: string[];
    foregroundService: {
      channelId: string;
      channelName: string;
      notificationTitle: string;
    };
  };
};

/** Options passed to RNCallKeep.setup (CallKit + ConnectionService). */
export function callKeepSetupOptions(): CallKeepSetupOptions {
  return {
    ios: {
      appName: CALLKEEP_APP_NAME,
    },
    android: {
      alertTitle: "Phone account access",
      alertDescription:
        "SRU Conf uses the system call UI for incoming meetings.",
      cancelButton: "Cancel",
      okButton: "OK",
      imageName: "phone_account_icon",
      additionalPermissions: [],
      foregroundService: {
        channelId: "com.sru.conf.calls",
        channelName: "Meeting calls",
        notificationTitle: "SRU Conf meeting in progress",
      },
    },
  };
}
