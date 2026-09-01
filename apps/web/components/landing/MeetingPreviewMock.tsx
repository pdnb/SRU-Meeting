import type { CSSProperties } from "react";

export function MeetingPreviewMock() {
  const participants = [
    { name: "Dr. Somchai", speaking: true, hue: "215" },
    { name: "Assoc. Prof. Mali", speaking: false, hue: "168" },
    { name: "Student rep.", speaking: false, hue: "32" },
    { name: "Committee sec.", speaking: false, hue: "280" },
  ];

  return (
    <div
      className="landing-mock"
      aria-hidden
    >
      <div className="landing-mock-chrome">
        <span className="landing-mock-dot" />
        <span className="landing-mock-dot" />
        <span className="landing-mock-dot" />
        <span className="landing-mock-title">CS-401 · Committee review</span>
        <span className="landing-mock-live">Live</span>
      </div>
      <div className="landing-mock-grid">
        {participants.map((p) => (
          <div
            key={p.name}
            className={
              p.speaking
                ? "landing-mock-tile landing-mock-tile-speaking"
                : "landing-mock-tile"
            }
            style={
              {
                "--tile-hue": p.hue,
              } as CSSProperties
            }
          >
            <div className="landing-mock-avatar" />
            <span className="landing-mock-name">{p.name}</span>
            {p.speaking ? (
              <span className="landing-mock-wave">
                <span />
                <span />
                <span />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="landing-mock-bar">
        <span className="landing-mock-control landing-mock-control-muted" />
        <span className="landing-mock-control landing-mock-control-muted" />
        <span className="landing-mock-control landing-mock-control-danger" />
        <span className="landing-mock-control landing-mock-control-accent" />
      </div>
    </div>
  );
}
