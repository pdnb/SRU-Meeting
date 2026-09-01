"use client";

import type { AnalyticsOverview, RoomQosSummary } from "@sru/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

type Preset = "7d" | "30d" | "custom";

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftUtcDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function presetRange(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const to = utcToday();
  return {
    from: shiftUtcDate(to, preset === "7d" ? -6 : -29),
    to,
  };
}

function MetricChart({
  title,
  daily,
  valueKey,
}: {
  title: string;
  daily: AnalyticsOverview["daily"];
  valueKey: "roomsCreated" | "participantMinutes" | "recordingsFinished" | "uniqueUsers";
}) {
  const max = Math.max(1, ...daily.map((row) => row[valueKey]));
  return (
    <div className="rounded-lg border border-line p-4">
      <h3 className="font-sans text-body font-semibold text-ink">{title}</h3>
      {daily.every((row) => row[valueKey] === 0) ? (
        <p className="mt-4 text-body text-muted">No data for this period.</p>
      ) : (
        <div
          className="mt-4 flex items-end gap-1"
          style={{ height: "8rem" }}
          role="img"
          aria-label={`${title} bar chart`}
        >
          {daily.map((row) => (
            <div
              key={row.date}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t bg-ink/80"
                style={{
                  height: `${(row[valueKey] / max) * 100}%`,
                  minHeight: row[valueKey] > 0 ? "2px" : 0,
                }}
                title={`${row.date}: ${row[valueKey]}`}
              />
              <span className="truncate text-[10px] text-muted">
                {row.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function exportCsv(overview: AnalyticsOverview): void {
  const header =
    "date,roomsCreated,participantMinutes,recordingsFinished,uniqueUsers";
  const lines = overview.daily.map(
    (row) =>
      `${row.date},${row.roomsCreated},${row.participantMinutes},${row.recordingsFinished},${row.uniqueUsers}`,
  );
  const blob = new Blob([[header, ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `analytics-${overview.from}-${overview.to}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsDashboard() {
  const [preset, setPreset] = useState<Preset>("7d");
  const initial = presetRange("7d");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [qos, setQos] = useState<RoomQosSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (rangeFrom: string, rangeTo: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from: rangeFrom, to: rangeTo });
    const [overviewRes, qosRes] = await Promise.all([
      fetch(`/api/v1/admin/analytics/overview?${params}`),
      fetch("/api/v1/admin/analytics/qos"),
    ]);
    if (!overviewRes.ok) {
      setLoading(false);
      setError("Could not load analytics overview.");
      return;
    }
    const overviewJson = (await overviewRes.json()) as AnalyticsOverview;
    setOverview(overviewJson);
    if (qosRes.ok) {
      const qosJson = (await qosRes.json()) as { data: RoomQosSummary[] };
      setQos(qosJson.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = new URLSearchParams({ from, to });
      const [overviewRes, qosRes] = await Promise.all([
        fetch(`/api/v1/admin/analytics/overview?${params}`),
        fetch("/api/v1/admin/analytics/qos"),
      ]);
      if (cancelled) {
        return;
      }
      if (!overviewRes.ok) {
        setError("Could not load analytics overview.");
        setLoading(false);
        return;
      }
      const overviewJson = (await overviewRes.json()) as AnalyticsOverview;
      setOverview(overviewJson);
      if (qosRes.ok) {
        const qosJson = (await qosRes.json()) as { data: RoomQosSummary[] };
        setQos(qosJson.data);
      }
      setError(null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const hasData = useMemo(
    () =>
      overview?.daily.some(
        (row) =>
          row.roomsCreated > 0 ||
          row.participantMinutes > 0 ||
          row.recordingsFinished > 0 ||
          row.uniqueUsers > 0,
      ) ?? false,
    [overview],
  );

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          {(["7d", "30d", "custom"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={
                preset === value ? "sru-cta" : "sru-cta-secondary"
              }
              onClick={() => {
                setPreset(value);
                if (value !== "custom") {
                  const range = presetRange(value);
                  setLoading(true);
                  setFrom(range.from);
                  setTo(range.to);
                }
              }}
            >
              {value === "7d" ? "7 days" : value === "30d" ? "30 days" : "Custom"}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="sru-label">From</span>
              <input
                className="sru-input"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="sru-label">To</span>
              <input
                className="sru-input"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="sru-cta-secondary"
              onClick={() => {
                setLoading(true);
                void load(from, to);
              }}
            >
              Apply
            </button>
          </>
        ) : null}
        {overview ? (
          <button
            type="button"
            className="sru-cta-secondary"
            onClick={() => exportCsv(overview)}
          >
            Export CSV
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-8 text-body text-muted">Loading analytics…</p>
      ) : error ? (
        <p className="mt-8 text-body text-muted">{error}</p>
      ) : overview && !hasData ? (
        <p className="mt-8 text-body text-muted">
          No metrics yet. Run the nightly rollup job or wait for the first
          aggregation pass.
        </p>
      ) : overview ? (
        <>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-line p-4">
              <dt className="text-body text-muted">Rooms created</dt>
              <dd className="mt-1 font-sans text-display font-semibold text-ink">
                {overview.totals.roomsCreated}
              </dd>
            </div>
            <div className="rounded-lg border border-line p-4">
              <dt className="text-body text-muted">Participant minutes</dt>
              <dd className="mt-1 font-sans text-display font-semibold text-ink">
                {overview.totals.participantMinutes}
              </dd>
            </div>
            <div className="rounded-lg border border-line p-4">
              <dt className="text-body text-muted">Recordings finished</dt>
              <dd className="mt-1 font-sans text-display font-semibold text-ink">
                {overview.totals.recordingsFinished}
              </dd>
            </div>
            <div className="rounded-lg border border-line p-4">
              <dt className="text-body text-muted">Unique users (sum of daily)</dt>
              <dd className="mt-1 font-sans text-display font-semibold text-ink">
                {overview.totals.uniqueUsers}
              </dd>
            </div>
          </dl>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <MetricChart
              title="Rooms created"
              daily={overview.daily}
              valueKey="roomsCreated"
            />
            <MetricChart
              title="Participant minutes"
              daily={overview.daily}
              valueKey="participantMinutes"
            />
            <MetricChart
              title="Recordings finished"
              daily={overview.daily}
              valueKey="recordingsFinished"
            />
          </div>
        </>
      ) : null}

      <section className="mt-12">
        <h2 className="font-sans text-body font-semibold text-ink">
          Latest QoS per room
        </h2>
        {qos.length === 0 ? (
          <p className="mt-4 text-body text-muted">
            No client QoS reports yet. Join a meeting to start collecting stats.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {qos.map((row) => (
              <li key={row.roomId} className="py-3">
                <p className="font-semibold text-ink">{row.roomName}</p>
                {row.latest ? (
                  <p className="text-body text-muted">
                    RTT {row.latest.rttMs ?? "—"} ms · loss{" "}
                    {row.latest.packetLoss != null
                      ? `${Math.round(row.latest.packetLoss * 1000) / 10}%`
                      : "—"}{" "}
                    · jitter {row.latest.jitterMs ?? "—"} ms · bitrate{" "}
                    {row.latest.bitrateKbps ?? "—"} kbps · {row.reportCount}{" "}
                    reports
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
