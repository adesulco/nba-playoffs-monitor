"""Deterministic polish pass — runs BEFORE the hard quality gates.

Per voice-rules.md § 2:
  > Em-dash (—): Banned. Not Indonesian convention. Use comma or period.
  > Semicolon (;): Banned. Same reason.

Sonnet 4.6 has a strong em-dash bias from training data and emits them
regardless of explicit "tidak pakai em-dash" prompt instruction. Rather
than regenerate-loop on every preview (which costs tokens + adds latency),
we mechanically substitute em-dash → comma + space + lowercase-of-next-word
when that yields valid Bahasa. The voice rule prescribes this exact
remediation, so the polish is doctrine-compliant, not a workaround.

The hard banned-phrase gate runs AFTER polish — anything that survives is
a real authoring fault and triggers regeneration.

Polish is purely mechanical (no LLM, no judgment calls). What it does:

  1. em-dash (—)        → ", " (comma-space)
  2. en-dash (–) in body → ", " (same convention; en-dash leaks from same source)
  3. semicolon (;)      → ". " (period-space) — semicolons join independent
                          clauses, period-space preserves that semantic
  4. ellipsis ()       → "..." — Unicode → ASCII for consistency
  5. smart quotes      → straight quotes
  6. trailing whitespace stripped from each line
  7. consecutive blank lines collapsed to one

What it does NOT do:
  - Fix banned phrases (regenerate is correct response — that's a voice fault)
  - Fix tense markers (judgment call, voice_lint catches via Haiku)
  - Re-paragraph — formatting decisions stay the model's
"""

from __future__ import annotations

import re

import structlog

log = structlog.get_logger()


# En-dash handling: we replace EVERY en-dash, but the substitute differs
# by context. Between digits (scores like "3–1", ranges like "5–7"),
# substitute with ASCII hyphen so it still reads naturally. Otherwise
# (used as em-dash substitute, e.g. "menang malam ini – yang bikin
# gemas"), substitute with comma-space.
#
# Why universal substitution: the banned-phrase gate fails on ANY
# en-dash per voice-rules.md § 2 (en-dash is a subset of the em-dash
# ban). Earlier polish leaked digit-flanked en-dashes through which
# then failed the gate — "Posisi 5–7" in a section header survived
# polish but blocked the standings agent's first generation.
_EM_DASH_RE = re.compile(r"\s*—\s*")
_EN_DASH_DIGIT_RE = re.compile(r"(?<=\d)–(?=\d)")  # "3–1" / "5–7" → "3-1" / "5-7"
_EN_DASH_BODY_RE = re.compile(r"\s*–\s*")  # any other en-dash → ", "
_SEMICOLON_RE = re.compile(r"\s*;\s*")
_TRAIL_WS_RE = re.compile(r"[ \t]+$", re.MULTILINE)
_TRIPLE_BLANKS_RE = re.compile(r"\n{3,}")


_REPLACEMENTS = {
    "…": "...",   # ellipsis → three ASCII dots
    "“": '"',     # left double quote → straight
    "”": '"',
    "‘": "'",     # left single quote → straight
    "’": "'",
}


def polish(body_md: str) -> str:
    """Apply deterministic substitutions. Idempotent — running twice
    produces the same output as running once."""
    if not body_md:
        return body_md

    out = body_md

    # 1. em-dash → comma. Tighten surrounding whitespace too.
    out, em_n = _EM_DASH_RE.subn(", ", out)
    # 2a. digit-flanked en-dash → ASCII hyphen (preserves scores + ranges).
    out, en_digit_n = _EN_DASH_DIGIT_RE.subn("-", out)
    # 2b. any other en-dash → comma (em-dash substitute pattern).
    out, en_n = _EN_DASH_BODY_RE.subn(", ", out)
    en_n += en_digit_n
    # 3. semicolon → period
    out, sc_n = _SEMICOLON_RE.subn(". ", out)
    # 4. straight up character replacements
    smart_n = 0
    for src, dst in _REPLACEMENTS.items():
        before = out
        out = out.replace(src, dst)
        if out != before:
            smart_n += 1
    # 5. strip trailing whitespace
    out = _TRAIL_WS_RE.sub("", out)
    # 6. collapse blank lines
    out = _TRIPLE_BLANKS_RE.sub("\n\n", out)
    # 7. ensure single trailing newline
    out = out.rstrip("\n") + "\n"

    if em_n or en_n or sc_n or smart_n:
        log.info(
            "quality.polish.applied",
            em_dash=em_n,
            en_dash=en_n,
            semicolon=sc_n,
            smart_quotes=smart_n,
        )

    return out
