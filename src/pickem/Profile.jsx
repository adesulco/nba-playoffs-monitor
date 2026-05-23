import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import { Badge, StreakFlame, PickemBtn, EmptyState } from './components/social.jsx';
import { listProfile } from './api.js';
import { teamShort } from './bracketData.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';

// ============================================================================
// v0.70.0 — Profile screen (Pick'em P5).
//
// /pickem/profile — the user's identity surface. Layout from
// design-handoff-pickem/js/screens.jsx#657:
//
//   Avatar bubble (Big letter / image)  +  streak chip
//   Stats grid (POIN / RANK / AKURASI)
//   Badges gallery (4-col grid; locked = greyed)
//   Riwayat terakhir (last N scored predictions)
//
// Reads everything via listProfile() — one round trip to /api/pickem
// returning the aggregated payload from list-profile.js. Schema-missing
// state degrades gracefully (the migration 0015 + bracket schema
// 0016 gap shows a friendly "not ready" panel).
// ============================================================================

export default function Profile() {
  return (
    <AuthProvider>
      <ProfileInner />
    </AuthProvider>
  );
}

function ProfileInner() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/pickem/profile'), { replace: true });
      return;
    }
    (async () => {
      setLoading(true);
      const res = await listProfile({ competition: 'WC2026', history_limit: 10 });
      if (res.ok) {
        setProfile(res.profile);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const avatarLetter = useMemo(() => {
    if (!profile) return 'K';
    const src = profile.username || profile.email || 'Kamu';
    return String(src).charAt(0).toUpperCase();
  }, [profile]);

  return (
    <PickemRoot active="profile">
      <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 32 }}>
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Memuat profil…
          </div>
        )}

        {!loading && !profile && (
          <div style={{ padding: '20px 16px' }}>
            <EmptyState
              tone="soon"
              title="Profil belum siap"
              body="Backend lagi disiapkan. Coba lagi sebentar."
              action={
                <PickemBtn variant="primary" onClick={() => navigate('/pickem')}>
                  Kembali ke prediksi
                </PickemBtn>
              }
            />
          </div>
        )}

        {profile && (
          <>
            <AvatarSection profile={profile} avatarLetter={avatarLetter} />
            <StatsGrid profile={profile} />
            <BadgesSection profile={profile} />
            <HistorySection profile={profile} />
          </>
        )}

        {error && profile && (
          <div
            role="alert"
            style={{
              margin: '16px 14px 0',
              padding: '10px 12px',
              borderRadius: 'var(--r-2)',
              background: 'var(--p-down-wash)',
              color: 'var(--p-down)',
              fontSize: 13,
              fontFamily: 'var(--font-ui-pickem)',
            }}
          >
            {String(error)}
          </div>
        )}
      </div>
    </PickemRoot>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

function AvatarSection({ profile, avatarLetter }) {
  return (
    <section
      style={{
        padding: '20px 18px 18px',
        textAlign: 'center',
        fontFamily: 'var(--font-ui-pickem)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--pickem-orange-wash)',
          color: 'var(--pickem-orange)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 32,
          marginBottom: 12,
        }}
      >
        {avatarLetter}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--ink-1)',
        }}
      >
        {profile.username || 'Kamu'}
      </div>
      <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>
        {profile.email && (
          <>
            <span>@{(profile.username || profile.email.split('@')[0]).toLowerCase()}</span>
            {profile.created_at && (
              <> · Gabung {formatDate(profile.created_at)}</>
            )}
          </>
        )}
      </div>
      {profile.streak?.current_streak > 0 && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            padding: '4px 10px',
            background: 'rgba(245, 158, 11, 0.16)',
            borderRadius: 999,
          }}
        >
          <StreakFlame days={profile.streak.current_streak} />
          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
            streak {profile.streak.current_streak} matchday
          </span>
        </div>
      )}
    </section>
  );
}

function StatsGrid({ profile }) {
  const cells = [
    { label: 'POIN', value: Number(profile.points || 0).toLocaleString('id-ID'), color: 'var(--pickem-orange)' },
    { label: 'RANK', value: profile.rank ? `#${profile.rank}` : '—', color: 'var(--ink-1)' },
    {
      label: 'AKURASI',
      value: profile.accuracy_pct != null ? `${profile.accuracy_pct}%` : '—',
      color: 'var(--ink-1)',
    },
  ];
  return (
    <section style={{ padding: '0 14px 14px', fontFamily: 'var(--font-ui-pickem)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {cells.map((c) => (
          <div
            key={c.label}
            style={{
              padding: 14,
              background: 'var(--bg-raised)',
              border: '1px solid var(--line-1)',
              borderRadius: 12,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 22,
                color: c.color,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {c.value}
            </div>
            <div
              className="p-eyebrow"
              style={{ fontSize: 9, marginTop: 4, color: 'var(--ink-3)' }}
            >
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BadgesSection({ profile }) {
  const earned = profile.badges?.earned || [];
  const catalog = profile.badges?.catalog || [];
  const earnedCodes = new Set(earned.map((b) => b.code));
  // Map codes to inline emojis (the schema doesn't carry an icon column for v1;
  // a future migration could). Falls back to 🎖️ for unknowns.
  const ICONS = {
    nostradamus: '🔮',
    berani:      '⚡',
    konsisten:   '🔥',
    raja_grup:   '👑',
    survivor_top:'💀',
  };
  return (
    <section style={{ padding: '4px 14px 18px', fontFamily: 'var(--font-ui-pickem)' }}>
      <div
        className="p-eyebrow"
        style={{ marginBottom: 10, padding: '0 4px', display: 'flex', justifyContent: 'space-between' }}
      >
        <span>BADGES</span>
        <span style={{ color: 'var(--ink-3)' }}>
          {earned.length} / {catalog.length}
        </span>
      </div>
      {catalog.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 14 }}>
          Lencana belum terkonfigurasi. Tunggu backend selesai.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {catalog.map((b) => (
            <Badge
              key={b.code}
              icon={ICONS[b.code] || '🎖️'}
              label={b.name_id || b.code}
              sublabel={b.description?.split('.')[0]?.slice(0, 28) || ''}
              locked={!earnedCodes.has(b.code)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HistorySection({ profile }) {
  const rows = profile.recent_predictions || [];
  if (rows.length === 0) {
    return (
      <section style={{ padding: '4px 14px', fontFamily: 'var(--font-ui-pickem)' }}>
        <div className="p-eyebrow" style={{ marginBottom: 10, padding: '0 4px' }}>
          RIWAYAT TERAKHIR
        </div>
        <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 14 }}>
          Belum ada prediksi yang dihitung. Riwayat muncul setelah pertandingan pertama selesai.
        </div>
      </section>
    );
  }
  return (
    <section style={{ padding: '4px 14px 24px', fontFamily: 'var(--font-ui-pickem)' }}>
      <div className="p-eyebrow" style={{ marginBottom: 10, padding: '0 4px' }}>
        RIWAYAT TERAKHIR
      </div>
      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-1)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <HistoryRow key={row.id} row={row} last={i === rows.length - 1} />
        ))}
      </div>
    </section>
  );
}

function HistoryRow({ row, last }) {
  const fx = row.fixtures || {};
  const total = (row.awarded_points || 0) + (row.grup_bonus_points || 0);
  const correct = (row.base_points || 0) > 0;
  const tone = correct ? 'var(--p-up)' : 'var(--p-down)';
  const homeShort = teamShortFromUuid(fx.home_team);
  const awayShort = teamShortFromUuid(fx.away_team);
  const score = fx.home_score != null && fx.away_score != null
    ? `${homeShort} ${fx.home_score}–${fx.away_score} ${awayShort}`
    : `${homeShort} vs ${awayShort}`;
  const predictedScore =
    row.picked_home != null && row.picked_away != null
      ? `${row.picked_home}–${row.picked_away}`
      : row.picked_outcome === 'H' ? `${homeShort} menang`
      : row.picked_outcome === 'A' ? `${awayShort} menang`
      : 'Seri';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 14px',
        borderBottom: last ? 'none' : '1px solid var(--line-1)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink-1)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score}
        </div>
        <div
          style={{
            color: 'var(--ink-3)',
            fontSize: 11,
            marginTop: 2,
            fontFamily: 'var(--font-ui-pickem)',
          }}
        >
          Prediksi {predictedScore}
          {row.is_jagoan && ' · Jagoan'}
          {row.upset_mult_applied > 1 && ` · Upset ×${Number(row.upset_mult_applied).toFixed(1).replace(/\.0$/, '')}`}
        </div>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          color: tone,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {correct ? '+' : ''}{total}
      </span>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function teamShortFromUuid(uuid) {
  // Without a joined teams table, we render a 3-char identifier
  // derived from the UUID. A future server-side join replaces this
  // with the real team code.
  if (!uuid) return 'TBA';
  return `T${String(uuid).slice(0, 3).toUpperCase()}`;
}
