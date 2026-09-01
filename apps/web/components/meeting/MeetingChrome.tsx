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
import { PollPanel } from "@/components/meeting/PollPanel";
import { QaPanel } from "@/components/meeting/QaPanel";
import { WhiteboardPanel } from "@/components/meeting/WhiteboardPanel";
import { HandQueue } from "@/components/meeting/HandQueue";
import { type MeetingLayout } from "@/components/meeting/LayoutSwitcher";
import { LobbyGate } from "@/components/meeting/LobbyGate";
import { MeetingErrorState } from "@/components/meeting/MeetingErrorState";
import { Reactions } from "@/components/meeting/Reactions";
import { RoomSettings } from "@/components/meeting/RoomSettings";
import { RecordingConsent } from "@/components/meeting/RecordingConsent";
import { StreamBanner } from "@/components/meeting/StreamBanner";
import { LocalVideoBackgroundSync } from "@/components/meeting/LocalVideoBackgroundSync";
import { QosReporter } from "@/components/meeting/QosReporter";
import { GridView } from "@/components/meeting/layouts/GridView";
import { SidebarView } from "@/components/meeting/layouts/SidebarView";
import { SpeakerView } from "@/components/meeting/layouts/SpeakerView";
import { MeetingControlBar, type MeetingOverlayPanel } from "@/components/meeting/chrome/MeetingControlBar";
import { MeetingSidebar } from "@/components/meeting/chrome/MeetingSidebar";
import { MeetingTopBar } from "@/components/meeting/chrome/MeetingTopBar";

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
  const [panel, setPanel] = useState<MeetingOverlayPanel>("none");
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
    if (panel !== "none") {
      setMobileSidebarOpen(false);
    }
  }, [panel]);

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
      trackRef,
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

  const recordingActive = Boolean(
    recording &&
      (recording.status === "pending_consent" ||
        recording.status === "starting" ||
        recording.status === "active"),
  );
  const canOpenBreakouts =
    moderator && !inChild && !breakouts.childRoom && !e2eeEnabled;
  const sidebarOpen = desktopSidebarOpen || mobileSidebarOpen;

  function toggleSidebar() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopSidebarOpen((value) => !value);
    } else {
      setMobileSidebarOpen((value) => !value);
    }
  }

  return (
    <div className="sru-meet">
      <LocalVideoBackgroundSync />
      <QosReporter roomId={room.id} />
      <RoomAudioRenderer />
      <MeetingTopBar
        title={room.name}
        participantCount={participants.length}
        e2eeEnabled={e2eeEnabled}
        recordingActive={recordingActive}
        locked={room.locked}
        layout={layout}
        onLayoutChange={setLayout}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />
      {connection === ConnectionState.Reconnecting ? (
        <p role="status" className="bg-meet-panel px-3 py-1 text-center text-sm text-meet-muted">
          Reconnecting…
        </p>
      ) : null}
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
          {layout === "grid" ? <GridView tiles={tiles} /> : null}
          {layout === "speaker" ? (
            <SpeakerView tiles={tiles} mainId={mainId} />
          ) : null}
          {layout === "sidebar" ? (
            <SidebarView tiles={tiles} mainId={mainId} />
          ) : null}
          <Reactions />
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
          {panel === "polls" ? (
            <PollPanel roomId={room.id} userId={userId} moderator={moderator} />
          ) : null}
          {panel === "qa" ? (
            <QaPanel roomId={room.id} userId={userId} moderator={moderator} />
          ) : null}
          {panel === "whiteboard" ? (
            <WhiteboardPanel roomId={room.id} userId={userId} host={role === "host"} />
          ) : null}
          {panel === "settings" && moderator ? (
            <RoomSettings room={room} onChange={setRoom} />
          ) : null}
          {panel === "breakouts" && canOpenBreakouts ? (
            <BreakoutPanel
              roomId={room.id}
              session={breakouts.session}
              loadError={breakouts.loadError}
              onChanged={breakouts.refresh}
              onMove={moveToRoom}
            />
          ) : null}
          <MeetingControlBar
            room={room}
            userId={userId}
            moderator={moderator}
            e2eeEnabled={e2eeEnabled}
            canOpenBreakouts={canOpenBreakouts}
            panel={panel}
            onPanelChange={setPanel}
            layout={layout}
            onLayoutChange={setLayout}
            recording={recording}
            streaming={streaming}
            onLeave={() => {
              livekitRoom.disconnect();
              window.location.href = "/app";
            }}
            onEndMeeting={() => {
              void (async () => {
                await fetch(`/api/v1/rooms/${room.id}/moderation`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "end" }),
                });
                setEnded(true);
                livekitRoom.disconnect();
              })();
            }}
          />
        </div>
        {mobileSidebarOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-pointer bg-black/50 lg:hidden"
            aria-label="Close participants and chat"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}
        <div
          className={[
            "h-full w-full max-w-xs shrink-0 sm:w-[265px]",
            mobileSidebarOpen
              ? "absolute inset-y-0 right-0 z-20 flex shadow-[(-8px)_0_24px_rgb(0_0_0_/_0.35)]"
              : "hidden",
            desktopSidebarOpen ? "lg:relative lg:flex lg:shadow-none" : "lg:hidden",
          ].join(" ")}
        >
          <MeetingSidebar
            roomId={room.id}
            userId={userId}
            host={moderator}
            allowChat={room.allowChat !== false}
          />
        </div>
      </div>
    </div>
  );
}
