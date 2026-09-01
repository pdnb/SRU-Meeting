import "@/app/meeting.css";
import { meetingInter } from "@/lib/meeting-font";

export function MeetingLobbyShell({
  roomName,
  centered,
  children,
}: {
  roomName?: string;
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`sru-meet ${meetingInter.className}`}>
      <header className="flex h-[44px] shrink-0 items-center gap-3 border-b border-meet-line bg-meet-panel px-3 text-sm text-meet-ink">
        <p className="shrink-0 font-semibold tracking-tight">SRU-Meeting</p>
        {roomName ? (
          <p className="min-w-0 flex-1 truncate text-meet-muted">{roomName}</p>
        ) : (
          <span className="flex-1" />
        )}
      </header>
      <div
        className={
          centered ? "sru-meet-lobby sru-meet-lobby-center" : "sru-meet-lobby"
        }
      >
        {children}
      </div>
    </div>
  );
}
