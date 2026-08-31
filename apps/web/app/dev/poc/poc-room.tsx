"use client";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { TokenRequestSchema, TokenResponseSchema } from "@sru/shared";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

type PocRoomProps = {
  initialRoomName?: string;
  initialIdentity?: string;
  initialName?: string;
  autoJoin?: boolean;
};

// LiveKitRoom: https://docs.livekit.io/reference/components/react/component/livekitroom/
// VideoConference: https://docs.livekit.io/reference/components/react/component/videoconference/
// Styles + data-lk-theme: https://docs.livekit.io/transport/sdk-platforms/react/

export function PocRoom({
  initialRoomName,
  initialIdentity,
  initialName,
  autoJoin = false,
}: PocRoomProps) {
  const roomNameId = useId();
  const identityId = useId();
  const nameId = useId();
  const autoStarted = useRef(false);

  const defaultIdentity = useMemo(
    () => initialIdentity ?? `poc-${crypto.randomUUID()}`,
    [initialIdentity],
  );

  const [roomName, setRoomName] = useState(initialRoomName ?? "sru-poc");
  const [identity, setIdentity] = useState(defaultIdentity);
  const [name, setName] = useState(initialName ?? "");
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function requestToken() {
    setError(null);
    setPending(true);

    const request = TokenRequestSchema.safeParse({
      roomName,
      identity,
      name: name.trim() === "" ? undefined : name,
    });
    if (!request.success) {
      setPending(false);
      setError("Room name and identity are required.");
      return;
    }

    try {
      const res = await fetch("/api/v1/dev/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.data),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const message =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error?: { message?: unknown } }).error
            ?.message === "string"
            ? (json as { error: { message: string } }).error.message
            : `Token request failed (${res.status})`;
        throw new Error(message);
      }

      const parsed = TokenResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Token response was not valid");
      }

      setToken(parsed.data.token);
      setUrl(parsed.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setPending(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestToken();
  }

  useEffect(() => {
    if (!autoJoin || autoStarted.current) {
      return;
    }
    autoStarted.current = true;
    void requestToken();
    // Join once from ?auto=1 using the initial field values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin]);

  if (token && url) {
    return (
      <div data-lk-theme="default" className="h-screen">
        <LiveKitRoom
          serverUrl={url}
          token={token}
          connect
          audio
          video
          onError={(err) => setError(err.message)}
          onDisconnected={() => {
            setToken(null);
            setUrl(null);
          }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleJoin}
      className="mx-auto flex max-w-md flex-col gap-4 p-8"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={roomNameId} className="text-sm font-medium">
          Room name
        </label>
        <input
          id={roomNameId}
          name="roomName"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          autoComplete="off"
          required
          className="border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={identityId} className="text-sm font-medium">
          Identity (must be unique per browser)
        </label>
        <input
          id={identityId}
          name="identity"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          autoComplete="off"
          required
          className="border border-neutral-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={nameId} className="text-sm font-medium">
          Display name (optional)
        </label>
        <input
          id={nameId}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
          className="border border-neutral-300 px-3 py-2"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Joining…" : "Join room"}
      </button>
    </form>
  );
}
