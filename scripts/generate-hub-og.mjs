#!/usr/bin/env node
/**
 * scripts/generate-hub-og.mjs — Brand + sport-hub OG card generator.
 *
 * Outputs:
 *   public/og-image.png            (1200×630 default fallback)
 *   public/og/hub-nba.png
 *   public/og/hub-epl.png
 *   public/og/hub-f1.png
 *   public/og/hub-tennis.png
 *   public/og/hub-fifa-wc.png
 *   public/og/hub-liga1.png
 *
 * Why static: same Hobby-plan rule as the F1 recap generator — runtime
 * @vercel/og is reserved for the dynamic per-game NBA cards. Hubs are
 * stable, so PNG-once-and-serve-from-edge is faster + cheaper.
 *
 * Usage:
 *   node scripts/generate-hub-og.mjs
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const OG_DIR = path.join(PUBLIC_DIR, 'og');
const FONT_DIR = path.join(__dirname, 'fonts');
const LOGO_PATH = path.join(PUBLIC_DIR, 'gibol-logo-1024.png');

const W = 1200;
const H = 630;

// Brand palette — matches src/index.css dark theme tokens.
const BG_TOP = '#0A1628';
const BG_BOT = '#13223D';
const INK    = '#F5F1EA';
const INK_DIM = '#9AA3B5';
const INK_FAINT = '#5A6275';
const AMBER  = '#F59E0B';

// Per-sport accent + copy. Accents pulled from each sport's brand or the
// repo's canonical hex (NBA red from constants.js, EPL purple from
// premier-league-2025-26 hub, F1 red from generate-f1-recap.mjs, tennis
// hard-court blue from COLORS.tennisHard, FIFA WC navy, Liga 1 red).
const SPORTS = [
  {
    slug: 'nba',
    accent: '#c8102e',
    eyebrow: 'NBA · 2026 PLAYOFFS',
    headline: 'NBA PLAYOFFS 2026',
    tagline: 'Skor live · bracket · peluang juara · play-by-play',
    foot: 'gibol.co/nba-playoff-2026',
  },
  {
    slug: 'epl',
    accent: '#37003c',
    eyebrow: 'PREMIER LEAGUE · 2025/26',
    headline: 'LIGA INGGRIS 2025-26',
    tagline: 'Klasemen · top skor · jadwal · 20 klub live',
    foot: 'gibol.co/premier-league-2025-26',
  },
  {
    slug: 'f1',
    accent: '#E8002D',
    eyebrow: 'FORMULA 1 · 2026',
    headline: 'FORMULA 1 2026',
    tagline: 'Klasemen · 23 Grand Prix · podium · hasil live',
    foot: 'gibol.co/formula-1-2026',
  },
  {
    slug: 'tennis',
    accent: '#1F6FB4',
    eyebrow: 'ATP · WTA · 2026',
    headline: 'TENIS 2026',
    tagline: 'Grand Slam · Masters 1000 · Race ke Finals',
    foot: 'gibol.co/tennis',
  },
  {
    slug: 'fifa-wc',
    accent: '#326295',
    eyebrow: 'FIFA WORLD CUP · 2026',
    headline: 'PIALA DUNIA 2026',
    tagline: 'USA · Meksiko · Kanada · kickoff Juni 2026',
    foot: 'gibol.co/fifa-world-cup-2026',
  },
  {
    slug: 'liga1',
    accent: '#dc2626',
    eyebrow: 'BRI LIGA 1 · 2025/26',
    headline: 'LIGA 1 INDONESIA',
    tagline: 'Klasemen · jadwal · top skor · 18 klub',
    foot: 'gibol.co/liga-1-2026',
  },
];

// Default brand card — replaces the stale Apr-18 og-image.png.
const DEFAULT_CARD = {
  outFile: path.join(PUBLIC_DIR, 'og-image.png'),
  accent: AMBER,
  eyebrow: 'GILA BOLA · LIVE DASHBOARD',
  headline: 'GILA BOLA.',
  tagline: 'NBA · Liga Inggris · F1 · Tenis · Piala Dunia 2026',
  foot: 'gibol.co · live · bahasa indonesia',
};

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
      @font-face {
        font-family: 'Bebas Neue';
        src: url(data:font/ttf;base64,${FONT_BEBAS_B64}) format('truetype');
        font-weight: normal;
      }
      @font-face {
        font-family: 'Space Grotesk';
        src: url(data:font/ttf;base64,${FONT_SPACE_B64}) format('truetype');
        font-weight: 700;
      }
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

function buildSvg({ accent, eyebrow, headline, tagline, foot }) {
  const logoSize = 140;
  const logoX = 60;
  const logoY = 60;

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
      <stop offset="0%"  stop-color="${accent}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <rect width="${W}" height="${H}" fill="url(#glow)" />

  <!-- top accent strip -->
  <rect x="0" y="0" width="${W}" height="8" fill="${accent}" />

  <!-- logo (embedded PNG) -->
  <image xlink:href="data:image/png;base64,${LOGO_B64}"
         x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" />

  <!-- wordmark beside logo -->
  <text x="${logoX + logoSize + 24}" y="${logoY + 70}"
        fill="${INK}" class="sans" font-size="56">gibol.co</text>
  <text x="${logoX + logoSize + 26}" y="${logoY + 110}"
        fill="${INK_DIM}" class="sans" font-size="22">gila bola · live multi-sport</text>

  <!-- eyebrow -->
  <text x="${logoX}" y="${logoY + logoSize + 80}"
        fill="${accent}" class="mono" font-size="22">${escapeXml(eyebrow)}</text>

  <!-- headline -->
  <text x="${logoX}" y="${logoY + logoSize + 170}"
        fill="${INK}" class="headline" font-size="92">${escapeXml(headline)}</text>

  <!-- tagline -->
  <text x="${logoX}" y="${logoY + logoSize + 220}"
        fill="${INK_DIM}" class="sans" font-size="26">${escapeXml(tagline)}</text>

  <!-- footer left: foot URL -->
  <text x="${logoX}" y="${H - 36}"
        fill="${INK_FAINT}" class="mono" font-size="18">${escapeXml(foot)}</text>

  <!-- footer right: live pill -->
  <rect x="${W - 220}" y="${H - 64}" width="160" height="36"
        fill="${accent}" rx="6" />
  <circle cx="${W - 200}" cy="${H - 46}" r="5" fill="${INK}" />
  <text x="${W - 184}" y="${H - 40}"
        fill="${INK}" class="mono" font-size="16">LIVE · BAHASA</text>
</svg>`;
}

async function renderCard({ outFile, accent, eyebrow, headline, tagline, foot }) {
  const svg = buildSvg({ accent, eyebrow, headline, tagline, foot });
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outFile);
  const stat = await fs.stat(outFile);
  console.log(`✓ ${path.relative(REPO_ROOT, outFile)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function main() {
  await preload();

  // 1. Default brand card → public/og-image.png
  await renderCard(DEFAULT_CARD);

  // 2. Per-sport hub cards → public/og/hub-{slug}.png
  for (const sport of SPORTS) {
    await renderCard({
      outFile: path.join(OG_DIR, `hub-${sport.slug}.png`),
      accent: sport.accent,
      eyebrow: sport.eyebrow,
      headline: sport.headline,
      tagline: sport.tagline,
      foot: sport.foot,
    });
  }

  console.log(`\n[hub-og] done — ${1 + SPORTS.length} cards written.`);
}

main().catch((e) => {
  console.error('[hub-og] fatal:', e);
  process.exit(1);
});
