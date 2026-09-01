"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { MeetingLobbyShell } from "@/components/meeting/chrome/MeetingLobbyShell";

export function WaitingRoom({
  roomId,
  roomName,
  onAdmitted,
  onDenied,
}: {
  roomId: string;
  roomName?: string;
  onAdmitted: () => void;
  onDenied: () => void;
}) {
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/v1/rooms/${roomId}/lobby`);
      if (!res.ok || cancelled) return;
      const json = (await res.json()) as { self: string | null };
      if (json.self === "admitted") {
        onAdmitted();
        return;
      }
      if (json.self === "denied") {
        onDenied();
      }
      setStatus(json.self ?? "pending");
    }
    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [onAdmitted, onDenied, roomId]);

  return (
    <MeetingLobbyShell roomName={roomName} centered>
      <div className="sru-meet-lobby-join">
        <span className="sru-meet-lobby-wait-mark" aria-hidden>
          <Clock className="h-6 w-6" />
        </span>
        <h1>Waiting for host</h1>
        <p role="status" className="m-0 max-w-md text-body sru-meet-muted">
          The host was notified. You will join the same room when they admit you.
        </p>
        <p className="m-0 text-caption sru-meet-muted">
          Status: {status}
        </p>
      </div>
    </MeetingLobbyShell>
  );
}
