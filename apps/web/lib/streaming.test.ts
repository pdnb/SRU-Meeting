import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prisma,
  enqueueWebhook,
  startRtmpRoomCompositeEgress,
  stopEgressById,
  updateRtmpStream,
} = vi.hoisted(() => ({
  prisma: {
    stream: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    streamConsent: { upsert: vi.fn(), findMany: vi.fn() },
    room: { findUnique: vi.fn() },
    roomParticipant: { findUnique: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  enqueueWebhook: vi.fn(async () => undefined),
  startRtmpRoomCompositeEgress: vi.fn(async () => ({ egressId: "EG_STREAM" })),
  stopEgressById: vi.fn(async () => undefined),
  updateRtmpStream: vi.fn(async () => undefined),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/webhooks", () => ({ enqueueWebhook }));
vi.mock("@/lib/livekit/room-service", () => ({
  getRoomService: () => null,
}));
vi.mock("@/lib/egress", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/egress")>();
  return {
    ...actual,
    startRtmpRoomCompositeEgress,
    stopEgressById,
    updateRtmpStream,
  };
});

import {
  STREAM_LIVE_PLAYLIST_NAME,
  streamHlsPrefix,
  streamLivePlaylistConfig,
} from "./egress";
import { allAdmittedHaveConsented } from "./recording";
import {
  getStreamForUser,
  nextStreamDestinations,
  parseRtmpUrl,
  redactRtmpUrl,
  requestStream,
  stopStream,
  updateRoomStream,
} from "./streaming";
import { streamLivePlaylistUrl } from "./stream-ui";

const room = {
  id: "room-1",
  name: "Seminar",
  createdAt: new Date(),
  ownerId: "host-1",
  passwordHash: null,
  lobbyEnabled: false,
  locked: false,
  finishedAt: null,
  allowGuests: false,
  signedInOnly: true,
  allowedEmailDomains: [],
  allowScreenShare: true,
  allowChat: true,
  maxParticipants: 25,
  chatRetentionDays: null,
  parentRoomId: null,
  breakoutSessionId: null,
};

const rtmpUrl = "rtmps://a.rtmp.youtube.com/live2/stream-key";
const rtmpUrlTwo = "rtmps://live.twitch.tv/app/other-key";

describe("parseRtmpUrl", () => {
  it("accepts rtmp and rtmps URLs and rejects other schemes", () => {
    expect(parseRtmpUrl(rtmpUrl)).toEqual({ ok: true, url: rtmpUrl });
    expect(parseRtmpUrl("rtmp://live.twitch.tv/app/key").ok).toBe(true);
    expect(parseRtmpUrl("https://example.com/live").ok).toBe(false);
    expect(parseRtmpUrl("not a url").ok).toBe(false);
  });
});

describe("redactRtmpUrl", () => {
  it("drops the stream key from a destination URL", () => {
    expect(redactRtmpUrl(rtmpUrl)).toBe("rtmps://a.rtmp.youtube.com");
    expect(redactRtmpUrl(rtmpUrl)).not.toContain("stream-key");
  });
});

describe("nextStreamDestinations", () => {
  it("adds a valid RTMP URL and rejects duplicates, missing, and malformed URLs", () => {
    const added = nextStreamDestinations({ current: [rtmpUrl], add: rtmpUrlTwo });
    expect(added.ok).toBe(true);
    if (added.ok) {
      expect(added.urls).toEqual([rtmpUrl, rtmpUrlTwo]);
    }

    const duplicate = nextStreamDestinations({
      current: [rtmpUrl],
      add: rtmpUrl,
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.status).toBe(409);
    }

    const malformed = nextStreamDestinations({
      current: [rtmpUrl],
      add: "https://example.com/live",
    });
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) {
      expect(malformed.status).toBe(422);
    }

    const removed = nextStreamDestinations({
      current: [rtmpUrl, rtmpUrlTwo],
      remove: rtmpUrlTwo,
    });
    expect(removed.ok).toBe(true);
    if (removed.ok) {
      expect(removed.urls).toEqual([rtmpUrl]);
    }

    const missing = nextStreamDestinations({
      current: [rtmpUrl],
      remove: rtmpUrlTwo,
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.status).toBe(404);
    }
  });
});

describe("HLS live playlist config", () => {
  it("points SegmentedFileOutput at live.m3u8 under the stream prefix", () => {
    const prefix = streamHlsPrefix("room-1", "st-1");
    expect(prefix).toBe("streams/room-1/st-1/");
    expect(streamLivePlaylistConfig(prefix)).toEqual({
      filenamePrefix: "streams/room-1/st-1/seg",
      playlistName: "index.m3u8",
      livePlaylistName: STREAM_LIVE_PLAYLIST_NAME,
    });
    expect(STREAM_LIVE_PLAYLIST_NAME).toBe("live.m3u8");
  });
});

describe("getStreamForUser", () => {
  const streamRow = {
    id: "st-1",
    roomId: "room-1",
    startedById: "host-1",
    status: "active" as const,
    rtmpUrls: [rtmpUrl],
    hlsPrefix: "streams/room-1/st-1/",
    egressIds: ["EG_STREAM"],
    startedAt: new Date("2026-08-31T12:00:01.000Z"),
    finishedAt: null,
    createdAt: new Date("2026-08-31T12:00:00.000Z"),
    consents: [{ userId: "host-1" }],
    room: { ownerId: "host-1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.stream.findUnique.mockResolvedValue(streamRow);
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });
  });

  it("returns a live playlist URL the VOD player can load", async () => {
    const result = await getStreamForUser({
      streamId: "st-1",
      userId: "host-1",
      orgAdmin: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.stream.hlsUrl).toBe(streamLivePlaylistUrl("st-1"));
    expect(JSON.stringify(result.stream)).not.toContain("stream-key");
  });

  it("rejects a viewer who is not in the room", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(null);
    prisma.stream.findUnique.mockResolvedValue({
      ...streamRow,
      startedById: "host-1",
      room: { ownerId: "host-1" },
    });

    const result = await getStreamForUser({
      streamId: "st-1",
      userId: "stranger",
      orgAdmin: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe("streaming consent gate", () => {
  it("reuses the recording PDPA gate", () => {
    expect(allAdmittedHaveConsented(["a", "b"], ["a"])).toBe(false);
    expect(allAdmittedHaveConsented(["a", "b"], ["a", "b"])).toBe(true);
  });
});

describe("requestStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue(room);
    prisma.stream.findFirst.mockResolvedValue(null);
    prisma.auditLog.create.mockResolvedValue({});
  });

  it("returns 403 when a participant starts a stream", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await requestStream({
      roomId: "room-1",
      actorId: "user-p",
      raw: { rtmpUrl },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
    expect(startRtmpRoomCompositeEgress).not.toHaveBeenCalled();
  });

  it("stays pending until every admitted participant consents", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });
    const created = {
      id: "st-1",
      roomId: "room-1",
      startedById: "host-1",
      status: "pending_consent" as const,
      rtmpUrls: [rtmpUrl],
      egressIds: [] as string[],
      startedAt: null,
      finishedAt: null,
      createdAt: new Date("2026-08-31T12:00:00.000Z"),
      consents: [{ userId: "host-1" }],
    };
    prisma.stream.create.mockResolvedValue(created);
    prisma.roomParticipant.findMany.mockResolvedValue([
      { userId: "host-1" },
      { userId: "user-p" },
    ]);
    prisma.stream.findUniqueOrThrow.mockResolvedValue(created);

    const result = await requestStream({
      roomId: "room-1",
      actorId: "host-1",
      raw: { rtmpUrl },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.stream.status).toBe("pending_consent");
    expect(startRtmpRoomCompositeEgress).not.toHaveBeenCalled();
    expect(enqueueWebhook).not.toHaveBeenCalled();
  });

  it("starts RTMP egress and enqueues streaming_started after solo-host consent", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });
    const created = {
      id: "st-1",
      roomId: "room-1",
      startedById: "host-1",
      status: "pending_consent" as const,
      rtmpUrls: [rtmpUrl],
      egressIds: [] as string[],
      startedAt: null,
      finishedAt: null,
      createdAt: new Date("2026-08-31T12:00:00.000Z"),
      consents: [{ userId: "host-1" }],
    };
    prisma.stream.create.mockResolvedValue(created);
    prisma.roomParticipant.findMany.mockResolvedValue([{ userId: "host-1" }]);
    prisma.stream.update.mockResolvedValue(created);
    prisma.stream.findUniqueOrThrow.mockResolvedValue({
      ...created,
      status: "active",
      egressIds: ["EG_STREAM"],
      startedAt: new Date("2026-08-31T12:00:01.000Z"),
    });

    const result = await requestStream({
      roomId: "room-1",
      actorId: "host-1",
      raw: { rtmpUrl },
    });

    expect(result.ok).toBe(true);
    expect(startRtmpRoomCompositeEgress).toHaveBeenCalledWith({
      roomId: "room-1",
      urls: [rtmpUrl],
      hlsPrefix: null,
    });
    expect(enqueueWebhook).toHaveBeenCalledWith("streaming_started", {
      stream: { id: "st-1", roomId: "room-1" },
    });
    if (result.ok) {
      expect(JSON.stringify(result.stream)).not.toContain("stream-key");
    }
  });

  it("returns 422 for a malformed RTMP URL and does not start egress", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await requestStream({
      roomId: "room-1",
      actorId: "host-1",
      raw: { rtmpUrl: "https://example.com/live" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
    }
    expect(startRtmpRoomCompositeEgress).not.toHaveBeenCalled();
    expect(prisma.stream.create).not.toHaveBeenCalled();
  });

  it("starts RTMP plus HLS live playlist when hls is true", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });
    const created = {
      id: "st-1",
      roomId: "room-1",
      startedById: "host-1",
      status: "pending_consent" as const,
      rtmpUrls: [rtmpUrl],
      hlsPrefix: null as string | null,
      egressIds: [] as string[],
      startedAt: null,
      finishedAt: null,
      createdAt: new Date("2026-08-31T12:00:00.000Z"),
      consents: [{ userId: "host-1" }],
    };
    prisma.stream.create.mockResolvedValue(created);
    prisma.roomParticipant.findMany.mockResolvedValue([{ userId: "host-1" }]);
    prisma.stream.update.mockResolvedValue(created);
    prisma.stream.findUniqueOrThrow.mockResolvedValue({
      ...created,
      status: "active",
      hlsPrefix: streamHlsPrefix("room-1", "st-1"),
      egressIds: ["EG_STREAM"],
      startedAt: new Date("2026-08-31T12:00:01.000Z"),
    });

    const result = await requestStream({
      roomId: "room-1",
      actorId: "host-1",
      raw: { rtmpUrl, hls: true },
    });

    expect(result.ok).toBe(true);
    expect(startRtmpRoomCompositeEgress).toHaveBeenCalledWith({
      roomId: "room-1",
      urls: [rtmpUrl],
      hlsPrefix: streamHlsPrefix("room-1", "st-1"),
    });
    expect(updateRtmpStream).not.toHaveBeenCalled();
  });
});

describe("updateRoomStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue(room);
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });
  });

  it("adds a second RTMP URL with updateStream and does not restart egress", async () => {
    const active = {
      id: "st-1",
      roomId: "room-1",
      startedById: "host-1",
      status: "active" as const,
      rtmpUrls: [rtmpUrl],
      hlsPrefix: null as string | null,
      egressIds: ["EG_STREAM"],
      startedAt: new Date(),
      finishedAt: null,
      createdAt: new Date(),
      consents: [{ userId: "host-1" }],
    };
    prisma.stream.findFirst.mockResolvedValue(active);
    prisma.stream.update.mockResolvedValue({
      ...active,
      rtmpUrls: [rtmpUrl, rtmpUrlTwo],
    });
    prisma.stream.findUniqueOrThrow.mockResolvedValue({
      ...active,
      rtmpUrls: [rtmpUrl, rtmpUrlTwo],
    });

    const result = await updateRoomStream({
      roomId: "room-1",
      actorId: "host-1",
      raw: { action: "add", rtmpUrl: rtmpUrlTwo },
    });

    expect(result.ok).toBe(true);
    expect(updateRtmpStream).toHaveBeenCalledWith("EG_STREAM", [rtmpUrlTwo], []);
    expect(startRtmpRoomCompositeEgress).not.toHaveBeenCalled();
    expect(stopEgressById).not.toHaveBeenCalled();
  });

  it("returns 422 for a malformed add URL and does not call updateStream", async () => {
    prisma.stream.findFirst.mockResolvedValue({
      id: "st-1",
      roomId: "room-1",
      startedById: "host-1",
      status: "active",
      rtmpUrls: [rtmpUrl],
      hlsPrefix: null,
      egressIds: ["EG_STREAM"],
      startedAt: new Date(),
      finishedAt: null,
      createdAt: new Date(),
      consents: [{ userId: "host-1" }],
    });

    const result = await updateRoomStream({
      roomId: "room-1",
      actorId: "host-1",
      raw: { action: "add", rtmpUrl: "https://example.com/live" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
    }
    expect(updateRtmpStream).not.toHaveBeenCalled();
    expect(startRtmpRoomCompositeEgress).not.toHaveBeenCalled();
  });
});

describe("stopStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue(room);
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });
  });

  it("stops the egress job and marks the stream finished", async () => {
    prisma.stream.findFirst.mockResolvedValue({
      id: "st-1",
      roomId: "room-1",
      startedById: "host-1",
      status: "active",
      rtmpUrls: [rtmpUrl],
      egressIds: ["EG_STREAM"],
      startedAt: new Date(),
      finishedAt: null,
      createdAt: new Date(),
      consents: [{ userId: "host-1" }],
    });
    prisma.stream.update.mockResolvedValue({
      id: "st-1",
      roomId: "room-1",
      startedById: "host-1",
      status: "finished",
      rtmpUrls: [rtmpUrl],
      egressIds: ["EG_STREAM"],
      startedAt: new Date(),
      finishedAt: new Date(),
      createdAt: new Date(),
      consents: [{ userId: "host-1" }],
    });

    const result = await stopStream({ roomId: "room-1", actorId: "host-1" });

    expect(result.ok).toBe(true);
    expect(stopEgressById).toHaveBeenCalledWith("EG_STREAM");
    if (result.ok) {
      expect(result.stream.status).toBe("finished");
    }
  });
});
