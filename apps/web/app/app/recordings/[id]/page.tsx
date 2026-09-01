import { auth } from "@/lib/auth";
import { isOrgAdmin } from "@/lib/rbac";
import { getRecordingForUser } from "@/lib/recording";
import { getSummaryForUser, getTranscriptForUser } from "@/lib/transcript";
import { RecordingDetailView } from "@/components/recordings/RecordingDetailView";
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

  const [transcriptResult, summaryResult] = await Promise.all([
    getTranscriptForUser({
      recordingId: id,
      userId: session.user.id,
      orgAdmin: isOrgAdmin(session.user.orgRole),
    }),
    getSummaryForUser({
      recordingId: id,
      userId: session.user.id,
      orgAdmin: isOrgAdmin(session.user.orgRole),
    }),
  ]);

  return (
    <main id="app-main" className="mx-auto w-full max-w-3xl flex-1 px-page py-12">
      <h1 className="font-sans text-display font-semibold text-ink">
        Recording
      </h1>
      <p className="mt-3 text-body text-muted">
        Status: {recording.status}
        {recording.finishedAt ? ` · Finished ${recording.finishedAt}` : ""}
      </p>
      <RecordingDetailView
        recording={recording}
        initialTranscript={transcriptResult.ok ? transcriptResult.transcript : null}
        initialSummary={summaryResult.ok ? summaryResult.summary : null}
        transcriptUnavailableMessage={
          !transcriptResult.ok && transcriptResult.status === 404
            ? "Transcript not available yet."
            : !transcriptResult.ok
              ? "Could not load transcript."
              : null
        }
      />
    </main>
  );
}
