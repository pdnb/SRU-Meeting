"use client";

import {
  Columns2,
  LayoutGrid,
  PanelRight,
  Shield,
  User,
  Users,
} from "lucide-react";
import type { MeetingLayout } from "@/components/meeting/LayoutSwitcher";
import { ControlIconButton } from "@/components/meeting/chrome/ControlIconButton";

export function MeetingTopBar({
  title,
  participantCount,
  e2eeEnabled,
  recordingActive,
  locked,
  layout,
  onLayoutChange,
  sidebarOpen,
  onToggleSidebar,
}: {
  title: string;
  participantCount: number;
  e2eeEnabled: boolean;
  recordingActive: boolean;
  locked?: boolean;
  layout: MeetingLayout;
  onLayoutChange: (layout: MeetingLayout) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="flex h-[44px] shrink-0 items-center gap-3 border-b border-meet-line bg-meet-panel px-3 text-sm text-meet-ink">
      <p className="min-w-0 flex-1 truncate font-medium">{title}</p>
      <div className="flex shrink-0 items-center gap-3 text-meet-muted">
        {recordingActive ? (
          <span className="inline-flex items-center gap-1 text-red-400" role="status">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
            Rec
          </span>
        ) : null}
        {e2eeEnabled ? (
          <span className="inline-flex items-center gap-1" title="End-to-end encryption is active">
            <Shield className="h-3.5 w-3.5 text-meet-speaker" aria-hidden />
            <span className="sr-only">End-to-end encryption is on</span>
          </span>
        ) : null}
        {locked ? (
          <span className="text-xs uppercase tracking-wide">Locked</span>
        ) : null}
        <span className="inline-flex items-center gap-1" title="Participants">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {participantCount}
        </span>
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Layout">
        <ControlIconButton
          label="Grid layout"
          pressed={layout === "grid"}
          className="h-8 w-8"
          onClick={() => onLayoutChange("grid")}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
        </ControlIconButton>
        <ControlIconButton
          label="Speaker layout"
          pressed={layout === "speaker"}
          className="h-8 w-8"
          onClick={() => onLayoutChange("speaker")}
        >
          <User className="h-4 w-4" aria-hidden />
        </ControlIconButton>
        <ControlIconButton
          label="Sidebar layout"
          pressed={layout === "sidebar"}
          className="h-8 w-8"
          onClick={() => onLayoutChange("sidebar")}
        >
          <Columns2 className="h-4 w-4" aria-hidden />
        </ControlIconButton>
      </div>
      <ControlIconButton
        label={sidebarOpen ? "Hide participants and chat" : "Show participants and chat"}
        pressed={sidebarOpen}
        className="h-8 w-8"
        aria-controls="meeting-sidebar"
        aria-expanded={sidebarOpen}
        onClick={onToggleSidebar}
      >
        <PanelRight className="h-4 w-4" aria-hidden />
      </ControlIconButton>
    </header>
  );
}
