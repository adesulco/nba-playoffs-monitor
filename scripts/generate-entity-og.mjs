#!/usr/bin/env node
/**
 * scripts/generate-entity-og.mjs — v0.13.0 SEO sprint, Ship 4.
 *
 * Generates per-entity OG cards (NBA per-team, EPL per-club, F1 per-team,
 * F1 per-driver, Tennis per-tournament, SuperLeague per-club) using the
 * same SVG → sharp → PNG pipeline as scripts/generate-hub-og.mjs.
 *
 * Why per-entity OG cards: prior to this ship, every per-entity URL
 * (~120 routes) fell back to /og-image.png in shares. WhatsApp/Twitter/
 * Slack previews looked identical for `/nba-playoff-2026/lakers` and
 * `/premier-league-2025-26/club/arsenal` — same default art, no
 * sport/team context. Bespoke cards lift CTR materially when the team
 * is recognisable.
 *
 * Output paths (matched to the wiring in each sport adapter):
 *   public/og/nba/{slug}.png         × 30
 *   public/og/epl/{slug}.png         × 20
 *   public/og/f1/team-{slug}.png     × 11
 *   public/og/f1/driver-{slug}.png   × 22
 *   public/og/tennis/{slug}.png      × 18
 *   public/og/super-league/{slug}.png × 18
 *
 * Total: ~119 cards.
 *
 * Run on demand (CLI): `node scripts/generate-entity-og.mjs`.
 * Cards are static; regenerate when:
 *   - team/club/driver line-up changes
 *   - new sport added
 *   - brand redesign (logo update)
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const OG_DIR = path.join(PUBLIC_DIR, 'og');
const FONT_DIR = path.join(__dirname, 'fonts');
const LOGO_PATH = path.join(PUBLIC_DIR, 'gibol-logo-1024.png');

const W = 1200;
const H = 630;

// Brand palette — must match generate-hub-og.mjs so cards feel
// part of the same family.
const BG_TOP = '#0A1628';
const BG_BOT = '#13223D';
const INK = '#F5F1EA';
const INK_DIM = '#9AA3B5';
const INK_FAINT = '#5A6275';

// ─── Asset preload ──────────────────────────────────────────────────────────
let LOGO_B64 = null;
let FONT_BEBAS_B64 = null;
let FONT_SPACE_B64 = null;
async function preload() {
  const [logo, bebas, space] = await Promise.all([
    fs.readFile(LOGO_PATH),
    fs.readFile(path.join(FONT_DIR, 'BebasNeue-Regular.ttf')),
    fs.readFile(path.join(FONT_DIR, 'SpaceGrotesk-Bold.ttf')),
  ]);
  LOGO_B64 = logo.toString('base64');
  FONT_BEBAS_B64 = bebas.toString('base64');
  FONT_SPACE_B64 = space.toString('base64');
}

function fontFaceBlock() {
  return `
    <style><![CDATA[
      @font-face { font-family: 'Bebas Neue'; src: url(data:font/ttf;base64,${FONT_BEBAS_B64}) format('truetype'); font-weight: normal; }
      @font-face { font-family: 'Space Grotesk'; src: url(data:font/ttf;base64,${FONT_SPACE_B64}) format('truetype'); font-weight: 700; }
      .headline { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.01em; }
      .sans { font-family: 'Space Grotesk', sans-serif; font-weight: 700; }
      .mono { font-family: 'Space Grotesk', monospace; font-weight: 700; letter-spacing: 0.06em; }
    ]]></style>
  `;
}

function escapeXml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// Compute headline font size so even the longest entity name fits
// in the available width (1080px usable). Bebas Neue is ~0.42 ×
// fontSize per character. Cap at 92 for the shortest names so they
// don't get gigantic; floor at 56 so the longest "Andrea Kimi
// Antonelli" / "Wolverhampton Wanderers" still read big.
function fitHeadlineSize(text, baseSize = 92, maxWidth = 1080) {
  const chars = String(text || '').length;
  const approxWidth = chars * baseSize * 0.42;
  if (approxWidth <= maxWidth) return baseSize;
  const scaled = Math.floor((maxWidth / (chars * 0.42)));
  return Math.max(56, Math.min(baseSize, scaled));
}

function buildSvg({ accent, eyebrow, headline, tagline, foot, sportTag }) {
  const logoSize = 140;
  const logoX = 60;
  const logoY = 60;
  const headlineSize = fitHeadlineSize(headline, 92);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${fontFaceBlock()}
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="${BG_TOP}" />
      <stop offset="100%" stop-color="${BG_BOT}" />
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.6">
      <stop offset="0%"  stop-color="${accent}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="accentBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="${accent}" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.6" />
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <rect width="${W}" height="${H}" fill="url(#glow)" />

  <!-- top accent strip -->
  <rect x="0" y="0" width="${W}" height="8" fill="${accent}" />

  <!-- vertical accent bar tying logo + headline -->
  <rect x="${logoX - 14}" y="${logoY + logoSize + 64}" width="6" height="${H - (logoY + logoSize + 64) - 80}"
        fill="url(#accentBar)" rx="3" />

  <!-- logo -->
  <image xlink:href="data:image/png;base64,${LOGO_B64}"
         x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" />

  <!-- wordmark + tagline -->
  <text x="${logoX + logoSize + 24}" y="${logoY + 70}"
        fill="${INK}" class="sans" font-size="56">gibol.co</text>
  <text x="${logoX + logoSize + 26}" y="${logoY + 110}"
        fill="${INK_DIM}" class="sans" font-size="22">gila bola · live multi-sport</text>

  <!-- sport tag (top-right pill) -->
  ${sportTag ? `
  <rect x="${W - 220}" y="${logoY + 30}" width="160" height="36"
        fill="transparent" stroke="${accent}" stroke-width="2" rx="6" />
  <text x="${W - 140}" y="${logoY + 54}" text-anchor="middle"
        fill="${accent}" class="mono" font-size="16">${escapeXml(sportTag)}</text>
  ` : ''}

  <!-- eyebrow -->
  <text x="${logoX}" y="${logoY + logoSize + 80}"
        fill="${accent}" class="mono" font-size="22">${escapeXml(eyebrow)}</text>

  <!-- headline (auto-sized to fit) -->
  <text x="${logoX}" y="${logoY + logoSize + 80 + headlineSize + 4}"
        fill="${INK}" class="headline" font-size="${headlineSize}">${escapeXml(headline)}</text>

  <!-- tagline -->
  <text x="${logoX}" y="${logoY + logoSize + 80 + headlineSize + 50}"
        fill="${INK_DIM}" class="sans" font-size="24">${escapeXml(tagline)}</text>

  <!-- footer left: URL -->
  <text x="${logoX}" y="${H - 36}"
        fill="${INK_FAINT}" class="mono" font-size="18">${escapeXml(foot)}</text>

  <!-- footer right: LIVE pill -->
  <rect x="${W - 220}" y="${H - 64}" width="160" height="36"
        fill="${accent}" rx="6" />
  <circle cx="${W - 200}" cy="${H - 46}" r="5" fill="${INK}" />
  <text x="${W - 184}" y="${H - 40}"
        fill="${INK}" class="mono" font-size="16">LIVE · BAHASA</text>
</svg>`;
}

async function renderCard({ outFile, accent, eyebrow, headline, tagline, foot, sportTag }) {
  const svg = buildSvg({ accent, eyebrow, headline, tagline, foot, sportTag });
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outFile);
}

// ─── Loaders for sport entity data ──────────────────────────────────────────
async function loadEntities() {
  // Import the same constants the runtime uses so the OG cards always
  // reflect the canonical source of truth (no copy-paste team rosters).
  const constantsUrl = pathToFileURL(path.join(REPO_ROOT, 'src/lib/constants.js')).href;
  const f1Url = pathToFileURL(path.join(REPO_ROOT, 'src/lib/sports/f1/constants.js')).href;
  const eplClubsUrl = pathToFileURL(path.join(REPO_ROOT, 'src/lib/sports/epl/clubs.js')).href;
  const tennisUrl = pathToFileURL(path.join(REPO_ROOT, 'src/lib/sports/tennis/tournaments.js')).href;
  let slClubs = null;
  try {
    const slUrl = pathToFileURL(path.join(REPO_ROOT, 'src/lib/sports/liga-1-id/clubs.js')).href;
    slClubs = await import(slUrl);
  } catch (_) {
    /* SuperLeague Phase 1A may not be present in older branches */
  }

  const { TEAM_META, teamSlug } = await import(constantsUrl);
  const { TEAMS_2026: F1_TEAMS, DRIVERS_2026: F1_DRIVERS, TEAMS_BY_ID: F1_TEAMS_BY_ID } = await import(f1Url);
  const { CLUBS: EPL_CLUBS } = await import(eplClubsUrl);
  const { TOURNAMENTS_2026: TENNIS_TOURNAMENTS, tournamentPath } = await import(tennisUrl);

  return {
    nbaTeams: Object.entries(TEAM_META).map(([name, meta]) => ({
      name, slug: teamSlug(name), abbr: meta.abbr, color: meta.color,
      conf: meta.conf, star: meta.star,
    })),
    eplClubs: EPL_CLUBS,
    f1Teams: F1_TEAMS,
    f1Drivers: F1_DRIVERS,
    f1TeamsById: F1_TEAMS_BY_ID,
    tennisTournaments: TENNIS_TOURNAMENTS,
    tennisPath: tournamentPath,
    slClubs: slClubs?.CLUBS || null,
  };
}

// ─── Per-entity card definitions ────────────────────────────────────────────
function nbaCardForTeam(t) {
  return {
    outFile: path.join(OG_DIR, 'nba', `${t.slug}.png`),
    accent: t.color,
    sportTag: 'NBA',
    eyebrow: `${t.conf === 'E' ? 'EAST' : 'WEST'} · NBA PLAYOFFS 2026`,
    headline: t.name.toUpperCase(),
    tagline: t.star ? `★ ${t.star}` : 'NBA Playoffs 2026',
    foot: `gibol.co/nba-playoff-2026/${t.slug}`,
  };
}

function eplCardForClub(c) {
  return {
    outFile: path.join(OG_DIR, 'epl', `${c.slug}.png`),
    accent: c.accent || '#37003C',
    sportTag: 'EPL',
    eyebrow: 'PREMIER LEAGUE · 2025/26',
    headline: (c.name || '').toUpperCase(),
    tagline: c.stadium ? `${c.stadium} · ${c.city}` : 'Liga Inggris 2025-26',
    foot: `gibol.co/premier-league-2025-26/club/${c.slug}`,
  };
}

function f1CardForTeam(t) {
  return {
    outFile: path.join(OG_DIR, 'f1', `team-${t.slug}.png`),
    accent: t.accent || '#E10600',
    sportTag: 'F1',
    eyebrow: `${t.short || t.code || 'F1'} · 2026 SEASON`,
    headline: (t.name || '').toUpperCase(),
    tagline: `${t.base || ''}${t.power ? ` · ${t.power}` : ''}`.trim() || 'Formula 1 2026',
    foot: `gibol.co/formula-1-2026/team/${t.slug}`,
  };
}

function f1CardForDriver(d, team) {
  return {
    outFile: path.join(OG_DIR, 'f1', `driver-${d.slug}.png`),
    accent: team?.accent || '#E10600',
    sportTag: 'F1',
    eyebrow: `${d.code} · #${d.number} · F1 2026`,
    headline: (d.name || '').toUpperCase(),
    tagline: team?.name || 'Formula 1 2026',
    foot: `gibol.co/formula-1-2026/driver/${d.slug}`,
  };
}

const TENNIS_TIER_LABEL = {
  grand_slam: 'GRAND SLAM',
  masters1000: 'MASTERS 1000',
  wta1000: 'WTA 1000',
  combined1000: 'MASTERS · WTA 1000',
  atp_finals: 'ATP FINALS',
  wta_finals: 'WTA FINALS',
  atp500: 'ATP 500',
  wta500: 'WTA 500',
};

const TENNIS_TIER_ACCENT = {
  grand_slam: '#D4A13A',
  masters1000: '#9DA6AD',
  wta1000: '#D13D7D',
  combined1000: '#9DA6AD',
  atp_finals: '#C83030',
  wta_finals: '#C83030',
  atp500: '#1F6FB4',
  wta500: '#D13D7D',
};

function tennisCardForTournament(t, tennisPath) {
  const accent = t.accent || TENNIS_TIER_ACCENT[t.tier] || '#1F6FB4';
  const tierLabel = TENNIS_TIER_LABEL[t.tier] || (t.tier || '').toUpperCase();
  return {
    outFile: path.join(OG_DIR, 'tennis', `${t.slug}.png`),
    accent,
    sportTag: 'TENNIS',
    eyebrow: `${tierLabel} · 2026`,
    headline: (t.name || '').toUpperCase(),
    tagline: `${t.venue || ''}${t.city ? ` · ${t.city}` : ''}`.trim() || 'Tenis 2026',
    foot: `gibol.co${tennisPath(t, 2026)}`,
  };
}

function slCardForClub(c) {
  return {
    outFile: path.join(OG_DIR, 'super-league', `${c.slug}.png`),
    accent: c.accent || '#E2231A',
    sportTag: 'SUPER LEAGUE',
    eyebrow: 'SUPER LEAGUE INDONESIA · 2025/26',
    headline: (c.nameId || c.name || '').toUpperCase(),
    tagline: c.stadium ? `${c.stadium} · ${c.city}` : 'Liga 1 Indonesia 2025-26',
    foot: `gibol.co/super-league-2025-26/club/${c.slug}`,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await preload();
  const ents = await loadEntities();

  let total = 0;
  let failed = 0;

  // Per-sport batches. Render sequentially within a sport (sharp shares
  // the same SVG buffer pool); could parallelise but the script runs
  // once per release so simplicity wins.
  const batches = [
    { label: 'NBA per-team',         specs: ents.nbaTeams.map(nbaCardForTeam) },
    { label: 'EPL per-club',         specs: ents.eplClubs.map(eplCardForClub) },
    { label: 'F1 per-team',          specs: ents.f1Teams.map(f1CardForTeam) },
    { label: 'F1 per-driver',        specs: ents.f1Drivers.map((d) => f1CardForDriver(d, ents.f1TeamsById[d.teamId])) },
    { label: 'Tennis per-tournament', specs: ents.tennisTournaments.map((t) => tennisCardForTournament(t, ents.tennisPath)) },
    ents.slClubs && { label: 'Super League per-club', specs: ents.slClubs.map(slCardForClub) },
  ].filter(Boolean);

  for (const batch of batches) {
    console.log(`\n[entity-og] rendering ${batch.label} — ${batch.specs.length} cards`);
    for (const spec of batch.specs) {
      try {
        await renderCard(spec);
        total += 1;
      } catch (err) {
        console.error(`  ✗ ${spec.outFile}: ${err.message}`);
        failed += 1;
      }
    }
  }

  console.log(`\n[entity-og] done — ${total} cards written, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('[entity-og] fatal:', e);
  process.exit(1);
});
