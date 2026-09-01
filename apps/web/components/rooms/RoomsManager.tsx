"use client";

import type { Room } from "@sru/shared";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { IconRoom } from "@/components/ui/icons";

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

  const openRooms = rooms.filter((room) => !room.finishedAt);
  const closedRooms = rooms.filter((room) => room.finishedAt);

  return (
    <main id="app-main" className="mx-auto w-full max-w-4xl flex-1 px-page py-10 md:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-sans text-display font-semibold text-ink">Rooms</h1>
          <p className="mt-2 max-w-[50ch] text-body text-muted">
            Create and join campus meetings. Open rooms appear below.
          </p>
        </div>
        {openRooms.length > 0 ? (
          <p className="text-caption text-muted">
            {openRooms.length} open · {closedRooms.length} closed
          </p>
        ) : null}
      </div>

      {canCreate ? (
        <form
          className="sru-card mt-8 flex flex-col gap-4 p-6 sm:flex-row sm:items-end"
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
          <button type="submit" className="sru-cta shrink-0" disabled={pending}>
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
        <div
          role="status"
          className="sru-card mt-10 flex flex-col items-center gap-4 px-6 py-14 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-sru-lg bg-accent-soft text-accent">
            <IconRoom className="h-6 w-6" />
          </div>
          <div>
            <p className="text-title font-semibold text-ink">No rooms yet</p>
            <p className="mt-2 max-w-[40ch] text-body text-muted">
              Create a room to start a meeting with your campus colleagues.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-10 flex flex-col gap-3">
          {rooms.map((room) => (
            <li key={room.id}>
              <article className="sru-card flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-ink">{room.name}</p>
                    <Badge variant={room.finishedAt ? "default" : "success"}>
                      {room.finishedAt ? "Closed" : "Open"}
                    </Badge>
                    {room.hasPassword ? (
                      <Badge variant="warning">Password</Badge>
                    ) : null}
                    {room.lobbyEnabled ? (
                      <Badge variant="accent">Lobby</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-caption text-muted">
                    {room.finishedAt
                      ? "This room has ended."
                      : "Ready for participants to join."}
                  </p>
                </div>
                {!room.finishedAt ? (
                  <div className="flex flex-wrap gap-2">
                    <a href={`/app/rooms/${room.id}`} className="sru-cta">
                      Join
                    </a>
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
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
