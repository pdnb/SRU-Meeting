import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    recording: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    recordingConsent: { upsert: vi.fn(), findMany: vi.fn() },
    room: { findUnique: vi.fn() },
    roomParticipant: { findUnique: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    webhookEndpoint: { findMany: vi.fn() },
    webhookDelivery: { createMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/livekit/room-service", () => ({
  getRoomService: () => null,
}));
vi.mock("@/lib/egress", () => ({
  startCompositeEgress: vi.fn(async () => ({
    egressId: "EG_1",
    objectKey: "recordings/room-1/rec-1.mp4",
    hlsPrefix: "recordings/room-1/rec-1/",
  })),
  startTrackFileEgress: vi.fn(async (input: { trackId: string }) => ({
    egressId: `EG_${input.trackId}`,
    objectKey: `recordings/room-1/rec-1/${input.trackId}.mp4`,
    hlsPrefix: null,
  })),
  stopEgressById: vi.fn(async () => undefined),
}));
vi.mock("@/lib/webhooks", () => ({
  enqueueWebhook: vi.fn(async () => undefined),
}));
vi.mock("@/lib/transcript", () => ({
  onRecordingFinished: vi.fn(async () => undefined),
}));

import { startTrackFileEgress } from "@/lib/egress";
import {
  allAdmittedHaveConsented,
  requestRecording,
  toRecordingDto,
} from "./recording";

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
};

describe("recording consent", () => {
  it("does not start until every admitted participant consents", () => {
    expect(allAdmittedHaveConsented(["a", "b"], ["a"])).toBe(false);
    expect(allAdmittedHaveConsented(["a", "b"], ["a", "b"])).toBe(true);
    expect(allAdmittedHaveConsented([], [])).toBe(false);
  });
});

describe("requestRecording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue(room);
    prisma.recording.findFirst.mockResolvedValue(null);
    prisma.auditLog.create.mockResolvedValue({});
    prisma.webhookEndpoint.findMany.mockResolvedValue([]);
  });

  it("returns 403 when a participant requests recording", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await requestRecording({
      roomId: "room-1",
      actorId: "user-p",
      raw: { mode: "composite" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("returns 409 when the room has E2EE enabled", async () => {
    prisma.room.findUnique.mockResolvedValue({ ...room, e2eeEnabled: true });
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await requestRecording({
      roomId: "room-1",
      actorId: "host-1",
      raw: { mode: "composite" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.code).toBe("E2EE_INCOMPATIBLE");
    }
  });

  it("starts track egress once per track after solo-host consent", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });
    const created = {
      id: "rec-1",
      roomId: "room-1",
      startedById: "host-1",
      mode: "tracks" as const,
      status: "pending_consent" as const,
      objectKey: null,
      hlsPrefix: null,
      startedAt: null,
      finishedAt: null,
      createdAt: new Date("2026-08-31T00:00:00.000Z"),
      consents: [{ userId: "host-1" }],
      egressIds: [] as string[],
    };
    prisma.recording.create.mockResolvedValue(created);
    prisma.roomParticipant.findMany.mockResolvedValue([{ userId: "host-1" }]);
    prisma.recording.update.mockResolvedValue(created);
    prisma.recording.findUniqueOrThrow.mockResolvedValue({
      ...created,
      status: "active",
      egressIds: ["EG_TR_A", "EG_TR_B"],
    });

    const result = await requestRecording({
      roomId: "room-1",
      actorId: "host-1",
      raw: { mode: "tracks", trackIds: ["TR_A", "TR_B"] },
    });

    expect(result.ok).toBe(true);
    expect(startTrackFileEgress).toHaveBeenCalledTimes(2);
  });
});

describe("toRecordingDto", () => {
  it("never includes egress internals beyond object keys", () => {
    const dto = toRecordingDto({
      id: "rec-1",
      roomId: "room-1",
      startedById: "host-1",
      mode: "composite",
      status: "finished",
      objectKey: "recordings/room-1/rec-1.mp4",
      hlsPrefix: "recordings/room-1/rec-1/",
      startedAt: new Date("2026-08-31T00:00:00.000Z"),
      finishedAt: new Date("2026-08-31T00:10:00.000Z"),
      createdAt: new Date("2026-08-31T00:00:00.000Z"),
    });
    expect(dto.objectKey).toBe("recordings/room-1/rec-1.mp4");
    expect(JSON.stringify(dto)).not.toContain("password");
  });
});
