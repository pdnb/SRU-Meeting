"use client";

export function RecordButton({
  roomId,
  recording,
}: {
  roomId: string;
  recording: { status: string } | null;
}) {
  const active =
    recording &&
    (recording.status === "pending_consent" ||
      recording.status === "starting" ||
      recording.status === "active");

  return (
    <button
      type="button"
      className="sru-meet-btn"
      aria-pressed={Boolean(active)}
      onClick={async () => {
        if (active) {
          await fetch(`/api/v1/rooms/${roomId}/recording`, { method: "DELETE" });
          return;
        }
        await fetch(`/api/v1/rooms/${roomId}/recording`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "composite" }),
        });
      }}
    >
      {active ? "Stop recording" : "Record"}
    </button>
  );
}
