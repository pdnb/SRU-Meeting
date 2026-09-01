import { beforeEach, describe, expect, it, vi } from "vitest";
import { parentCanHostBreakouts } from "./breakouts";

describe("parentCanHostBreakouts", () => {
  it("allows a top-level room to host a breakout session", () => {
    expect(
      parentCanHostBreakouts({ parentRoomId: null, finishedAt: null }),
    ).toEqual({ ok: true });
  });

  it("rejects a child room as a breakout parent", () => {
    expect(
      parentCanHostBreakouts({
        parentRoomId: "room-parent",
        finishedAt: null,
      }),
    ).toEqual({ ok: false, code: "CHILD_CANNOT_HOST_BREAKOUTS" });
  });

  it("rejects a session whose parent is itself a child", () => {
    const parent = { parentRoomId: "room-grandparent", finishedAt: null };

    expect(parentCanHostBreakouts(parent)).toEqual({
      ok: false,
      code: "CHILD_CANNOT_HOST_BREAKOUTS",
    });
  });

  it("rejects a finished parent room", () => {
    expect(
      parentCanHostBreakouts({
        parentRoomId: null,
        finishedAt: new Date("2026-08-31T00:00:00.000Z"),
      }),
    ).toEqual({ ok: false, code: "ROOM_CLOSED" });
  });
});

const { prisma, sendRoomData } = vi.hoisted(() => {
  const client = {
    room: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    roomParticipant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    breakoutSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    breakoutAssignment: {
      createMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation(async (fn: (tx: typeof client) => unknown) =>
    fn(client),
  );
  return { prisma: client, sendRoomData: vi.fn(async () => undefined) };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/livekit/room-service", () => ({
  getRoomService: () => null,
  ensureLiveKitRoom: vi.fn(async () => undefined),
  sendRoomData,
}));

import {
  closeBreakouts,
  closeOpenBreakoutsForParent,
  createBreakouts,
  evenSplitAssignments,
  canMintBreakoutChildToken,
  canBroadcastBreakout,
  canClaimBreakout,
  canRequestBreakoutHelp,
  breakoutSendRooms,
  applyBreakoutAction,
  getOpenBreakout,
} from "./breakouts";

const parentRoom = {
  id: "room-1",
  name: "Seminar",
  createdAt: new Date("2026-08-31T00:00:00.000Z"),
  ownerId: "host-1",
  passwordHash: "hashed",
  lobbyEnabled: true,
  locked: false,
  finishedAt: null,
  allowGuests: true,
  signedInOnly: false,
  allowedEmailDomains: [],
  allowScreenShare: true,
  allowChat: true,
  maxParticipants: 25,
  chatRetentionDays: null,
  parentRoomId: null,
  breakoutSessionId: null,
};

function hostRow() {
  return {
    id: "h1",
    roomId: "room-1",
    userId: "host-1",
    role: "host" as const,
    banned: false,
    lobbyStatus: "admitted" as const,
  };
}

describe("evenSplitAssignments", () => {
  it("round-robins participants across child rooms", () => {
    expect(
      evenSplitAssignments(["a", "b", "c"], ["g0", "g1"]),
    ).toEqual([
      { userId: "a", childRoomId: "g0" },
      { userId: "b", childRoomId: "g1" },
      { userId: "c", childRoomId: "g0" },
    ]);
  });
});

describe("canMintBreakoutChildToken", () => {
  it("allows an assigned participant into their child room", () => {
    expect(
      canMintBreakoutChildToken({
        childRoomId: "child-1",
        sessionStatus: "open",
        assignedChildRoomId: "child-1",
        parentRole: "participant",
        isParentOwner: false,
        parentBanned: false,
      }),
    ).toEqual({ ok: true, role: "participant" });
  });

  it("rejects an unassigned participant", () => {
    expect(
      canMintBreakoutChildToken({
        childRoomId: "child-1",
        sessionStatus: "open",
        assignedChildRoomId: "child-2",
        parentRole: "participant",
        isParentOwner: false,
        parentBanned: false,
      }),
    ).toEqual({ ok: false, code: "NOT_ASSIGNED" });
  });

  it("lets a parent host or cohost mint for any child", () => {
    expect(
      canMintBreakoutChildToken({
        childRoomId: "child-1",
        sessionStatus: "open",
        assignedChildRoomId: null,
        parentRole: "cohost",
        isParentOwner: false,
        parentBanned: false,
      }),
    ).toEqual({ ok: true, role: "cohost" });
  });

  it("lets a parent moderator roam into a child with no assignment row", () => {
    expect(
      canMintBreakoutChildToken({
        childRoomId: "child-2",
        sessionStatus: "open",
        assignedChildRoomId: null,
        parentRole: "host",
        isParentOwner: true,
        parentBanned: false,
      }),
    ).toEqual({ ok: true, role: "host" });
  });
});

describe("canClaimBreakout", () => {
  const base = {
    assignmentMode: "self_pick" as const,
    sessionStatus: "open" as const,
    role: "participant" as const,
    isOwner: false,
    childRoomId: "child-1",
    childBelongsToSession: true,
    alreadyAssignedChildId: null as string | null,
    assignedCountOnChild: 3,
    maxParticipants: 25,
  };

  it("allows an admitted participant to claim a child with remaining capacity", () => {
    expect(canClaimBreakout(base)).toEqual({ ok: true });
  });

  it("rejects a claim when the child is at capacity", () => {
    expect(
      canClaimBreakout({
        ...base,
        assignedCountOnChild: 25,
        maxParticipants: 25,
      }),
    ).toEqual({ ok: false, code: "FULL" });
  });

  it("is idempotent when the participant already claimed that child", () => {
    expect(
      canClaimBreakout({
        ...base,
        alreadyAssignedChildId: "child-1",
        assignedCountOnChild: 25,
        maxParticipants: 25,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects hosts and auto-assigned sessions", () => {
    expect(
      canClaimBreakout({ ...base, role: "host", isOwner: true }),
    ).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(
      canClaimBreakout({ ...base, assignmentMode: "auto" }),
    ).toEqual({ ok: false, code: "NOT_SELF_PICK" });
  });
});

describe("createBreakouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
    prisma.room.findUnique.mockResolvedValue(parentRoom);
    prisma.roomParticipant.findUnique.mockResolvedValue(hostRow());
    prisma.breakoutSession.findFirst.mockResolvedValue(null);
    prisma.roomParticipant.findMany.mockResolvedValue([
      { userId: "user-a" },
      { userId: "user-b" },
    ]);
    prisma.breakoutSession.create.mockResolvedValue({
      id: "bo-1",
      parentRoomId: "room-1",
      status: "open",
      assignmentMode: "auto",
      endsAt: null,
      createdAt: new Date("2026-08-31T01:00:00.000Z"),
    });
    let n = 0;
    prisma.room.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      n += 1;
      return {
        id: `child-${n}`,
        createdAt: new Date("2026-08-31T01:00:00.000Z"),
        ...data,
      };
    });
    prisma.breakoutAssignment.createMany.mockResolvedValue({ count: 2 });
  });

  it("returns 403 when a participant opens breakouts", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await createBreakouts({
      roomId: "room-1",
      actorId: "user-p",
      raw: { mode: "auto", count: 2 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("rejects a child room as the breakout parent", async () => {
    prisma.room.findUnique.mockResolvedValue({
      ...parentRoom,
      id: "child-1",
      parentRoomId: "room-1",
    });

    const result = await createBreakouts({
      roomId: "child-1",
      actorId: "host-1",
      raw: { mode: "auto", count: 2 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CHILD_CANNOT_HOST_BREAKOUTS");
    }
  });

  it("creates child rooms that inherit the owner and have no lobby or password", async () => {
    const result = await createBreakouts({
      roomId: "room-1",
      actorId: "host-1",
      raw: { mode: "auto", count: 2 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.session.childRoomIds).toEqual(["child-1", "child-2"]);
    expect(prisma.room.create).toHaveBeenCalledTimes(2);
    expect(prisma.room.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "host-1",
          parentRoomId: "room-1",
          passwordHash: null,
          lobbyEnabled: false,
        }),
      }),
    );
  });

  it("opens a self-pick session with no assignment rows", async () => {
    prisma.breakoutSession.create.mockResolvedValue({
      id: "bo-1",
      parentRoomId: "room-1",
      status: "open",
      assignmentMode: "self_pick",
      endsAt: null,
      createdAt: new Date("2026-08-31T01:00:00.000Z"),
    });

    const result = await createBreakouts({
      roomId: "room-1",
      actorId: "host-1",
      raw: { mode: "self_pick", count: 2 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.session.assignmentMode).toBe("self_pick");
    expect(result.session.assignments).toEqual([]);
    expect(prisma.breakoutAssignment.createMany).not.toHaveBeenCalled();
  });
});

describe("getOpenBreakout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.room.findUnique.mockResolvedValue(parentRoom);
    prisma.roomParticipant.findUnique.mockResolvedValue(hostRow());
  });

  it("returns the open session and child room ids", async () => {
    prisma.breakoutSession.findFirst.mockResolvedValue({
      id: "bo-1",
      parentRoomId: "room-1",
      status: "open",
      assignmentMode: "auto",
      endsAt: null,
      createdAt: new Date("2026-08-31T01:00:00.000Z"),
      childRooms: [{ id: "child-1" }, { id: "child-2" }],
      assignments: [
        { userId: "user-a", childRoomId: "child-1" },
        { userId: "user-b", childRoomId: "child-2" },
      ],
    });

    const result = await getOpenBreakout({
      roomId: "room-1",
      actorId: "host-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.session?.id).toBe("bo-1");
    expect(result.session?.childRoomIds).toEqual(["child-1", "child-2"]);
  });
});

describe("closeBreakouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return arg;
      }
      return (arg as (tx: typeof prisma) => unknown)(prisma);
    });
    prisma.room.findUnique.mockResolvedValue(parentRoom);
    prisma.roomParticipant.findUnique.mockResolvedValue(hostRow());
    prisma.breakoutSession.findFirst.mockResolvedValue({
      id: "bo-1",
      parentRoomId: "room-1",
      status: "open",
      assignmentMode: "auto",
      endsAt: null,
      createdAt: new Date("2026-08-31T01:00:00.000Z"),
    });
    prisma.breakoutSession.update.mockResolvedValue({
      id: "bo-1",
      parentRoomId: "room-1",
      status: "closed",
      assignmentMode: "auto",
      endsAt: null,
      createdAt: new Date("2026-08-31T01:00:00.000Z"),
      childRooms: [{ id: "child-1" }],
      assignments: [],
    });
    prisma.room.updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns 403 when a participant closes breakouts", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await closeBreakouts({
      roomId: "room-1",
      actorId: "user-p",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("closes the session and child rooms", async () => {
    const result = await closeBreakouts({
      roomId: "room-1",
      actorId: "host-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.session.status).toBe("closed");
    expect(prisma.room.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { breakoutSessionId: "bo-1" },
        data: expect.objectContaining({ locked: true }),
      }),
    );
  });
});

describe("closeOpenBreakoutsForParent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return arg;
      }
      return (arg as (tx: typeof prisma) => unknown)(prisma);
    });
    prisma.breakoutSession.update.mockResolvedValue({});
    prisma.room.updateMany.mockResolvedValue({ count: 2 });
  });

  it("closes an open session when the parent room closes", async () => {
    prisma.breakoutSession.findFirst.mockResolvedValue({
      id: "bo-1",
      parentRoomId: "room-1",
      status: "open",
    });

    await closeOpenBreakoutsForParent("room-1");

    expect(prisma.breakoutSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bo-1" },
        data: { status: "closed" },
      }),
    );
    expect(prisma.room.updateMany).toHaveBeenCalled();
  });
});

describe("breakout action authorization", () => {
  it("lets host and cohost broadcast or recall, not participants", () => {
    expect(canBroadcastBreakout({ role: "host", isOwner: false })).toBe(true);
    expect(canBroadcastBreakout({ role: "cohost", isOwner: false })).toBe(true);
    expect(canBroadcastBreakout({ role: "participant", isOwner: false })).toBe(
      false,
    );
    expect(canBroadcastBreakout({ role: null, isOwner: true })).toBe(true);
  });

  it("lets an assigned participant request help, not a host", () => {
    expect(
      canRequestBreakoutHelp({
        role: "participant",
        assignedChildRoomId: "child-1",
      }),
    ).toBe(true);
    expect(
      canRequestBreakoutHelp({
        role: "host",
        assignedChildRoomId: "child-1",
      }),
    ).toBe(false);
    expect(
      canRequestBreakoutHelp({
        role: "participant",
        assignedChildRoomId: null,
      }),
    ).toBe(false);
  });

  it("sends broadcast and recall to children, help to the parent", () => {
    expect(
      breakoutSendRooms({
        action: "broadcast",
        parentRoomId: "room-1",
        childRoomIds: ["child-1", "child-2"],
      }),
    ).toEqual(["child-1", "child-2"]);
    expect(
      breakoutSendRooms({
        action: "help",
        parentRoomId: "room-1",
        childRoomIds: ["child-1"],
      }),
    ).toEqual(["room-1"]);
    expect(
      breakoutSendRooms({
        action: "recall",
        parentRoomId: "room-1",
        childRoomIds: ["child-1"],
      }),
    ).toEqual(["child-1"]);
  });
});

describe("applyBreakoutAction", () => {
  const openSession = {
    id: "bo-1",
    parentRoomId: "room-1",
    status: "open" as const,
    assignmentMode: "auto" as const,
    endsAt: null,
    createdAt: new Date("2026-08-31T01:00:00.000Z"),
    childRooms: [{ id: "child-1" }, { id: "child-2" }],
    assignments: [{ userId: "user-p", childRoomId: "child-1" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return arg;
      }
      return (arg as (tx: typeof prisma) => unknown)(prisma);
    });
    prisma.room.findUnique.mockResolvedValue(parentRoom);
    prisma.roomParticipant.findUnique.mockResolvedValue(hostRow());
    prisma.breakoutSession.findFirst.mockResolvedValue(openSession);
    prisma.breakoutSession.update.mockResolvedValue({
      ...openSession,
      status: "closed",
    });
    prisma.room.updateMany.mockResolvedValue({ count: 2 });
    prisma.breakoutAssignment.findUnique.mockResolvedValue({
      sessionId: "bo-1",
      userId: "user-p",
      childRoomId: "child-1",
    });
  });

  it("returns 403 when a participant broadcasts", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await applyBreakoutAction({
      roomId: "room-1",
      actorId: "user-p",
      raw: { action: "broadcast", body: "Wrap up" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
    expect(sendRoomData).not.toHaveBeenCalled();
  });

  it("sends a host broadcast into every child room", async () => {
    const result = await applyBreakoutAction({
      roomId: "room-1",
      actorId: "host-1",
      raw: { action: "broadcast", body: "Wrap up" },
    });

    expect(result.ok).toBe(true);
    expect(sendRoomData).toHaveBeenCalledTimes(2);
    expect(sendRoomData).toHaveBeenCalledWith(
      "child-1",
      expect.any(Uint8Array),
      "breakout",
    );
    expect(sendRoomData).toHaveBeenCalledWith(
      "child-2",
      expect.any(Uint8Array),
      "breakout",
    );
  });

  it("sends a help request to the parent room", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });

    const result = await applyBreakoutAction({
      roomId: "room-1",
      actorId: "user-p",
      raw: { action: "help" },
    });

    expect(result.ok).toBe(true);
    expect(sendRoomData).toHaveBeenCalledTimes(1);
    expect(sendRoomData).toHaveBeenCalledWith(
      "room-1",
      expect.any(Uint8Array),
      "breakout",
    );
  });

  it("closes the session and notifies children on recall", async () => {
    const result = await applyBreakoutAction({
      roomId: "room-1",
      actorId: "host-1",
      raw: { action: "recall" },
    });

    expect(result.ok).toBe(true);
    expect(prisma.room.updateMany).toHaveBeenCalled();
    expect(prisma.breakoutSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "closed" },
      }),
    );
    expect(sendRoomData).toHaveBeenCalledWith(
      "child-1",
      expect.any(Uint8Array),
      "breakout",
    );
  });

  it("lets an admitted participant claim a self-pick child with capacity", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });
    prisma.breakoutSession.findFirst.mockResolvedValue({
      ...openSession,
      assignmentMode: "self_pick",
      assignments: [],
    });
    prisma.breakoutAssignment.findUnique.mockResolvedValue(null);
    prisma.breakoutAssignment.count.mockResolvedValue(2);
    prisma.breakoutAssignment.create.mockResolvedValue({
      sessionId: "bo-1",
      userId: "user-p",
      childRoomId: "child-1",
    });

    const result = await applyBreakoutAction({
      roomId: "room-1",
      actorId: "user-p",
      raw: { action: "claim", childRoomId: "child-1" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.assignment).toEqual({
      userId: "user-p",
      childRoomId: "child-1",
    });
    expect(prisma.breakoutAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: "bo-1",
          userId: "user-p",
          childRoomId: "child-1",
        }),
      }),
    );
    expect(sendRoomData).not.toHaveBeenCalled();
  });

  it("returns 409 when the self-pick child is at capacity", async () => {
    prisma.roomParticipant.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "room-1",
      userId: "user-p",
      role: "participant",
      banned: false,
      lobbyStatus: "admitted",
    });
    prisma.breakoutSession.findFirst.mockResolvedValue({
      ...openSession,
      assignmentMode: "self_pick",
      assignments: [],
    });
    prisma.breakoutAssignment.findUnique.mockResolvedValue(null);
    prisma.breakoutAssignment.count.mockResolvedValue(25);

    const result = await applyBreakoutAction({
      roomId: "room-1",
      actorId: "user-p",
      raw: { action: "claim", childRoomId: "child-1" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.code).toBe("FULL");
    }
    expect(prisma.breakoutAssignment.create).not.toHaveBeenCalled();
  });

  it("returns 403 when a host tries to claim instead of roaming", async () => {
    prisma.breakoutSession.findFirst.mockResolvedValue({
      ...openSession,
      assignmentMode: "self_pick",
    });

    const result = await applyBreakoutAction({
      roomId: "room-1",
      actorId: "host-1",
      raw: { action: "claim", childRoomId: "child-1" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("FORBIDDEN");
    }
  });
});
