"""Fact validator — rule-based claim extraction + verification.

Phase 1 ship #5. The last hard quality gate per CLAUDE.md non-
negotiable rule #9 ("Never publish if any quality gate fails. Fact
validator + banned-phrase regex + length check + dedup hash + schema
validity + external sim-hash plagiarism check. No bypass flags.")

The voice linter (Haiku 4.5) catches *register* drift but explicitly
does NOT verify factual correctness — it has no view into whether
"Arsenal di posisi 1 dengan 73 poin" matches the input data. This
module fills that gap with deterministic rule-based pattern matching
against the same context block the writer agent saw.

Approach: extract 1-2-digit numerical claims that can be cross-checked
(table positions, points, form strings, goal counts, minutes, score
lines), then verify each against the structured input.

Categories caught:

  1. **Position claims** — "posisi 1", "ke-3", "berada di urutan 5"
     → must match home/away_position in the input.
  2. **Points claims** — "73 poin", "48 poin"
     → must match home/away points (extracted from the input
     "Setelah 34 laga, X poin" line).
  3. **Form strings** — five-letter [WLD] sequences like "WLLWW"
     → must match home/away_form from input (case-insensitive).
  4. **Goal-count claims** — "N gol musim ini" near a player name
     → must match the topscorer entries in the input.
  5. **Score lines** (recaps only) — "menang 3-1", "imbang 2-2"
     → must match the SCORE AKHIR from input.
  6. **Goal-minute claims** (recaps only) — "menit 35" near a player
     name in a goal context → must match the events timeline.

False-positive philosophy: rule-based is intentionally LOW-recall and
HIGH-precision. We only flag when there's a clear pattern + clear
mismatch. Sentence-level "the article said X but input says Y" claims
that need semantic understanding go to a future Haiku second pass —
deferred to ship #5b once we see the rule-based gate's first 100+
articles in editorial feedback.

Hard fail = exit non-zero from the CLI. No bypass flag.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import structlog

log = structlog.get_logger()


# ── Data classes ──────────────────────────────────────────────────────────


@dataclass
class FactIssue:
    """Single factual mismatch flagged by the validator."""

    type: str  # "position" | "points" | "form" | "goals" | "score" | "minute"
    severity: str  # "high" | "medium" | "low"
    snippet: str
    claim: str  # the value the article asserted
    expected: str  # what the input data says
    issue: str  # one-sentence description


@dataclass
class FactCheckReport:
    """Result of a fact-check pass."""

    passed: bool
    issues: list[FactIssue] = field(default_factory=list)

    def summary(self) -> str:
        head = f"fact-check: {'PASS' if self.passed else 'FAIL'}"
        if not self.issues:
            return head + " — no factual mismatches"
        lines = [head, f"  {len(self.issues)} issue(s):"]
        for i, iss in enumerate(self.issues, 1):
            snip = iss.snippet[:80] + ("..." if len(iss.snippet) > 80 else "")
            lines.append(f"    {i}. [{iss.severity.upper()}] {iss.type}")
            lines.append(f'       claim:    "{iss.claim}"')
            lines.append(f'       expected: "{iss.expected}"')
            lines.append(f'       snippet:  "{snip}"')
        return "\n".join(lines)


# ── Source-of-truth extraction ────────────────────────────────────────────
#
# The fact validator's authority is the input context block — the same
# user message the writer agent saw. We extract structured facts FROM
# that block, then check the article body against them.


# Match the preview user-message template lines (preview.py
# _format_fixture_user_message). Keep these in sync if the template
# changes — there's a unit-test-shaped responsibility here.
_RE_HOME_POS = re.compile(r"TIM A.*?\n- Posisi klasemen:\s*(\d+|—)", re.DOTALL)
_RE_AWAY_POS = re.compile(r"TIM B.*?\n- Posisi klasemen:\s*(\d+|—)", re.DOTALL)
_RE_HOME_FORM = re.compile(r"TIM A.*?\n.*?Form 5 laga:\s*([WLD—]+)", re.DOTALL)
_RE_AWAY_FORM = re.compile(r"TIM B.*?\n.*?Form 5 laga:\s*([WLD—]+)", re.DOTALL)
_RE_HOME_TOP = re.compile(
    r"TIM A.*?\n.*?Pencetak gol terbanyak musim:\s*([^()\n]+)\s*\((\d+|—)\s*gol",
    re.DOTALL,
)
_RE_AWAY_TOP = re.compile(
    r"TIM B.*?\n.*?Pencetak gol terbanyak musim:\s*([^()\n]+)\s*\((\d+|—)\s*gol",
    re.DOTALL,
)

# H2H summary in the preview block looks like
#   "W 1-0, W 2-1, D 1-1, L 1-2, D 2-2. (2M-2S-1K dari Arsenal POV)"
# We don't fact-check the prose H2H summary line for ship #5, but we
# do extract it for context_notes.

# Recap user-message lines (recap.py format_recap_user_message)
_RE_RECAP_SCORE = re.compile(
    r"SCORE AKHIR:\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)$",
    re.MULTILINE,
)


# Standings position context line (preview_context._derive_context_notes
# emits something like "Setelah 34 laga, Arsenal 73 poin dan Fulham 48
# poin."). We pull both team-points pairs from this.
_RE_CONTEXT_PTS = re.compile(
    r"Setelah\s+\d+\s+laga,\s+(.+?)\s+(\d+)\s+poin\s+dan\s+(.+?)\s+(\d+)\s+poin",
)


@dataclass
class SourceFacts:
    """Structured facts extracted from the input context block."""

    home_team: str | None = None
    away_team: str | None = None
    home_position: int | None = None
    away_position: int | None = None
    home_form: str | None = None
    away_form: str | None = None
    home_top_scorer: str | None = None
    home_top_goals: int | None = None
    away_top_scorer: str | None = None
    away_top_goals: int | None = None
    home_points: int | None = None
    away_points: int | None = None
    # Recap-only
    home_score: int | None = None
    away_score: int | None = None
    # All names that legitimately appear in the input (players, teams,
    # coaches, venues). The validator uses this set when deciding
    # whether a name flagged in the article is "grounded".
    allowed_names: set[str] = field(default_factory=set)
    # Goal events for recap fact-check (minute, scorer, team)
    goal_events: list[dict[str, Any]] = field(default_factory=list)


def _strip_initial(name: str) -> str:
    """Drop API-Football initial prefix: 'B. Mbeumo' → 'Mbeumo'.

    The writer agent commonly drops the initial on second mention
    (per recap-system.md). We accept either form by storing both.
    """
    name = name.strip()
    parts = name.split(None, 1)
    if len(parts) == 2 and parts[0].endswith(".") and len(parts[0]) <= 3:
        return parts[1]
    return name


def extract_source_facts(source_block: str, *, recap: bool = False) -> SourceFacts:
    """Parse the writer's user message into structured facts.

    Tolerant: missing fields stay None rather than raising. The
    validator only flags claims when both (a) the article makes the
    claim explicitly AND (b) the source has a concrete value to
    compare against.
    """
    facts = SourceFacts()

    # Team names (line headers)
    m = re.search(r"TIM A\s*\(Home\):\s*(.+)$", source_block, re.MULTILINE)
    if m:
        facts.home_team = m.group(1).strip()
    m = re.search(r"TIM B\s*\(Away\):\s*(.+)$", source_block, re.MULTILINE)
    if m:
        facts.away_team = m.group(1).strip()

    # Positions
    m = _RE_HOME_POS.search(source_block)
    if m and m.group(1).isdigit():
        facts.home_position = int(m.group(1))
    m = _RE_AWAY_POS.search(source_block)
    if m and m.group(1).isdigit():
        facts.away_position = int(m.group(1))

    # Form strings (5 chars of W/L/D)
    m = _RE_HOME_FORM.search(source_block)
    if m and re.fullmatch(r"[WLD]{5}", m.group(1) or ""):
        facts.home_form = m.group(1)
    m = _RE_AWAY_FORM.search(source_block)
    if m and re.fullmatch(r"[WLD]{5}", m.group(1) or ""):
        facts.away_form = m.group(1)

    # Top scorers
    m = _RE_HOME_TOP.search(source_block)
    if m:
        name = m.group(1).strip()
        if name and name != "—":
            facts.home_top_scorer = name
            if m.group(2).isdigit():
                facts.home_top_goals = int(m.group(2))
    m = _RE_AWAY_TOP.search(source_block)
    if m:
        name = m.group(1).strip()
        if name and name != "—":
            facts.away_top_scorer = name
            if m.group(2).isdigit():
                facts.away_top_goals = int(m.group(2))

    # Points pulled from context_notes line if present
    m = _RE_CONTEXT_PTS.search(source_block)
    if m:
        # group 1 = home name (or close to it), 2 = home points, 3 = away, 4 = away points
        try:
            facts.home_points = int(m.group(2))
            facts.away_points = int(m.group(4))
        except ValueError:
            pass

    # Recap: score
    if recap:
        m = _RE_RECAP_SCORE.search(source_block)
        if m:
            facts.home_team = facts.home_team or m.group(1).strip()
            facts.away_team = facts.away_team or m.group(4).strip()
            try:
                facts.home_score = int(m.group(2))
                facts.away_score = int(m.group(3))
            except ValueError:
                pass

        # Recap: parse goal events from the TIMELINE block. Each goal
        # line in the recap_context-rendered block looks like:
        #   "  35'  [Liverpool] GOAL — Normal Goal — A. Isak (assist: ...)"
        # We extract the 4-tuple (minute, team, scorer, assist?) for
        # each goal to support minute fact-checks.
        goal_re = re.compile(
            r"^\s*(\d+)(?:\+\d+)?'\s+\[(.+?)\]\s+GOAL\s+—\s+[^—]+—\s+(.+?)\s*(?:\(assist:.*?\))?\s*$",
            re.MULTILINE,
        )
        for gm in goal_re.finditer(source_block):
            minute = int(gm.group(1))
            team = gm.group(2).strip()
            scorer = gm.group(3).strip()
            facts.goal_events.append({"minute": minute, "team": team, "scorer": scorer})

    # Build allowed_names set from all known names in the source.
    for name in [facts.home_team, facts.away_team, facts.home_top_scorer, facts.away_top_scorer]:
        if name:
            facts.allowed_names.add(name)
            facts.allowed_names.add(_strip_initial(name))

    return facts


# ── Body claim extraction + verification ──────────────────────────────────


# "posisi N", "ke-N", "urutan N" — N is 1-20 for league football
_RE_BODY_POS = re.compile(
    r"(?:posisi|ke-|urutan)\s*(\d{1,2})(?!\d)",
    re.IGNORECASE,
)
# "N poin" — 0..120 covers any plausible mid/late-season tally
_RE_BODY_PTS = re.compile(r"(\d{1,3})\s*poin", re.IGNORECASE)
# Five-character W/L/D run (form string), case-insensitive
_RE_BODY_FORM = re.compile(r"\b([WLDwld]{5})\b")
# "N gol" within 30 chars of a likely-player-name token. We won't try
# to extract player names regex-only (Bahasa names can be single
# tokens like "Salah" or two like "Mac Allister"); instead we scan
# every "N gol musim ini" claim and check that some allowed name
# appears within the surrounding 50 chars.
_RE_BODY_GOALS_SEASON = re.compile(
    r"(\d{1,2})\s*gol\s+musim\s+ini",
    re.IGNORECASE,
)
# Recap minute-based goal claims: "menit ke-N" or "menit N"
_RE_BODY_MINUTE = re.compile(
    r"\bmenit(?:\s+ke-?)?\s*(\d{1,3})",
    re.IGNORECASE,
)
# Recap score line: "menang 3-1", "kalah 0-2", "imbang 2-2"
_RE_BODY_SCORE = re.compile(
    r"\b(?:menang|kalah|imbang|seri|unggul)\s+(\d{1,2})\s*-\s*(\d{1,2})",
    re.IGNORECASE,
)


def _surrounding(text: str, start: int, end: int, pad: int = 80) -> str:
    """Pull a snippet of `text` around an offset range with padding."""
    a = max(0, start - pad)
    b = min(len(text), end + pad)
    return text[a:b].replace("\n", " ").strip()


def check(
    body_md: str,
    source_block: str,
    *,
    recap: bool = False,
) -> FactCheckReport:
    """Run the fact validator against an article body.

    Returns a FactCheckReport. Caller (CLI) checks `passed` and exits
    non-zero on fail per CLAUDE.md rule #9.
    """
    facts = extract_source_facts(source_block, recap=recap)
    issues: list[FactIssue] = []

    # ── Position checks ──────────────────────────────────────────
    # Tolerance: both teams' positions are valid claims. We pass any
    # 1-20 number that matches either home or away position. Anything
    # else flagged.
    valid_positions: set[int] = set()
    if facts.home_position is not None:
        valid_positions.add(facts.home_position)
    if facts.away_position is not None:
        valid_positions.add(facts.away_position)

    if valid_positions:  # only check if the input had positions
        for m in _RE_BODY_POS.finditer(body_md):
            try:
                claimed = int(m.group(1))
            except ValueError:
                continue
            if 1 <= claimed <= 20 and claimed not in valid_positions:
                # Only flag if surrounding context suggests it refers
                # to a team in this fixture (mention of home/away team
                # name within 80 chars). Avoids flagging "posisi 4-3-3"
                # (formation digit) or "ke-2 gol" (which means "2nd
                # goal", different sense).
                snip = _surrounding(body_md, m.start(), m.end())
                referenced_team = (
                    (facts.home_team and facts.home_team.lower() in snip.lower()) or
                    (facts.away_team and facts.away_team.lower() in snip.lower())
                )
                if referenced_team:
                    issues.append(FactIssue(
                        type="position",
                        severity="high",
                        snippet=snip,
                        claim=str(claimed),
                        expected=f"{facts.home_team}={facts.home_position} / {facts.away_team}={facts.away_position}",
                        issue=f"Article claims position {claimed} but neither team is at that position in input",
                    ))

    # ── Points checks ─────────────────────────────────────────────
    # Valid points = each team's actual points + the delta between them.
    # The delta is admissible because writers commonly do the math
    # ("X di bawah Y") and that's a grounded inference from input data,
    # not a fabrication. We DON'T add other arithmetic combinations —
    # only the pair-wise delta is a natural-language thing.
    valid_points: set[int] = set()
    for v in (facts.home_points, facts.away_points):
        if v is not None:
            valid_points.add(v)
    if facts.home_points is not None and facts.away_points is not None:
        valid_points.add(abs(facts.home_points - facts.away_points))

    # Delta-context phrases — when the claim is a rank-gap statement,
    # don't flag mismatches even outside the valid set. Catches phrasing
    # like "selisih 25 poin" where the math is the writer's framing
    # ("Liverpool 25 points clear of 4th") and the exact number doesn't
    # have to map to a team's tally.
    _DELTA_CONTEXT_RE = re.compile(
        r"selisih|di\s+bawah|di\s+atas|lebih\s+(?:banyak|sedikit|tinggi|rendah)|"
        r"berjarak|terpaut|jarak|gap",
        re.IGNORECASE,
    )

    if valid_points:
        for m in _RE_BODY_PTS.finditer(body_md):
            try:
                claimed = int(m.group(1))
            except ValueError:
                continue
            # Ignore tiny numbers (likely game-state references like
            # "tiga poin di laga ini") and stadium capacities (>200).
            if claimed < 5 or claimed > 200:
                continue
            if claimed not in valid_points:
                snip = _surrounding(body_md, m.start(), m.end())
                # Only flag if surrounding context references a team
                # — avoids "perlu 3 poin" (game stakes, not table).
                referenced_team = (
                    (facts.home_team and facts.home_team.lower() in snip.lower()) or
                    (facts.away_team and facts.away_team.lower() in snip.lower())
                )
                if not referenced_team:
                    continue
                # Skip if delta context — the writer's doing arithmetic
                # on the input, which is allowed.
                if _DELTA_CONTEXT_RE.search(snip):
                    continue
                issues.append(FactIssue(
                    type="points",
                    severity="high",
                    snippet=snip,
                    claim=f"{claimed} poin",
                    expected=f"{facts.home_team}={facts.home_points} / {facts.away_team}={facts.away_points}",
                    issue=f"Article claims {claimed} poin but neither team has that points total",
                ))

    # ── Form-string checks ───────────────────────────────────────
    valid_forms: set[str] = set()
    for v in (facts.home_form, facts.away_form):
        if v:
            valid_forms.add(v.upper())
    if valid_forms:
        for m in _RE_BODY_FORM.finditer(body_md):
            claimed = m.group(1).upper()
            if claimed not in valid_forms:
                # Allow single-letter spam like "WWWWW" only if it's a
                # 5-char identifier in a form context — surrounding
                # text should mention "form" or "lima laga" within
                # 40 chars or the claim is just a typo.
                snip = _surrounding(body_md, m.start(), m.end(), pad=40)
                form_context = re.search(r"form|lima laga|laga terakhir|5 laga", snip, re.IGNORECASE)
                if form_context:
                    issues.append(FactIssue(
                        type="form",
                        severity="high",
                        snippet=_surrounding(body_md, m.start(), m.end()),
                        claim=claimed,
                        expected=f"{facts.home_team}={facts.home_form} / {facts.away_team}={facts.away_form}",
                        issue=f"Article claims form '{claimed}' but neither team has that form in input",
                    ))

    # ── Top-scorer goal-count checks ─────────────────────────────
    valid_goal_counts: dict[str, int] = {}
    if facts.home_top_scorer and facts.home_top_goals is not None:
        valid_goal_counts[facts.home_top_scorer] = facts.home_top_goals
        valid_goal_counts[_strip_initial(facts.home_top_scorer)] = facts.home_top_goals
    if facts.away_top_scorer and facts.away_top_goals is not None:
        valid_goal_counts[facts.away_top_scorer] = facts.away_top_goals
        valid_goal_counts[_strip_initial(facts.away_top_scorer)] = facts.away_top_goals

    if valid_goal_counts:
        for m in _RE_BODY_GOALS_SEASON.finditer(body_md):
            try:
                claimed_goals = int(m.group(1))
            except ValueError:
                continue
            snip = _surrounding(body_md, m.start(), m.end(), pad=50)
            # Find any known scorer name in the surrounding window
            mentioned_player = None
            for name, expected_goals in valid_goal_counts.items():
                if name and name.lower() in snip.lower():
                    mentioned_player = (name, expected_goals)
                    break
            if mentioned_player and claimed_goals != mentioned_player[1]:
                issues.append(FactIssue(
                    type="goals",
                    severity="high",
                    snippet=snip,
                    claim=f"{mentioned_player[0]} {claimed_goals} gol",
                    expected=f"{mentioned_player[0]} {mentioned_player[1]} gol per input",
                    issue=f"Article says {mentioned_player[0]} has {claimed_goals} season goals but input has {mentioned_player[1]}",
                ))

    # ── Recap-specific: score-line check ─────────────────────────
    if recap and facts.home_score is not None and facts.away_score is not None:
        actual_score = (facts.home_score, facts.away_score)
        actual_score_rev = (facts.away_score, facts.home_score)
        for m in _RE_BODY_SCORE.finditer(body_md):
            try:
                claimed = (int(m.group(1)), int(m.group(2)))
            except ValueError:
                continue
            # Score lines could be either home-first or away-first;
            # accept both orderings as long as the multiset matches.
            if claimed not in {actual_score, actual_score_rev}:
                # Could also reference a goal-by-goal scoreline mid-
                # narrative ("unggul 1-0", "balas 1-1"). Only flag if
                # surrounding 60 chars mention "akhir", "skor akhir",
                # "menutup", "final" — i.e. clearly the final-score
                # interpretation.
                snip = _surrounding(body_md, m.start(), m.end(), pad=60)
                final_context = re.search(
                    r"akhir|skor akhir|menutup|final|tutup|menjadi",
                    snip,
                    re.IGNORECASE,
                )
                if final_context:
                    issues.append(FactIssue(
                        type="score",
                        severity="high",
                        snippet=_surrounding(body_md, m.start(), m.end()),
                        claim=f"{claimed[0]}-{claimed[1]}",
                        expected=f"{facts.home_score}-{facts.away_score}",
                        issue=f"Article claims final {claimed[0]}-{claimed[1]} but actual was {facts.home_score}-{facts.away_score}",
                    ))

    # ── Recap-specific: goal-minute check ────────────────────────
    if recap and facts.goal_events:
        valid_minutes = {ev["minute"] for ev in facts.goal_events}
        # Only flag when the minute is paired with a clear goal context
        # ("cetak gol di menit", "gol pembuka di menit", etc.) AND not
        # in valid_minutes. Other minute mentions (cards, subs) are
        # legitimate.
        goal_context_re = re.compile(
            r"(?:cetak\s+gol|gol\s+pembuka|gol\s+penyama|gol\s+penutup|membuka\s+skor|menggandakan|menyamakan|menambahi)\s*[^.]{0,40}menit(?:\s+ke-?)?\s*(\d{1,3})",
            re.IGNORECASE,
        )
        for m in goal_context_re.finditer(body_md):
            try:
                claimed = int(m.group(1))
            except ValueError:
                continue
            if claimed not in valid_minutes and claimed > 1 and claimed <= 100:
                issues.append(FactIssue(
                    type="minute",
                    severity="medium",
                    snippet=_surrounding(body_md, m.start(), m.end()),
                    claim=f"goal at minute {claimed}",
                    expected=f"goal minutes per timeline: {sorted(valid_minutes)}",
                    issue=f"Article cites a goal at minute {claimed} but no goal at that minute in input timeline",
                ))

    log.info(
        "fact_check.done",
        issue_count=len(issues),
        passed=not issues,
        recap=recap,
        had_position=facts.home_position is not None,
        had_form=facts.home_form is not None,
        had_score=facts.home_score is not None,
    )

    return FactCheckReport(passed=not issues, issues=issues)
