"use client";

import { buildE2eePolicyMatrix } from "@sru/shared";
import { useState } from "react";

export function E2eeSettingsPanel({
  initialAllowE2ee,
}: {
  initialAllowE2ee: boolean;
}) {
  const [allowE2ee, setAllowE2ee] = useState(initialAllowE2ee);
  const [message, setMessage] = useState<string | null>(null);
  const matrix = buildE2eePolicyMatrix(true);

  return (
    <section className="mt-12">
      <h2 className="font-sans text-body font-semibold text-ink">
        End-to-end encryption
      </h2>
      <p className="mt-2 max-w-[60ch] text-body text-muted">
        Allow hosts to enable E2EE per room. Requires human security review
        before any pilot — see <code>docs/e2ee.md</code>.
      </p>
      <form
        className="mt-4 flex flex-wrap items-center gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const res = await fetch("/api/v1/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allowE2eeRooms: allowE2ee }),
          });
          setMessage(
            res.ok
              ? "E2EE org setting saved."
              : "Could not save E2EE setting.",
          );
        }}
      >
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={allowE2ee}
            onChange={(event) => setAllowE2ee(event.target.checked)}
          />
          Allow E2EE rooms
        </label>
        <button type="submit" className="sru-cta">
          Save
        </button>
      </form>
      {message ? <p className="mt-3 text-body text-muted">{message}</p> : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-4 font-medium">Feature</th>
              <th className="py-2 pr-4 font-medium">In E2EE rooms</th>
              <th className="py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {matrix.features.map((row) => (
              <tr key={row.feature} className="border-b border-line/60">
                <td className="py-2 pr-4 text-ink">{row.feature}</td>
                <td className="py-2 pr-4">
                  {row.available ? "Available (degraded)" : "Blocked"}
                </td>
                <td className="py-2 text-muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
