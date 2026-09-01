"use client";

export type MeetingLayout = "grid" | "speaker" | "sidebar";

export function LayoutSwitcher({
  layout,
  onChange,
}: {
  layout: MeetingLayout;
  onChange: (layout: MeetingLayout) => void;
}) {
  return (
    <div role="group" aria-label="Layout" className="flex flex-wrap gap-1">
      {(["grid", "speaker", "sidebar"] as const).map((value) => (
        <button
          key={value}
          type="button"
          className="sru-meet-btn"
          aria-pressed={layout === value}
          onClick={() => onChange(value)}
        >
          {value === "grid" ? "Grid" : value === "speaker" ? "Speaker" : "Sidebar"}
        </button>
      ))}
    </div>
  );
}
