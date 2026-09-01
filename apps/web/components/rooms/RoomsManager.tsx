"use client";

import type { Room } from "@sru/shared";
import { useState } from "react";

export function RoomsManager({
  initialRooms,
  canCreate = true,
}: {
  initialRooms: Room[];
  canCreate?: boolean;
}) {
  const [rooms, setRooms] = useState(initialRooms);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const res = await fetch("/api/v1/rooms");
    if (!res.ok) {
      setError("Could not load rooms.");
      return;
    }
    const json = (await res.json()) as { data: Room[] };
    setRooms(json.data);
  }

  return (
    <main id="app-main" className="mx-auto w-full max-w-3xl flex-1 px-page py-12">
      <h1 className="font-sans text-display font-semibold text-ink">Rooms</h1>
      {canCreate ? (
      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const res = await fetch("/api/v1/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          setPending(false);
          if (!res.ok) {
            setError("Could not create the room.");
            return;
          }
          setName("");
          await refresh();
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="room-name" className="sru-label">
            New room
          </label>
          <input
            id="room-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={120}
            className="sru-input"
            placeholder="Committee meeting"
          />
        </div>
        <button type="submit" className="sru-cta" disabled={pending}>
          {pending ? "Creating…" : "Create room"}
        </button>
      </form>
      ) : (
        <p className="mt-8 text-body text-muted">
          Your organization role can join rooms but cannot create them.
        </p>
      )}
      {error ? (
        <p role="alert" className="sru-error mt-4">
          {error}
        </p>
      ) : null}
      {rooms.length === 0 ? (
        <p role="status" className="mt-10 max-w-[50ch] text-body text-muted">
          No rooms yet. Create one to start a meeting.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-t border-line">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="font-semibold text-ink">{room.name}</p>
                <p className="text-body text-muted">
                  {room.finishedAt ? "Closed" : "Open"}
                  {room.hasPassword ? " · Password" : ""}
                  {room.lobbyEnabled ? " · Lobby" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!room.finishedAt ? (
                  <a href={`/app/rooms/${room.id}`} className="sru-cta">
                    Join
                  </a>
                ) : null}
                {!room.finishedAt ? (
                  <button
                    type="button"
                    className="sru-cta-secondary"
                    onClick={async () => {
                      const res = await fetch(`/api/v1/rooms/${room.id}`, {
                        method: "DELETE",
                      });
                      if (!res.ok) {
                        setError("Only the host can close this room.");
                        return;
                      }
                      await refresh();
                    }}
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
