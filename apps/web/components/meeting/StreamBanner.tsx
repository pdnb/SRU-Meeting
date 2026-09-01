"use client";

import { useState } from "react";
import type { Stream } from "@sru/shared";
import { streamBannerKind } from "@/lib/stream-ui";

export function StreamBanner({
  roomId,
  userId,
  stream,
}: {
  roomId: string;
  userId: string;
  stream: Pick<Stream, "id" | "status" | "consentedUserIds">;
}) {
  const kind = streamBannerKind(stream.status);
  const already = stream.consentedUserIds?.includes(userId) ?? false;
  const [pending, setPending] = useState(false);
  const [consentedHere, setConsentedHere] = useState(false);
  const consented = already || consentedHere;

  if (kind === "hidden") {
    return null;
  }

  if (kind === "live") {
    return (
      <div role="status" className="sru-record-banner">
        This meeting is being streamed. Media may leave this organization to
        configured destinations.
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="stream-consent-title"
      className="sru-record-banner"
    >
      <p id="stream-consent-title" className="font-semibold">
        Streaming consent (PDPA)
      </p>
      <p className="mt-1">
        The host wants to stream this room. Streaming does not start until
        everyone here consents. Destinations may be outside this organization.
      </p>
      {consented ? (
        <p className="mt-2">You consented. Waiting for others.</p>
      ) : (
        <button
          type="button"
          className="sru-cta mt-3"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const res = await fetch(`/api/v1/rooms/${roomId}/streaming/consent`, {
              method: "POST",
            });
            setPending(false);
            if (res.ok) {
              setConsentedHere(true);
            }
          }}
        >
          {pending ? "Saving…" : "I consent to streaming"}
        </button>
      )}
    </div>
  );
}
