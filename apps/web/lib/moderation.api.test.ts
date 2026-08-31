import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, applyMocks } = vi.hoisted(() => {
  const room = { findUnique: vi.fn(), update: vi.fn() };
  const roomParticipant = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  };
  return {
    prisma: { room, roomParticipant },
    applyMocks: { room, roomParticipant },
  };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/livekit/room-service", () => ({
  getRoomService: () => null,
  liveKitIdentity: (userId: string) => userId,
}));

import { applyModeration } from "./moderation";

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

describe("moderation API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyMocks.room.findUnique.mockResolvedValue(room);
  });

  it("returns 403 when a participant calls moderator actions", async () => {
    applyMocks.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await applyModeration({
      roomId: "room-1",
      actorId: "user-p",
      body: { action: "mute_all" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("lets the host ban, lock, and end", async () => {
    applyMocks.roomParticipant.findUnique.mockResolvedValue({
      id: "h1",
      roomId: "room-1",
      userId: "host-1",
      role: "host",
      banned: false,
      lobbyStatus: "admitted",
    });
    applyMocks.roomParticipant.upsert.mockResolvedValue({});
    applyMocks.room.update.mockResolvedValue(room);

    await expect(
      applyModeration({
        roomId: "room-1",
        actorId: "host-1",
        body: { action: "ban", targetUserId: "user-p" },
      }),
    ).resolves.toMatchObject({ ok: true });

    await expect(
      applyModeration({
        roomId: "room-1",
        actorId: "host-1",
        body: { action: "lock" },
      }),
    ).resolves.toMatchObject({ ok: true });

    await expect(
      applyModeration({
        roomId: "room-1",
        actorId: "host-1",
        body: { action: "end" },
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(applyMocks.roomParticipant.upsert).toHaveBeenCalled();
    expect(applyMocks.room.update).toHaveBeenCalled();
  });
});
