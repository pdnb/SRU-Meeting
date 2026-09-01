"use client";

import type { Room } from "@sru/shared";
import { useState } from "react";

export function RoomSettings({
  room,
  onChange,
}: {
  room: Room;
  onChange: (room: Room) => void;
}) {
  const [password, setPassword] = useState("");
  const [domains, setDomains] = useState(
    (room.allowedEmailDomains ?? []).join(", "),
  );
  const [status, setStatus] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/v1/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setStatus("Could not save settings.");
      return;
    }
    onChange((await res.json()) as Room);
    setStatus("Saved.");
  }

  return (
    <aside className="sru-meet-panel" aria-label="Room settings">
      <h2>Room settings</h2>
      <form
        className="flex flex-col gap-3 overflow-y-auto p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void patch({
            password: password || undefined,
            allowedEmailDomains: domains
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          });
        }}
      >
        <p className="text-sm text-zinc-300">
          Signed-in only: {room.signedInOnly ? "yes" : "no"}. Guests:{" "}
          {room.allowGuests ? "allowed" : "off"}. Lobby:{" "}
          {room.lobbyEnabled ? "on" : "off"}.
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(room.lobbyEnabled)}
            onChange={(event) =>
              void patch({ lobbyEnabled: event.target.checked })
            }
          />
          Lobby
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(room.signedInOnly)}
            onChange={(event) =>
              void patch({ signedInOnly: event.target.checked })
            }
          />
          Signed-in only
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(room.allowGuests)}
            onChange={(event) =>
              void patch({ allowGuests: event.target.checked })
            }
          />
          Allow guest link
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={room.allowScreenShare !== false}
            onChange={(event) =>
              void patch({ allowScreenShare: event.target.checked })
            }
          />
          Allow screen share
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={room.allowChat !== false}
            onChange={(event) => void patch({ allowChat: event.target.checked })}
          />
          Allow chat
        </label>
        <div className="rounded-md border border-zinc-700/70 bg-zinc-900/40 p-3 text-sm text-zinc-300">
          <p className="font-semibold text-zinc-100">End-to-end encryption</p>
          <p className="mt-1">
            When enabled, camera and microphone use Insertable Streams. Recording,
            live streaming, and breakouts are blocked. Screen share stays
            plaintext. Requires desktop Chrome or Edge.
          </p>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(room.e2eeEnabled)}
              onChange={(event) =>
                void patch({ e2eeEnabled: event.target.checked })
              }
            />
            Enable E2EE for this room
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="domains" className="sru-label">
            Allowed email domains
          </label>
          <input
            id="domains"
            value={domains}
            onChange={(event) => setDomains(event.target.value)}
            className="sru-input"
            placeholder="sru.ac.th"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="set-password" className="sru-label">
            Set or change password
          </label>
          <input
            id="set-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="sru-input"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="sru-cta">
            Save
          </button>
          <button
            type="button"
            className="sru-cta-secondary"
            onClick={() => void patch({ password: null })}
          >
            Remove password
          </button>
        </div>
        {room.allowGuests && !room.signedInOnly ? (
          <p className="text-sm text-zinc-300">
            Guest link:{" "}
            <a href={`/join/${room.id}`} className="underline">
              /join/{room.id}
            </a>
          </p>
        ) : (
          <p className="text-sm text-zinc-400">
            Guest links stay off until guests are allowed and signed-in-only is
            off.
          </p>
        )}
        {status ? <p role="status">{status}</p> : null}
      </form>
    </aside>
  );
}
