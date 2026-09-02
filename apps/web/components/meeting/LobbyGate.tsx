"use client";

import { useEffect, useRef, useState } from "react";
import {
  isDesktopShell,
  showDesktopNotification,
} from "@/lib/desktop-bridge";

type Knock = {
  userId: string;
  name: string | null;
  email: string;
  lobbyStatus: string;
};

export function LobbyGate({ roomId }: { roomId: string }) {
  const [knocks, setKnocks] = useState<Knock[]>([]);
  const knownKnockIds = useRef<Set<string>>(new Set());
  const initialLoad = useRef(true);

  async function refreshKnocks() {
    const res = await fetch(`/api/v1/rooms/${roomId}/lobby`);
    if (!res.ok) return;
    const json = (await res.json()) as { data: Knock[] };
    const next = json.data;

    if (isDesktopShell()) {
      if (!initialLoad.current) {
        for (const knock of next) {
          if (!knownKnockIds.current.has(knock.userId)) {
            void showDesktopNotification(
              "Someone is waiting to join",
              knock.name ?? knock.email,
            );
          }
        }
      }
      for (const knock of next) {
        knownKnockIds.current.add(knock.userId);
      }
      initialLoad.current = false;
    }

    setKnocks(next);
  }

  async function decide(userId: string, decision: "admit" | "deny") {
    await fetch(`/api/v1/rooms/${roomId}/lobby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, decision }),
    });
    await refreshKnocks();
  }

  useEffect(() => {
    knownKnockIds.current = new Set();
    initialLoad.current = true;
    void refreshKnocks();
    const id = window.setInterval(() => {
      void refreshKnocks();
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
