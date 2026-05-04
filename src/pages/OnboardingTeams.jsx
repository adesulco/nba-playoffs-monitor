import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
 * /onboarding/teams — v0.12.5.
 *
 * First-login onboarding step. User picks favorite teams across all
 * four sports (NBA / EPL / F1 / Tennis) — multi-select, up to 8 total.
 * Saved to `profiles.favorite_teams` JSONB via useFavoriteTeams.save().
 *
 * Flow:
 *   1. AuthCallback redirects here on first sign-in (no favs yet)
 *   2. User picks → "Simpan & lanjut →" → /
 *   3. Skip link → / (saves nothing; user can come back via the
 *      "Pilih tim favoritmu" affordance on Home)
 *
 * Design: chip grid per sport. Each chip is 24×24 color square + name.
 * Tap toggles selection; selected chips have a solid border + checkmark
 * overlay. Limit 8 to keep the home FOLLOWING list focused.
 *
 * Auth: requires logged-in user. If anon, redirect to /login.
 */
const MAX_PICKS = 8;

export default function OnboardingTeams() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { status, user, favorites, save } = useFavoriteTeams();

  // Working set — initialized from saved favs so a returning user can
  // edit their picks. Stored as a Set of `${sport}:${id}` keys for
  // O(1) toggle.
  const [picked, setPicked] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'ready' && favorites?.length > 0) {
      setPicked(new Set(favorites.map((f) => `${f.sport}:${f.id}`)));
    }
  }, [status, favorites]);

  // v0.12.9 — fire one onboarding_view event when the picker actually
  // mounts in a usable state (auth resolved, picker rendered) so the
  // funnel viz in PostHog can compute auth_callback_success →
  // onboarding_view → onboarding_teams_saved without double-counting.
  // Only fires once per status transition into 'ready'.
  const viewedRef = React.useRef(false);
  useEffect(() => {
    if (status === 'ready' && !viewedRef.current) {
      viewedRef.current = true;
      trackEvent('onboarding_view', {
        existing_count: favorites?.length || 0,
        next: search.get('next') || '/',
      });
    }
  }, [status, favorites, search]);

  // Redirect anon users to login with a return-to-this-page hint
  useEffect(() => {
    if (status === 'anon') {
      navigate('/login?next=' + encodeURIComponent('/onboarding/teams'), { replace: true });
    }
  }, [status, navigate]);

  const nbaTeams = useMemo(() => {
    return Object.entries(TEAM_META).map(([name, meta]) => ({
      sport: 'nba',
      id: name, // full name is the canonical key
      short: meta.abbr,
      color: meta.color,
      name,
    }));
  }, []);

  const eplClubs = useMemo(() => {
    return CLUBS.map((c) => ({
      sport: 'epl',
      id: c.slug,
      short: (c.name || '').slice(0, 3).toUpperCase(),
      color: c.accent || '#37003C',
      name: c.name,
    }));
  }, []);

  const f1Teams = useMemo(() => {
    return F1_TEAMS.map((t) => ({
      sport: 'f1',
      id: t.id,
      short: t.short || t.code || t.id.slice(0, 3).toUpperCase(),
      color: t.color || '#E10600',
      name: t.name,
    }));
  }, []);

  const tennisStars = useMemo(() => {
    return TENNIS_STARS.map((p) => ({
      sport: 'tennis',
      id: p.slug,
      short: (p.country || p.ccode || '').slice(0, 3).toUpperCase(),
      color: p.accent || '#D4A13A',
      name: p.name || p.displayName,
    }));
  }, []);

  function toggle(item) {
    const key = `${item.sport}:${item.id}`;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size >= MAX_PICKS) {
          // Refuse silently — the helper text shows the cap
          return prev;
        }
        next.add(key);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    // Re-derive selected items in the order they appear in the source
    // arrays so the saved list has a deterministic order.
    const allItems = [...nbaTeams, ...eplClubs, ...f1Teams, ...tennisStars];
    const next = allItems.filter((it) => picked.has(`${it.sport}:${it.id}`));
    try {
      await save(next);
      trackEvent('onboarding_teams_saved', { count: next.length });
      const dest = search.get('next') || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(String(err?.message || err));
      setSaving(false);
    }
  }

  function handleSkip() {
    trackEvent('onboarding_teams_skipped', { partial_count: picked.size });
    const dest = search.get('next') || '/';
    navigate(dest, { replace: true });
  }

  if (status === 'loading' || status === 'anon') {
    return null; // Anon redirects via the useEffect above; loading is a brief blank
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: '"JetBrains Mono", monospace' }}>
      <SEO
        title={lang === 'id' ? 'Pilih tim favoritmu · gibol.co' : 'Pick your favorites · gibol.co'}
        description={lang === 'id'
          ? 'Atur tim NBA, klub EPL, konstruktor F1, dan petenis favoritmu di gibol.co.'
          : 'Set your favorite NBA team, EPL club, F1 constructor, and tennis player on gibol.co.'}
        path="/onboarding/teams"
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
        {/* Header */}
        <div>
          <div style={{ fontSize: 9, letterSpacing: 1.6, color: C.muted, fontWeight: 700, marginBottom: 6 }}>
            GIBOL · {lang === 'id' ? 'ONBOARDING' : 'ONBOARDING'}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 30, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.025em',
            color: C.text, margin: 0,
            textWrap: 'balance',
          }}>
            {lang === 'id' ? 'Pilih tim favoritmu' : 'Pick your favorites'}
          </h1>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 8, lineHeight: 1.5, maxWidth: 600 }}>
            {lang === 'id'
              ? `Pilih sampai ${MAX_PICKS} tim, klub, konstruktor, atau petenis. Mereka akan muncul di home dan dashboard kamu, plus jadi prioritas notifikasi laga live.`
              : `Pick up to ${MAX_PICKS} teams, clubs, constructors, or players. They'll appear on your home and dashboards, plus drive live-match notifications.`}
          </div>
          <div style={{ fontSize: 10, color: C.amber, marginTop: 6, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, fontWeight: 700 }}>
            {picked.size} / {MAX_PICKS} {lang === 'id' ? 'DIPILIH' : 'PICKED'}
          </div>
        </div>

        {/* NBA */}
        <TeamPickerSection
          title={lang === 'id' ? 'NBA — 30 tim' : 'NBA — 30 teams'}
          accent="#FF5722"
          items={nbaTeams}
          picked={picked}
          onToggle={toggle}
          maxReached={picked.size >= MAX_PICKS}
        />

        {/* EPL */}
        <TeamPickerSection
          title={lang === 'id' ? 'Liga Inggris — 20 klub' : 'Premier League — 20 clubs'}
          accent="#37003C"
          items={eplClubs}
          picked={picked}
          onToggle={toggle}
          maxReached={picked.size >= MAX_PICKS}
        />

        {/* F1 */}
        <TeamPickerSection
          title={lang === 'id' ? 'F1 — 11 konstruktor' : 'F1 — 11 constructors'}
          accent="#E10600"
          items={f1Teams}
          picked={picked}
          onToggle={toggle}
          maxReached={picked.size >= MAX_PICKS}
        />

        {/* Tennis */}
        <TeamPickerSection
          title={lang === 'id' ? 'Tenis — petenis populer' : 'Tennis — popular players'}
          accent="#D4A13A"
          items={tennisStars}
          picked={picked}
          onToggle={toggle}
          maxReached={picked.size >= MAX_PICKS}
        />

        {/* Footer actions */}
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
              background: picked.size > 0 ? C.amber : C.muted,
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
              : picked.size > 0
                ? `${lang === 'id' ? 'Simpan' : 'Save'} (${picked.size}) →`
                : (lang === 'id' ? 'Pilih minimal 1 tim' : 'Pick at least 1 team')}
          </button>
          <button
            type="button"
            onClick={handleSkip}
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
              cursor: 'pointer',
            }}
          >
            {lang === 'id' ? 'Lewati' : 'Skip'}
          </button>
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

// Section component extracted to /src/components/TeamPickerSection.jsx
// in v0.12.9 so /settings/teams can reuse the same chip grid.
