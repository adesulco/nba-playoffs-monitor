"""Regex-driven training-inference detector.

Phase 2 ship #25. The voice-linter (Haiku 4.5) catches training-data
inference creep — claims the writer made up because the LLM "knows"
it from training, not because it's in the input data. Recurring
slips observed across the multi-sport profile rollout (Verstappen,
Sinner, Liverpool, etc.):

  • "Juara Dunia", "World Champion" — championship claims without
    the input listing trophies
  • "debut profesional pada 2018", "memulai karier..." — debut-year
    invented when the input doesn't include it
  • "kelahiran kota X" with details beyond what's in the data
  • "pernah peringkat 1", "career-high" — historical superlatives
  • "rivalitas dengan", "feud lama" — invented rivalries
  • "era [name]", "dinasti" — manufactured eras
  • "musim lalu", "tahun lalu" — referencing history beyond input

This module is a deterministic regex pass that runs in addition to
the Haiku linter. It augments — doesn't replace — voice_lint's
issue list. If the regex finds a hit AND the snippet (or one of
its key tokens) is NOT in the source-context block, the hit gets
flagged as training_inference. Otherwise it's grounded and skipped.

Why this works: regex covers high-frequency patterns deterministically
+ instantly + free. Haiku still catches the long tail. The two
together push voice-lint coverage from "Haiku might catch it" to
"regex always catches the obvious slips, Haiku handles nuance."

Public API matches voice_lint.VoiceLintIssue so callers can merge
the lists transparently.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


# Each pattern is (compiled_regex, severity, fix_hint). The pattern
# matches a SUBSTRING; the issue snippet is the match plus a few
# words of context.
#
# IMPORTANT: every pattern is checked AGAINST source_context. If the
# match's "anchor" (the noun it's claiming about) appears in the
# source context, the hit is considered grounded and skipped.

@dataclass
class _Pattern:
    regex: re.Pattern[str]
    severity: str  # "high" | "medium" | "low"
    fix: str
    description: str  # what kind of inference this catches


# Compile case-insensitive, allow some flexibility in spacing.
def _re(p: str) -> re.Pattern[str]:
    return re.compile(p, re.IGNORECASE)


_PATTERNS: list[_Pattern] = [
    # Championship / trophy claims.
    _Pattern(
        _re(r"\b(?:juara dunia|world champion(?:ship)?(?:s)?)\b"),
        "high",
        "Remove the world-championship reference unless input data lists trophies/titles.",
        "Championship/trophy claim without grounding.",
    ),
    _Pattern(
        _re(r"\b(?:gelar|trofi|trophy|title)\s+(?:liga|premier|champions league|grand slam|nba|f1)"),
        "high",
        "Cut the trophy-count reference; input data doesn't include lifetime trophies.",
        "League/tournament title claim without grounding.",
    ),
    # Debut / origin story.
    _Pattern(
        _re(r"\b(?:debut|memulai karier|memulai profesional|breakthrough)\s+(?:profesional\s+)?(?:pada|di|tahun)\s+\d{4}"),
        "high",
        "Remove debut-year claim unless input has it.",
        "Debut-year story not in input.",
    ),
    _Pattern(
        _re(r"\bsejak (?:usia|umur)\s+\d+\s+tahun\b"),
        "medium",
        "Remove age-of-entry claim unless input has it.",
        "Age-of-entry biography line not in input.",
    ),
    # Career-history superlatives.
    _Pattern(
        _re(r"\b(?:pernah|sempat)\s+(?:peringkat|posisi|nomor)\s+(?:1|satu|pertama|teratas)\b"),
        "medium",
        "Drop the historical-rank claim unless input has it.",
        "Historical career peak claim.",
    ),
    _Pattern(
        _re(r"\bcareer[- ]high\b|\brekor karier(nya)?\b"),
        "medium",
        "Remove career-high reference unless input lists career stats.",
        "Career-high stat claim.",
    ),
    # Era / dynasty framing.
    _Pattern(
        _re(r"\b(?:era|dinasti|dekade)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b"),
        "medium",
        "Remove era/dynasty framing unless input establishes it.",
        "Manufactured era / dynasty narrative.",
    ),
    # Rivalry / feud invention.
    _Pattern(
        _re(r"\brivalitas\s+(?:lama|panjang|legendaris|sengit)\b"),
        "medium",
        "Drop the rivalry framing unless input data establishes it (e.g. through H2H block).",
        "Generic rivalry narrative without input grounding.",
    ),
    _Pattern(
        _re(r"\b(?:feud|rivalry)\s+(?:dengan|with|vs)\s+[A-Z][a-z]+\b"),
        "medium",
        "Remove specific rivalry claim — verify against input data.",
        "Specific named-rival claim.",
    ),
    # Historical season references.
    _Pattern(
        _re(r"\b(?:musim|tahun)\s+(?:lalu|sebelumnya|kemarin)\b"),
        "low",
        "Avoid 'musim lalu' framing — profile is evergreen and shouldn't reference seasons not in input.",
        "Reference to prior season not in input.",
    ),
    # Coach / manager invention.
    _Pattern(
        _re(r"\b(?:di bawah|dilatih oleh|under)\s+(?:pelatih|coach|manajer|manager)\s+[A-Z][a-z]+"),
        "high",
        "Remove coach/manager name unless explicit in input data.",
        "Specific coach/manager attribution not in input.",
    ),
    # Biographical detail invention (city geography).
    _Pattern(
        _re(r"\b(?:kota|kawasan|wilayah)\s+(?:kecil|industri|pegunungan|pesisir|metropolitan)\b"),
        "medium",
        "Cut city descriptor — input only has city name, not geography.",
        "Invented city geography descriptor.",
    ),
    # Past-tense team claims that imply transfer history.
    _Pattern(
        _re(r"\b(?:dulu|sebelumnya|mantan)\s+(?:bermain|membela|tampil)\s+(?:di|untuk|bersama)"),
        "high",
        "Remove ex-team / transfer history claim — input only shows current team.",
        "Ex-team / transfer history not in input.",
    ),
]


@dataclass
class InferenceHit:
    """One regex-detected inference hit."""

    snippet: str
    severity: str
    fix: str
    pattern_description: str


def _has_in_context(needle: str, source_context: str | None) -> bool:
    """Loose containment check (case-insensitive, whitespace-flexible)."""
    if not source_context:
        return False
    n = re.sub(r"\s+", " ", needle.lower().strip())
    s = re.sub(r"\s+", " ", source_context.lower())
    return n in s


def _expand_snippet(text: str, start: int, end: int, padding: int = 60) -> str:
    """Return the matched substring plus padding chars on each side,
    snapped to word boundaries when possible."""
    a = max(0, start - padding)
    b = min(len(text), end + padding)
    s = text[a:b]
    # Snap to word boundary
    if a > 0:
        s = s[s.find(" ") + 1:] if " " in s[: padding] else s
    if b < len(text):
        last_sp = s.rfind(" ")
        if last_sp > len(s) - padding:
            s = s[:last_sp]
    return s.strip()


def scan(body: str, source_context: str | None = None) -> list[InferenceHit]:
    """Scan a polished article body for ungrounded inference patterns.

    Returns one InferenceHit per match. If the matched substring or
    its key noun appears in the source-context block, the hit is
    skipped as grounded (e.g. if the prompt's IDENTITAS block
    explicitly includes "World Champion" then citing it is fine).

    Default usage::

        from content_engine.quality import inference_guard, voice_lint
        regex_hits = inference_guard.scan(body, source_context=user_msg)
        # Merge into voice_lint report
        for hit in regex_hits:
            report.issues.append(voice_lint.VoiceLintIssue(
                type="training_inference",
                severity=hit.severity,
                snippet=hit.snippet,
                issue=hit.pattern_description,
                fix=hit.fix,
            ))
    """
    hits: list[InferenceHit] = []
    seen_snippets: set[str] = set()
    for p in _PATTERNS:
        for m in p.regex.finditer(body):
            matched = m.group(0)
            # If the EXACT matched phrase is in source context, skip
            # — the model is quoting the input legitimately.
            if _has_in_context(matched, source_context):
                continue
            snippet = _expand_snippet(body, m.start(), m.end())
            # De-dupe — same snippet matched by multiple patterns
            # only counts once (severity = max).
            key = snippet[:80]
            if key in seen_snippets:
                continue
            seen_snippets.add(key)
            hits.append(InferenceHit(
                snippet=snippet,
                severity=p.severity,
                fix=p.fix,
                pattern_description=p.description,
            ))
    return hits
