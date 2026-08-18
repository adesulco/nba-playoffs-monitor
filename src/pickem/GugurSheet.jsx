/**
 * /gugur/:code — Gugur (Survivor) sheet · R4a-1 / M1 (v0.85.0).
 *
 * The doc-16 pitch: pick ONE team to win per matchday, no team twice,
 * wrong = out, last standing wins the grup. The engine has existed since
 * migration 0017 (entries, no-reuse, elimination inside the scoring RPC)
 * and upsert-survivor-pick / list-survivor enforce everything server-side
 * — this screen is the surfacing, in the 4a grammar.
 *
 * Grup-scoped on purpose (/gugur/:code, not /gugur): survivor is a grup
 * game — "last standing wins THE GRUP" — so the sheet always knows whose
 * board to show. Route is gated on the grup's enabled_modes.survivor.
 *
 * Three states, one screen:
 *   alive       → team grid for the current matchday (used teams greyed,
 *                 one tap to pick, server confirms), then locked pick.
 *   eliminated  → "pantau" mode: the board, who's still alive, and the
 *                 "Gugur di MW_" share card CTA. Eliminated ≠ gone —
 *                 doc 16 explicitly wants re-engagement via pantau.
 *   guest       → the board + login CTA. Survivor entries are per-account
 *                 (elimination must survive device changes), so there is
 *                 deliberately NO guest survivor pick.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  listFixtures, listSurvivor, upsertSurvivorPick, leagueDetail, survivorBoard,
} from './api.js';
import { COMPETITIONS } from './competitions.js';
import { skinForCompetition } from './sportSkins.js';
import { LockBadge } from './components/primitives4a.jsx';
import TabBar4a from './components/TabBar4a.jsx';
import Logo4a from './components/Logo4a.jsx';
import { AuthProvider, useAuth } from '../lib/AuthContext.jsx';
import { useApp } from '../lib/AppContext.jsx';
import SEO from '../components/SEO.jsx';

export default function GugurSheet() {
  return (
    <AuthProvider>
      <GugurSheetInner />
    </AuthProvider>
  );
}

function GugurSheetInner() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { lang } = useApp();
  const { user } = useAuth();
  const tx = (en, id) => (lang === 'id' ? id : en);

  const [league, setLeague] = useState(null);
  const [board, setBoard] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [entry, setEntry] = useState(null);
  const [picks, setPicks] = useState([]);
  const [saving, setSaving] = useState(null); // tricode being saved
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Grup + board (public), fixtures for the grup's competition.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ld, bd] = await Promise.all([
        leagueDetail({ code }),
        survivorBoard({ code }),
      ]);
      if (cancelled) return;
      setLeague(ld?.league || null);
      setBoard(bd?.ok ? bd : null);
      const comp = ld?.league?.competition;
      if (comp) {
        const fx = await listFixtures({ league: comp, status: 'scheduled', limit: 500 });
        if (cancelled) return;
        const nowMs = Date.now();
        setFixtures(
          (fx?.fixtures || [])
            .filter((f) => new Date(f.lock_at || f.kickoff_at).getTime() > nowMs)
            .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
        );
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [code]);

  // My survivor state (authed only).
  useEffect(() => {
    if (!user || !league?.competition) return undefined;
    let cancelled = false;
    (async () => {
      const res = await listSurvivor({ competition: league.competition });
      if (cancelled) return;
      if (res.ok) { setEntry(res.entry); setPicks(res.picks); }
    })();
    return () => { cancelled = true; };
  }, [user, league?.competition]);

  const competition = league?.competition ? COMPETITIONS[league.competition] : null;
  const skin = useMemo(
    () => skinForCompetition(league?.competition, competition),
    [league?.competition, competition]
  );

  const eliminated = entry?.status === 'out';
  const usedTricodes = useMemo(() => new Set(entry?.used_team_ids || []), [entry]);

  // Current matchday = the earliest one still open.
  const currentMatchday = fixtures[0]?.matchday ?? null;
  const mdFixtures = fixtures.filter((f) => f.matchday === currentMatchday);
  const myMdPick = picks.find((p) => p.matchday === currentMatchday) || null;
  const nextLock = mdFixtures[0]?.lock_at ? new Date(mdFixtures[0].lock_at).getTime() : null;

  async function pickTeam(fixture, tricode) {
    if (saving || myMdPick) return;
    setSaving(tricode);
    setError(null);
    const res = await upsertSurvivorPick({ fixture_id: fixture.id, picked_team_id: tricode });
    setSaving(null);
    if (!res.ok) {
      setError(
        res.error === 'team_already_used'
          ? tx('You already used that team.', 'Tim itu udah pernah kamu pakai.')
          : res.error === 'fixture locked'
            ? tx('That match is locked.', 'Laga itu udah terkunci.')
            : tx('Save failed. Try again.', 'Gagal simpan. Coba lagi.')
      );
      return;
    }
    // Refresh authoritative state rather than patching locally — the
    // server may have cleared another pick on this matchday.
    const fresh = await listSurvivor({ competition: league.competition });
    if (fresh.ok) { setEntry(fresh.entry); setPicks(fresh.picks); }
  }

  const title = `Gugur — ${league?.name || 'Pick’em'} | gibol.co`;

  return (
    <div className="g4-shell" style={S.shell}>
      <SEO title={title} description="Satu tim per pekan. Salah sekali, gugur." noindex />

      <header style={S.header}>
        <button type="button" onClick={() => navigate(`/grup/${code}`)} aria-label={tx('Back', 'Kembali')} style={S.back}>‹</button>
        <span style={S.headerTitle}>Gugur · {league?.name || '…'}</span>
        {nextLock != null && (
          <LockBadge secondsLeft={Math.max(0, Math.floor((nextLock - Date.now()) / 1000))} />
        )}
      </header>

      <div className="g4-body" style={S.body}>
        {loading && <p style={S.muted}>{tx('Loading…', 'Memuat…')}</p>}

        {!loading && board && board.enabled === false && (
          <div style={S.calmCard}>
            <div style={S.calmTitle}>{tx('Gugur is off for this grup', 'Gugur belum nyala di grup ini')}</div>
            <p style={S.calmMeta}>{tx('Ask the commissioner to switch it on.', 'Minta komisioner buat nyalain.')}</p>
          </div>
        )}

        {!loading && board?.enabled && (
          <>
            {/* Rules strip — one line, always visible */}
            <p style={S.rules}>
              {tx(
                'One team per matchday. Never the same team twice. One wrong pick — you’re out.',
                'Satu tim per pekan. Gak boleh tim yang sama dua kali. Salah sekali — gugur.'
              )}
            </p>

            {/* MY STATE */}
            {!user && (
              <div style={S.calmCard}>
                <div style={S.calmTitle}>{tx('Playing needs an account', 'Main perlu akun')}</div>
                <p style={S.calmMeta}>
                  {tx(
                    'Your survival has to follow you across devices.',
                    'Status hidupmu harus ikut kamu di semua perangkat.'
                  )}
                </p>
                <button type="button" style={S.cta} onClick={() => navigate(`/login?next=/gugur/${code}`)}>
                  {tx('Log in & play', 'Masuk & main')}
                </button>
              </div>
            )}

            {user && eliminated && (
              <div style={{ ...S.calmCard, borderColor: 'var(--g4-lose)', borderWidth: 2 }}>
                <div style={S.calmTitle}>
                  {tx(`Eliminated in MW${entry?.eliminated_matchday ?? '–'}`, `Gugur di MW${entry?.eliminated_matchday ?? '–'}`)}
                </div>
                <p style={S.calmMeta}>
                  {tx('You’re in pantau mode — watch who falls next.', 'Kamu mode pantau — tonton siapa yang gugur berikutnya.')}
                </p>
                <a
                  style={{ ...S.cta, textDecoration: 'none', display: 'block', textAlign: 'center' }}
                  href={`/api/og-recap?type=g4-gugur&mw=${entry?.eliminated_matchday ?? ''}&grup=${encodeURIComponent(league?.name || '')}&code=${encodeURIComponent(code)}`}
                  target="_blank" rel="noreferrer"
                >
                  {tx('Share your fall →', 'Bagikan kejatuhanmu →')}
                </a>
              </div>
            )}

            {user && !eliminated && myMdPick && (
              <div style={{ ...S.calmCard, borderColor: 'var(--g4-win)', borderWidth: 2 }}>
                <div style={S.calmTitle}>
                  {tx(`MW${currentMatchday}: you picked`, `MW${currentMatchday}: pilihanmu`)} {myMdPick.picked_team_id || myMdPick.picked_outcome}
                </div>
                <p style={S.calmMeta}>
                  {tx('Locked at kickoff. Survive and pick again next week.', 'Terkunci pas kickoff. Bertahan, lalu pilih lagi pekan depan.')}
                </p>
              </div>
            )}

            {/* TEAM GRID — alive + not yet picked this MW */}
            {user && !eliminated && !myMdPick && mdFixtures.length > 0 && (
              <>
                <div style={S.sectionRule}>
                  <span style={S.sectionTitle}>{tx(`Pick one — MW${currentMatchday}`, `Pilih satu — MW${currentMatchday}`)}</span>
                  <span style={S.sectionMeta}>{usedTricodes.size} {tx('used', 'terpakai')}</span>
                </div>
                {mdFixtures.map((f) => (
                  <div key={f.id} style={S.fixtureRow}>
                    <span style={S.fixtureMeta}>
                      {new Date(f.kickoff_at).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { weekday: 'short', timeZone: 'Asia/Jakarta' })}
                    </span>
                    {[
                      { code: f.home_team, name: f.home?.name },
                      { code: f.away_team, name: f.away?.name },
                    ].map((t) => {
                      const used = usedTricodes.has(t.code);
                      return (
                        <button
                          key={t.code}
                          type="button"
                          disabled={used || saving != null}
                          onClick={() => pickTeam(f, t.code)}
                          style={{
                            ...S.teamBtn,
                            opacity: used ? 0.35 : 1,
                            background: saving === t.code ? skin.accent : 'var(--g4-surface)',
                            color: saving === t.code ? '#fff' : 'var(--g4-text)',
                            textDecoration: used ? 'line-through' : 'none',
                          }}
                        >
                          {t.code}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {error && <p style={S.error}>{error}</p>}
              </>
            )}

            {/* THE BOARD — everyone sees it; this IS pantau */}
            <div style={S.sectionRule}>
              <span style={S.sectionTitle}>{tx('Still standing', 'Masih bertahan')}</span>
              <span style={S.sectionMeta}>
                {/* standing = not yet eliminated; before anyone picks,
                    everyone is standing — 0/N would read as a massacre. */}
                {board.rows.filter((r) => r.status !== 'eliminated').length}/{board.total_count}
              </span>
            </div>
            {board.rows.map((r) => (
              <div key={r.user_id} style={S.boardRow}>
                <span style={{ ...S.boardDot, background: r.status === 'eliminated' ? 'var(--g4-lose)' : r.status === 'alive' ? 'var(--g4-win)' : 'var(--g4-border)' }} />
                <span style={{ flex: 1, minWidth: 0, font: '600 13px/1.3 var(--g4-font-ui)' }}>{r.display_name}</span>
                <span style={S.boardStatus}>
                  {r.status === 'eliminated'
                    ? tx(`out · MW${r.eliminated_matchday ?? '–'}`, `gugur · MW${r.eliminated_matchday ?? '–'}`)
                    : r.status === 'alive'
                      ? tx(`alive · ${r.used_count} used`, `hidup · ${r.used_count} terpakai`)
                      : tx('not started', 'belum mulai')}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <TabBar4a active="grup" grupCode={code} lang={lang} />
      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <Logo4a size={10} />
      </div>
    </div>
  );
}

const S = {
  shell: {
    minHeight: '100dvh', background: 'var(--g4-bg)', color: 'var(--g4-text)',
    fontFamily: 'var(--g4-font-ui)', maxWidth: 480, margin: '0 auto',
    paddingBottom: 96, boxSizing: 'border-box',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px var(--g4-gutter) 10px',
    borderBottom: 'var(--g4-rule-strong) solid var(--g4-text)',
    margin: '0 var(--g4-gutter)', paddingLeft: 0, paddingRight: 0,
  },
  back: {
    appearance: 'none', background: 'none', border: 'none', cursor: 'pointer',
    font: '800 22px/1 var(--g4-font-display)', color: 'var(--g4-text)', padding: '0 4px',
  },
  headerTitle: { flex: 1, font: '800 15px/1.2 var(--g4-font-display)', letterSpacing: '-0.3px', minWidth: 0 },
  body: { padding: '12px var(--g4-gutter) 0', display: 'flex', flexDirection: 'column', gap: 'var(--g4-gap-card-sm)' },
  rules: { font: '500 12px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: 0 },
  calmCard: {
    background: 'var(--g4-surface)', border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card)', padding: '14px 16px',
  },
  calmTitle: { font: '800 17px/1.15 var(--g4-font-display)', letterSpacing: 'var(--g4-track-display)' },
  calmMeta: { font: '500 12px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', margin: '5px 0 0' },
  cta: {
    appearance: 'none', border: 'none', width: '100%', marginTop: 12,
    background: 'var(--g4-ink-block)', color: 'var(--g4-paper)',
    borderRadius: 'var(--g4-radius-cta)', padding: 12,
    font: '700 13px/1.2 var(--g4-font-ui)', cursor: 'pointer',
  },
  sectionRule: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    borderBottom: '1px solid var(--g4-text)', paddingBottom: 4, marginTop: 8,
  },
  sectionTitle: { font: '800 15px/1.1 var(--g4-font-display)' },
  sectionMeta: { font: '600 10px/1 var(--g4-font-ui)', color: 'var(--g4-text-muted)' },
  fixtureRow: { display: 'flex', alignItems: 'center', gap: 8 },
  fixtureMeta: { width: 34, font: '600 10px/1.2 var(--g4-font-ui)', color: 'var(--g4-text-muted)', flex: 'none' },
  teamBtn: {
    flex: 1, appearance: 'none', border: '1.5px solid var(--g4-text)',
    borderRadius: 'var(--g4-radius-cta)', padding: '11px 0',
    font: '700 14px/1 var(--g4-font-ui)', cursor: 'pointer',
  },
  boardRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--g4-surface)', border: '1px solid var(--g4-border)',
    borderRadius: 'var(--g4-radius-card-sm)', padding: '9px 12px',
  },
  boardDot: { width: 8, height: 8, borderRadius: '50%', flex: 'none' },
  boardStatus: { font: '600 10px/1.2 var(--g4-font-ui)', color: 'var(--g4-text-muted)', flex: 'none' },
  error: { font: '500 12px/1.4 var(--g4-font-ui)', color: 'var(--g4-lose)', margin: 0 },
  muted: { font: '500 13px/1.5 var(--g4-font-ui)', color: 'var(--g4-text-muted)', textAlign: 'center', padding: '24px 0' },
};
