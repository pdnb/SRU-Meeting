"use client";

import { useParticipants } from "@livekit/components-react";
import { type KeyboardEvent, useState } from "react";
import { ChatPanel } from "@/components/meeting/ChatPanel";
import { ParticipantList } from "@/components/meeting/ParticipantList";

type SidebarTab = "people" | "chat";

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "people", label: "Participants" },
  { id: "chat", label: "Chat" },
];

export function MeetingSidebar({
  roomId,
  userId,
  host,
  allowChat,
}: {
  roomId: string;
  userId: string;
  host: boolean;
  allowChat: boolean;
}) {
  const [tab, setTab] = useState<SidebarTab>("people");
  const participants = useParticipants();

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    event.preventDefault();
    setTab((current) => (current === "people" ? "chat" : "people"));
  }

  return (
    <aside
      id="meeting-sidebar"
      className="flex h-full w-full flex-col border-l border-meet-line bg-meet-panel"
      aria-label="Participants and chat"
    >
      <div
        role="tablist"
        aria-label="Sidebar panels"
        className="flex h-11 shrink-0 border-b border-meet-line"
      >
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`meeting-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`meeting-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              className={`flex-1 cursor-pointer border-b-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-meet-speaker text-meet-ink"
                  : "border-transparent text-meet-muted hover:text-meet-ink"
              }`}
              onClick={() => setTab(item.id)}
              onKeyDown={onTabKeyDown}
            >
              {item.id === "people"
                ? `Participants (${participants.length})`
                : item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`meeting-panel-${tab}`}
        aria-labelledby={`meeting-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        {tab === "people" ? (
          <ParticipantList roomId={roomId} host={host} embedded />
        ) : (
          <ChatPanel roomId={roomId} userId={userId} allowChat={allowChat} embedded />
        )}
      </div>
    </aside>
  );
}
