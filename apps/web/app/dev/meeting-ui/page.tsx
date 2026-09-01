"use client";

import { useState } from "react";
import {
  AudioLines,
  Clock,
  Hand,
  LayoutGrid,
  Mic,
  MoreHorizontal,
  PanelRight,
  PhoneOff,
  User,
  Users,
  Video,
} from "lucide-react";
import "@/app/meeting.css";
import { meetingInter } from "@/lib/meeting-font";
import { ControlIconButton } from "@/components/meeting/chrome/ControlIconButton";
import { MeetingLobbyShell } from "@/components/meeting/chrome/MeetingLobbyShell";

type PreviewView = "lobby" | "waiting" | "in-room";

/**
 * Static Webex-style meeting chrome preview (no LiveKit).
 * Used to verify layout tokens and shell structure.
 */
export default function MeetingUiPreviewPage() {
  const [view, setView] = useState<PreviewView>("lobby");

  return (
    <>
      <div
        className={[
          "fixed z-[40] flex gap-1 rounded-full border border-meet-line bg-meet-panel p-1 text-sm text-meet-ink shadow-[0_8px_24px_rgb(0_0_0_/_0.4)]",
          view === "in-room"
            ? "z-[15] bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 justify-center sm:left-auto sm:right-3 sm:justify-start lg:bottom-auto lg:top-3 lg:z-[40]"
            : "top-3 right-3",
        ].join(" ")}
        role="tablist"
        aria-label="Preview screen"
      >
        {(
          [
            ["lobby", "Lobby"],
            ["waiting", "Waiting"],
            ["in-room", "In room"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={`cursor-pointer rounded-full px-3 py-1.5 ${
              view === id ? "bg-meet-speaker text-black" : "text-meet-muted"
            }`}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "lobby" ? <LobbyPreview /> : null}
      {view === "waiting" ? <WaitingPreview /> : null}
      {view === "in-room" ? <InRoomPreview /> : null}
    </>
  );
}

function LobbyPreview() {
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(true);

  return (
    <MeetingLobbyShell roomName="Design review room">
      <div className="sru-meet-lobby-preview">
        <div className="sru-tile sru-meet-lobby-tile">
          <div className="grid h-full place-items-center bg-meet-panel">
            <span
              className="grid h-20 w-20 place-items-center rounded-full bg-meet-raised text-2xl font-medium text-meet-ink"
              aria-hidden
            >
              AK
            </span>
            <span className="sr-only">
              {video ? "Camera preview placeholder" : "Camera off"}
            </span>
          </div>
          <div className="sru-meet-lobby-controls">
            <ControlIconButton
              label={audio ? "Mute microphone" : "Unmute microphone"}
              danger={!audio}
              pressed={!audio}
              onClick={() => setAudio((value) => !value)}
            >
              <Mic className="h-5 w-5" aria-hidden />
            </ControlIconButton>
            <ControlIconButton
              label={video ? "Stop camera" : "Start camera"}
              danger={!video}
              pressed={!video}
              onClick={() => setVideo((value) => !value)}
            >
              <Video className="h-5 w-5" aria-hidden />
            </ControlIconButton>
            <ControlIconButton label="Noise reduction" pressed>
              <AudioLines className="h-5 w-5" aria-hidden />
            </ControlIconButton>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-caption">
          <span className="sr-only">Background</span>
          <select className="sru-input" defaultValue="none" aria-label="Background">
            <option value="none">No background effect</option>
            <option value="blur">Blur background</option>
          </select>
        </label>
      </div>
      <div className="sru-meet-lobby-join">
        <div>
          <h1>Ready to join?</h1>
          <p className="mt-2 text-body sru-meet-muted">Design review room</p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <button type="submit" className="sru-meet-cta">
            Join meeting
          </button>
        </form>
      </div>
    </MeetingLobbyShell>
  );
}

function WaitingPreview() {
  return (
    <MeetingLobbyShell roomName="Design review room" centered>
      <div className="sru-meet-lobby-join">
        <span className="sru-meet-lobby-wait-mark" aria-hidden>
          <Clock className="h-6 w-6" />
        </span>
        <h1>Waiting for host</h1>
        <p role="status" className="m-0 max-w-md text-body sru-meet-muted">
          The host was notified. You will join the same room when they admit you.
        </p>
        <p className="m-0 text-caption sru-meet-muted">Status: pending</p>
      </div>
    </MeetingLobbyShell>
  );
}

function InRoomPreview() {
  const [tab, setTab] = useState<"people" | "chat">("people");
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarOpen = desktopSidebarOpen || mobileSidebarOpen;

  function toggleSidebar() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopSidebarOpen((value) => !value);
    } else {
      setMobileSidebarOpen((value) => !value);
    }
  }

  return (
    <div className={`sru-meet ${meetingInter.className}`}>
      <header className="flex h-[44px] shrink-0 items-center gap-2 border-b border-meet-line bg-meet-panel px-3 text-sm text-meet-ink sm:gap-3">
        <p className="min-w-0 flex-1 truncate font-medium">Design review room</p>
        <span className="inline-flex shrink-0 items-center gap-1 text-meet-muted">
          <Users className="h-3.5 w-3.5" aria-hidden />6
        </span>
        <div className="hidden items-center gap-1 lg:flex">
          <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-meet-speaker text-black">
            <LayoutGrid className="h-4 w-4" aria-hidden />
          </span>
          <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-meet-raised text-meet-ink">
            <User className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <button
          type="button"
          className="inline-grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-meet-raised text-meet-ink"
          aria-label={sidebarOpen ? "Hide participants and chat" : "Show participants and chat"}
          aria-pressed={sidebarOpen}
          onClick={toggleSidebar}
        >
          <PanelRight className="h-4 w-4" aria-hidden />
        </button>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
          <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-y-auto p-2 sm:grid-cols-2 lg:grid-cols-2 lg:grid-rows-3 lg:overflow-hidden">
            {["Alex Kim", "Sam Rivera", "Jordan Lee", "Casey Ng", "Riley Park", "Active Speaker"].map(
              (name, index) => (
                <div
                  key={name}
                  className={`sru-tile ${index === 5 ? "sru-tile-speaking" : ""}`}
                >
                  <div className="grid h-full place-items-center bg-meet-panel text-meet-muted">
                    {name}
                  </div>
                  <span className="sru-tile-label">{name}</span>
                </div>
              ),
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-20 flex justify-center px-3">
            <div className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-full border border-meet-line bg-meet-panel px-3 py-2">
              <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-meet-raised text-meet-ink">
                <Mic className="h-5 w-5" aria-hidden />
              </span>
              <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-meet-raised text-meet-ink">
                <Video className="h-5 w-5" aria-hidden />
              </span>
              <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-meet-raised text-meet-ink">
                <Hand className="h-5 w-5" aria-hidden />
              </span>
              <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-meet-raised text-meet-ink">
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </span>
              <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#c4314b] text-white">
                <PhoneOff className="h-5 w-5" aria-hidden />
              </span>
            </div>
          </div>
        </div>
        {mobileSidebarOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-pointer bg-black/50 lg:hidden"
            aria-label="Close participants and chat"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}
        {sidebarOpen ? (
          <aside
            id="meeting-sidebar"
            className={[
              "flex h-full w-full max-w-xs shrink-0 flex-col border-l border-meet-line bg-meet-panel sm:w-[265px]",
              mobileSidebarOpen
                ? "absolute inset-y-0 right-0 z-20 shadow-[(-8px)_0_24px_rgb(0_0_0_/_0.35)]"
                : "hidden lg:flex",
            ].join(" ")}
            aria-label="Participants and chat"
          >
            <div role="tablist" className="flex h-11 shrink-0 border-b border-meet-line">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "people"}
                className={`flex-1 cursor-pointer border-b-2 text-sm font-medium ${
                  tab === "people"
                    ? "border-meet-speaker text-meet-ink"
                    : "border-transparent text-meet-muted"
                }`}
                onClick={() => setTab("people")}
              >
                Participants (6)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "chat"}
                className={`flex-1 cursor-pointer border-b-2 text-sm font-medium ${
                  tab === "chat"
                    ? "border-meet-speaker text-meet-ink"
                    : "border-transparent text-meet-muted"
                }`}
                onClick={() => setTab("chat")}
              >
                Chat
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm text-meet-ink">
              {tab === "people" ? (
                <ul className="m-0 list-none space-y-2 p-0">
                  {["Alex Kim", "Sam Rivera", "Jordan Lee", "Casey Ng", "Riley Park", "Active Speaker"].map(
                    (name) => (
                      <li key={name}>{name}</li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-meet-muted">No messages yet.</p>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
