"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  REACTION_EMOJIS,
  REACTION_TTL_MS,
  REACTION_TOPIC,
  isReactionPayload,
  type ReactionPayload,
} from "@/lib/livekit/reactions";

const LOCAL_REACTION_EVENT = "sru-local-reaction";

type Burst = { id: string; emoji: string; senderId: string };

function pushBurst(
  setActive: Dispatch<SetStateAction<Burst[]>>,
  emoji: string,
  senderId: string,
) {
  const id = crypto.randomUUID();
  setActive((current) => [...current, { id, emoji, senderId }]);
  window.setTimeout(() => {
    setActive((current) => current.filter((item) => item.id !== id));
  }, REACTION_TTL_MS);
}

export function ReactionPicker({ userId }: { userId: string }) {
  const room = useRoomContext();

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
    window.dispatchEvent(
      new CustomEvent(LOCAL_REACTION_EVENT, {
        detail: { emoji, senderId: userId },
      }),
    );
  }

  return (
    <div role="group" aria-label="Reactions" className="flex flex-wrap gap-1">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="sru-meet-btn min-h-10 px-2"
          onClick={() => void send(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function Reactions() {
  const room = useRoomContext();
  const [active, setActive] = useState<Burst[]>([]);

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      _p: unknown,
      _k: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== REACTION_TOPIC) return;
      try {
        const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
        if (!isReactionPayload(parsed)) return;
        pushBurst(setActive, parsed.emoji, parsed.senderId);
      } catch {
        // ignore malformed packets
      }
    };
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<{ emoji: string; senderId: string }>)
        .detail;
      if (!detail?.emoji) return;
      pushBurst(setActive, detail.emoji, detail.senderId);
    };
    room.on(RoomEvent.DataReceived, onData);
    window.addEventListener(LOCAL_REACTION_EVENT, onLocal);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
      window.removeEventListener(LOCAL_REACTION_EVENT, onLocal);
    };
  }, [room]);

  return (
    <>
      {active.map((item) => (
        <span key={item.id} className="sru-reaction" aria-hidden>
          {item.emoji}
        </span>
      ))}
    </>
  );
}
