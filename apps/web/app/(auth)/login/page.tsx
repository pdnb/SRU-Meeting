"use client";

import { useState } from "react";
import { loginAction } from "@/lib/auth-actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main id="main" className="mx-auto w-full max-w-md flex-1 px-page py-12">
      <h1 className="font-sans text-display font-semibold text-ink">Sign in</h1>
      <p className="mt-4 text-body text-muted">
        Use the campus account you registered on this server.
      </p>
      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setPending(true);
          const result = await loginAction(new FormData(event.currentTarget));
          if (result?.error) {
            setError(result.error);
            setPending(false);
          }
        }}
      >
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
            autoComplete="current-password"
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-8 text-body text-muted">
        No account?{" "}
        <a href="/register" className="text-ink underline">
          Register
        </a>
      </p>
    </main>
  );
}
