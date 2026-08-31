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
    <div className="sru-meet items-center justify-center px-page text-center">
      <h1 className="font-sans text-display font-semibold">{title}</h1>
      <p role="alert" className="mt-4 max-w-md text-body text-zinc-300">
        {message}
      </p>
      {onRetry ? (
        <p className="mt-8">
          <button type="button" className="sru-cta" onClick={onRetry}>
            Try again
          </button>
        </p>
      ) : (
        <p className="mt-8">
          <a href="/app" className="sru-cta">
            Back to rooms
          </a>
        </p>
      )}
    </div>
  );
}
