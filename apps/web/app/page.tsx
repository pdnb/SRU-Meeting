/*
  Design read: logged-out institutional service page for a Thai-university
  self-hosted conference, calm and trust-first, not a SaaS marketing splash.
  Dials: variance 4, motion 2, density 5.
*/

import Link from "next/link";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import {
  IconLock,
  IconServer,
  IconShield,
  IconUsers,
  IconVideo,
} from "@/components/ui/icons";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <a href="#main" className="sru-skip">
        Skip to content
      </a>
      <SiteHeader
        trailing={
          <>
            <Link href="/login" className="sru-nav-link">
              Sign in
            </Link>
            <Link href="/register" className="sru-cta">
              Register
            </Link>
          </>
        }
      />
      <main id="main" className="flex-1">
        <section className="sru-hero-glow border-b border-line">
          <div className="mx-auto max-w-6xl px-page py-16 md:py-24">
            <p className="text-caption font-semibold uppercase tracking-wider text-accent">
              Campus video conference
            </p>
            <h1 className="mt-4 max-w-[18ch] font-sans text-display font-semibold text-ink">
              Hold class and committee meetings on servers you run.
            </h1>
            <p className="mt-6 max-w-[46ch] text-body text-muted">
              SRU-Conf is a self-hosted video conference for campus rooms. Media
              stays on your network — not on a third-party cloud.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/login" className="sru-cta">
                Sign in to rooms
              </Link>
              <Link href="/register" className="sru-cta-secondary">
                Create account
              </Link>
              <Link href="/docs" className="sru-cta-secondary">
                API docs
              </Link>
            </div>
            <ul
              aria-label="Trust indicators"
              className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-caption text-muted"
            >
              <li className="flex items-center gap-2">
                <IconServer className="h-4 w-4 text-accent" aria-hidden />
                Self-hosted infrastructure
              </li>
              <li className="flex items-center gap-2">
                <IconLock className="h-4 w-4 text-accent" aria-hidden />
                On-campus media routing
              </li>
              <li className="flex items-center gap-2">
                <IconShield className="h-4 w-4 text-accent" aria-hidden />
                Optional end-to-end encryption
              </li>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-page py-16 md:py-20">
          <h2 className="text-title font-semibold text-ink">
            Built for institutional use
          </h2>
          <p className="mt-3 max-w-[50ch] text-body text-muted">
            Everything runs on infrastructure your organization controls — from
            room scheduling to media transport.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Your servers"
              description="Rooms, users, and recordings live in your Postgres database on hardware you operate."
            >
              <IconServer />
            </FeatureCard>
            <FeatureCard
              title="LiveKit SFU"
              description="Camera, microphone, and screen share route through your own LiveKit media server."
            >
              <IconVideo />
            </FeatureCard>
            <FeatureCard
              title="Campus rooms"
              description="Named meetings for classes, committees, and office hours — with lobby and moderator controls."
            >
              <IconUsers />
            </FeatureCard>
            <FeatureCard
              title="Access control"
              description="Password-protected rooms, waiting lobby, SSO, LDAP, and role-based organization admin."
            >
              <IconLock />
            </FeatureCard>
            <FeatureCard
              title="Privacy options"
              description="Optional E2EE for sensitive discussions. Recordings and streams stay on your storage."
            >
              <IconShield />
            </FeatureCard>
            <FeatureCard
              title="Full meeting toolkit"
              description="Chat, polls, Q&A, whiteboard, breakouts, reactions, and live streaming when you need them."
            >
              <IconVideo />
            </FeatureCard>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
