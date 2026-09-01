import { auth } from "@/lib/auth";
import { isOrgAdmin } from "@/lib/rbac";
import { getStreamForUser } from "@/lib/streaming";
import { HlsPlayer } from "@/components/vod/HlsPlayer";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";

export default async function StreamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fixture?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  if (query.fixture === "1") {
    return (
      <main id="app-main" className="mx-auto w-full max-w-3xl flex-1 px-page py-12">
        <h1 className="font-sans text-display font-semibold text-ink">
          Stream (fixture)
        </h1>
        <p className="mt-3 text-body text-muted">
          Public HLS sample for player smoke checks.
        </p>
        <div className="mt-8">
          <HlsPlayer
            src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            title="Fixture live stream"
          />
        </div>
      </main>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return (
      <MeetingErrorState
        title="Sign in required"
        message="Open this stream after you sign in."
      />
    );
  }

  const result = await getStreamForUser({
    streamId: id,
    userId: session.user.id,
    orgAdmin: isOrgAdmin(session.user.orgRole),
  });
  if (!result.ok) {
    return (
      <MeetingErrorState title="Stream unavailable" message={result.message} />
    );
  }
  const stream = result.stream;
  return (
    <main id="app-main" className="mx-auto w-full max-w-3xl flex-1 px-page py-12">
      <h1 className="font-sans text-display font-semibold text-ink">Stream</h1>
      <p className="mt-3 text-body text-muted">
        Status: {stream.status}
        {stream.startedAt ? ` · Started ${stream.startedAt}` : ""}
      </p>
      {stream.hlsUrl ? (
        <div className="mt-8">
          <HlsPlayer src={stream.hlsUrl} title="Meeting live stream" />
        </div>
      ) : (
        <p className="mt-8 text-body text-muted">
          Live playlist appears when the host starts streaming with HLS enabled.
        </p>
      )}
    </main>
  );
}
