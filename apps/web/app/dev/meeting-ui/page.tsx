"use client";

import { useState } from "react";
import {
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

/**
 * Static Webex-style meeting chrome preview (no LiveKit).
 * Used to verify layout tokens and shell structure.
 */
export default function MeetingUiPreviewPage() {
  const [tab, setTab] = useState<"people" | "chat">("people");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`sru-meet ${meetingInter.className}`}>
      <header className="flex h-[44px] shrink-0 items-center gap-3 border-b border-meet-line bg-meet-panel px-3 text-sm text-meet-ink">
        <p className="min-w-0 flex-1 truncate font-medium">Design review room</p>
        <span className="inline-flex items-center gap-1 text-meet-muted">
          <Users className="h-3.5 w-3.5" aria-hidden />6
        </span>
        <div className="flex items-center gap-1">
          <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-meet-speaker text-black">
            <LayoutGrid className="h-4 w-4" aria-hidden />
          </span>
          <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-meet-raised text-meet-ink">
            <User className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <button
          type="button"
          className="inline-grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-meet-raised text-meet-ink"
          aria-label="Toggle sidebar"
          aria-pressed={sidebarOpen}
          onClick={() => setSidebarOpen((value) => !value)}
        >
          <PanelRight className="h-4 w-4" aria-hidden />
        </button>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1 pb-20">
          <div className="grid h-full min-h-0 grid-cols-1 gap-2 p-2 sm:grid-cols-2 lg:grid-cols-2 lg:grid-rows-3">
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
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-meet-line bg-meet-panel px-3 py-2">
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-meet-raised text-meet-ink">
                <Mic className="h-5 w-5" aria-hidden />
              </span>
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-meet-raised text-meet-ink">
                <Video className="h-5 w-5" aria-hidden />
              </span>
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-meet-raised text-meet-ink">
                <Hand className="h-5 w-5" aria-hidden />
              </span>
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-meet-raised text-meet-ink">
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </span>
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-[#c4314b] text-white">
                <PhoneOff className="h-5 w-5" aria-hidden />
              </span>
            </div>
          </div>
        </div>
        {sidebarOpen ? (
          <aside
            id="meeting-sidebar"
            className="flex h-full w-[265px] shrink-0 flex-col border-l border-meet-line bg-meet-panel"
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
