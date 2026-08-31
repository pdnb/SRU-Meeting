"use client";

import type { ChatMessage } from "@sru/shared";
import { useParticipants, useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useMemo, useState } from "react";
import { findMentionedNames } from "@/lib/chat-format";

export function ChatPanel({
  roomId,
  userId,
  allowChat,
}: {
  roomId: string;
  userId: string;
  allowChat: boolean;
}) {
  const room = useRoomContext();
  const participants = useParticipants();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const names = useMemo(
    () =>
      participants
        .map((participant) => participant.name)
        .filter((name): name is string => Boolean(name)),
    [participants],
  );

  useEffect(() => {
    void fetch(`/api/v1/rooms/${roomId}/messages`)
      .then((res) => res.json())
      .then((json: { data?: ChatMessage[] }) => {
        setMessages(json.data ?? []);
      });
  }, [roomId]);

  useEffect(() => {
    const onData = (payload: Uint8Array, _p: unknown, _k: unknown, topic?: string) => {
      if (topic && topic !== "chat") return;
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload)) as ChatMessage;
        if (!parsed.id) return;
        setMessages((current) =>
          current.some((item) => item.id === parsed.id)
            ? current
            : [...current, parsed],
        );
      } catch {
        // ignore
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  async function send() {
    if (!allowChat) {
      setError("Chat is disabled in this room.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/v1/rooms/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        recipientId: recipientId || undefined,
      }),
    });
    const json: unknown = await res.json();
    if (!res.ok) {
      const message =
        typeof json === "object" &&
        json !== null &&
        "error" in json &&
        typeof (json as { error?: { message?: unknown } }).error?.message ===
          "string"
          ? (json as { error: { message: string } }).error.message
          : "Could not send";
      setError(message);
      return;
    }
    const created = json as ChatMessage;
    setMessages((current) => [...current, created]);
    setBody("");
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(created)),
      {
        reliable: true,
        topic: "chat",
        destinationIdentities: created.recipientId
          ? [created.recipientId]
          : undefined,
      },
    );
  }

  async function attach(file: File) {
    const form = new FormData();
    form.set("file", file);
    const uploaded = await fetch(`/api/v1/rooms/${roomId}/attachments`, {
      method: "POST",
      body: form,
    });
    if (!uploaded.ok) {
      setError("Could not upload that file.");
      return;
    }
    const { key } = (await uploaded.json()) as { key: string };
    setBody((current) => current || file.name);
    const res = await fetch(`/api/v1/rooms/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: body || file.name,
        recipientId: recipientId || undefined,
        attachmentKey: key,
      }),
    });
    if (res.ok) {
      const created = (await res.json()) as ChatMessage;
      setMessages((current) => [...current, created]);
      setBody("");
    }
  }

  return (
    <aside className="sru-meet-panel" aria-label="Chat">
      <h2>{recipientId ? "Private chat" : "Room chat"}</h2>
      <label className="sr-only" htmlFor="chat-to">
        Send to
      </label>
      <select
        id="chat-to"
        className="sru-input mx-3 mt-3"
        value={recipientId}
        onChange={(event) => setRecipientId(event.target.value)}
      >
        <option value="">Everyone</option>
        {participants
          .filter((participant) => participant.identity !== userId)
          .map((participant) => (
            <option key={participant.identity} value={participant.identity}>
              {participant.name || participant.identity}
            </option>
          ))}
      </select>
      <ul className="m-0 min-h-40 flex-1 list-none overflow-y-auto p-3">
        {messages.length === 0 ? (
          <li className="text-zinc-400">No messages yet.</li>
        ) : (
          messages.map((message) => {
            const mentions = findMentionedNames(message.body, names);
            return (
              <li key={message.id} className="mb-3">
                <p className="text-sm text-zinc-400">
                  {message.recipientId ? "DM · " : ""}
                  {message.senderId}
                </p>
                <p>
                  {message.body.split(/(@\S+)/).map((part, index) => {
                    const name = part.startsWith("@") ? part.slice(1) : "";
                    const hit = mentions.some(
                      (item) => item.toLowerCase() === name.toLowerCase(),
                    );
                    return hit ? (
                      <mark key={`${message.id}-${index}`} className="bg-accent/30">
                        {part}
                      </mark>
                    ) : (
                      <span key={`${message.id}-${index}`}>{part}</span>
                    );
                  })}
                </p>
                {message.attachmentUrl ? (
                  <p className="mt-1">
                    <a
                      href={message.attachmentUrl}
                      className="underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Attachment
                    </a>
                  </p>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
      {error ? (
        <p role="alert" className="sru-error px-3">
          {error}
        </p>
      ) : null}
      <form
        className="flex flex-col gap-2 border-t border-zinc-700 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label htmlFor="chat-body" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="sru-input min-h-16 py-2"
          required
        />
        <div className="flex flex-wrap gap-2">
          <label className="sru-meet-btn cursor-pointer">
            Attach
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void attach(file);
              }}
            />
          </label>
          <button type="submit" className="sru-cta">
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
