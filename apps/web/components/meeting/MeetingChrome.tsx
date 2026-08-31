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
import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "@/components/meeting/ChatPanel";
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
import { ScreenShareButton } from "@/components/meeting/ScreenShareButton";
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
    "none" | "chat" | "people" | "settings"
  >("none");
  const [spotlight, setSpotlight] = useState<string | undefined>();
  const [ended, setEnded] = useState(Boolean(initialRoom.finishedAt));

  const moderator = role === "host" || role === "cohost";

  useEffect(() => {
    const onMeta = (metadata: string) => {
      try {
        const parsed = JSON.parse(metadata) as { spotlightIdentity?: string };
        setSpotlight(parsed.spotlightIdentity);
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
      <RoomAudioRenderer />
      {connection === ConnectionState.Reconnecting ? (
        <p role="status" className="px-page py-2 text-center">
          Reconnecting…
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
        {moderator && room.lobbyEnabled ? <LobbyGate roomId={room.id} /> : null}
        {moderator ? <HandQueue /> : null}
        {panel === "chat" ? (
          <ChatPanel
            roomId={room.id}
            userId={userId}
            allowChat={room.allowChat !== false}
          />
        ) : null}
        {panel === "people" ? (
          <ParticipantList roomId={room.id} host={moderator} />
        ) : null}
        {panel === "settings" && moderator ? (
          <RoomSettings room={room} onChange={setRoom} />
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
        {room.allowScreenShare !== false ? <ScreenShareButton /> : null}
        <RaiseHand />
        <Reactions userId={userId} />
        <LayoutSwitcher layout={layout} onChange={setLayout} />
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
