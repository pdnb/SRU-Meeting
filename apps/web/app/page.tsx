/*
  Design read: institutional campus conference landing for university staff,
  calm and trust-first — variance 5, motion 3, density 5.
*/

import Link from "next/link";
import { LandingFeature } from "@/components/landing/LandingFeature";
import { MeetingPreviewMock } from "@/components/landing/MeetingPreviewMock";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import {
  IconLock,
  IconServer,
  IconShield,
  IconUsers,
  IconVideo,
} from "@/components/ui/icons";
import "./landing.css";

const FLOW_STEPS = [
  {
    title: "Sign in with campus credentials",
    description:
      "Use your organization account, SSO, or LDAP — the same identity your IT team already manages.",
  },
  {
    title: "Open or schedule a room",
    description:
      "Named rooms for classes and committees, with lobby, passwords, and moderator controls when needed.",
  },
  {
    title: "Meet on your infrastructure",
    description:
      "Audio, video, and screen share route through your LiveKit server. Recordings stay in your storage.",
  },
] as const;

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
        <section className="landing-hero landing-grain">
          <div className="landing-hero-inner mx-auto grid max-w-6xl items-center gap-12 px-page py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="landing-reveal">
              <p className="landing-eyebrow">
                <span className="landing-eyebrow-dot" aria-hidden />
                Campus video conference
              </p>
              <h1 className="landing-headline font-sans">
                Hold class and committee meetings on servers you run.
              </h1>
              <p className="landing-lede">
                SRU-Meeting is a self-hosted video conference for campus rooms.
                Media stays on your network — not on a third-party cloud.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
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
              <ul aria-label="Trust indicators" className="landing-trust-row">
                <li className="landing-trust-pill">
                  <IconServer className="h-3.5 w-3.5 text-accent" aria-hidden />
                  Self-hosted infrastructure
                </li>
                <li className="landing-trust-pill">
                  <IconLock className="h-3.5 w-3.5 text-accent" aria-hidden />
                  On-campus media routing
                </li>
                <li className="landing-trust-pill">
                  <IconShield className="h-3.5 w-3.5 text-accent" aria-hidden />
                  Optional E2EE
                </li>
              </ul>
            </div>
            <div className="landing-reveal landing-reveal-delay-2">
              <MeetingPreviewMock />
            </div>
          </div>
        </section>

        <section className="landing-strip" aria-label="Platform highlights">
          <div className="landing-strip-inner mx-auto max-w-6xl px-page py-10">
            <div className="landing-stat">
              <p className="landing-stat-value">Your Postgres, your rules</p>
              <p className="landing-stat-label">
                Rooms, users, and org settings live in a database you operate.
              </p>
            </div>
            <div className="landing-stat">
              <p className="landing-stat-value">LiveKit on your network</p>
              <p className="landing-stat-label">
                SFU media path stays inside campus or data-center boundaries.
              </p>
            </div>
            <div className="landing-stat">
              <p className="landing-stat-value">Full meeting toolkit</p>
              <p className="landing-stat-label">
                Lobby, chat, polls, whiteboard, breakouts, and recordings when
                you need them.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-page py-16 md:py-20">
          <div className="landing-section-head landing-reveal">
            <h2 className="landing-section-title font-sans">
              Built for institutional use
            </h2>
            <p className="mt-3 text-body text-muted">
              Everything runs on infrastructure your organization controls —
              from room scheduling to media transport.
            </p>
          </div>
          <div className="landing-bento mt-10">
            <LandingFeature
              className="landing-feature-span-4 landing-reveal landing-reveal-delay-1"
              title="Your servers"
              description="Rooms, users, and recordings live in your Postgres database on hardware you operate. No vendor lock-in for meeting history or org configuration."
              icon={<IconServer className="h-5 w-5" aria-hidden />}
            />
            <LandingFeature
              className="landing-feature-span-2 landing-reveal landing-reveal-delay-2"
              title="LiveKit SFU"
              description="Camera, microphone, and screen share route through your own LiveKit media server."
              icon={<IconVideo className="h-5 w-5" aria-hidden />}
            />
            <LandingFeature
              className="landing-feature-span-2 landing-reveal"
              title="Campus rooms"
              description="Named meetings for classes, committees, and office hours — with lobby and moderator controls."
              icon={<IconUsers className="h-5 w-5" aria-hidden />}
            />
            <LandingFeature
              className="landing-feature-span-2 landing-reveal landing-reveal-delay-1"
              title="Access control"
              description="Password-protected rooms, waiting lobby, SSO, LDAP, and role-based organization admin."
              icon={<IconLock className="h-5 w-5" aria-hidden />}
            />
            <LandingFeature
              className="landing-feature-span-2 landing-reveal landing-reveal-delay-2"
              title="Privacy options"
              description="Optional E2EE for sensitive discussions. Recordings and streams stay on your storage."
              icon={<IconShield className="h-5 w-5" aria-hidden />}
            />
          </div>
        </section>

        <section className="landing-flow" aria-labelledby="how-it-works">
          <div className="mx-auto max-w-6xl px-page py-14 md:py-16">
            <h2
              id="how-it-works"
              className="landing-section-title font-sans landing-reveal"
            >
              How staff get into a room
            </h2>
            <ol className="landing-flow-list mt-8">
              {FLOW_STEPS.map((step) => (
                <li key={step.title} className="landing-flow-step landing-reveal">
                  <p className="landing-flow-step-title">{step.title}</p>
                  <p className="landing-flow-step-desc">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-cta-band">
          <div className="mx-auto max-w-6xl px-page py-14 md:py-16">
            <div className="landing-cta-panel landing-reveal">
              <div>
                <p className="landing-cta-panel-title">
                  Ready to join a campus room?
                </p>
                <p className="landing-cta-panel-desc">
                  Sign in with your organization account, or register if your
                  admin has opened self-service enrollment.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link href="/login" className="sru-cta">
                  Sign in
                </Link>
                <Link href="/docs" className="sru-cta-secondary">
                  Integration docs
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
