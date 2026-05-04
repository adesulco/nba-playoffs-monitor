"""Banned-phrase regex linter.

Hard quality gate. Reads ``prompts/banned-phrases.txt`` and checks the
draft body for any case-insensitive phrase match. Punctuation bans
(em-dash —, semicolon ;) are checked separately as literal characters.

Returns a ``BannedPhraseReport`` listing every match with line + offset.
A non-empty report = the draft FAILS publish. Caller should regenerate
(typically with the offending phrase highlighted in the next prompt).

Per CLAUDE.md non-negotiable rule #4: no bypass flags, no override.
First offense = regenerate, full stop.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import structlog

log = structlog.get_logger()

_PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"

# Punctuation bans live separately from the textual blocklist because they
# are single Unicode codepoints, not whole phrases. Per voice-rules.md § 2:
# em-dash and semicolon are banned in body copy. Triple dots are allowed
# only in quoted incomplete speech — too contextual for regex; flagged
# for voice_lint but not banned here.
_PUNCTUATION_BANS: dict[str, str] = {
    "—": "em-dash (—) — voice rule § 2",  # U+2014
    "–": "en-dash (–) — voice rule § 2 (subset of em-dash ban)",  # U+2013
    ";": "semicolon (;) — voice rule § 2",
}


@dataclass
class Match:
    """A single banned-phrase or punctuation hit."""

    phrase: str          # the phrase or character that matched
    rule: str            # human-readable rule reason (file source or punctuation)
    line: int            # 1-indexed line number in the draft
    column: int          # 1-indexed column where the match starts
    context: str         # ±20 chars around the match for the ship-note debug


@dataclass
class BannedPhraseReport:
    """Result of running banned_phrase.check() on a draft."""

    matches: list[Match] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not self.matches

    def summary(self) -> str:
        if self.passed:
            return "✓ banned-phrase: pass"
        lines = [f"✗ banned-phrase: {len(self.matches)} match(es)"]
        for m in self.matches:
            lines.append(f"   L{m.line}:C{m.column} '{m.phrase}' [{m.rule}]")
            lines.append(f"     ...{m.context}...")
        return "\n".join(lines)


# ── Loading ────────────────────────────────────────────────────────────────


_phrase_cache: list[str] | None = None


def _load_phrases() -> list[str]:
    """Read banned-phrases.txt, strip comments + blank lines + soft entries.

    Lines starting with `#` are comments. Within the file, a "SOFT
    DISCOURAGED" section uses `# anak asuh` syntax — we treat any
    commented entry as soft (not enforced here; voice_lint counts those
    differently). Hard bans are uncommented lines only.

    Cached for the process lifetime — phrase list is stable enough that
    re-reading on every call is wasteful.
    """
    global _phrase_cache
    if _phrase_cache is not None:
        return _phrase_cache
    path = _PROMPTS_DIR / "banned-phrases.txt"
    phrases: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if not s:
            continue
        if s.startswith("#"):
            # comments + soft-discouraged (commented). Skip.
            continue
        phrases.append(s)
    _phrase_cache = phrases
    log.info("banned_phrase.loaded", count=len(phrases))
    return phrases


# ── Check ──────────────────────────────────────────────────────────────────


def check(body_md: str) -> BannedPhraseReport:
    """Scan ``body_md`` for banned phrases + banned punctuation.

    Phrase match is case-insensitive whole-word-ish — we allow word
    boundaries OR punctuation boundaries on either side so "mari kita"
    matches in "Mari kita lihat..." but not in "carmari kitarus" (which
    wouldn't happen in practice but the boundary check is cheap insurance).

    Punctuation bans match the literal codepoint, no boundary.
    """
    matches: list[Match] = []
    phrases = _load_phrases()

    # Build a regex that's reasonably fast for our ~16 phrases. Compile
    # once per call — phrase list rarely changes within a process and
    # re.compile caches anyway.
    phrase_re = re.compile(
        r"(?i)\b(" + "|".join(re.escape(p) for p in phrases) + r")\b",
        flags=re.IGNORECASE,
    ) if phrases else None

    lines = body_md.splitlines()
    for line_num, line in enumerate(lines, start=1):
        # Phrases
        if phrase_re:
            for m in phrase_re.finditer(line):
                start = m.start()
                ctx_lo = max(0, start - 20)
                ctx_hi = min(len(line), start + len(m.group()) + 20)
                matches.append(Match(
                    phrase=m.group(),
                    rule=f"banned-phrases.txt entry '{m.group().lower()}'",
                    line=line_num,
                    column=start + 1,
                    context=line[ctx_lo:ctx_hi],
                ))

        # Punctuation bans
        for char, rule in _PUNCTUATION_BANS.items():
            idx = -1
            while True:
                idx = line.find(char, idx + 1)
                if idx == -1:
                    break
                ctx_lo = max(0, idx - 20)
                ctx_hi = min(len(line), idx + 1 + 20)
                matches.append(Match(
                    phrase=char,
                    rule=rule,
                    line=line_num,
                    column=idx + 1,
                    context=line[ctx_lo:ctx_hi],
                ))

    report = BannedPhraseReport(matches=matches)
    if report.passed:
        log.info("banned_phrase.pass")
    else:
        log.warning(
            "banned_phrase.fail",
            count=len(matches),
            phrases=[m.phrase for m in matches[:5]],  # don't spam logs
        )
    return report
