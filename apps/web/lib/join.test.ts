import { describe, expect, it } from "vitest";
import { evaluateJoinAccess, type JoinRoomState } from "./join";

const room: JoinRoomState = {
  id: "room-1",
  ownerId: "host-1",
  passwordHash: null,
  lobbyEnabled: false,
  locked: false,
  finishedAt: null,
  allowGuests: false,
  signedInOnly: true,
  allowedEmailDomains: [],
  maxParticipants: 25,
};

describe("evaluateJoinAccess", () => {
  it("rejects a wrong room password and never implies a token", () => {
    const decision = evaluateJoinAccess({
      room: { ...room, passwordHash: "argon2id-hash" },
      user: { id: "p1", email: "p@sru.ac.th" },
      participation: {
        role: "participant",
        banned: false,
        lobbyStatus: "admitted",
      },
      passwordOk: false,
      admittedCount: 1,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("WRONG_PASSWORD");
    }
  });

  it("rejects a banned user", () => {
    const decision = evaluateJoinAccess({
      room,
      user: { id: "p1", email: "p@sru.ac.th" },
      participation: {
        role: "participant",
        banned: true,
        lobbyStatus: "admitted",
      },
      passwordOk: true,
      admittedCount: 1,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("BANNED");
    }
  });

  it("rejects new joins when the room is locked", () => {
    const decision = evaluateJoinAccess({
      room: { ...room, locked: true },
      user: { id: "p1", email: "p@sru.ac.th" },
      participation: null,
      passwordOk: true,
      admittedCount: 1,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("ROOM_LOCKED");
    }
  });

  it("keeps a pending lobby user without a token", () => {
    const decision = evaluateJoinAccess({
      room: { ...room, lobbyEnabled: true },
      user: { id: "p1", email: "p@sru.ac.th" },
      participation: {
        role: "participant",
        banned: false,
        lobbyStatus: "pending",
      },
      passwordOk: true,
      admittedCount: 1,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("LOBBY_PENDING");
    }
  });

  it("rejects a denied user until they knock again", () => {
    const decision = evaluateJoinAccess({
      room: { ...room, lobbyEnabled: true },
      user: { id: "p1", email: "p@sru.ac.th" },
      participation: {
        role: "participant",
        banned: false,
        lobbyStatus: "denied",
      },
      passwordOk: true,
      admittedCount: 1,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("LOBBY_DENIED");
    }
  });

  it("rejects an email outside the allow-list", () => {
    const decision = evaluateJoinAccess({
      room: { ...room, allowedEmailDomains: ["sru.ac.th"] },
      user: { id: "p1", email: "user@other.com" },
      participation: null,
      passwordOk: true,
      admittedCount: 1,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("DOMAIN_NOT_ALLOWED");
    }
  });

  it("rejects a guest when the room does not allow guests", () => {
    const decision = evaluateJoinAccess({
      room,
      user: null,
      participation: null,
      passwordOk: true,
      admittedCount: 0,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("GUESTS_DISABLED");
    }
  });

  it("rejects the 26th new join when the cap is 25", () => {
    const decision = evaluateJoinAccess({
      room,
      user: { id: "p26", email: "p26@sru.ac.th" },
      participation: null,
      passwordOk: true,
      admittedCount: 25,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("ROOM_FULL");
    }
  });
});
