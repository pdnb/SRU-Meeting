"use client";

import type { AuditLog, Recording, Room, User } from "@sru/shared";
import { useState } from "react";
import { BackgroundPresetsPanel } from "@/components/admin/BackgroundPresetsPanel";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { E2eeSettingsPanel } from "@/components/admin/E2eeSettingsPanel";
import { ScimTokenPanel } from "@/components/admin/ScimTokenPanel";

export function AdminDashboard({
  users,
  rooms,
  recordings,
  audit,
  retentionDays,
  allowE2eeRooms,
  scimMeta,
  showBuiltinBackgrounds,
  orgBackgroundPresets,
}: {
  users: User[];
  rooms: Room[];
  recordings: Recording[];
  audit: AuditLog[];
  retentionDays: number;
  allowE2eeRooms: boolean;
  scimMeta: {
    configured: boolean;
    createdAt: string | null;
    lastRotatedAt: string | null;
  };
  showBuiltinBackgrounds: boolean;
  orgBackgroundPresets: { id: string; label: string; imageUrl: string }[];
}) {
  const [days, setDays] = useState(String(retentionDays));
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "analytics">("overview");

  return (
    <main id="app-main" className="mx-auto w-full max-w-5xl flex-1 px-page py-12">
      <h1 className="font-sans text-display font-semibold text-ink">
        Administration
      </h1>
      <p className="mt-3 max-w-[50ch] text-body text-muted">
        Organization users, rooms, recordings, analytics, and retention.
        Moderator actions are also in the audit log.
      </p>

      <div className="mt-8 flex gap-2" role="tablist" aria-label="Admin sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          className={tab === "overview" ? "sru-tab sru-tab-active" : "sru-tab"}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "analytics"}
          className={tab === "analytics" ? "sru-tab sru-tab-active" : "sru-tab"}
          onClick={() => setTab("analytics")}
        >
          Analytics
        </button>
      </div>

      {tab === "analytics" ? (
        <section className="mt-12">
          <AnalyticsDashboard />
        </section>
      ) : (
        <>
      <section className="mt-12">
        <h2 className="font-sans text-body font-semibold text-ink">Retention</h2>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const res = await fetch("/api/v1/admin/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recordingRetentionDays: Number.parseInt(days, 10),
              }),
            });
            setMessage(res.ok ? "Retention saved." : "Could not save settings.");
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="retention-days" className="sru-label">
              Recording retention (days)
            </label>
            <input
              id="retention-days"
              className="sru-input"
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          </div>
          <button type="submit" className="sru-cta">
            Save
          </button>
        </form>
        {message ? <p className="mt-3 text-body text-muted">{message}</p> : null}
      </section>

      <ScimTokenPanel initialMeta={scimMeta} />

      <E2eeSettingsPanel initialAllowE2ee={allowE2eeRooms} />

      <BackgroundPresetsPanel
        initialShowBuiltin={showBuiltinBackgrounds}
        initialPresets={orgBackgroundPresets}
      />

      <section className="mt-12">
        <h2 className="font-sans text-body font-semibold text-ink">Users</h2>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-ink">{user.email}</p>
                <p className="text-body text-muted">{user.orgRole ?? "host"}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-sans text-body font-semibold text-ink">Rooms</h2>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {rooms.map((room) => (
            <li key={room.id} className="py-3">
              <p className="font-semibold text-ink">{room.name}</p>
              <p className="text-body text-muted">
                {room.finishedAt ? "Closed" : "Open"}
                {room.e2eeEnabled ? " · E2EE" : ""} · {room.id}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-sans text-body font-semibold text-ink">Recordings</h2>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {recordings.map((recording) => (
            <li key={recording.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-ink">{recording.id}</p>
                <p className="text-body text-muted">
                  {recording.status} · {recording.mode}
                </p>
              </div>
              {recording.status === "finished" ? (
                <a href={`/app/recordings/${recording.id}`} className="sru-cta-secondary">
                  Open
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-sans text-body font-semibold text-ink">Audit</h2>
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {audit.map((row) => (
            <li key={row.id} className="py-3">
              <p className="font-semibold text-ink">{row.action}</p>
              <p className="text-body text-muted">
                {row.createdAt} · {row.targetType} {row.targetId ?? ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
        </>
      )}
    </main>
  );
}
