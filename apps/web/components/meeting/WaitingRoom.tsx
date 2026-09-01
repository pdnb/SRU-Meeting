"use client";

import { useEffect, useState } from "react";

export function WaitingRoom({
  roomId,
  onAdmitted,
  onDenied,
}: {
  roomId: string;
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
    <div className="sru-meet items-center justify-center px-page text-center">
      <h1 className="font-sans text-display font-semibold">Waiting for host</h1>
      <p role="status" className="mt-4 max-w-md text-body sru-meet-muted">
        The host was notified. You will join the same room when they admit you.
        Current status: {status}.
      </p>
    </div>
  );
}
