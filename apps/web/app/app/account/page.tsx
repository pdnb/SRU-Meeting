"use client";

import { useState } from "react";

export default function AccountPage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <main id="app-main" className="mx-auto w-full max-w-3xl flex-1 px-page py-12">
      <h1 className="font-sans text-display font-semibold text-ink">Account</h1>
      <p className="mt-3 max-w-[50ch] text-body text-muted">
        Create an API key for HMAC-signed integrations. The secret is shown once.
      </p>
      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const res = await fetch("/api/v1/keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: String(form.get("name") ?? "Integration") }),
          });
          const json = (await res.json()) as { secret?: string; error?: { message: string } };
          if (!res.ok) {
            setError(json.error?.message ?? "Could not create a key.");
            return;
          }
          setSecret(json.secret ?? null);
          setError(null);
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="key-name" className="sru-label">
            Key name
          </label>
          <input id="key-name" name="name" required className="sru-input" />
        </div>
        <button type="submit" className="sru-cta">
          Create key
        </button>
      </form>
      {secret ? (
        <p className="mt-6 break-all text-body">
          Secret (copy now): <code>{secret}</code>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="sru-error mt-4">
          {error}
        </p>
      ) : null}

      <h2 className="mt-16 font-sans text-body font-semibold text-ink">
        Delete my data
      </h2>
      <p className="mt-3 max-w-[50ch] text-body text-muted">
        PDPA deletion anonymizes your account, revokes API keys, and redacts your
        public chat. Direct messages to other people are not rewritten.
      </p>
      <button
        type="button"
        className="sru-cta-danger mt-4"
        onClick={async () => {
          const res = await fetch("/api/v1/me", { method: "DELETE" });
          if (res.ok) {
            window.location.href = "/";
          }
        }}
      >
        Delete my account
      </button>
    </main>
  );
}
