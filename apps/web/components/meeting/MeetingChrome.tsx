"use client";

import type { Room } from "@sru/shared";
import {
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useSpeakingParticipants,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BreakoutChildBar,
  BreakoutHelpNotice,
  BreakoutJoinBanner,
  BreakoutPanel,
  useOpenBreakout,
} from "@/components/meeting/BreakoutPanel";
import { moveToPreparedMeeting } from "@/lib/breakout-move";
import { ChatPanel } from "@/components/meeting/ChatPanel";
import { PollPanel } from "@/components/meeting/PollPanel";
import { QaPanel } from "@/components/meeting/QaPanel";
import { WhiteboardPanel } from "@/components/meeting/WhiteboardPanel";
import { HandQueue } from "@/components/meeting/HandQueue";
import {
  LayoutSwitcher,
  type MeetingLayout,
} from "@/components/meeting/LayoutSwitcher";
import { LobbyGate } from "@/components/meeting/LobbyGate";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";
import { ModerationBar } from "@/components/meeting/ModerationBar";
import { ParticipantList } from "@/components/meeting/ParticipantList";
import { RaiseHand } from "@/components/meeting/RaiseHand";
import { Reactions } from "@/components/meeting/Reactions";
import { RoomSettings } from "@/components/meeting/RoomSettings";
import { RecordButton } from "@/components/meeting/RecordButton";
import { RecordingConsent } from "@/components/meeting/RecordingConsent";
import { StreamBanner } from "@/components/meeting/StreamBanner";
import { StreamButton } from "@/components/meeting/StreamButton";
import { ScreenShareButton } from "@/components/meeting/ScreenShareButton";
import { LocalVideoBackgroundSync } from "@/components/meeting/LocalVideoBackgroundSync";
import { QosReporter } from "@/components/meeting/QosReporter";
import { NoiseSuppressionControl } from "@/components/meeting/NoiseSuppressionControl";
import { VirtualBackgroundControl } from "@/components/meeting/VirtualBackgroundControl";
import { GridView } from "@/components/meeting/layouts/GridView";
import { SidebarView } from "@/components/meeting/layouts/SidebarView";
import { SpeakerView } from "@/components/meeting/layouts/SpeakerView";

export function MeetingChrome({
  room: initialRoom,
  userId,
  role,
}: {
  room: Room;
  userId: string;
  role: "host" | "cohost" | "participant";
}) {
  const livekitRoom = useRoomContext();
  const connection = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const speakers = useSpeakingParticipants();
  const participants = useParticipants();
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const screenTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: false,
  });

  const [layout, setLayout] = useState<MeetingLayout>("grid");
  const [room, setRoom] = useState(initialRoom);
  const [panel, setPanel] = useState<
    "none" | "chat" | "people" | "settings" | "breakouts" | "polls" | "qa" | "whiteboard"
  >("none");
  const [spotlight, setSpotlight] = useState<string | undefined>();
  const [ended, setEnded] = useState(Boolean(initialRoom.finishedAt));
  const [recording, setRecording] = useState<{
    id: string;
    status:
      | "pending_consent"
      | "starting"
      | "active"
      | "finishing"
      | "finished"
      | "failed";
    consentedUserIds?: string[];
  } | null>(null);
  const [streaming, setStreaming] = useState<{
    id: string;
    status:
      | "pending_consent"
      | "starting"
      | "active"
      | "finishing"
      | "finished"
      | "failed";
    consentedUserIds?: string[];
  } | null>(null);

  const moderator = role === "host" || role === "cohost";
  const inChild = Boolean(room.parentRoomId);
  const e2eeEnabled = Boolean(room.e2eeEnabled);
  const breakouts = useOpenBreakout(room.parentRoomId ?? room.id);
  const moveToRoom = useCallback(
    async (destinationRoomId: string) => {
      const result = await moveToPreparedMeeting({
        destinationRoomId,
        identity: userId,
        name: localParticipant.name || undefined,
        audio: localParticipant.isMicrophoneEnabled,
        video: localParticipant.isCameraEnabled,
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
    },
    [localParticipant, userId],
  );

  useEffect(() => {
    const onMeta = (metadata: string) => {
      try {
        const parsed = JSON.parse(metadata) as {
          spotlightIdentity?: string;
          recording?: {
            id: string;
            status:
              | "pending_consent"
              | "starting"
              | "active"
              | "finishing"
              | "finished"
              | "failed";
          } | null;
          streaming?: {
            id: string;
            status:
              | "pending_consent"
              | "starting"
              | "active"
              | "finishing"
              | "finished"
              | "failed";
          } | null;
        };
        setSpotlight(parsed.spotlightIdentity);
        if (parsed.recording) {
          setRecording((current) => ({
            id: parsed.recording!.id,
            status: parsed.recording!.status,
            consentedUserIds: current?.consentedUserIds,
          }));
        } else if (parsed.recording === null) {
          setRecording(null);
        }
        if (parsed.streaming) {
          setStreaming((current) => ({
            id: parsed.streaming!.id,
            status: parsed.streaming!.status,
            consentedUserIds: current?.consentedUserIds,
          }));
        } else if (parsed.streaming === null) {
          setStreaming(null);
        }
      } catch {
        // ignore
      }
    };
    if (livekitRoom.metadata) {
      onMeta(livekitRoom.metadata);
    }
    livekitRoom.on(RoomEvent.RoomMetadataChanged, onMeta);
    return () => {
      livekitRoom.off(RoomEvent.RoomMetadataChanged, onMeta);
    };
  }, [livekitRoom]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const [recordingRes, streamingRes] = await Promise.all([
        fetch(`/api/v1/rooms/${room.id}/recording`),
        fetch(`/api/v1/rooms/${room.id}/streaming`),
      ]);
      if (!cancelled && recordingRes.ok) {
        const json = (await recordingRes.json()) as {
          data: {
            id: string;
            status:
              | "pending_consent"
              | "starting"
              | "active"
              | "finishing"
              | "finished"
              | "failed";
            consentedUserIds?: string[];
          } | null;
        };
        setRecording(json.data);
      }
      if (!cancelled && streamingRes.ok) {
        const json = (await streamingRes.json()) as {
          data: {
            id: string;
            status:
              | "pending_consent"
              | "starting"
              | "active"
              | "finishing"
              | "finished"
              | "failed";
            consentedUserIds?: string[];
          } | null;
        };
        setStreaming(json.data);
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [room.id]);

  const tiles = useMemo(() => {
    const screens = screenTracks.map((trackRef) => ({
      id: `${trackRef.participant.identity}-screen`,
      label: `${trackRef.participant.name || trackRef.participant.identity} · screen`,
      trackRef,
    }));
    const cameras = cameraTracks.map((trackRef) => ({
      id: trackRef.participant.identity,
      label: trackRef.participant.name || trackRef.participant.identity,
      trackRef: trackRef.publication ? trackRef : undefined,
    }));
    return [...screens, ...cameras];
  }, [cameraTracks, screenTracks]);

  const screenMain = screenTracks[0]
    ? `${screenTracks[0].participant.identity}-screen`
    : undefined;
  const mainId =
    (spotlight
      ? tiles.find((tile) => tile.id.startsWith(spotlight))?.id
      : undefined) ??
    screenMain ??
    speakers[0]?.identity ??
    participants[0]?.identity;

  if (ended) {
    return (
      <MeetingErrorState
        title="Meeting ended"
        message="The host ended this meeting for everyone."
      />
    );
  }

  if (connection === ConnectionState.Disconnected) {
    return (
      <MeetingErrorState
        title="Disconnected"
        message="The connection dropped. Check your network and try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="sru-meet">
      <LocalVideoBackgroundSync />
      <QosReporter roomId={room.id} />
      <RoomAudioRenderer />
      {connection === ConnectionState.Reconnecting ? (
        <p role="status" className="px-page py-2 text-center">
          Reconnecting…
        </p>
      ) : null}
      {e2eeEnabled ? (
        <p
          role="status"
          className="border-b border-emerald-800/60 bg-emerald-950/50 px-page py-2 text-center text-sm text-emerald-200"
        >
          End-to-end encryption is active for camera and microphone. Recording,
          streaming, and breakouts are unavailable.
        </p>
      ) : null}
      <div className="sru-meet-stage relative">
        {layout === "grid" ? <GridView tiles={tiles} /> : null}
        {layout === "speaker" ? (
          <SpeakerView tiles={tiles} mainId={mainId} />
        ) : null}
        {layout === "sidebar" ? (
          <SidebarView tiles={tiles} mainId={mainId} />
        ) : null}
        {recording ? (
          <RecordingConsent
            roomId={room.id}
            userId={userId}
            recording={recording}
          />
        ) : null}
        {streaming ? (
          <StreamBanner
            roomId={room.id}
            userId={userId}
            stream={streaming}
          />
        ) : null}
        {!moderator && !inChild && !e2eeEnabled ? (
          <BreakoutJoinBanner
            session={breakouts.session}
            userId={userId}
            maxParticipants={room.maxParticipants ?? 25}
            onMove={moveToRoom}
          />
        ) : null}
        {moderator && !inChild ? (
          <BreakoutHelpNotice session={breakouts.session} />
        ) : null}
        {inChild && room.parentRoomId ? (
          <BreakoutChildBar
            roomId={room.id}
            parentRoomId={room.parentRoomId}
            session={breakouts.session}
            onMove={moveToRoom}
          />
        ) : null}
        {moderator && room.lobbyEnabled ? <LobbyGate roomId={room.id} /> : null}
        {moderator ? <HandQueue /> : null}
        {panel === "chat" ? (
          <ChatPanel
            roomId={room.id}
            userId={userId}
            allowChat={room.allowChat !== false}
          />
        ) : null}
        {panel === "polls" ? (
          <PollPanel roomId={room.id} userId={userId} moderator={moderator} />
        ) : null}
        {panel === "qa" ? (
          <QaPanel roomId={room.id} userId={userId} moderator={moderator} />
        ) : null}
        {panel === "whiteboard" ? (
          <WhiteboardPanel roomId={room.id} userId={userId} host={role === "host"} />
        ) : null}
        {panel === "people" ? (
          <ParticipantList roomId={room.id} host={moderator} />
        ) : null}
        {panel === "settings" && moderator ? (
          <RoomSettings room={room} onChange={setRoom} />
        ) : null}
        {panel === "breakouts" && moderator && !inChild && !breakouts.childRoom && !e2eeEnabled ? (
          <BreakoutPanel
            roomId={room.id}
            session={breakouts.session}
            loadError={breakouts.loadError}
            onChanged={breakouts.refresh}
            onMove={moveToRoom}
          />
        ) : null}
      </div>
      <footer className="sru-meet-bar">
        <button
          type="button"
          className="sru-meet-btn"
          aria-pressed={!localParticipant.isMicrophoneEnabled}
          onClick={() =>
            void localParticipant.setMicrophoneEnabled(
              !localParticipant.isMicrophoneEnabled,
            )
          }
        >
          {localParticipant.isMicrophoneEnabled ? "Mute" : "Unmute"}
        </button>
        <NoiseSuppressionControl />
        <VirtualBackgroundControl />
        <button
          type="button"
          className="sru-meet-btn"
          aria-pressed={!localParticipant.isCameraEnabled}
          onClick={() =>
            void localParticipant.setCameraEnabled(
              !localParticipant.isCameraEnabled,
            )
          }
        >
          {localParticipant.isCameraEnabled ? "Stop camera" : "Start camera"}
        </button>
        {room.allowScreenShare !== false ? (
          <ScreenShareButton e2eeEnabled={e2eeEnabled} />
        ) : null}
        <RaiseHand />
        <Reactions userId={userId} />
        <LayoutSwitcher layout={layout} onChange={setLayout} />
        <button
          type="button"
          className="sru-meet-btn"
          aria-pressed={panel === "polls"}
          onClick={() => setPanel((value) => (value === "polls" ? "none" : "polls"))}
        >
          Poll
        </button>
        <button
          type="button"
          className="sru-meet-btn"
          aria-pressed={panel === "qa"}
          onClick={() => setPanel((value) => (value === "qa" ? "none" : "qa"))}
        >
          Q&amp;A
        </button>
        <button
          type="button"
          className="sru-meet-btn"
          aria-pressed={panel === "whiteboard"}
          onClick={() =>
            setPanel((value) => (value === "whiteboard" ? "none" : "whiteboard"))
          }
        >
          Board
        </button>
        <button
          type="button"
          className="sru-meet-btn"
          aria-pressed={panel === "chat"}
          onClick={() => setPanel((value) => (value === "chat" ? "none" : "chat"))}
        >
          Chat
        </button>
        <button
          type="button"
          className="sru-meet-btn"
          aria-pressed={panel === "people"}
          onClick={() =>
            setPanel((value) => (value === "people" ? "none" : "people"))
          }
        >
          People
        </button>
        {moderator ? (
          <>
            <button
              type="button"
              className="sru-meet-btn"
              aria-pressed={panel === "settings"}
              onClick={() =>
                setPanel((value) => (value === "settings" ? "none" : "settings"))
              }
            >
              Settings
            </button>
            {!inChild && !breakouts.childRoom && !e2eeEnabled ? (
              <button
                type="button"
                className="sru-meet-btn"
                aria-pressed={panel === "breakouts"}
                onClick={() =>
                  setPanel((value) =>
                    value === "breakouts" ? "none" : "breakouts",
                  )
                }
              >
                Breakouts
              </button>
            ) : null}
            {!e2eeEnabled ? (
              <>
                <RecordButton roomId={room.id} recording={recording} />
                <StreamButton roomId={room.id} stream={streaming} />
              </>
            ) : null}
            <ModerationBar roomId={room.id} />
            <button
              type="button"
              className="sru-meet-btn"
              onClick={async () => {
                await fetch(`/api/v1/rooms/${room.id}/moderation`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "lock" }),
                });
              }}
            >
              Lock
            </button>
            <button
              type="button"
              className="sru-cta-danger"
              onClick={async () => {
                await fetch(`/api/v1/rooms/${room.id}/moderation`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "end" }),
                });
                setEnded(true);
                livekitRoom.disconnect();
              }}
            >
              End meeting
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="sru-cta-danger"
          onClick={() => {
            livekitRoom.disconnect();
            window.location.href = "/app";
          }}
        >
          Leave
        </button>
      </footer>
    </div>
  );
}
