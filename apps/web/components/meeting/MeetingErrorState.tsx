import { MeetingLobbyShell } from "@/components/meeting/chrome/MeetingLobbyShell";

export function MeetingErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <MeetingLobbyShell centered>
      <div className="sru-meet-lobby-join">
        <h1>{title}</h1>
        <p role="alert" className="m-0 text-body sru-meet-muted">
          {message}
        </p>
        {onRetry ? (
          <button type="button" className="sru-meet-cta" onClick={onRetry}>
            Try again
          </button>
        ) : (
          <a href="/app" className="sru-meet-cta">
            Back to rooms
          </a>
        )}
      </div>
    </MeetingLobbyShell>
  );
}
