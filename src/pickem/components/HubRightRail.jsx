import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, StreakFlame, PickemBtn } from './social.jsx';
import { listMyGrups, listProfile } from '../api.js';
import { usePickemCompetition } from '../useCompetition.jsx';

// ============================================================================
// v0.76.0 — Pick'em desktop right rail (P8 polish).
//
// Shown on ≥1024 widths in the PredictingHub content layout. Three
// compact cards:
//
//   - Streak kamu — flame + matchday counter (from list-profile)
//   - Grup kamu   — top 3 grups by points (from list-grups)
//   - Quick-add   — CTAs (Bracket / Survivor / Recap) for desktop entry
//
// All three are read-only data summaries — taps route the user to the
// dedicated screens. Auth-aware: renders only when a user is signed in
// (guest mode hides the rail since the data doesn't exist yet).
//
// Graceful degradation: schema-missing (no migration 0015) shows the
// card frames with "—" placeholders rather than erroring out.
// ============================================================================

export default function HubRightRail({ user }) {
  const navigate = useNavigate();
  const { competition } = usePickemCompetition();
  const COMPETITION = competition.key;
  const [profile, setProfile] = useState(null);
  const [grups, setGrups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [pRes, gRes] = await Promise.all([
        listProfile({ competition: COMPETITION, history_limit: 1 }),
        listMyGrups(COMPETITION),
      ]);
      if (cancelled) return;
      if (pRes.ok) setProfile(pRes.profile);
      if (gRes.ok) setGrups((gRes.grups || []).slice(0, 3));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, COMPETITION]);

  if (!user) {
    return <GuestRail onLogin={() => navigate('/login?next=/pickem')} />;
  }

  return (
    <aside
      className="pickem-hub-rail"
      aria-label="Ringkasan kamu"
      style={{ fontFamily: 'var(--font-ui-pickem)' }}
    >
      <StreakCard profile={profile} loading={loading} />
      <GrupSnippet grups={grups} loading={loading} onCreate={() => navigate('/pickem/grup/new')} />
      <QuickLinks navigate={navigate} competition={competition} />
    </aside>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────────

function StreakCard({ profile, loading }) {
  const current = profile?.streak?.current_streak ?? 0;
  const longest = profile?.streak?.longest_streak ?? 0;
  const accuracy = profile?.accuracy_pct;
  return (
    <RailCard label="STREAK KAMU">
      {loading ? (
        <RailLoading />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                background: 'rgba(245, 158, 11, 0.18)',
                borderRadius: 999,
                color: 'var(--p-live)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <StreakFlame days={current} />
              <span style={{ color: 'var(--ink-2)', fontSize: 11, fontWeight: 600 }}>
                matchday
              </span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 12 }}>
            <RailStat label="REKOR" value={longest > 0 ? longest : '—'} />
            <RailStat label="AKURASI" value={accuracy != null ? `${accuracy}%` : '—'} />
          </div>
        </>
      )}
    </RailCard>
  );
}

function GrupSnippet({ grups, loading, onCreate }) {
  return (
    <RailCard label="GRUP KAMU" trailing={
      grups.length > 0 ? (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.08em',
          }}
        >
          {grups.length}
        </span>
      ) : null
    }>
      {loading ? (
        <RailLoading />
      ) : grups.length === 0 ? (
        <div>
          <div
            style={{
              color: 'var(--ink-2)',
              fontSize: 13,
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          >
            Belum ikutan grup. Bikin satu untuk main bareng teman.
          </div>
          <PickemBtn variant="primary" size="sm" onClick={onCreate}>
            Bikin grup
          </PickemBtn>
        </div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {grups.map((g) => (
            <li
              key={g.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--line-1)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--ink-1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {g.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 2,
                  }}
                >
                  {g.member_count} anggota · {g.my_rank ? `#${g.my_rank}` : '—'}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--ink-1)',
                }}
              >
                {Number(g.my_points || 0).toLocaleString('id-ID')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  );
}

function QuickLinks({ navigate, competition }) {
  // v0.79.7 — links are now competition-aware. Bracket + Survivor only
  // appear when the active competition supports them (tournament-shape).
  // For NBA Playoffs (playoff-series shape) these wouldn't open anything
  // useful — the bracket renders a "tersedia mulai 11 Juni" placeholder.
  const links = [];
  if (competition?.hasBracket) {
    const bracketLabel = `Bracket ${competition.label || 'WC'}`;
    links.push({ l: bracketLabel, to: '/pickem/bracket', sub: 'Bangun bracket sebelum kick-off' });
  }
  if (competition?.hasSurvivor) {
    links.push({ l: 'Survivor', to: '/pickem/survivor', sub: 'Pilih satu tim per pekan' });
  }
  links.push({ l: 'Recap kamu', to: '/pickem/recap', sub: 'Kartu Bola buat WhatsApp' });
  return (
    <RailCard label="CEPAT KE">
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {links.map((it, i) => (
          <li
            key={it.to}
            style={{
              borderBottom: i < links.length - 1 ? '1px solid var(--line-1)' : 'none',
            }}
          >
            <button
              type="button"
              onClick={() => navigate(it.to)}
              aria-label={`Buka ${it.l.toLowerCase()}`}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                padding: '10px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                color: 'var(--ink-1)',
                fontFamily: 'var(--font-ui-pickem)',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{it.l}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                  {it.sub}
                </div>
              </div>
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  color: 'var(--pickem-orange)',
                }}
              >
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </RailCard>
  );
}

// ── Sub-primitives ─────────────────────────────────────────────────────────

function RailCard({ label, trailing, children }) {
  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--r-3)',
        padding: '14px 16px',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.10em',
            color: 'var(--ink-3)',
          }}
        >
          {label}
        </span>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function RailStat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.08em',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--ink-1)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function RailLoading() {
  return (
    <div
      style={{
        color: 'var(--ink-3)',
        fontSize: 12,
        fontStyle: 'italic',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      Memuat…
    </div>
  );
}

function GuestRail({ onLogin }) {
  return (
    <aside
      className="pickem-hub-rail"
      aria-label="Ringkasan kamu"
      style={{ fontFamily: 'var(--font-ui-pickem)' }}
    >
      <RailCard label="MASUK">
        <div
          style={{
            color: 'var(--ink-2)',
            fontSize: 13,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          Masuk untuk dapet papan peringkat, streak, dan grup teman.
        </div>
        <PickemBtn variant="primary" size="sm" onClick={onLogin}>
          Masuk dengan email
        </PickemBtn>
      </RailCard>
    </aside>
  );
}
