"use client";

import { useState } from "react";
import type { Recording } from "@sru/shared";

export function RecordingConsent({
  roomId,
  userId,
  recording,
}: {
  roomId: string;
  userId: string;
  recording: Pick<Recording, "id" | "status" | "consentedUserIds">;
}) {
  const already = recording.consentedUserIds?.includes(userId) ?? false;
  const [pending, setPending] = useState(false);
  const [consentedHere, setConsentedHere] = useState(false);
  const consented = already || consentedHere;

  if (recording.status === "active") {
    return (
      <div role="status" className="sru-record-banner">
        This meeting is being recorded. The file is stored on this organization&apos;s
        servers.
      </div>
    );
  }

  if (recording.status !== "pending_consent") {
    return null;
  }

  return (
    <div role="dialog" aria-labelledby="pdpa-consent-title" className="sru-record-banner">
      <p id="pdpa-consent-title" className="font-semibold">
        Recording consent (PDPA)
      </p>
      <p className="mt-1">
        The host wants to record this room. Recording does not start until everyone
        here consents. Files stay on this server.
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
            const res = await fetch(`/api/v1/rooms/${roomId}/recording/consent`, {
              method: "POST",
            });
            setPending(false);
            if (res.ok) {
              setConsentedHere(true);
            }
          }}
        >
          {pending ? "Saving…" : "I consent to recording"}
        </button>
      )}
    </div>
  );
}
