"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

export default function DocsPage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    let cancelled = false;
    void import("swagger-ui-dist/swagger-ui-es-bundle.js").then((mod) => {
      if (cancelled || !node) {
        return;
      }
      const SwaggerUIBundle = (mod as { default?: (opts: unknown) => void }).default ??
        (mod as { SwaggerUIBundle?: (opts: unknown) => void }).SwaggerUIBundle;
      if (typeof SwaggerUIBundle === "function") {
        SwaggerUIBundle({
          url: "/api/v1/openapi.json",
          domNode: node,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="flex h-nav items-center border-b border-line px-page">
        <Link href="/" className="font-semibold text-ink">
          SRU-Conf
        </Link>
      </header>
      <main id="main" className="px-page py-6">
        <h1 className="font-sans text-display font-semibold">API documentation</h1>
        <p className="mt-3 text-body text-muted">
          OpenAPI 3 for rooms, tokens, recording, keys, and webhooks. HMAC
          headers: <code>X-Api-Key</code>, <code>X-Api-Timestamp</code>,{" "}
          <code>X-Api-Signature</code>.
        </p>
        <section className="mt-8 max-w-3xl text-body text-muted">
          <h2 className="font-sans text-body font-semibold text-ink">
            Embed handshake
          </h2>
          <p className="mt-2">
            Parent sites use <code>@sru/embed</code> to iframe{" "}
            <code>/embed/rooms/[id]</code>. After the iframe posts{" "}
            <code>sru-embed.ready</code>, the parent sends{" "}
            <code>sru-embed.connect</code> with a minted LiveKit JWT and URL
            (minted by the customer backend via the token API — never{" "}
            <code>LIVEKIT_API_SECRET</code> on the customer page). Only origins
            listed in <code>EMBED_ALLOWED_ORIGINS</code> are accepted.
          </p>
        </section>
        <div ref={ref} className="mt-8" />
      </main>
    </div>
  );
}
