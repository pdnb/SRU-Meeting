/*
  Design read: logged-out institutional service page for a Thai-university
  self-hosted conference, calm and trust-first, not a SaaS marketing splash.
  Dials: variance 4, motion 2, density 5.
*/

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a href="#main" className="sru-skip">
        Skip to content
      </a>
      <header className="flex h-nav items-center border-b border-line px-page">
        <p className="font-sans text-body font-semibold">SRU-Conf</p>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-page py-12 md:py-16"
      >
        <h1 className="max-w-[20ch] font-sans text-display font-semibold text-ink">
          Hold class and committee meetings on servers you run.
        </h1>
        <p className="mt-6 max-w-[42ch] text-body text-muted">
          SRU-Conf is a self-hosted video conference for campus rooms. Media
          stays on your network.
        </p>
        <p className="mt-8 flex flex-wrap gap-3">
          <a href="/login" className="sru-cta">
            Sign in
          </a>
          <a href="/register" className="sru-cta-secondary">
            Register
          </a>
          <a href="/docs" className="sru-cta-secondary">
            API docs
          </a>
        </p>
        <dl className="mt-16 grid max-w-2xl grid-cols-1 gap-8 border-t border-line pt-8 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-ink">Rooms</dt>
            <dd className="mt-2 text-body text-muted">
              Named meetings stored in your Postgres.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Media</dt>
            <dd className="mt-2 text-body text-muted">
              Camera, mic, and share go through your LiveKit SFU.
            </dd>
          </div>
        </dl>
      </main>
      <footer className="border-t border-line px-page py-6 text-body text-muted">
        <p>Self-hosted campus conference.</p>
        <p className="mt-2">
          <a href="/dev/poc" className="text-ink underline">
            Media PoC
          </a>
        </p>
      </footer>
    </div>
  );
}
