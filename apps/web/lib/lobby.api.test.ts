import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    room: { findUnique: vi.fn() },
    roomParticipant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));

import { decideLobby } from "./lobby";

const room = {
  id: "room-1",
  name: "Seminar",
  createdAt: new Date(),
  ownerId: "host-1",
  passwordHash: null,
  lobbyEnabled: true,
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

describe("lobby admit/deny API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue(room);
  });

  it("lets a host admit or deny a pending user", async () => {
    prisma.roomParticipant.findUnique
      .mockResolvedValueOnce({
        id: "h1",
        roomId: "room-1",
        userId: "host-1",
        role: "host",
        banned: false,
        lobbyStatus: "admitted",
      })
      .mockResolvedValueOnce({
        id: "p1",
        roomId: "room-1",
        userId: "user-p",
        role: "participant",
        banned: false,
        lobbyStatus: "pending",
      });
    prisma.roomParticipant.update.mockResolvedValue({
      lobbyStatus: "admitted",
    });

    await expect(
      decideLobby({
        roomId: "room-1",
        actorId: "host-1",
        targetUserId: "user-p",
        decision: "admit",
      }),
    ).resolves.toEqual({ ok: true, lobbyStatus: "admitted" });
  });

  it("rejects a participant deciding the lobby", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await decideLobby({
      roomId: "room-1",
      actorId: "user-p",
      targetUserId: "user-q",
      decision: "deny",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});
