"use client";

import { useEffect, useState } from "react";
import {
  ldapLoginAction,
  loginAction,
  samlTicketSignInAction,
  ssoSignInAction,
} from "@/lib/auth-actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [providers, setProviders] = useState<
    { id: string; label: string }[]
  >([]);
  const [saml, setSaml] = useState(false);
  const [ldap, setLdap] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/providers-public")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { oidc?: { id: string; label: string }[]; saml?: boolean; ldap?: boolean } | null) => {
        if (!json) return;
        setProviders(json.oidc ?? []);
        setSaml(Boolean(json.saml));
        setLdap(Boolean(json.ldap));
      });
  }, []);

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get("samlTicket");
    if (!ticket) {
      return;
    }
    void samlTicketSignInAction(ticket).then((result) => {
      if (result?.error) {
        setError(result.error);
      }
    });
  }, []);

  return (
    <main id="main">
      <h1 className="font-sans text-title font-semibold text-ink">Sign in</h1>
      <p className="mt-3 text-body text-muted">
        Use a campus account, or an identity provider your administrator enabled.
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
        <button type="submit" className="sru-cta w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {providers.length > 0 || saml || ldap ? (
        <div className="mt-10 border-t border-line pt-8">
          <p className="text-body font-semibold text-ink">Organization sign-in</p>
          <div className="mt-4 flex flex-col gap-3">
            {providers.map((provider) => (
              <form
                key={provider.id}
                action={async () => {
                  await ssoSignInAction(provider.id);
                }}
              >
                <button type="submit" className="sru-cta-secondary w-full">
                  Continue with {provider.label}
                </button>
              </form>
            ))}
            {saml ? (
              <button
                type="button"
                className="sru-cta-secondary w-full"
                onClick={() => {
                  window.location.href = "/api/auth/saml";
                }}
              >
                Continue with SAML
              </button>
            ) : null}
          </div>
          {ldap ? (
            <form
              className="mt-6 flex flex-col gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setPending(true);
                const result = await ldapLoginAction(
                  new FormData(event.currentTarget),
                );
                if (result?.error) {
                  setError(result.error);
                  setPending(false);
                }
              }}
            >
              <label htmlFor="ldapUsername" className="sru-label">
                LDAP username
              </label>
              <input
                id="ldapUsername"
                name="ldapUsername"
                className="sru-input"
                autoComplete="username"
                required
              />
              <label htmlFor="ldapPassword" className="sru-label">
                LDAP password
              </label>
              <input
                id="ldapPassword"
                name="password"
                type="password"
                className="sru-input"
                autoComplete="current-password"
                required
              />
              <button type="submit" className="sru-cta-secondary w-full">
                Sign in with LDAP
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 text-body text-muted">
        No account?{" "}
        <a href="/register" className="sru-text-link">
          Register
        </a>
      </p>
    </main>
  );
}
