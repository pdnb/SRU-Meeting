/** Tauri global injected when the desktop shell sets `withGlobalTauri: true`. */
type TauriCore = {
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
};

declare global {
  interface Window {
    __TAURI__?: {
      core?: TauriCore;
    };
  }
}

export function isDesktopShell(): boolean {
  return typeof window !== "undefined" && typeof window.__TAURI__?.core?.invoke === "function";
}

export async function showDesktopNotification(
  title: string,
  body: string,
): Promise<void> {
  if (!isDesktopShell()) {
    return;
  }
  await window.__TAURI__!.core!.invoke("show_notification", { title, body });
}

export async function navigateDesktopShell(path: string): Promise<void> {
  if (!isDesktopShell()) {
    return;
  }
  await window.__TAURI__!.core!.invoke("navigate_to", { path });
}

export async function focusDesktopShell(): Promise<void> {
  if (!isDesktopShell()) {
    return;
  }
  await window.__TAURI__!.core!.invoke("focus_window");
}
