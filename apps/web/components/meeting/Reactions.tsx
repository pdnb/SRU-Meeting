"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";
import {
  REACTION_EMOJIS,
  REACTION_TTL_MS,
  REACTION_TOPIC,
  isReactionPayload,
  type ReactionPayload,
} from "@/lib/livekit/reactions";

export function Reactions({ userId }: { userId: string }) {
  const room = useRoomContext();
  const [active, setActive] = useState<
    { id: string; emoji: string; senderId: string }[]
  >([]);

  useEffect(() => {
    const onData = (payload: Uint8Array, _p: unknown, _k: unknown, topic?: string) => {
      if (topic && topic !== REACTION_TOPIC) return;
      try {
        const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
        if (!isReactionPayload(parsed)) return;
        const id = crypto.randomUUID();
        setActive((current) => [
          ...current,
          { id, emoji: parsed.emoji, senderId: parsed.senderId },
        ]);
        window.setTimeout(() => {
          setActive((current) => current.filter((item) => item.id !== id));
        }, REACTION_TTL_MS);
      } catch {
        // ignore malformed packets
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  async function send(emoji: ReactionPayload["emoji"]) {
    const payload: ReactionPayload = {
      type: "reaction",
      emoji,
      senderId: userId,
    };
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(payload)),
      { reliable: false, topic: REACTION_TOPIC },
    );
    const id = crypto.randomUUID();
    setActive((current) => [...current, { id, emoji, senderId: userId }]);
    window.setTimeout(() => {
      setActive((current) => current.filter((item) => item.id !== id));
    }, REACTION_TTL_MS);
  }

  return (
    <>
      <div role="group" aria-label="Reactions">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="sru-meet-btn"
            onClick={() => void send(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {active.map((item) => (
        <span key={item.id} className="sru-reaction" aria-hidden>
          {item.emoji}
        </span>
      ))}
    </>
  );
}
