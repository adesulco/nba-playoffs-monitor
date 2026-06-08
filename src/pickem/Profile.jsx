import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import { Badge, StreakFlame, PickemBtn, EmptyState } from './components/social.jsx';
import { listProfile } from './api.js';
import { teamShort } from './bracketData.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { usePickemCompetition } from './useCompetition.jsx';
import { supabase } from '../lib/supabase.js';

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
  const { competition } = usePickemCompetition();
  const COMPETITION = competition.key;
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
      const res = await listProfile({ competition: COMPETITION, history_limit: 10 });
      if (res.ok) {
        setProfile(res.profile);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    })();
  }, [user, authLoading, navigate, COMPETITION]);

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
            <AvatarSection
              profile={profile}
              avatarLetter={avatarLetter}
              user={user}
              onNicknameSaved={(nick) => setProfile((p) => (p ? { ...p, username: nick } : p))}
            />
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

function AvatarSection({ profile, avatarLetter, user, onNicknameSaved }) {
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
      <NicknameEditor
        currentName={profile.username}
        hasNickname={profile.has_nickname}
        userId={user?.id}
        onSaved={onNicknameSaved}
      />
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

// v0.79.12 — inline nickname editor. The leaderboard shows
// `username || user_id.slice(0,8)`, so an unset nickname renders a raw
// hex prefix — ugly on a screenshot-and-share product. This lets the
// user set a display name. Writes profiles.nickname directly via the
// Supabase client (RLS policy profiles_self_update_favorites is
// row-level — auth.uid() = id — so self-update on any column is
// allowed; no new serverless function needed, we're at 11/12 slots).
function NicknameEditor({ currentName, hasNickname, userId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // v0.79.24 — gate on the raw has_nickname flag, not currentName. `username`
  // falls back to the email-prefix server-side, so it's never empty — without
  // this, a user who never set a nickname saw "Ubah nama" + their email prefix
  // instead of the "Atur nama tampilan →" prompt. Defensive fallback to
  // currentName if an older API response omits has_nickname.
  const hasName = hasNickname !== undefined ? !!hasNickname : !!currentName;

  const save = async () => {
    const next = value.trim();
    if (next.length < 2 || next.length > 20) {
      setError('Nama 2–20 karakter.');
      return;
    }
    if (!userId) {
      setError('Sesi habis — login lagi.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('profiles')
      .update({ nickname: next })
      .eq('id', userId);
    setSaving(false);
    if (err) {
      setError('Gagal simpan. Coba lagi.');
      return;
    }
    setEditing(false);
    onSaved?.(next);
    if (typeof window !== 'undefined' && window.gibolToast) {
      window.gibolToast.show({ text: 'Nama tersimpan', icon: 'check' });
    }
  };

  if (!editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--ink-1)',
          }}
        >
          {currentName || 'Kamu'}
        </div>
        <button
          type="button"
          onClick={() => { setValue(hasName ? (currentName || '') : ''); setEditing(true); setError(null); }}
          style={{
            appearance: 'none',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--pickem-orange)',
            fontFamily: 'var(--font-ui-pickem)',
            fontSize: 12,
            fontWeight: 600,
            padding: '2px 6px',
          }}
        >
          {hasName ? 'Ubah nama' : 'Atur nama tampilan →'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        maxLength={20}
        autoFocus
        aria-label="Nama tampilan"
        placeholder="Nama tampilan"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 700,
          textAlign: 'center',
          color: 'var(--ink-1)',
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-2)',
          padding: '6px 12px',
          maxWidth: 240,
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <PickemBtn variant="primary" size="sm" onClick={save} disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </PickemBtn>
        <PickemBtn variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
          Batal
        </PickemBtn>
      </div>
      {error && (
        <div role="alert" style={{ color: 'var(--p-down)', fontSize: 12, fontFamily: 'var(--font-ui-pickem)' }}>
          {error}
        </div>
      )}
    </div>
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

function teamShortFromUuid(code) {
  // v0.79.13 — fix "TOKC"/"TSAS" stray-T bug. This was a placeholder
  // from before the schema settled: it assumed home_team/away_team were
  // UUIDs needing a derived 3-char code, so it did `T${uuid.slice(0,3)}`.
  // But fixtures.home_team/away_team ARE the team tricode (text FK to
  // teams.tricode), e.g. 'OKC' — so the old code produced 'T'+'OKC' =
  // 'TOKC'. Return the tricode directly.
  if (!code) return 'TBA';
  return String(code).toUpperCase();
}
