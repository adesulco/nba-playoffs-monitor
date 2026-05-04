import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { COLORS as C, TEAM_META } from '../lib/constants.js';
import { CLUBS } from '../lib/sports/epl/clubs.js';
import { TEAMS_2026 as F1_TEAMS } from '../lib/sports/f1/constants.js';
import { TENNIS_STARS } from '../lib/sports/tennis/constants.js';
import { useApp } from '../lib/AppContext.jsx';
import { useFavoriteTeams } from '../hooks/useFavoriteTeams.js';
import { trackEvent } from '../lib/analytics.js';
import SEO from '../components/SEO.jsx';
import TeamPickerSection from '../components/TeamPickerSection.jsx';

/**
 * /settings/teams — v0.12.9.
 *
 * Edit-favorites surface for logged-in users. Same chip grid as
 * /onboarding/teams (via the shared TeamPickerSection component) but:
 *   - No "Skip" button (this is intentional editing, not first-run).
 *   - Save button stays available even at zero picks (clearing all
 *     favorites is a valid action).
 *   - "Done" button instead of "Save & continue →" — destination is
 *     always /, not a `next` query param.
 *   - Each chip toggle fires favorite_team_added / favorite_team_removed
 *     for funnel telemetry (lets PostHog separate the high-intent
 *     "I'm pruning my list" cohort from the first-run mass-pick).
 *
 * Auth: requires logged-in user. If anon, redirect to /login with
 * return path so the user lands back here after sign-in.
 */
const MAX_PICKS = 8;

export default function SettingsTeams() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const { status, favorites, save } = useFavoriteTeams();

  const [picked, setPicked] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedNudge, setSavedNudge] = useState(false);

  // Hydrate from saved favs on first load (and on auth-state refresh).
  useEffect(() => {
    if (status === 'ready') {
      setPicked(new Set((favorites || []).map((f) => `${f.sport}:${f.id}`)));
    }
  }, [status, favorites]);

  useEffect(() => {
    if (status === 'anon') {
      navigate('/login?next=' + encodeURIComponent('/settings/teams'), { replace: true });
    }
  }, [status, navigate]);

  const nbaTeams = useMemo(() => Object.entries(TEAM_META).map(([name, meta]) => ({
    sport: 'nba', id: name, short: meta.abbr, color: meta.color, name,
  })), []);
  const eplClubs = useMemo(() => CLUBS.map((c) => ({
    sport: 'epl', id: c.slug, short: (c.name || '').slice(0, 3).toUpperCase(),
    color: c.accent || '#37003C', name: c.name,
  })), []);
  const f1Teams = useMemo(() => F1_TEAMS.map((t) => ({
    sport: 'f1', id: t.id, short: t.short || t.code || t.id.slice(0, 3).toUpperCase(),
    color: t.color || '#E10600', name: t.name,
  })), []);
  const tennisStars = useMemo(() => TENNIS_STARS.map((p) => ({
    sport: 'tennis', id: p.slug,
    short: (p.country || p.ccode || '').slice(0, 3).toUpperCase(),
    color: p.accent || '#D4A13A', name: p.name || p.displayName,
  })), []);

  function toggle(item) {
    const key = `${item.sport}:${item.id}`;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        trackEvent('favorite_team_removed', { sport: item.sport, id: item.id, source: 'settings' });
      } else {
        if (next.size >= MAX_PICKS) return prev;
        next.add(key);
        trackEvent('favorite_team_added', { sport: item.sport, id: item.id, source: 'settings' });
      }
      return next;
    });
    setSavedNudge(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const allItems = [...nbaTeams, ...eplClubs, ...f1Teams, ...tennisStars];
    const next = allItems.filter((it) => picked.has(`${it.sport}:${it.id}`));
    try {
      await save(next);
      trackEvent('favorites_saved', { count: next.length, source: 'settings' });
      setSavedNudge(true);
      setTimeout(() => setSavedNudge(false), 2400);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || status === 'anon') return null;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id' ? 'Tim favoritmu · gibol.co' : 'Your favorite teams · gibol.co'}
        description={lang === 'id'
          ? 'Atur tim NBA, klub EPL, konstruktor F1, dan petenis favoritmu.'
          : 'Manage your favorite NBA teams, EPL clubs, F1 constructors, and tennis players.'}
        path="/settings/teams"
        lang={lang}
      />
      <main style={{
        maxWidth: 880,
        margin: '0 auto',
        padding: '40px 20px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 1.6, color: C.muted, fontWeight: 700, marginBottom: 6 }}>
            GIBOL · {lang === 'id' ? 'PENGATURAN' : 'SETTINGS'}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 30, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.025em',
            color: C.text, margin: 0,
            textWrap: 'balance',
          }}>
            {lang === 'id' ? 'Tim favoritmu' : 'Your favorites'}
          </h1>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 8, lineHeight: 1.5, maxWidth: 600 }}>
            {lang === 'id'
              ? `Sampai ${MAX_PICKS} tim, klub, konstruktor, atau petenis. Mereka muncul di home dan jadi prioritas di kartu LIVE NOW saat lagi main.`
              : `Up to ${MAX_PICKS} teams, clubs, constructors, or players. They appear on home and rise to the top of the LIVE NOW card when their match is on.`}
          </div>
          <div style={{ fontSize: 10, color: C.amber, marginTop: 6, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, fontWeight: 700 }}>
            {picked.size} / {MAX_PICKS} {lang === 'id' ? 'DIPILIH' : 'PICKED'}
          </div>
        </div>

        <TeamPickerSection
          title={lang === 'id' ? 'NBA — 30 tim' : 'NBA — 30 teams'}
          accent="#FF5722"
          items={nbaTeams}
          picked={picked}
          onToggle={toggle}
          maxReached={picked.size >= MAX_PICKS}
        />
        <TeamPickerSection
          title={lang === 'id' ? 'Liga Inggris — 20 klub' : 'Premier League — 20 clubs'}
          accent="#37003C"
          items={eplClubs}
          picked={picked}
          onToggle={toggle}
          maxReached={picked.size >= MAX_PICKS}
        />
        <TeamPickerSection
          title={lang === 'id' ? 'F1 — 11 konstruktor' : 'F1 — 11 constructors'}
          accent="#E10600"
          items={f1Teams}
          picked={picked}
          onToggle={toggle}
          maxReached={picked.size >= MAX_PICKS}
        />
        <TeamPickerSection
          title={lang === 'id' ? 'Tenis — petenis populer' : 'Tennis — popular players'}
          accent="#D4A13A"
          items={tennisStars}
          picked={picked}
          onToggle={toggle}
          maxReached={picked.size >= MAX_PICKS}
        />

        <div style={{
          position: 'sticky',
          bottom: 0,
          background: C.bg,
          padding: '16px 0',
          borderTop: `1px solid ${C.line}`,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: C.amber,
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.3,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? (lang === 'id' ? 'Menyimpan...' : 'Saving...')
              : (lang === 'id' ? `Simpan (${picked.size})` : `Save (${picked.size})`)}
          </button>
          <Link
            to="/"
            style={{
              padding: '10px 16px',
              background: 'transparent',
              color: C.dim,
              border: `1px solid ${C.line}`,
              borderRadius: 4,
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.3,
              textDecoration: 'none',
            }}
          >
            {lang === 'id' ? 'Selesai' : 'Done'}
          </Link>
          {savedNudge && (
            <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>
              ✓ {lang === 'id' ? 'Tersimpan' : 'Saved'}
            </span>
          )}
          {error && (
            <span style={{ fontSize: 11, color: C.red }}>
              {lang === 'id' ? 'Gagal simpan: ' : 'Save failed: '}{error}
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
