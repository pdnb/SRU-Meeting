"use client";

import { useState } from "react";
import { registerAction } from "@/lib/auth-actions";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main id="main" className="mx-auto w-full max-w-md flex-1 px-page py-12">
      <h1 className="font-sans text-display font-semibold text-ink">
        Create an account
      </h1>
      <p className="mt-4 text-body text-muted">
        Registration stays on this server. Passwords are hashed with Argon2id.
      </p>
      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setPending(true);
          const result = await registerAction(new FormData(event.currentTarget));
          if (result?.error) {
            setError(result.error);
            setPending(false);
          }
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="sru-label">
            Display name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="sru-input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="sru-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="sru-input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="sru-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="sru-input"
          />
        </div>
        {error ? (
          <p role="alert" className="sru-error">
            {error}
          </p>
        ) : null}
        <button type="submit" className="sru-cta" disabled={pending}>
          {pending ? "Creating account…" : "Register"}
        </button>
      </form>
      <p className="mt-8 text-body text-muted">
        Already registered?{" "}
        <a href="/login" className="text-ink underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
