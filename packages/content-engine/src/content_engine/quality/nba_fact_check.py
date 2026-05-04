"""NBA-specific rule-based fact-check.

Phase 2 ship #17. Sister to ``quality/fact_check.py`` (football); this
module catches NBA-specific hallucinations that the football fact-
check can't see:

  * **Triple-double / double-double misuse** — model claims a player
    had a triple-double when their stat line doesn't qualify (e.g.
    Tatum 30/11/7 — 7 reb means double-double, not triple).
  * **Wrong scorer points** — "Tatum 30 poin" when input says 27.
  * **Wrong final score** — "BOS menang 130-92" when input says 128-96.
  * **Wrong rebounds / assists in stat-line citations**.

This first cut is intentionally conservative: only flag when the
article EXPLICITLY claims a number that contradicts the input. Soft
qualitative claims ("Tatum dominated") are out of scope — the voice
linter handles those.

Hard fail = block publish per CLAUDE.md non-negotiable rule #9.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import structlog

log = structlog.get_logger()


@dataclass
class NbaFactIssue:
    type: str  # "triple_double" | "double_double" | "scorer_points" | "score_line" | "stat_line"
    severity: str  # "high" | "medium"
    snippet: str
    claim: str
    expected: str
    issue: str


@dataclass
class NbaFactReport:
    passed: bool
    issues: list[NbaFactIssue] = field(default_factory=list)

    def summary(self) -> str:
        head = f"nba-fact-check: {'PASS' if self.passed else 'FAIL'}"
        if not self.issues:
            return head + " — no NBA-specific factual issues"
        lines = [head, f"  {len(self.issues)} issue(s):"]
        for i, iss in enumerate(self.issues, 1):
            lines.append(f"    {i}. [{iss.severity.upper()}] {iss.type}")
            lines.append(f'       claim:    "{iss.claim}"')
            lines.append(f'       expected: "{iss.expected}"')
            lines.append(f'       snippet:  "{iss.snippet[:80]}{"..." if len(iss.snippet) > 80 else ""}"')
        return "\n".join(lines)


# ── Body regex patterns ─────────────────────────────────────────────


# "X poin" or "X pts" anchored to a player name. Bahasa-aware.
_RE_BODY_PTS_LINE = re.compile(
    r"(\d{1,3})\s*(?:poin|pts?)\b",
    re.IGNORECASE,
)
# Triple-double / double-double claims
_RE_BODY_TRIPLE = re.compile(r"\btriple[\s-]?double\b", re.IGNORECASE)
_RE_BODY_DOUBLE = re.compile(r"\bdouble[\s-]?double\b", re.IGNORECASE)
# Final score citations: "menang 128-96", "kalah 96-128", "skor akhir 128-96",
# "kemenangan 128-96", "tutup pertandingan 128-96".
#
# v0.59.6 — DROPPED `unggul` and `tertinggal` as triggers because they
# match quarter-score leads ("unggul 41-33 di Q1") generating false
# positives. Final score is reliably introduced by menang/kalah/skor
# akhir/skor final/kemenangan/kekalahan.
_RE_BODY_SCORE = re.compile(
    r"\b(?:menang|kalah|kemenangan|kekalahan|skor\s+akhir|skor\s+final|akhir\s+pertandingan)\s*(?:dengan\s+)?(?:skor\s+)?(\d{1,3})\s*-\s*(\d{1,3})",
    re.IGNORECASE,
)
# Quarter-context markers — if any of these appear within 25 chars
# after a score citation, the claim is about a quarter not the final.
# Used to suppress score_line flags for clear quarter references.
_RE_QUARTER_CONTEXT = re.compile(
    r"\b(?:Q[1-4]|kuarter\s+(?:pertama|kedua|ketiga|keempat|1|2|3|4)|paruh\s+(?:pertama|kedua)|babak\s+(?:pertama|kedua)|halftime|setengah\s+pertama)\b",
    re.IGNORECASE,
)
# Stat line: "30 poin, 8 rebound, 6 asis" near a name token
_RE_BODY_STAT_LINE = re.compile(
    r"(\d{1,3})\s*(?:poin|pts?)\s*,\s*(\d{1,3})\s*(?:rebound|reb)\s*,\s*(\d{1,3})\s*(?:asis|assist|ast)",
    re.IGNORECASE,
)


def _surrounding(text: str, start: int, end: int, pad: int = 80) -> str:
    a = max(0, start - pad)
    b = min(len(text), end + pad)
    return text[a:b].replace("\n", " ").strip()


def _name_in_window(text: str, start: int, end: int, names: list[str], pad: int = 60) -> str | None:
    """Return the first known name found in `text[start-pad:end+pad]`,
    or None. Case-insensitive substring.
    """
    snippet = text[max(0, start - pad):min(len(text), end + pad)].lower()
    for n in names:
        if n and n.lower() in snippet:
            return n
    return None


# ── Main entry ──────────────────────────────────────────────────────


def check(body_md: str, ctx: dict[str, Any]) -> NbaFactReport:
    """Run the NBA fact validator.

    `ctx` is the recap context dict from
    ``data.nba_recap_context.build_context``. Required keys:
      * `_header.home_score`, `_header.away_score`, `_header.home_abbr`, `_header.away_abbr`
      * `_scorers` — list of `{team_abbr, scorers: [{name, pts, reb, ast}]}`

    Hard fail = any HIGH issue. Caller (CLI) blocks publish per
    CLAUDE.md rule #9.
    """
    issues: list[NbaFactIssue] = []

    header = ctx.get("_header") or {}
    scorers_blocks = ctx.get("_scorers") or []

    # Build a quick lookup: player_name → (pts, reb, ast)
    player_lookup: dict[str, tuple[int, int, int]] = {}
    name_list: list[str] = []
    for team_block in scorers_blocks:
        for s in team_block.get("scorers", []):
            name = s.get("name") or ""
            if not name:
                continue
            stat = (int(s.get("pts") or 0), int(s.get("reb") or 0), int(s.get("ast") or 0))
            player_lookup[name.lower()] = stat
            name_list.append(name)
            # Also index by last-name only for short citations
            last = name.rsplit(" ", 1)[-1].lower()
            if last and last not in player_lookup:
                player_lookup[last] = stat

    # ── Final score check ────────────────────────────────────────
    home_score = header.get("home_score")
    away_score = header.get("away_score")
    if home_score is not None and away_score is not None:
        valid_pairs = {(home_score, away_score), (away_score, home_score)}
        for m in _RE_BODY_SCORE.finditer(body_md):
            try:
                a, b = int(m.group(1)), int(m.group(2))
            except ValueError:
                continue
            if (a, b) in valid_pairs:
                continue
            # v0.59.6 — Suppress false positive when a quarter / half
            # context marker appears immediately before or after the
            # score. The article is talking about a quarter, not final.
            window_start = max(0, m.start() - 40)
            window_end = min(len(body_md), m.end() + 40)
            context_window = body_md[window_start:window_end]
            if _RE_QUARTER_CONTEXT.search(context_window):
                log.info(
                    "nba_fact_check.score_line_false_positive_suppressed",
                    claim=f"{a}-{b}",
                    context=context_window[:120],
                )
                continue
            issues.append(NbaFactIssue(
                type="score_line",
                severity="high",
                snippet=_surrounding(body_md, m.start(), m.end()),
                claim=f"{a}-{b}",
                expected=f"{home_score}-{away_score} (or {away_score}-{home_score})",
                issue=f"Article cites final score {a}-{b} but actual was {home_score}-{away_score}",
            ))

    # ── Triple-double / double-double check ─────────────────────
    # For every "triple-double" mention near a player name, verify
    # the player's stat line meets the threshold.
    for m in _RE_BODY_TRIPLE.finditer(body_md):
        name = _name_in_window(body_md, m.start(), m.end(), name_list, pad=80)
        if not name:
            continue
        stat = player_lookup.get(name.lower())
        if not stat:
            continue
        pts, reb, ast = stat
        # Triple-double = 10+ in three of {pts, reb, ast}. We check
        # only the three categories the input has; other categories
        # (stl, blk) aren't ingested in Phase 1 ship #11.
        doubles = sum(1 for v in (pts, reb, ast) if v >= 10)
        if doubles < 3:
            issues.append(NbaFactIssue(
                type="triple_double",
                severity="high",
                snippet=_surrounding(body_md, m.start(), m.end(), pad=80),
                claim=f"{name} triple-double",
                expected=f"{name} stat line: {pts} pts / {reb} reb / {ast} ast (only {doubles} of 3 categories ≥10)",
                issue=f"Article claims {name} had a triple-double but stat line is {pts}/{reb}/{ast} — not a triple-double",
            ))

    for m in _RE_BODY_DOUBLE.finditer(body_md):
        # Skip if "triple-double" matched at this position (already counted)
        prefix = body_md[max(0, m.start() - 10):m.start()].lower()
        if "triple" in prefix or "triple-" in prefix:
            continue
        name = _name_in_window(body_md, m.start(), m.end(), name_list, pad=80)
        if not name:
            continue
        stat = player_lookup.get(name.lower())
        if not stat:
            continue
        pts, reb, ast = stat
        doubles = sum(1 for v in (pts, reb, ast) if v >= 10)
        if doubles < 2:
            issues.append(NbaFactIssue(
                type="double_double",
                severity="high",
                snippet=_surrounding(body_md, m.start(), m.end(), pad=80),
                claim=f"{name} double-double",
                expected=f"{name} stat line: {pts} pts / {reb} reb / {ast} ast (only {doubles} of 3 categories ≥10)",
                issue=f"Article claims {name} had a double-double but stat line is {pts}/{reb}/{ast} — not a double-double",
            ))

    # ── Player point totals check ──────────────────────────────
    # Look for "{name} ... N poin" patterns and verify N matches
    # the input. Conservative: require name within 50 chars of the
    # poin number AND number to be 5-99 (real game range).
    for m in _RE_BODY_PTS_LINE.finditer(body_md):
        try:
            claimed_pts = int(m.group(1))
        except ValueError:
            continue
        if claimed_pts < 5 or claimed_pts > 99:
            continue  # likely team total, not player
        name = _name_in_window(body_md, m.start(), m.end(), name_list, pad=50)
        if not name:
            continue
        stat = player_lookup.get(name.lower())
        if not stat:
            continue
        actual_pts = stat[0]
        if claimed_pts != actual_pts:
            issues.append(NbaFactIssue(
                type="scorer_points",
                severity="high",
                snippet=_surrounding(body_md, m.start(), m.end()),
                claim=f"{name} {claimed_pts} poin",
                expected=f"{name} {actual_pts} poin per input",
                issue=f"Article says {name} scored {claimed_pts} but input has {actual_pts}",
            ))

    # ── Stat-line check (pts/reb/ast triple) ────────────────────
    for m in _RE_BODY_STAT_LINE.finditer(body_md):
        try:
            cp, cr, ca = int(m.group(1)), int(m.group(2)), int(m.group(3))
        except ValueError:
            continue
        name = _name_in_window(body_md, m.start(), m.end(), name_list, pad=70)
        if not name:
            continue
        stat = player_lookup.get(name.lower())
        if not stat:
            continue
        ap, ar, aa = stat
        if (cp, cr, ca) != (ap, ar, aa):
            issues.append(NbaFactIssue(
                type="stat_line",
                severity="high",
                snippet=_surrounding(body_md, m.start(), m.end()),
                claim=f"{name} {cp}/{cr}/{ca}",
                expected=f"{name} {ap}/{ar}/{aa} per input",
                issue=f"Article cites {name} stat line {cp}/{cr}/{ca} but input has {ap}/{ar}/{aa}",
            ))

    log.info(
        "nba_fact_check.done",
        issue_count=len(issues),
        passed=not issues,
    )
    return NbaFactReport(passed=not issues, issues=issues)
