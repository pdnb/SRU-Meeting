import { auth } from "@/lib/auth";
import { isOrgAdmin } from "@/lib/rbac";
import { getRecordingForUser } from "@/lib/recording";
import { HlsPlayer } from "@/components/vod/HlsPlayer";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";

export default async function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <MeetingErrorState title="Sign in required" message="Open this recording after you sign in." />
    );
  }
  const result = await getRecordingForUser({
    recordingId: id,
    userId: session.user.id,
    orgAdmin: isOrgAdmin(session.user.orgRole),
  });
  if (!result.ok) {
    return (
      <MeetingErrorState
        title="Recording unavailable"
        message={result.message}
      />
    );
  }
  const recording = result.recording;
  return (
    <main id="app-main" className="mx-auto w-full max-w-3xl flex-1 px-page py-12">
      <h1 className="font-sans text-display font-semibold text-ink">
        Recording
      </h1>
      <p className="mt-3 text-body text-muted">
        Status: {recording.status}
        {recording.finishedAt ? ` · Finished ${recording.finishedAt}` : ""}
      </p>
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
    </main>
  );
}
