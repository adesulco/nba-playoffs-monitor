import React from 'react';
import { Link } from 'react-router-dom';
import { useUserBracketSummary } from '../hooks/useUserBracketSummary.js';
import { useApp } from '../lib/AppContext.jsx';

/**
 * Pick'em Home hero — v0.12.2 Theme B.
 *
 * Renders ABOVE the sport grid on HomeV1 with three distinct states
 * driven by useUserBracketSummary's status field:
 *
 *   • anon         — logged-out CTA (Option B copy per amendments §10.x)
 *   • no-bracket   — logged in, no bracket yet → "Create your bracket" CTA
 *   • no-league /
 *     ready /
 *     error        — logged-in hero with bracket standing + next step
 *
 * Layout breakpoints:
 *   ≥ 768 px       — 3-column desktop (standing · bracket · next pick)
 *   < 768 px       — single-line chip with arrow → tap opens /bracket
 */

const COLORS = {
  // Mirror of the page palette so this file doesn't need to import the
  // full `lib/constants.js` — keeps the bundle slim on Home where this
  // hero ships.
  panel: 'var(--panel)',
  panelSoft: 'var(--panel-soft)',
  ink: 'var(--ink)',
  ink2: 'var(--ink-2)',
  ink3: 'var(--ink-3)',
  muted: 'var(--ink-4)',
  amber: 'var(--amber)',
  green: 'var(--green)',
  line: 'var(--line)',
  lineSoft: 'var(--line-soft)',
};

export default function PickemHomeHero() {
  const { lang } = useApp();
  const summary = useUserBracketSummary();

  // Hide while loading — first paint of Home should be uncluttered.
  // Skeleton-loading hero would just be visual noise for an anon user
  // (the typical case), so we wait until the auth-state read resolves
  // (~5 ms from localStorage) before rendering anything.
  if (summary.status === 'loading') return null;

  if (summary.status === 'anon') {
    return <AnonCTA lang={lang} />;
  }

  if (summary.status === 'no-bracket') {
    return <NoBracketCTA lang={lang} />;
  }

  // ready | no-league | error — render the hero with whatever we have
  return <LoggedInHero summary={summary} lang={lang} />;
}

// ─── Logged-out CTA — Option B copy per amendments §10.x ───────────────
function AnonCTA({ lang }) {
  return (
    <section
      aria-labelledby="pickem-anon-cta"
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '20px 22px',
        margin: '0 14px 14px 14px',
        background: 'linear-gradient(135deg, rgba(255, 87, 34, 0.10) 0%, rgba(255, 87, 34, 0.02) 60%, transparent 100%)',
        border: '1px solid rgba(255, 87, 34, 0.25)',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.18em',
          fontWeight: 700,
          color: 'var(--amber)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
        }}
      >
        Pick'em · gibol.co
      </div>
      <h2
        id="pickem-anon-cta"
        className="pickem-anon-headline"
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.ink,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          textWrap: 'balance',
        }}
      >
        {lang === 'id'
          ? "Pick'em playoff sama temen lo. Bahasa Indonesia. Live score."
          : "Bracket pick'em with your friends. In Bahasa. Live scores."}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Link
          to="/login?next=/bracket/new"
          style={{
            padding: '9px 16px',
            background: 'var(--amber)',
            color: '#fff',
            borderRadius: 4,
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          {lang === 'id' ? 'Masuk dengan email' : 'Sign in with email'} →
        </Link>
        <Link
          to="/about#pickem"
          style={{
            fontSize: 11,
            color: COLORS.ink3,
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            letterSpacing: 0.2,
          }}
        >
          {lang === 'id' ? 'Cara kerjanya' : 'How it works'} →
        </Link>
      </div>
    </section>
  );
}

// ─── Logged-in but no bracket yet ─────────────────────────────────────
function NoBracketCTA({ lang }) {
  return (
    <section
      aria-labelledby="pickem-no-bracket"
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '18px 22px',
        margin: '0 14px 14px 14px',
        background: COLORS.panel,
        border: `1px solid ${COLORS.line}`,
        borderLeft: '3px solid var(--blue)',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.18em',
          fontWeight: 700,
          color: COLORS.ink3,
          fontFamily: 'var(--font-mono)',
        }}
      >
        Pick'em · {lang === 'id' ? 'PLAYOFF 2026' : 'PLAYOFFS 2026'}
      </div>
      <h2
        id="pickem-no-bracket"
        style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: 18,
          fontWeight: 700,
          color: COLORS.ink,
          letterSpacing: '-0.015em',
        }}
      >
        {lang === 'id'
          ? 'Bracket lo belum jadi. Yuk mulai sekarang.'
          : "You haven't built a bracket yet. Start one."}
      </h2>
      <Link
        to="/bracket/new"
        style={{
          alignSelf: 'flex-start',
          padding: '8px 14px',
          background: 'var(--blue)',
          color: '#fff',
          borderRadius: 4,
          textDecoration: 'none',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        {lang === 'id' ? 'Bikin bracket' : 'Create bracket'} →
      </Link>
    </section>
  );
}

// ─── Logged-in hero (ready / no-league / error) ──────────────────────
function LoggedInHero({ summary, lang }) {
  const { bracket, primaryLeague, rank, totalMembers } = summary;
  const score = bracket?.score ?? 0;
  const leagueName = primaryLeague?.name || (lang === 'id' ? 'Liga publik' : 'Public ladder');
  const rankLabel = rank && totalMembers
    ? `#${rank} / ${totalMembers}`
    : (lang === 'id' ? 'belum ada peringkat' : 'no rank yet');

  return (
    <section
      aria-labelledby="pickem-hero"
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '16px 22px',
        margin: '0 14px 14px 14px',
        background: COLORS.panel,
        border: `1px solid ${COLORS.line}`,
        borderLeft: '3px solid var(--green)',
        borderRadius: 6,
      }}
    >
      {/* Hero header — small label + bracket name */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: '0.18em',
            fontWeight: 700,
            color: 'var(--green)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {lang === 'id' ? 'BRACKET KAMU' : 'YOUR BRACKET'}
        </div>
        <Link
          to="/bracket"
          style={{
            fontSize: 10,
            color: COLORS.ink3,
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          {lang === 'id' ? 'KELOLA' : 'MANAGE'} →
        </Link>
      </div>

      {/* 3-column on desktop, 1-line on mobile via responsive class */}
      <div className="pickem-hero-row">
        <Stat
          label={lang === 'id' ? 'Skor' : 'Score'}
          value={String(score)}
          sub={bracket?.name || (lang === 'id' ? 'Bracket #1' : 'Bracket #1')}
          accent="var(--green)"
        />
        <Stat
          label={lang === 'id' ? 'Liga' : 'League'}
          value={leagueName}
          sub={rankLabel}
          accent="var(--blue)"
          link={primaryLeague ? `/leaderboard/league/${primaryLeague.invite_code || primaryLeague.id}` : '/leaderboard'}
        />
        <Stat
          label={lang === 'id' ? 'Aksi' : 'Action'}
          value={lang === 'id' ? 'Bracket kamu' : 'Open bracket'}
          sub={lang === 'id' ? 'edit pick · lihat skor' : 'edit picks · see score'}
          accent="var(--amber)"
          link="/bracket"
        />
      </div>

      {/* Inline CSS for the responsive stack — keeps the component
          self-contained and avoids touching index.css for one ship. */}
      <style>{`
        .pickem-hero-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 768px) {
          .pickem-hero-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .pickem-hero-stat-sub {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}

function Stat({ label, value, sub, accent, link }) {
  const inner = (
    <>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1.4,
          fontWeight: 700,
          color: COLORS.muted,
          fontFamily: 'var(--font-mono)',
          marginBottom: 2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 17,
          fontWeight: 700,
          color: accent || COLORS.ink,
          letterSpacing: '-0.015em',
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="pickem-hero-stat-sub"
          style={{
            fontSize: 10.5,
            color: COLORS.ink3,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.3,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </>
  );
  if (link) {
    return (
      <Link
        to={link}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}
