"use client";

export function StreamButton({
  roomId,
  stream,
}: {
  roomId: string;
  stream: { status: string; id?: string } | null;
}) {
  const active =
    stream &&
    (stream.status === "pending_consent" ||
      stream.status === "starting" ||
      stream.status === "active");

  return (
    <button
      type="button"
      className="sru-meet-btn"
      aria-pressed={Boolean(active)}
      onClick={async () => {
        if (active) {
          await fetch(`/api/v1/rooms/${roomId}/streaming`, { method: "DELETE" });
          return;
        }
        await fetch(`/api/v1/rooms/${roomId}/streaming`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hls: true }),
        });
      }}
    >
      {active ? "Stop stream" : "Stream"}
    </button>
  );
}
