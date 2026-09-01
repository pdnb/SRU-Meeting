"use client";

import { useEffect, useState } from "react";

type Knock = {
  userId: string;
  name: string | null;
  email: string;
  lobbyStatus: string;
};

export function LobbyGate({ roomId }: { roomId: string }) {
  const [knocks, setKnocks] = useState<Knock[]>([]);

  async function decide(userId: string, decision: "admit" | "deny") {
    await fetch(`/api/v1/rooms/${roomId}/lobby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, decision }),
    });
    const res = await fetch(`/api/v1/rooms/${roomId}/lobby`);
    if (!res.ok) return;
    const json = (await res.json()) as { data: Knock[] };
    setKnocks(json.data);
  }

  useEffect(() => {
    async function refresh() {
      const res = await fetch(`/api/v1/rooms/${roomId}/lobby`);
      if (!res.ok) return;
      const json = (await res.json()) as { data: Knock[] };
      setKnocks(json.data);
    }
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 2000);
    return () => window.clearInterval(id);
  }, [roomId]);

  if (knocks.length === 0) {
    return null;
  }

  return (
    <aside className="sru-meet-panel" aria-label="Lobby">
      <h2>Waiting to join</h2>
      <ul className="m-0 list-none overflow-y-auto p-3">
        {knocks.map((knock) => (
          <li
            key={knock.userId}
            className="mb-3 flex items-center justify-between gap-2"
          >
            <span>{knock.name ?? knock.email}</span>
            <span className="flex gap-1">
              <button
                type="button"
                className="sru-meet-btn"
                onClick={() => void decide(knock.userId, "admit")}
              >
                Admit
              </button>
              <button
                type="button"
                className="sru-meet-btn"
                onClick={() => void decide(knock.userId, "deny")}
              >
                Deny
              </button>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
