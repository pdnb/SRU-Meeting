import { beforeEach, describe, expect, it, vi } from "vitest";

const prepareConnection = vi.fn(async () => undefined);

vi.mock("livekit-client", () => ({
  Room: class {
    prepareConnection = prepareConnection;
  },
  VideoPresets: {
    h360: { resolution: {}, encoding: {} },
    h720: { encoding: {} },
  },
}));

import {
  moveToPreparedMeeting,
  peekBreakoutMove,
  stashBreakoutMove,
  takeBreakoutMove,
} from "./breakout-move";

describe("takeBreakoutMove", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  it("returns a stashed move for the destination room once", () => {
    stashBreakoutMove({
      roomId: "child-1",
      token: "tok",
      url: "wss://lk",
      audio: true,
      video: false,
    });

    expect(takeBreakoutMove("child-1")).toEqual({
      roomId: "child-1",
      token: "tok",
      url: "wss://lk",
      audio: true,
      video: false,
    });
    expect(takeBreakoutMove("child-1")).toBeNull();
  });

  it("lets peek read the stash twice so React Strict Mode can remount", () => {
    stashBreakoutMove({
      roomId: "child-1",
      token: "tok",
      url: "wss://lk",
      audio: true,
      video: false,
    });

    expect(peekBreakoutMove("child-1")?.token).toBe("tok");
    expect(peekBreakoutMove("child-1")?.token).toBe("tok");
    expect(takeBreakoutMove("child-1")?.token).toBe("tok");
    expect(peekBreakoutMove("child-1")).toBeNull();
  });

  it("ignores a stash meant for a different room", () => {
    stashBreakoutMove({
      roomId: "child-1",
      token: "tok",
      url: "wss://lk",
      audio: true,
      video: true,
    });

    expect(takeBreakoutMove("parent-1")).toBeNull();
  });
});

describe("moveToPreparedMeeting", () => {
  beforeEach(() => {
    prepareConnection.mockClear();
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  it("pre-warms the child connection before leaving the parent", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ token: "child-tok", url: "wss://lk" }),
    }));
    const navigate = vi.fn();
    const order: string[] = [];
    prepareConnection.mockImplementation(async () => {
      order.push("prepare");
    });
    const navigating = async (...args: unknown[]) => {
      order.push("navigate");
      navigate(...args);
    };

    const result = await moveToPreparedMeeting(
      {
        destinationRoomId: "child-1",
        identity: "user-1",
        name: "Ada",
        audio: true,
        video: false,
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch, navigate: navigating },
    );

    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/v1/rooms/child-1/tokens",
      expect.objectContaining({ method: "POST" }),
    );
    expect(prepareConnection).toHaveBeenCalledWith("wss://lk", "child-tok");
    expect(navigate).toHaveBeenCalledWith("/app/rooms/child-1");
    expect(order).toEqual(["prepare", "navigate"]);
    expect(takeBreakoutMove("child-1")).toEqual({
      roomId: "child-1",
      token: "child-tok",
      url: "wss://lk",
      audio: true,
      video: false,
    });
  });

  it("does not navigate when the token request fails", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      json: async () => ({
        error: { code: "NOT_ASSIGNED", message: "Not assigned" },
      }),
    }));
    const navigate = vi.fn();

    const result = await moveToPreparedMeeting(
      {
        destinationRoomId: "child-1",
        identity: "user-1",
        audio: true,
        video: true,
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch, navigate },
    );

    expect(result.ok).toBe(false);
    expect(prepareConnection).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
