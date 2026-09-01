export type EmbedMountOptions = {
  /** Parent page element that will own the iframe. */
  container: HTMLElement;
  /** SRU-Meeting room id. */
  roomId: string;
  /**
   * Origin of the SRU-Meeting deployment that hosts `/embed/rooms/[id]`.
   * Example: `https://meet.example.com`
   */
  baseUrl: string;
  /** Accessible name for the iframe. */
  title?: string;
  /** Optional class name applied to the iframe. */
  className?: string;
};

export type EmbedHandle = {
  iframe: HTMLIFrameElement;
  destroy: () => void;
};

/**
 * Message shape for the embed handshake.
 *
 * Parent → iframe (`sru-embed.connect`):
 * `{ type, roomId, token, url, identity?, name?, role?, audio?, video? }`
 * `token` is a LiveKit JWT minted by the customer's backend via the SRU API.
 * Never put LiveKit API secrets (or any API secret) in this message or on the
 * customer page.
 *
 * Iframe → parent (`sru-embed.ready`):
 * `{ type, roomId }` — sent when the iframe is listening for connect.
 *
 * Iframe → parent (`sru-embed.e2ee-warning`):
 * Sent when the hosted room has E2EE enabled so integrators can show a banner.
 */
export const EMBED_READY_TYPE = "sru-embed.ready" as const;
export const EMBED_CONNECT_TYPE = "sru-embed.connect" as const;

export type EmbedReadyMessage = {
  type: typeof EMBED_READY_TYPE;
  roomId: string;
};

export type EmbedConnectMessage = {
  type: typeof EMBED_CONNECT_TYPE;
  roomId: string;
  /** Minted LiveKit participant JWT (not an API secret). */
  token: string;
  /** LiveKit WebSocket URL from the token mint response. */
  url: string;
  identity?: string;
  name?: string;
  role?: "host" | "cohost" | "participant";
  audio?: boolean;
  video?: boolean;
};

export {
  EMBED_E2EE_WARNING_TYPE,
  createE2eeWarning,
  isEmbedE2eeWarning,
  type EmbedE2eeWarning,
} from "./e2ee";

export function createReadyMessage(roomId: string): EmbedReadyMessage {
  return { type: EMBED_READY_TYPE, roomId };
}

export function createConnectMessage(input: {
  roomId: string;
  token: string;
  url: string;
  identity?: string;
  name?: string;
  role?: "host" | "cohost" | "participant";
  audio?: boolean;
  video?: boolean;
}): EmbedConnectMessage {
  return {
    type: EMBED_CONNECT_TYPE,
    roomId: input.roomId,
    token: input.token,
    url: input.url,
    ...(input.identity ? { identity: input.identity } : {}),
    ...(input.name ? { name: input.name } : {}),
    ...(input.role ? { role: input.role } : {}),
    ...(typeof input.audio === "boolean" ? { audio: input.audio } : {}),
    ...(typeof input.video === "boolean" ? { video: input.video } : {}),
  };
}

/**
 * Sends a minted connect payload into the hosted iframe.
 * `targetOrigin` must be the SRU-Meeting deployment origin (see `baseUrl`).
 */
export function postConnect(
  iframe: HTMLIFrameElement,
  message: EmbedConnectMessage,
  targetOrigin: string,
): void {
  iframe.contentWindow?.postMessage(message, targetOrigin);
}

/**
 * Builds the absolute URL for the hosted embed room page.
 * The parent site loads this in an iframe so it never bundles LiveKit.
 */
export function embedRoomUrl(baseUrl: string, roomId: string): string {
  const origin = baseUrl.replace(/\/+$/, "");
  const id = encodeURIComponent(roomId);
  return `${origin}/embed/rooms/${id}`;
}

/**
 * Mounts an SRU-Meeting meeting iframe into `container`.
 * LiveKit media and secrets stay inside the hosted iframe origin.
 */
export function mount(options: EmbedMountOptions): EmbedHandle {
  const iframe = document.createElement("iframe");
  iframe.src = embedRoomUrl(options.baseUrl, options.roomId);
  iframe.title = options.title ?? "SRU-Meeting meeting";
  iframe.allow = "camera; microphone; display-capture; autoplay; fullscreen";
  iframe.setAttribute("allowfullscreen", "true");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  if (options.className) {
    iframe.className = options.className;
  }
  options.container.appendChild(iframe);
  return {
    iframe,
    destroy: () => {
      options.container.removeChild(iframe);
    },
  };
}
