import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PickemRoot from './PickemRoot.jsx';
import { GrupCard, EmptyState, PickemBtn } from './components/social.jsx';
import { listMyGrups, joinGrup } from './api.js';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { usePickemCompetition } from './useCompetition.jsx';
import { usePickemT } from './i18n.js';

// ============================================================================
// v0.68.0 — Grup hub (Pick'em P3).
//
// /pickem/grup — lists the user's grup memberships (private + public)
// for the active Pick'em competition. Two CTAs:
//   - "Bikin grup"  → /pickem/grup/new
//   - "Gabung grup" inline form: paste invite-code → join
//
// Guest path: if the user isn't signed in, redirect to /login?next=/pickem/grup.
// The whole grup surface requires auth (you can't be in a grup anonymously).
// ============================================================================

// v0.79.1 — COMPETITION reads from usePickemCompetition() at render time.

export default function Grup() {
  return (
    <AuthProvider>
      <GrupInner />
    </AuthProvider>
  );
}

function GrupInner() {
  const { user, loading: authLoading } = useAuth();
  const { competition } = usePickemCompetition();
  const tx = usePickemT();
  const COMPETITION = competition.key;
  const navigate = useNavigate();
  const [grups, setGrups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?next=' + encodeURIComponent('/pickem/grup'), { replace: true });
      return;
    }
    (async () => {
      setLoading(true);
      const res = await listMyGrups(COMPETITION);
      if (res.ok) {
        setGrups(res.grups || []);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    })();
  }, [user, authLoading, navigate, COMPETITION]);

  const onJoin = async (e) => {
    e?.preventDefault?.();
    setJoinError(null);
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4 || trimmed.length > 12) {
      setJoinError(tx('Invite code is 4–12 characters.', 'Kode undangan 4–12 karakter.'));
      return;
    }
    setJoining(true);
    // The legacy join-league flow needs both leagueId AND inviteCode.
    // We don't know the leagueId from just the code — resolve it via a
    // lookup. For v1, route the user to /pickem/grup/join?code=… where
    // GrupJoin.jsx does the (code → leagueId) resolution server-side
    // (it has access to admin-query auth via the join handler).
    setJoining(false);
    navigate(`/pickem/grup/join?code=${encodeURIComponent(trimmed)}`);
  };

  return (
    <PickemRoot active="grup">
      <div style={{ padding: '20px 16px 32px', maxWidth: 720, margin: '0 auto' }}>
        <header style={{ marginBottom: 18 }}>
          <div className="p-eyebrow" style={{ marginBottom: 6 }}>
            {tx('LEAGUES', 'LIGA')} · {competition.label.toUpperCase()}
          </div>
          <h1 className="p-display-sm" style={{ marginBottom: 4, color: 'var(--ink-1)' }}>
            {tx('Leagues & groups', 'Liga & grup')}
          </h1>
          <p style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-ui-pickem)', fontSize: 13 }}>
            {tx(
              "You're automatically in the global Gibol League. Create or join private groups to compete with friends.",
              'Kamu otomatis ikut Liga Gibol global. Bikin atau gabung grup privat buat tanding sama teman.',
            )}
          </p>
        </header>

        {/* General/global league — everyone on Gibol is in it. Distinct from
            the private groups you create (item 8: "a main general pick'em for
            a general gibol league, different to when creating leagues"). Mirrors
            the playoff pick'em global leaderboard. */}
        <button
          type="button"
          onClick={() => navigate('/pickem/board')}
          style={{
            width: '100%',
            appearance: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            marginBottom: 18,
            borderRadius: 'var(--r-3)',
            background: 'var(--pickem-orange-wash)',
            border: '1px solid var(--pickem-orange-soft)',
            borderLeft: '3px solid var(--pickem-orange)',
            fontFamily: 'var(--font-ui-pickem)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="p-eyebrow" style={{ color: 'var(--pickem-orange)', marginBottom: 4 }}>
              {tx('GENERAL LEAGUE', 'LIGA UMUM')}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-1)' }}>
              {tx('Gibol League', 'Liga Gibol')}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>
              {tx('Everyone playing — the global leaderboard. No invite needed.', 'Semua pemain — papan peringkat global. Tanpa undangan.')}
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--pickem-orange)' }}>→</span>
        </button>

        <div className="p-eyebrow" style={{ marginBottom: 10, color: 'var(--ink-3)' }}>
          {tx('YOUR GROUPS', 'GRUP KAMU')}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <PickemBtn variant="primary" onClick={() => navigate('/pickem/grup/new')}>
            {tx('Create group', 'Bikin grup')}
          </PickemBtn>
        </div>

        <form
          onSubmit={onJoin}
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--line-1)',
            borderRadius: 'var(--r-3)',
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontFamily: 'var(--font-ui-pickem)',
          }}
        >
          <label
            htmlFor="grup-code"
            className="p-eyebrow"
            style={{ color: 'var(--ink-3)' }}
          >
            {tx('JOIN WITH A CODE', 'GABUNG PAKAI KODE')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="grup-code"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck="false"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              maxLength={12}
              aria-invalid={!!joinError}
              aria-describedby={joinError ? 'grup-code-err' : undefined}
              style={{
                flex: 1,
                background: 'var(--bg-base)',
                border: '1px solid ' + (joinError ? 'var(--p-down)' : 'var(--line-2)'),
                color: 'var(--ink-1)',
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.20em',
                padding: '10px 14px',
                borderRadius: 'var(--r-2)',
                outline: 'none',
              }}
            />
            <PickemBtn type="submit" variant="secondary" disabled={joining}>
              {joining ? tx('Searching…', 'Mencari…') : tx('Join', 'Gabung')}
            </PickemBtn>
          </div>
          {joinError && (
            <div
              id="grup-code-err"
              role="alert"
              style={{ color: 'var(--p-down)', fontSize: 12 }}
            >
              {joinError}
            </div>
          )}
        </form>

        {loading && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            {tx('Loading your groups…', 'Memuat grupmu…')}
          </div>
        )}

        {!loading && grups.length === 0 && (
          <EmptyState
            title={tx('No groups yet', 'Belum ikutan grup')}
            body={tx(
              'Create a group or join with a friend’s code. Groups make playing together feel competitive.',
              'Bikin grup baru atau gabung pakai kode dari teman. Grup bikin main bareng terasa kompetitif.',
            )}
            action={
              <PickemBtn variant="primary" onClick={() => navigate('/pickem/grup/new')}>
                {tx('Create your first group', 'Bikin grup pertama')}
              </PickemBtn>
            }
          />
        )}

        {!loading && grups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {grups.map((g) => (
              <GrupCard
                key={g.id}
                grup={{
                  id: g.id,
                  name: g.name,
                  members: g.member_count,
                  rank: g.my_rank,
                  movement:
                    g.my_matchday_rank != null && g.my_previous_rank != null
                      ? g.my_previous_rank - g.my_matchday_rank
                      : null,
                  color: g.color || undefined,
                }}
                onClick={() => navigate(`/pickem/grup/${g.id}`)}
              />
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 16,
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
