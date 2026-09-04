"use client";

import type { PersonalRoom } from "@sru/shared";
import { useEffect, useState } from "react";

export function PersonalRoomCard({
  initial,
}: {
  initial: PersonalRoom | null;
}) {
  const [personal, setPersonal] = useState(initial);
  const [displayUrl, setDisplayUrl] = useState(initial?.joinPath ?? "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!personal) {
      return;
    }
    setDisplayUrl(`${window.location.origin}${personal.joinPath}`);
  }, [personal]);

  async function ensure() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/me/personal-room");
    setLoading(false);
    if (!res.ok) {
      setError("Could not load your permanent link.");
      return;
    }
    const json = (await res.json()) as PersonalRoom;
    setPersonal(json);
  }

  if (!personal) {
    return (
      <section className="sru-card mt-8 p-6">
        <h2 className="text-title font-semibold text-ink">My permanent link</h2>
        <p className="mt-2 max-w-[50ch] text-body text-muted">
          Get a Webex-style personal room URL that never changes.
        </p>
        {error ? (
          <p role="alert" className="sru-error mt-3">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="sru-cta mt-4"
          disabled={loading}
          onClick={() => void ensure()}
        >
          {loading ? "Loading…" : "Show my link"}
        </button>
      </section>
    );
  }

  return (
    <section className="sru-card mt-8 p-6">
      <h2 className="text-title font-semibold text-ink">My permanent link</h2>
      <p className="mt-2 max-w-[50ch] text-body text-muted">
        Share this link anytime. Guests enter with a display name — no account
        needed.
      </p>
      <p className="mt-4 break-all rounded-sru-lg border border-line bg-surface px-3 py-2 font-mono text-caption text-ink">
        {displayUrl || personal.joinPath}
      </p>
      {error ? (
        <p role="alert" className="sru-error mt-3">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="sru-cta"
          onClick={async () => {
            try {
              const url = `${window.location.origin}${personal.joinPath}`;
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              setError("Could not copy to clipboard.");
            }
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a href={`/app/rooms/${personal.id}`} className="sru-cta-secondary">
          Open as host
        </a>
      </div>
    </section>
  );
}
