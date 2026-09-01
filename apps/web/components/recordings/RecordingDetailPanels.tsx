"use client";

import type { MeetingSummary, Transcript } from "@sru/shared";
import { useMemo, useState } from "react";

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TranscriptViewer({ transcript }: { transcript: Transcript }) {
  const [query, setQuery] = useState("");

  const filteredSegments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return transcript.segments;
    }
    return transcript.segments.filter(
      (segment) =>
        segment.text.toLowerCase().includes(needle) ||
        segment.speakerLabel.toLowerCase().includes(needle),
    );
  }, [query, transcript.segments]);

  if (transcript.status === "pending" || transcript.status === "processing") {
    return (
      <section className="mt-8 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-sans text-body font-semibold text-ink">Transcript</h2>
        <p className="mt-3 text-body text-muted">Transcription queued</p>
      </section>
    );
  }

  if (transcript.status === "failed") {
    return (
      <section className="mt-8 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-sans text-body font-semibold text-ink">Transcript</h2>
        <p className="mt-3 text-body text-muted">
          Transcription failed. Contact an administrator if this persists.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-sans text-body font-semibold text-ink">Transcript</h2>
        <label className="flex min-w-[12rem] flex-col gap-1">
          <span className="sru-label">Search transcript</span>
          <input
            className="sru-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Speaker or phrase"
          />
        </label>
      </div>
      {transcript.segments.length === 0 ? (
        <p className="mt-4 text-body text-muted">
          No transcript segments yet. The STT provider is not configured.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {filteredSegments.map((segment) => (
            <li key={segment.id} className="py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-caption text-muted">
                  {formatTimestamp(segment.startMs)}
                </span>
                <span className="font-semibold text-ink">{segment.speakerLabel}</span>
              </div>
              <p className="mt-1 text-body text-ink">{segment.text}</p>
            </li>
          ))}
        </ul>
      )}
      {query && filteredSegments.length === 0 ? (
        <p className="mt-4 text-body text-muted">No segments match your search.</p>
      ) : null}
    </section>
  );
}

export function MeetingSummaryPanel({ summary }: { summary: MeetingSummary | null }) {
  if (!summary) {
    return (
      <section className="mt-8 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-sans text-body font-semibold text-ink">Meeting summary</h2>
        <p className="mt-3 text-body text-muted">
          Summary will appear after transcription completes.
        </p>
      </section>
    );
  }

  if (summary.status === "not_configured") {
    return (
      <section className="mt-8 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-sans text-body font-semibold text-ink">Meeting summary</h2>
        <p className="mt-3 text-body text-muted">
          {summary.message ?? "Summary not configured"}
        </p>
      </section>
    );
  }

  if (summary.status === "pending") {
    return (
      <section className="mt-8 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-sans text-body font-semibold text-ink">Meeting summary</h2>
        <p className="mt-3 text-body text-muted">Summary is being generated…</p>
      </section>
    );
  }

  if (summary.status === "failed") {
    return (
      <section className="mt-8 rounded-lg border border-line bg-surface p-6">
        <h2 className="font-sans text-body font-semibold text-ink">Meeting summary</h2>
        <p className="mt-3 text-body text-muted">Summary generation failed.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-lg border border-line bg-surface p-6">
      <h2 className="font-sans text-body font-semibold text-ink">Meeting summary</h2>
      <div className="prose mt-4 max-w-none whitespace-pre-wrap text-body text-ink">
        {summary.bodyMarkdown}
      </div>
    </section>
  );
}
