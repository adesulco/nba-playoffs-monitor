import React from 'react';
import { Link } from 'react-router-dom';
import { COLORS as C } from '../lib/constants.js';
import { useContentManifest } from '../lib/contentManifest.js';

/**
 * /profile/[slug] cross-link CTA from canonical sport dashboards.
 *
 * Phase 2 ship #27. Surfaces the new evergreen Profile Writer
 * articles (built ships #21-#24) from the existing high-traffic
 * canonical dashboards (`/nba-playoff-2026/[teamSlug]`,
 * `/premier-league-2025-26/club/[slug]`, etc). Routes a fraction
 * of dashboard traffic into profile pages — internal link graph
 * for SEO, share-graph compounding for editorial value.
 *
 * Usage:
 *   <ProfileLink sport="nba" teamFullName="Boston Celtics" />
 *   <ProfileLink sport="epl" entitySlug="arsenal" />
 *   <ProfileLink sport="liga-1-id" canonicalSlug="persib" />
 *   <ProfileLink sport="f1" driverName="Max Verstappen" />
 *
 * Slug compute logic (per the audit in v0.46.0 ship notes):
 *   • NBA:      `nba-{slugify(teamFullName)}`
 *               canonical TeamPage uses last-word slug ("celtics") so
 *               we need TEAM_META's full name to derive the profile
 *               slug ("nba-boston-celtics").
 *   • EPL:      `epl-{entitySlug}`
 *               canonical EPLClub.slug already matches profile slug
 *               (e.g. "arsenal" → "epl-arsenal"). Direct prepend.
 *   • Liga 1:   lookup table `LIGA1_CANONICAL_TO_PROFILE` —
 *               canonical slugs are short ("persib") but profile slugs
 *               use API-Football full names ("persib-bandung"). 18-entry
 *               table maintained alongside Liga 1 club additions.
 *   • F1:       `f1-{slugify(driverName)}`
 *               canonical F1Driver.slug is last name only ("verstappen")
 *               but profile slug uses full name ("f1-max-verstappen").
 *
 * Conditional rendering: v0.62.3 (audit FUNC-002) — the CTA now gates
 * on the published-content manifest (`/content/index.json` via
 * useContentManifest). It renders ONLY when `team:{slug}` is published.
 * This is the "v2" behavior the original v1 comment promised: no more
 * blind links, no more silent bounce-to-home when the click lands on an
 * unpublished or missing profile. The /profile/:slug route's body-gate
 * (silent Navigate to / for unpublished drafts) is left intact — that's
 * a deliberate directive for shared draft URLs; this change just stops
 * the in-product CTA from ever leading there.
 */

// Lookup table for Liga 1 — canonical short slug → profile-slug-suffix.
// Source: cross-checked between src/lib/sports/liga-1-id/clubs.js
// (canonical slug+nameId) and public/content/team/liga-1-id-*.json
// (profile slugs from API-Football team names).
const LIGA1_CANONICAL_TO_PROFILE = {
  persija: 'persija-jakarta',
  persib: 'persib-bandung',
  persebaya: 'persebaya-surabaya',
  arema: 'arema-fc',
  'bali-united': 'bali-united',
  borneo: 'pusamania-borneo',
  'dewa-united': 'dewa-united',
  'madura-united': 'persepam-madura-utd',
  bhayangkara: 'bhayangkara-fc',
  persita: 'persita',
  persik: 'persik-kediri',
  'psm-makassar': 'psm-makassar',
  psm: 'psm-makassar',
  'persis-solo': 'persis-solo',
  persis: 'persis-solo',
  psbs: 'psbs-biak-numfor',
  psim: 'psim-yogyakarta',
  malut: 'malut-united',
  persijap: 'persijap',
  'semen-padang': 'semen-padang',
};

function slugify(text) {
  if (!text) return '';
  // NFKD strips accents; lowercased; non-alphanum runs collapse to '-'.
  const folded = text.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  return folded.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Compute the profile slug for a given sport + entity. Returns null
 * if the inputs aren't enough to compute a slug — caller renders
 * nothing in that case (defensive).
 */
export function computeProfileSlug({
  sport,
  teamFullName,
  entitySlug,
  canonicalSlug,
  driverName,
  playerName,
}) {
  if (!sport) return null;
  if (sport === 'nba') {
    const name = teamFullName || playerName;
    if (!name) return null;
    const prefix = playerName ? 'pemain-nba-' : 'nba-';
    return `${prefix}${slugify(name)}`;
  }
  if (sport === 'epl') {
    const s = entitySlug || (teamFullName ? slugify(teamFullName) : '');
    if (!s) return null;
    return `epl-${s}`;
  }
  if (sport === 'liga-1-id') {
    const cs = canonicalSlug || entitySlug;
    if (!cs) return null;
    const mapped = LIGA1_CANONICAL_TO_PROFILE[cs] || cs;
    return `liga-1-id-${mapped}`;
  }
  if (sport === 'f1') {
    const name = driverName;
    if (!name) return null;
    return `f1-${slugify(name)}`;
  }
  if (sport === 'tennis') {
    const name = playerName;
    if (!name) return null;
    return `tennis-${slugify(name)}`;
  }
  return null;
}

/**
 * Render a "📖 Profil lengkap" CTA pill. Self-contained styling
 * matches the existing Bloomberg-dim chrome — amber accent, dim
 * border, subtle hover. Hidden when slug can't be computed.
 *
 * Pass `label` to override the default text.
 * Pass `style` to extend (object merge).
 */
export default function ProfileLink({
  sport,
  teamFullName,
  entitySlug,
  canonicalSlug,
  driverName,
  playerName,
  label,
  style,
}) {
  const slug = computeProfileSlug({
    sport, teamFullName, entitySlug, canonicalSlug, driverName, playerName,
  });

  // v0.62.3 — audit FUNC-002. Gate the CTA on the published-content
  // manifest. Profiles live on disk as /content/team/{slug}.json, so
  // the manifest type is 'team'. Render nothing until the manifest
  // resolves AND confirms this profile is published — a missing
  // secondary CTA is invisible; a CTA that bounces to home is a
  // trust defect.
  const { isPublished } = useContentManifest();

  if (!slug) return null;
  if (!isPublished('team', slug)) return null;

  const subjectLabel =
    teamFullName || driverName || playerName || canonicalSlug || entitySlug || 'profil';
  const cta = label || `📖 Profil lengkap ${subjectLabel}`;

  return (
    <Link
      to={`/profile/${slug}`}
      title={`Baca profil ${subjectLabel}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        background: 'rgba(245,158,11,0.08)',
        color: C.amber || '#F59E0B',
        border: `1px solid ${C.amber || '#F59E0B'}55`,
        borderRadius: 8,
        textDecoration: 'none',
        fontSize: 13, fontWeight: 600,
        transition: 'background 120ms, border-color 120ms',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(245,158,11,0.16)';
        e.currentTarget.style.borderColor = (C.amber || '#F59E0B') + 'aa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(245,158,11,0.08)';
        e.currentTarget.style.borderColor = (C.amber || '#F59E0B') + '55';
      }}
    >
      {cta}
    </Link>
  );
}
