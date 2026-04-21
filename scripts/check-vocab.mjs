#!/usr/bin/env node
/**
 * Vocabulary guard — grep src/ for forbidden betting/gambling words in any
 * user-facing string. Runs as part of `npm run build` so regressions can't
 * land on production.
 *
 * Rule source: docs/v2-design-gaps.md §D8. Indonesian gambling law (KUHP 303,
 * UU 7/1974) + editorial policy forbid framing odds, Pick'em, or any feature
 * as betting.
 *
 * False-positive handling: the BANNED list uses word boundaries where
 * possible. Reference material (docs/, CLAUDE.md, this script, commit
 * messages, external README) is allowed — only src/ is scanned.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', 'src');

// Each entry: [regex, label]. Word boundaries keep 'bet' from matching
// 'between', 'better', 'albet', etc. Indonesian terms don't always have clean
// word boundaries so we match them literally — if a false positive lands, add
// an ALLOWLIST entry below.
const BANNED = [
  [/\btaruhan\b/i, 'taruhan'],
  [/\bbertaruh\b/i, 'bertaruh'],
  [/\bjudi\b/i, 'judi'],
  [/\bgambling\b/i, 'gambling'],
  [/\bgamble\b/i, 'gamble'],
  [/\bbetting\b/i, 'betting'],
  [/\bbet\b/i, 'bet'],
  [/\bbets\b/i, 'bets'],
  // `pasang` alone is ambiguous (can mean "install"/"put on"); only flag the
  // betting-adjacent phrases. Expand if regressions appear in copy.
  [/pasang\s+(taruhan|judi|bet)/i, 'pasang (wager context)'],
];

// Files where these strings are allowed as technical references (regex
// sources, vocab lists, gloss definitions that explicitly explain the rule).
// Any file whose absolute path ENDS with one of these suffixes is skipped.
const ALLOWLIST = [
  'scripts/check-vocab.mjs', // this file
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(SRC)) {
  if (ALLOWLIST.some((suffix) => file.endsWith(suffix))) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const [regex, label] of BANNED) {
      if (regex.test(lines[i])) {
        violations.push({ file, line: i + 1, label, preview: lines[i].trim().slice(0, 120) });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('\n❌ Vocabulary guard FAILED — gambling/betting words found in src/');
  console.error('   Rule: docs/v2-design-gaps.md §D8. Scrub and retry.\n');
  for (const v of violations) {
    const rel = v.file.replace(SRC, 'src');
    console.error(`  ${rel}:${v.line}  [${v.label}]  ${v.preview}`);
  }
  console.error('');
  process.exit(1);
}

console.log('✓ Vocabulary guard passed — no banned terms in src/');
