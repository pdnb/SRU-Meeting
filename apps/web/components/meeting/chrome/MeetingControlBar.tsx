"use client";

import { useLocalParticipant } from "@livekit/components-react";
import {
  CircleStop,
  Hand,
  Lock,
  MessageCircleQuestion,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  Presentation,
  Settings,
  Users,
  Video,
  VideoOff,
  Vote,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import type { Room } from "@sru/shared";
import { ControlIconButton } from "@/components/meeting/chrome/ControlIconButton";
import { LayoutSwitcher, type MeetingLayout } from "@/components/meeting/LayoutSwitcher";
import { NoiseSuppressionControl } from "@/components/meeting/NoiseSuppressionControl";
import { ReactionPicker } from "@/components/meeting/Reactions";
import { RecordButton } from "@/components/meeting/RecordButton";
import { StreamButton } from "@/components/meeting/StreamButton";
import { VirtualBackgroundControl } from "@/components/meeting/VirtualBackgroundControl";
import {
  parseHandMetadata,
  serializeHandMetadata,
} from "@/lib/livekit/metadata";
import { isScreenShareSupported } from "@/lib/livekit/screen-share";

export type MeetingOverlayPanel =
  | "none"
  | "settings"
  | "breakouts"
  | "polls"
  | "qa"
  | "whiteboard";

export function MeetingControlBar({
  room,
  userId,
  moderator,
  e2eeEnabled,
  canOpenBreakouts,
  panel,
  onPanelChange,
  layout,
  onLayoutChange,
  recording,
  streaming,
  onLeave,
  onEndMeeting,
}: {
  room: Room;
  userId: string;
  moderator: boolean;
  e2eeEnabled: boolean;
  canOpenBreakouts: boolean;
  panel: MeetingOverlayPanel;
  onPanelChange: (panel: MeetingOverlayPanel) => void;
  layout: MeetingLayout;
  onLayoutChange: (layout: MeetingLayout) => void;
  recording: { status: string } | null;
  streaming: { status: string; id?: string } | null;
  onLeave: () => void;
  onEndMeeting: () => void;
}) {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreId = useId();
  const shareSupported = isScreenShareSupported();
  const micOn = localParticipant.isMicrophoneEnabled;
  const cameraOn = localParticipant.isCameraEnabled;
  const handRaised = Boolean(
    parseHandMetadata(localParticipant.metadata).handRaisedAt,
  );

  useEffect(() => {
    if (!moreOpen) {
      return;
    }
    function onPointer(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  function openPanel(next: MeetingOverlayPanel) {
    onPanelChange(panel === next ? "none" : next);
    setMoreOpen(false);
  }

  async function lockRoom() {
    await fetch(`/api/v1/rooms/${room.id}/moderation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lock" }),
    });
    setMoreOpen(false);
  }

  async function muteAll() {
    await fetch(`/api/v1/rooms/${room.id}/moderation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mute_all" }),
    });
    setMoreOpen(false);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-20 flex justify-center px-3">
      <div
        ref={moreRef}
        className="pointer-events-auto relative flex max-w-full items-center gap-2 overflow-x-auto rounded-full border border-meet-line bg-meet-panel px-3 py-2 shadow-[0_8px_24px_rgb(0_0_0_/_0.45)]"
      >
        {moreOpen ? (
          <div
            id={moreId}
            role="menu"
            aria-label="More meeting controls"
            className="absolute bottom-[calc(100%+0.75rem)] left-1/2 z-30 w-72 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-lg border border-meet-line bg-meet-panel p-3 shadow-[0_12px_32px_rgb(0_0_0_/_0.5)]"
          >
            <div className="flex flex-col gap-2">
              <MoreRow
                pressed={panel === "polls"}
                onClick={() => openPanel("polls")}
              >
                <Vote className="h-4 w-4" aria-hidden />
                Poll
              </MoreRow>
              <MoreRow
                pressed={panel === "qa"}
                onClick={() => openPanel("qa")}
              >
                <MessageCircleQuestion className="h-4 w-4" aria-hidden />
                Q&amp;A
              </MoreRow>
              <MoreRow
                pressed={panel === "whiteboard"}
                onClick={() => openPanel("whiteboard")}
              >
                <Presentation className="h-4 w-4" aria-hidden />
                Board
              </MoreRow>
              {moderator ? (
                <MoreRow
                  pressed={panel === "settings"}
                  onClick={() => openPanel("settings")}
                >
                  <Settings className="h-4 w-4" aria-hidden />
                  Settings
                </MoreRow>
              ) : null}
              {moderator && canOpenBreakouts ? (
                <MoreRow
                  pressed={panel === "breakouts"}
                  onClick={() => openPanel("breakouts")}
                >
                  <Users className="h-4 w-4" aria-hidden />
                  Breakouts
                </MoreRow>
              ) : null}
              <div className="border-t border-meet-line pt-2">
                <p className="mb-1 text-xs text-meet-muted">Layout</p>
                <LayoutSwitcher layout={layout} onChange={onLayoutChange} />
              </div>
              <div className="border-t border-meet-line pt-2">
                <NoiseSuppressionControl />
              </div>
              <div className="border-t border-meet-line pt-2">
                <VirtualBackgroundControl compact />
              </div>
              <div className="border-t border-meet-line pt-2">
                <p className="mb-1 text-xs text-meet-muted">Reactions</p>
                <ReactionPicker userId={userId} />
              </div>
              {e2eeEnabled && shareSupported ? (
                <p role="status" className="text-xs text-amber-300">
                  Screen share is not encrypted in E2EE meetings.
                </p>
              ) : null}
              {!shareSupported ? (
                <p role="status" className="text-xs text-meet-muted">
                  Screen share is not available in this browser
                </p>
              ) : null}
              {moderator && !e2eeEnabled ? (
                <div className="flex flex-wrap gap-2 border-t border-meet-line pt-2">
                  <RecordButton roomId={room.id} recording={recording} />
                  <StreamButton roomId={room.id} stream={streaming} />
                </div>
              ) : null}
              {moderator ? (
                <div className="flex flex-col gap-1 border-t border-meet-line pt-2">
                  <MoreRow onClick={() => void muteAll()}>
                    <MicOff className="h-4 w-4" aria-hidden />
                    Mute all
                  </MoreRow>
                  <MoreRow onClick={() => void lockRoom()}>
                    <Lock className="h-4 w-4" aria-hidden />
                    Lock
                  </MoreRow>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <ControlIconButton
          label={micOn ? "Mute microphone" : "Unmute microphone"}
          danger={!micOn}
          pressed={!micOn}
          onClick={() => void localParticipant.setMicrophoneEnabled(!micOn)}
        >
          {micOn ? (
            <Mic className="h-5 w-5" aria-hidden />
          ) : (
            <MicOff className="h-5 w-5" aria-hidden />
          )}
        </ControlIconButton>
        <ControlIconButton
          label={cameraOn ? "Stop camera" : "Start camera"}
          danger={!cameraOn}
          pressed={!cameraOn}
          onClick={() => void localParticipant.setCameraEnabled(!cameraOn)}
        >
          {cameraOn ? (
            <Video className="h-5 w-5" aria-hidden />
          ) : (
            <VideoOff className="h-5 w-5" aria-hidden />
          )}
        </ControlIconButton>
        {room.allowScreenShare !== false ? (
          <ControlIconButton
            label={isScreenShareEnabled ? "Stop sharing" : "Share screen"}
            pressed={isScreenShareEnabled}
            disabled={!shareSupported}
            onClick={() =>
              void localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
            }
          >
            <MonitorUp className="h-5 w-5" aria-hidden />
          </ControlIconButton>
        ) : null}
        <ControlIconButton
          label={handRaised ? "Lower hand" : "Raise hand"}
          pressed={handRaised}
          onClick={() => {
            const next = handRaised ? null : new Date().toISOString();
            void localParticipant.setMetadata(
              serializeHandMetadata({ handRaisedAt: next }),
            );
          }}
        >
          <Hand className="h-5 w-5" aria-hidden />
        </ControlIconButton>
        <ControlIconButton
          label="More"
          pressed={moreOpen}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          aria-controls={moreId}
          onClick={() => setMoreOpen((value) => !value)}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </ControlIconButton>
        {moderator ? (
          <ControlIconButton
            label="End meeting for everyone"
            danger
            onClick={onEndMeeting}
          >
            <CircleStop className="h-5 w-5" aria-hidden />
          </ControlIconButton>
        ) : null}
        <ControlIconButton label="Leave meeting" danger onClick={onLeave}>
          <PhoneOff className="h-5 w-5" aria-hidden />
        </ControlIconButton>
      </div>
    </div>
  );
}

function MoreRow({
  children,
  pressed,
  onClick,
}: {
  children: Array<ReactElement | string> | ReactElement | string;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
        pressed
          ? "bg-meet-speaker/15 text-meet-speaker"
          : "text-meet-ink hover:bg-meet-raised"
      }`}
      onClick={onClick}
    >
      {children as never}
    </button>
  );
}
