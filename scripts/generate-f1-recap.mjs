#!/usr/bin/env node
/**
 * scripts/generate-f1-recap.mjs — Catatan Race PNG generator.
 *
 * Produces three share-card PNGs per completed Grand Prix:
 *   - og     : 1200 × 630  (Twitter/Facebook/WhatsApp link preview)
 *   - story  : 1080 × 1920 (IG/WA Stories, vertical phone)
 *   - square : 1080 × 1080 (IG feed posts)
 *
 * Data source: Jolpica-F1 /{season}/{round}/results.json (Ergast successor).
 * Output: public/og/f1/2026-R{nn}-{slug}-{variant}.png
 *
 * Usage:
 *   node scripts/generate-f1-recap.mjs --round 3
 *   node scripts/generate-f1-recap.mjs --all-past            # every past GP
 *   node scripts/generate-f1-recap.mjs --round 3 --variant og
 *   node scripts/generate-f1-recap.mjs --dry-run --round 3   # print data, skip png write
 *
 * Design: dark gradient background, gibol.co wordmark top-left, F1-red accent,
 * three podium chips with team accent bar, Bahasa hook quote, circuit+date footer.
 *
 * Why static PNGs over @vercel/og at runtime: project rule 7 — hot paths must
 * stay light on Hobby-plan Vercel. One-shot generation per race is enough;
 * regenerate by re-running this script after the chequered flag.
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SEASON,
  CALENDAR_2026,
  CALENDAR_BY_ROUND,
  TEAMS_2026,
  formatGPDate,
} from '../src/lib/sports/f1/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'og', 'f1');
const FONT_DIR = path.join(__dirname, 'fonts');

// ─── Design tokens (match repo COLORS) ───────────────────────────────────────
const COLORS = {
  bgTop: '#0A0A0F',
  bgBot: '#15151F',
  bgAccent: '#1E1E2E',
  ink: '#F5F5F5',
  inkDim: '#A8A8B3',
  inkFaint: '#5A5A6A',
  f1Red: '#E8002D',
  quoteBg: 'rgba(245, 245, 245, 0.06)',
  quoteBorder: 'rgba(245, 245, 245, 0.15)',
};

// Map Jolpica constructor name / id → hex accent.
// Jolpica returns Constructor.name like "Red Bull", "McLaren", "Ferrari",
// "Mercedes", etc. Normalise by lowercasing + stripping punctuation.
function accentForConstructor(teamName) {
  if (!teamName) return COLORS.f1Red;
  const key = String(teamName).toLowerCase();
  if (key.includes('red bull')) return '#3671C6';
  if (key.includes('mclaren')) return '#FF8000';
  if (key.includes('ferrari')) return '#E8002D';
  if (key.includes('mercedes')) return '#27F4D2';
  if (key.includes('aston')) return '#229971';
  if (key.includes('alpine')) return '#FF87BC';
  if (key.includes('williams')) return '#64C4FF';
  if (key.includes('rb') || key.includes('racing bulls') || key.includes('alphatauri') || key.includes('visa cash')) return '#6692FF';
  if (key.includes('audi') || key.includes('sauber')) return '#00A19B';
  if (key.includes('haas')) return '#B6BABD';
  if (key.includes('cadillac')) return '#C6AF7F';
  return COLORS.f1Red;
}

// ─── Fonts — base64-embed TTFs so sharp/librsvg renders without net deps ────
let FONT_BEBAS_B64 = null;
let FONT_SPACE_B64 = null;
async function loadFonts() {
  if (FONT_BEBAS_B64 && FONT_SPACE_B64) return;
  const [b, s] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, 'BebasNeue-Regular.ttf')),
    fs.readFile(path.join(FONT_DIR, 'SpaceGrotesk-Bold.ttf')),
  ]);
  FONT_BEBAS_B64 = b.toString('base64');
  FONT_SPACE_B64 = s.toString('base64');
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
      .headline { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.02em; }
      .mono     { font-family: 'Space Grotesk', monospace; font-weight: 700; }
      .sans     { font-family: 'Space Grotesk', sans-serif; font-weight: 700; }
    ]]></style>
  `;
}

// ─── Copy helpers — Bahasa-casual hook quote per podium shape ────────────────
function bahasaHook(gp, podium) {
  const p1 = podium[0];
  if (!p1) return `${gp.name} 2026 — Minggu seru di ${gp.circuit}.`;
  const first = p1.name.split(' ')[0];
  // A few rotating casual lines, deterministic by round for repeatability.
  const variants = [
    `${first} menang di ${gp.circuit}. Tonton breakdown-nya di gibol.co.`,
    `${first} juara lagi. Klasemen 2026 makin panas.`,
    `${first} dominan — ${p1.code} ambil P1 di ${gp.circuit}.`,
    `${first} naik podium teratas. Satu lagi buat rak piala.`,
  ];
  return variants[gp.round % variants.length];
}

// ─── Jolpica fetch ──────────────────────────────────────────────────────────
async function fetchRoundResults(round) {
  const url = `https://api.jolpi.ca/ergast/f1/${SEASON}/${round}/results.json`;
  const r = await fetch(url, { headers: { 'User-Agent': 'gibol.co recap-gen' } });
  if (!r.ok) throw new Error(`Jolpica ${r.status} for round ${round}`);
  const json = await r.json();
  const race = json?.MRData?.RaceTable?.Races?.[0];
  if (!race) return null;
  const top3 = (race.Results || []).slice(0, 3).map((res) => ({
    position: Number(res.position) || null,
    code: res.Driver?.code || '',
    name: `${res.Driver?.givenName || ''} ${res.Driver?.familyName || ''}`.trim(),
    teamName: res.Constructor?.name || '',
    time: res.Time?.time || res.status || '',
    status: res.status || '',
  }));
  return { round: Number(race.round), raceName: race.raceName, date: race.date, podium: top3 };
}

// ─── SVG builders ───────────────────────────────────────────────────────────
function escapeXml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// P1/P2/P3 gap/time display. P1 shows raw time; P2/P3 show +gap if present.
function formatTimeCell(p, index) {
  if (!p || !p.time) return '';
  if (p.status && !p.status.toLowerCase().includes('finished') && !p.time.includes(':') && !p.time.startsWith('+')) {
    return p.status;
  }
  return p.time;
}

// Family-name-only. "Andrea Kimi Antonelli" → "Antonelli", "Max Verstappen" → "Verstappen".
function familyName(full) {
  if (!full) return '';
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1];
}

// Greedy word-wrap at `maxChars` per line. Returns an array of lines.
function wrapText(text, maxChars) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildSvg({ width, height, gp, podium, hook, variant }) {
  const fontCss = fontFaceBlock();
  const p1 = podium[0] || {};
  const p2 = podium[1] || {};
  const p3 = podium[2] || {};

  // Shared header helpers
  const logoCircle = (cx, cy, r) => `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLORS.f1Red}" />
    <text x="${cx}" y="${cy + r * 0.35}" text-anchor="middle"
          font-size="${r * 1.2}" fill="${COLORS.ink}" class="headline">G</text>
  `;

  // Podium row — reusable across variants.
  // Layout: [accent bar][Pn label][CODE huge][family-name + team stacked][time right-aligned]
  // `colPos`, `colCode`, `colName`, `colTime` control horizontal anchors so each
  // variant can tune its own spacing and not fight name overflow.
  function podiumRow({
    y, rowHeight, rowGap,
    colPos, colCode, colName, colTimeRight,
    posFont, codeFont, nameFont, teamFont, timeFont,
  }) {
    const rows = [p1, p2, p3];
    return rows.map((p, i) => {
      if (!p || !p.code) return '';
      const rowY = y + i * (rowHeight + rowGap);
      const accent = accentForConstructor(p.teamName);
      const posLabel = ['P1', 'P2', 'P3'][i];
      const midY = rowY + rowHeight * 0.5;
      return `
        <rect x="${colPos - 24}" y="${rowY}" width="${colTimeRight + 24 - (colPos - 24)}" height="${rowHeight}"
              fill="${COLORS.bgAccent}" rx="10" />
        <rect x="${colPos - 24}" y="${rowY}" width="8" height="${rowHeight}"
              fill="${accent}" rx="3" />
        <text x="${colPos}" y="${midY + posFont * 0.35}"
              fill="${COLORS.inkDim}" class="mono" font-size="${posFont}">${posLabel}</text>
        <text x="${colCode}" y="${midY + codeFont * 0.35}"
              fill="${COLORS.ink}" class="headline" font-size="${codeFont}">${escapeXml(p.code)}</text>
        <text x="${colName}" y="${midY - 4}"
              fill="${COLORS.ink}" class="sans" font-size="${nameFont}">${escapeXml(familyName(p.name))}</text>
        <text x="${colName}" y="${midY + teamFont + 6}"
              fill="${COLORS.inkDim}" class="sans" font-size="${teamFont}">${escapeXml(p.teamName)}</text>
        <text x="${colTimeRight}" y="${midY + timeFont * 0.35}" text-anchor="end"
              fill="${COLORS.ink}" class="mono" font-size="${timeFont}">${escapeXml(formatTimeCell(p, i))}</text>
      `;
    }).join('\n');
  }

  // ─── OG (1200 × 630) ─────────────────────────────────────────────────────
  if (variant === 'og') {
    const podiumSvg = podiumRow({
      y: 252, rowHeight: 72, rowGap: 8,
      colPos: 84, colCode: 174, colName: 364, colTimeRight: width - 60,
      posFont: 20, codeFont: 40, nameFont: 26, teamFont: 14, timeFont: 22,
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${fontCss}
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.bgTop}" />
      <stop offset="100%" stop-color="${COLORS.bgBot}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect x="0" y="0" width="${width}" height="6" fill="${COLORS.f1Red}" />

  <!-- Header row -->
  ${logoCircle(78, 70, 26)}
  <text x="120" y="80" fill="${COLORS.ink}" class="sans" font-size="28">gibol.co</text>
  <text x="${width - 60}" y="80" text-anchor="end"
        fill="${COLORS.f1Red}" class="headline" font-size="30">F1 · 2026</text>

  <!-- Section label + GP name + circuit -->
  <text x="60" y="148" fill="${COLORS.inkDim}" class="mono" font-size="18">
    CATATAN RACE · ROUND ${String(gp.round).padStart(2, '0')}
  </text>
  <text x="60" y="200" fill="${COLORS.ink}" class="headline" font-size="58">
    ${escapeXml(gp.name.toUpperCase())}
  </text>
  <text x="60" y="228" fill="${COLORS.inkDim}" class="sans" font-size="18">
    ${escapeXml(gp.circuit)}
  </text>

  <!-- Podium -->
  ${podiumSvg}

  <!-- Quote -->
  <rect x="60" y="${height - 128}" width="${width - 120}" height="56"
        fill="${COLORS.quoteBg}" stroke="${COLORS.quoteBorder}" stroke-width="1" rx="8" />
  <text x="80" y="${height - 92}" fill="${COLORS.ink}" class="sans" font-size="20">
    ${escapeXml('"' + hook + '"')}
  </text>

  <!-- Footer meta -->
  <text x="60" y="${height - 28}" fill="${COLORS.inkFaint}" class="mono" font-size="14">
    ${escapeXml(gp.circuit.toUpperCase())} · ${escapeXml(formatGPDate(gp.dateISO, 'id').toUpperCase())}
  </text>
  <text x="${width - 60}" y="${height - 28}" text-anchor="end"
        fill="${COLORS.f1Red}" class="mono" font-size="14">GIBOL.CO/F1</text>
</svg>`;
  }

  // ─── Story (1080 × 1920) ─────────────────────────────────────────────────
  if (variant === 'story') {
    // Pick a GP-name font size that fits 1080 - 2*60 = 960 width roughly.
    // Rough rule: ~0.6 * fontSize * chars ≤ 960 → fontSize ≤ 960 / (0.6 * chars).
    // "MEXICO CITY GP" is 14 chars → fontSize ≤ 114. "JAPANESE GP" 11 → ≤ 145.
    const nameLen = gp.name.toUpperCase().length;
    const gpFont = Math.min(130, Math.floor(920 / (0.55 * nameLen)));

    const podiumSvg = podiumRow({
      y: 900, rowHeight: 160, rowGap: 20,
      colPos: 90, colCode: 230, colName: 450, colTimeRight: width - 60,
      posFont: 36, codeFont: 92, nameFont: 46, teamFont: 26, timeFont: 36,
    });

    // Quote wrap helper: break at ~38 chars for 960px @ 34px font
    const wrapped = wrapText(hook, 38);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${fontCss}
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.bgTop}" />
      <stop offset="55%" stop-color="${COLORS.bgBot}" />
      <stop offset="100%" stop-color="${COLORS.bgTop}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect x="0" y="0" width="${width}" height="12" fill="${COLORS.f1Red}" />

  <!-- Header -->
  ${logoCircle(88, 120, 38)}
  <text x="148" y="134" fill="${COLORS.ink}" class="sans" font-size="40">gibol.co</text>
  <text x="${width - 60}" y="134" text-anchor="end"
        fill="${COLORS.f1Red}" class="headline" font-size="40">F1 · 2026</text>

  <!-- Section label -->
  <text x="60" y="290" fill="${COLORS.inkDim}" class="mono" font-size="28">
    CATATAN RACE · ROUND ${String(gp.round).padStart(2, '0')}
  </text>

  <!-- GP name on one line, circuit below -->
  <text x="60" y="${290 + gpFont + 30}" fill="${COLORS.ink}" class="headline" font-size="${gpFont}">
    ${escapeXml(gp.name.toUpperCase())}
  </text>
  <text x="60" y="${290 + gpFont + 80}" fill="${COLORS.inkDim}" class="sans" font-size="32">
    ${escapeXml(gp.circuit)} · ${escapeXml(formatGPDate(gp.dateISO, 'id').toUpperCase())}
  </text>

  <!-- Podium header + rows -->
  <text x="60" y="840" fill="${COLORS.f1Red}" class="mono" font-size="28">PODIUM</text>
  ${podiumSvg}

  <!-- Quote -->
  <rect x="60" y="1500" width="${width - 120}" height="220"
        fill="${COLORS.quoteBg}" stroke="${COLORS.quoteBorder}" stroke-width="2" rx="16" />
  ${wrapped.map((line, i) => `
    <text x="96" y="${1560 + i * 44}" fill="${COLORS.ink}" class="sans" font-size="34">${escapeXml((i === 0 ? '"' : '') + line + (i === wrapped.length - 1 ? '"' : ''))}</text>
  `).join('')}
  <text x="96" y="${1580 + wrapped.length * 44 + 40}" fill="${COLORS.inkDim}" class="mono" font-size="22">— gibol.co/f1</text>

  <!-- Footer -->
  <text x="60" y="${height - 100}" fill="${COLORS.inkFaint}" class="mono" font-size="22">
    ${escapeXml(gp.circuit.toUpperCase())}
  </text>
  <text x="60" y="${height - 60}" fill="${COLORS.inkFaint}" class="mono" font-size="22">
    ${escapeXml(formatGPDate(gp.dateISO, 'id').toUpperCase())} · ${escapeXml(gp.wibTime)} WIB
  </text>
  <text x="${width - 60}" y="${height - 60}" text-anchor="end"
        fill="${COLORS.f1Red}" class="headline" font-size="40">F1 2026</text>
</svg>`;
  }

  // ─── Square (1080 × 1080) ────────────────────────────────────────────────
  const sqNameLen = gp.name.toUpperCase().length;
  const sqGpFont = Math.min(90, Math.floor(980 / (0.55 * sqNameLen)));
  const sqPodium = podiumRow({
    y: 440, rowHeight: 118, rowGap: 14,
    colPos: 84, colCode: 210, colName: 430, colTimeRight: width - 60,
    posFont: 28, codeFont: 68, nameFont: 40, teamFont: 22, timeFont: 30,
  });
  const sqWrapped = wrapText(hook, 44);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${fontCss}
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.bgTop}" />
      <stop offset="100%" stop-color="${COLORS.bgBot}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect x="0" y="0" width="${width}" height="8" fill="${COLORS.f1Red}" />

  <!-- Header -->
  ${logoCircle(78, 90, 30)}
  <text x="124" y="102" fill="${COLORS.ink}" class="sans" font-size="32">gibol.co</text>
  <text x="${width - 50}" y="102" text-anchor="end"
        fill="${COLORS.f1Red}" class="headline" font-size="34">F1 · 2026</text>

  <!-- Section label + GP -->
  <text x="50" y="216" fill="${COLORS.inkDim}" class="mono" font-size="24">
    CATATAN RACE · ROUND ${String(gp.round).padStart(2, '0')}
  </text>
  <text x="50" y="${216 + sqGpFont + 16}" fill="${COLORS.ink}" class="headline" font-size="${sqGpFont}">
    ${escapeXml(gp.name.toUpperCase())}
  </text>
  <text x="50" y="${216 + sqGpFont + 54}" fill="${COLORS.inkDim}" class="sans" font-size="24">
    ${escapeXml(gp.circuit)}
  </text>

  <!-- Podium -->
  ${sqPodium}

  <!-- Quote -->
  <rect x="50" y="860" width="${width - 100}" height="${sqWrapped.length > 1 ? 150 : 100}"
        fill="${COLORS.quoteBg}" stroke="${COLORS.quoteBorder}" stroke-width="1.5" rx="12" />
  ${sqWrapped.map((line, i) => `
    <text x="80" y="${910 + i * 40}" fill="${COLORS.ink}" class="sans" font-size="28">${escapeXml((i === 0 ? '"' : '') + line + (i === sqWrapped.length - 1 ? '"' : ''))}</text>
  `).join('')}

  <!-- Footer -->
  <text x="50" y="${height - 40}" fill="${COLORS.inkFaint}" class="mono" font-size="20">
    ${escapeXml(formatGPDate(gp.dateISO, 'id').toUpperCase())}
  </text>
  <text x="${width - 50}" y="${height - 40}" text-anchor="end"
        fill="${COLORS.f1Red}" class="headline" font-size="30">GIBOL.CO/F1</text>
</svg>`;
}

// ─── PNG writer ─────────────────────────────────────────────────────────────
async function writeVariant(gp, podium, variant, dryRun = false) {
  const sizes = {
    og:     { width: 1200, height: 630 },
    story:  { width: 1080, height: 1920 },
    square: { width: 1080, height: 1080 },
  };
  const { width, height } = sizes[variant];
  const hook = bahasaHook(gp, podium);
  const svg = buildSvg({ width, height, gp, podium, hook, variant });
  const fname = `2026-R${String(gp.round).padStart(2, '0')}-${gp.slug}-${variant}.png`;
  const out = path.join(OUT_DIR, fname);

  if (dryRun) {
    console.log(`[dry-run] would write ${out} (${width}×${height})`);
    return out;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  const stat = await fs.stat(out);
  console.log(`✓ ${path.relative(REPO_ROOT, out)} (${(stat.size / 1024).toFixed(1)} KB)`);
  return out;
}

// ─── CLI ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { round: null, allPast: false, variant: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--round') args.round = Number(argv[++i]);
    else if (a === '--all-past') args.allPast = true;
    else if (a === '--variant') args.variant = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/generate-f1-recap.mjs [options]
  --round N       Generate for a single round
  --all-past      Generate for every GP whose dateISO is today or earlier
  --variant V     og | story | square  (default: all three)
  --dry-run       Print plan; don't write PNGs
`);
      process.exit(0);
    }
  }
  return args;
}

function pastRounds(today = new Date().toISOString().slice(0, 10)) {
  return CALENDAR_2026.filter((gp) => gp.dateISO <= today).map((gp) => gp.round);
}

async function main() {
  const args = parseArgs(process.argv);
  await loadFonts();

  const rounds = args.allPast
    ? pastRounds()
    : (args.round != null ? [args.round] : []);

  if (rounds.length === 0) {
    console.error('Missing target. Pass --round N or --all-past.');
    process.exit(1);
  }

  const variants = args.variant ? [args.variant] : ['og', 'story', 'square'];

  console.log(`[recap] rounds=${rounds.join(',')} variants=${variants.join(',')}${args.dryRun ? ' (dry-run)' : ''}`);

  let ok = 0;
  let fail = 0;
  for (const round of rounds) {
    const gp = CALENDAR_BY_ROUND[String(round)];
    if (!gp) {
      console.error(`  round ${round}: not in CALENDAR_2026, skipping`);
      fail++;
      continue;
    }
    let results;
    try {
      results = await fetchRoundResults(round);
    } catch (e) {
      console.error(`  round ${round}: Jolpica fetch failed — ${e.message}`);
      fail++;
      continue;
    }
    if (!results || !results.podium || results.podium.length < 3) {
      console.error(`  round ${round}: no podium yet, skipping`);
      fail++;
      continue;
    }
    console.log(`\n[R${round}] ${gp.name} — P1 ${results.podium[0].code} · P2 ${results.podium[1].code} · P3 ${results.podium[2].code}`);
    for (const v of variants) {
      try {
        await writeVariant(gp, results.podium, v, args.dryRun);
        ok++;
      } catch (e) {
        console.error(`  ${v}: render failed — ${e.message}`);
        fail++;
      }
    }
  }

  console.log(`\n[recap] done — ${ok} PNG written, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('[recap] fatal:', e);
  process.exit(1);
});
