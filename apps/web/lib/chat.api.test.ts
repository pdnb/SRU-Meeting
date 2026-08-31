import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    chatMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    roomParticipant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/storage", () => ({
  signDownloadUrl: vi.fn(async () => "https://example.test/file"),
}));

import { createMessageForUser, listMessagesForUser } from "./chat";

describe("chat API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates and lists public messages for a room member", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "a",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });
    const row = {
      id: "m1",
      roomId: "room-1",
      senderId: "a",
      body: "Hello room",
      recipientId: null,
      attachmentKey: null,
      createdAt: new Date("2026-08-31T00:00:00.000Z"),
    };
    prisma.chatMessage.create.mockResolvedValue(row);
    prisma.chatMessage.findMany.mockResolvedValue([row]);

    const created = await createMessageForUser({
      roomId: "room-1",
      userId: "a",
      raw: { body: "Hello room" },
      allowChat: true,
    });
    expect(created.ok).toBe(true);

    const listed = await listMessagesForUser("room-1", "a");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.body).toBe("Hello room");
  });

  it("does not list a DM to a third user", async () => {
    prisma.chatMessage.findMany.mockResolvedValue([]);

    const listed = await listMessagesForUser("room-1", "c");

    expect(listed).toEqual([]);
    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { recipientId: null },
            { senderId: "c" },
            { recipientId: "c" },
          ],
        }),
      }),
    );
  });

  it("rejects a sender who is not in the room", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue(null);

    const result = await createMessageForUser({
      roomId: "room-1",
      userId: "stranger",
      raw: { body: "Hi", recipientId: "b" },
      allowChat: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_IN_ROOM");
    }
  });
});
