"use client";

import { MAX_ORG_BACKGROUND_PRESETS } from "@/lib/backgrounds/constants";
import { useState } from "react";

type OrgBackgroundPreset = {
  id: string;
  label: string;
  imageUrl: string;
};

export function BackgroundPresetsPanel({
  initialShowBuiltin,
  initialPresets,
}: {
  initialShowBuiltin: boolean;
  initialPresets: OrgBackgroundPreset[];
}) {
  const [showBuiltin, setShowBuiltin] = useState(initialShowBuiltin);
  const [presets, setPresets] = useState(initialPresets);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [pending, setPending] = useState(false);

  const saveBuiltinToggle = async () => {
    const res = await fetch("/api/v1/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showBuiltinBackgrounds: showBuiltin }),
    });
    setMessage(
      res.ok
        ? "Built-in background setting saved."
        : "Could not save background setting.",
    );
  };

  const refreshPresets = async () => {
    const res = await fetch("/api/v1/admin/backgrounds");
    if (!res.ok) {
      return;
    }
    const json = (await res.json()) as {
      data: { org: OrgBackgroundPreset[]; showBuiltinBackgrounds: boolean };
    };
    setPresets(json.data.org);
    setShowBuiltin(json.data.showBuiltinBackgrounds);
  };

  const uploadPreset = async (file: File) => {
    if (presets.length >= MAX_ORG_BACKGROUND_PRESETS) {
      setMessage(
        `Organization backgrounds are limited to ${MAX_ORG_BACKGROUND_PRESETS}.`,
      );
      return;
    }
    setPending(true);
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    if (uploadLabel.trim()) {
      form.set("label", uploadLabel.trim());
    }
    const res = await fetch("/api/v1/admin/backgrounds", {
      method: "POST",
      body: form,
    });
    setPending(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setMessage(json?.error?.message ?? "Could not upload background.");
      return;
    }
    setUploadLabel("");
    setMessage("Background uploaded.");
    await refreshPresets();
  };

  const deletePreset = async (id: string) => {
    setPending(true);
    const res = await fetch(`/api/v1/admin/backgrounds/${id}`, {
      method: "DELETE",
    });
    setPending(false);
    setMessage(res.ok ? "Background removed." : "Could not remove background.");
    if (res.ok) {
      await refreshPresets();
    }
  };

  return (
    <section className="mt-12">
      <h2 className="font-sans text-body font-semibold text-ink">
        Meeting backgrounds
      </h2>
      <p className="mt-2 max-w-[60ch] text-body text-muted">
        Upload organization background presets for participants. Users can also
        upload a temporary image during a meeting (session only, not stored).
      </p>

      <form
        className="mt-4 flex flex-wrap items-center gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          await saveBuiltinToggle();
        }}
      >
        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={showBuiltin}
            onChange={(event) => setShowBuiltin(event.target.checked)}
          />
          Show built-in backgrounds (Office, Nature, Abstract)
        </label>
        <button type="submit" className="sru-cta">
          Save
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="org-bg-label" className="sru-label">
            Label (optional)
          </label>
          <input
            id="org-bg-label"
            className="sru-input"
            value={uploadLabel}
            onChange={(event) => setUploadLabel(event.target.value)}
            placeholder="e.g. Campus hall"
            maxLength={80}
          />
        </div>
        <label className="sru-cta cursor-pointer">
          {pending ? "Uploading…" : "Upload background"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={pending || presets.length >= MAX_ORG_BACKGROUND_PRESETS}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadPreset(file);
              }
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <p className="mt-2 text-caption text-muted">
        {presets.length}/{MAX_ORG_BACKGROUND_PRESETS} organization presets ·
        max 5 MB · JPEG, PNG, or WebP
      </p>

      {presets.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="flex items-center gap-3 rounded-lg border border-line p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preset.imageUrl}
                alt=""
                className="h-14 w-20 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{preset.label}</p>
              </div>
              <button
                type="button"
                className="sru-cta-secondary shrink-0"
                disabled={pending}
                onClick={() => void deletePreset(preset.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-body text-muted">
          No organization backgrounds yet.
        </p>
      )}

      {message ? <p className="mt-3 text-body text-muted">{message}</p> : null}
    </section>
  );
}
