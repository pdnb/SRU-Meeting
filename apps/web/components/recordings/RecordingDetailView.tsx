"use client";

import type { MeetingSummary, Recording, Transcript } from "@sru/shared";
import { useEffect, useState } from "react";
import { HlsPlayer } from "@/components/vod/HlsPlayer";
import {
  MeetingSummaryPanel,
  TranscriptViewer,
} from "@/components/recordings/RecordingDetailPanels";

export function RecordingDetailView({
  recording,
  initialTranscript,
  initialSummary,
  transcriptUnavailableMessage,
}: {
  recording: Recording;
  initialTranscript: Transcript | null;
  initialSummary: MeetingSummary | null;
  transcriptUnavailableMessage: string | null;
}) {
  const [transcript, setTranscript] = useState<Transcript | null>(initialTranscript);
  const [summary, setSummary] = useState<MeetingSummary | null>(initialSummary);
  const [transcriptMessage, setTranscriptMessage] = useState<string | null>(
    transcriptUnavailableMessage,
  );

  useEffect(() => {
    if (transcript?.status !== "pending" && transcript?.status !== "processing") {
      return;
    }
    let cancelled = false;
    const timer = window.setInterval(async () => {
      const [transcriptRes, summaryRes] = await Promise.all([
        fetch(`/api/v1/recordings/${recording.id}/transcript`),
        fetch(`/api/v1/recordings/${recording.id}/summary`),
      ]);
      if (cancelled) {
        return;
      }
      if (transcriptRes.ok) {
        const next = (await transcriptRes.json()) as Transcript;
        setTranscript(next);
        setTranscriptMessage(null);
        if (next.status === "finished" || next.status === "failed") {
          window.clearInterval(timer);
        }
      }
      if (summaryRes.ok) {
        setSummary((await summaryRes.json()) as MeetingSummary);
      }
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [recording.id, transcript?.status]);

  return (
    <>
      {recording.hlsUrl ? (
        <div className="mt-8">
          <HlsPlayer src={recording.hlsUrl} title="Meeting recording" />
        </div>
      ) : recording.downloadUrl ? (
        <p className="mt-8">
          <a href={recording.downloadUrl} className="sru-cta">
            Download MP4
          </a>
        </p>
      ) : (
        <p className="mt-8 text-body text-muted">
          Playback will appear when the recording has finished uploading.
        </p>
      )}

      {transcript ? (
        <TranscriptViewer transcript={transcript} />
      ) : transcriptMessage ? (
        <section className="mt-8 rounded-lg border border-line bg-surface p-6">
          <h2 className="font-sans text-body font-semibold text-ink">Transcript</h2>
          <p className="mt-3 text-body text-muted">{transcriptMessage}</p>
        </section>
      ) : null}

      <MeetingSummaryPanel summary={summary} />
    </>
  );
}
