"use client";

import { useState } from "react";

type ScimTokenMeta = {
  configured: boolean;
  createdAt: string | null;
  lastRotatedAt: string | null;
};

export function ScimTokenPanel({ initialMeta }: { initialMeta: ScimTokenMeta }) {
  const [meta, setMeta] = useState<ScimTokenMeta>(initialMeta);
  const [tokenOnce, setTokenOnce] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/v1/admin/scim-token");
    if (res.ok) {
      const body = (await res.json()) as { data: ScimTokenMeta };
      setMeta(body.data);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="font-sans text-body font-semibold text-ink">SCIM provisioning</h2>
      <p className="mt-2 max-w-[60ch] text-body text-muted">
        IdPs call <code className="text-ink">/scim/v2/*</code> with a bearer token.
        Groups are a flat list from <code className="text-ink">SCIM_GROUP_ROLE_MAP</code> (single-org v1).
      </p>
      <div className="mt-4 space-y-3">
        <p className="text-body text-muted">
          Status: {meta.configured ? "configured" : "not configured"}
          {meta.createdAt ? ` · created ${meta.createdAt}` : ""}
          {meta.lastRotatedAt ? ` · rotated ${meta.lastRotatedAt}` : ""}
        </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="sru-cta"
              onClick={async () => {
                setMessage(null);
                setTokenOnce(null);
                const res = await fetch("/api/v1/admin/scim-token", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rotate: meta.configured }),
                });
                if (!res.ok) {
                  setMessage("Could not generate SCIM token.");
                  return;
                }
                const body = (await res.json()) as { data: { token: string } };
                setTokenOnce(body.data.token);
                setMessage("Copy the token now — it will not be shown again.");
                await refresh();
              }}
            >
              {meta.configured ? "Rotate token" : "Generate token"}
            </button>
            {meta.configured ? (
              <button
                type="button"
                className="sru-cta-secondary"
                onClick={async () => {
                  setMessage(null);
                  setTokenOnce(null);
                  const res = await fetch("/api/v1/admin/scim-token", {
                    method: "DELETE",
                  });
                  setMessage(res.ok ? "SCIM token revoked." : "Could not revoke token.");
                  await refresh();
                }}
              >
                Revoke
              </button>
            ) : null}
          </div>
          {tokenOnce ? (
            <pre className="overflow-x-auto rounded border border-line bg-surface px-4 py-3 text-body text-ink">
              {tokenOnce}
            </pre>
          ) : null}
          {message ? <p className="text-body text-muted">{message}</p> : null}
        </div>
    </section>
  );
}
