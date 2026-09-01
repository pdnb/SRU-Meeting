import { describe, expect, it, vi } from "vitest";
import {
  EMBED_CONNECT_TYPE,
  EMBED_READY_TYPE,
  createConnectMessage,
  createReadyMessage,
  postConnect,
} from "./index";

describe("embed handshake messages", () => {
  it("documents the connect message shape without LiveKit secrets", () => {
    const message = createConnectMessage({
      roomId: "room-1",
      token: "minted-jwt",
      url: "wss://livekit.example.com",
      identity: "user-1",
      name: "Ada",
    });
    expect(message.type).toBe(EMBED_CONNECT_TYPE);
    expect(message).toEqual({
      type: "sru-embed.connect",
      roomId: "room-1",
      token: "minted-jwt",
      url: "wss://livekit.example.com",
      identity: "user-1",
      name: "Ada",
    });
    expect(JSON.stringify(message)).not.toContain("LIVEKIT_API_SECRET");
    expect(JSON.stringify(message)).not.toContain("apiSecret");
  });

  it("posts connect only to the iframe contentWindow with a target origin", () => {
    const postMessage = vi.fn();
    const iframe = {
      contentWindow: { postMessage },
    } as unknown as HTMLIFrameElement;
    const message = createConnectMessage({
      roomId: "room-1",
      token: "minted-jwt",
      url: "wss://livekit.example.com",
    });
    postConnect(iframe, message, "https://meet.example.com");
    expect(postMessage).toHaveBeenCalledWith(message, "https://meet.example.com");
  });

  it("builds the ready ping the iframe sends to the parent", () => {
    expect(createReadyMessage("room-1")).toEqual({
      type: EMBED_READY_TYPE,
      roomId: "room-1",
    });
  });
});
