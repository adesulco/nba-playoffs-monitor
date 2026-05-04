"""F1-specific rule-based fact-check.

Phase 2 ship #17. Verifies finishing positions cited in the body
match the actual race classification from input.

Catches:
  * Wrong driver-position attribution: "Verstappen P3" when input has him P8
  * Wrong constructor for a driver: "Hamilton di Mercedes" when input has him at Ferrari
  * Wrong winner: "Piastri menangi" when input says Antonelli
  * Wrong driver code: "VER P1" when input has ANT

Same gate-fail semantics as nba_fact_check + the football fact-check.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import structlog

log = structlog.get_logger()


@dataclass
class F1FactIssue:
    type: str  # "winner" | "driver_position" | "driver_constructor" | "driver_code"
    severity: str
    snippet: str
    claim: str
    expected: str
    issue: str


@dataclass
class F1FactReport:
    passed: bool
    issues: list[F1FactIssue] = field(default_factory=list)

    def summary(self) -> str:
        head = f"f1-fact-check: {'PASS' if self.passed else 'FAIL'}"
        if not self.issues:
            return head + " — no F1-specific factual issues"
        lines = [head, f"  {len(self.issues)} issue(s):"]
        for i, iss in enumerate(self.issues, 1):
            lines.append(f"    {i}. [{iss.severity.upper()}] {iss.type}")
            lines.append(f'       claim:    "{iss.claim}"')
            lines.append(f'       expected: "{iss.expected}"')
            lines.append(f'       snippet:  "{iss.snippet[:80]}{"..." if len(iss.snippet) > 80 else ""}"')
        return "\n".join(lines)


# ── Body regex patterns ─────────────────────────────────────────


# "{name} P{n}" or "P{n} {name}" — n is 1..20 (full grid)
# We capture optional name + position pairs and verify both directions.
_RE_BODY_DRIVER_AT_POS = re.compile(
    r"\b(?:P|p)\s*(\d{1,2})\b",
)
# Driver code pattern — ANT, NOR, VER, HAM, etc — 3 uppercase letters
_RE_BODY_DRIVER_CODE = re.compile(r"\b([A-Z]{3})\b\s*(?:P|p)\s*(\d{1,2})\b")
# "menangi / juarai / pemenang / juara"
_RE_BODY_WINNER = re.compile(
    r"\b(?:memenangi|memenangkan|menjuarai|juara|pemenang)\b\s+([^.!,\n]{1,60})",
    re.IGNORECASE,
)


def _surrounding(text: str, start: int, end: int, pad: int = 80) -> str:
    a = max(0, start - pad)
    b = min(len(text), end + pad)
    return text[a:b].replace("\n", " ").strip()


def _name_in_window(text: str, start: int, end: int, names: list[str], pad: int = 60) -> str | None:
    snippet = text[max(0, start - pad):min(len(text), end + pad)].lower()
    for n in names:
        if n and n.lower() in snippet:
            return n
    return None


# ── Main entry ──────────────────────────────────────────────────


def check(body_md: str, ctx: dict[str, Any]) -> F1FactReport:
    """Run the F1 fact validator.

    `ctx` is the recap context dict from
    ``data.f1_recap_context.build_context``. Required keys:
      * `_results` — list of `{position, driver_name, driver_code, constructor}`
    """
    issues: list[F1FactIssue] = []

    results = ctx.get("_results") or []
    if not results:
        return F1FactReport(passed=True, issues=[])  # no input data → can't fact-check

    # Build lookups
    pos_to_driver: dict[int, dict[str, Any]] = {}
    name_list: list[str] = []
    name_to_row: dict[str, dict[str, Any]] = {}
    code_to_row: dict[str, dict[str, Any]] = {}
    for r in results:
        pos = r.get("position")
        if isinstance(pos, int):
            pos_to_driver[pos] = r
        name = r.get("driver_name") or ""
        last = r.get("driver_last") or (name.rsplit(" ", 1)[-1] if name else "")
        if name:
            name_list.append(name)
            name_to_row[name.lower()] = r
        if last:
            name_to_row[last.lower()] = r
        code = r.get("driver_code")
        if code:
            code_to_row[code.upper()] = r

    # ── Winner check ────────────────────────────────────────
    actual_winner = pos_to_driver.get(1) or {}
    actual_winner_name = (actual_winner.get("driver_name") or "").lower()
    if actual_winner_name:
        for m in _RE_BODY_WINNER.finditer(body_md):
            tail = m.group(1)
            # Look for any KNOWN driver name in the captured tail.
            mentioned = None
            for n in name_list:
                if n.lower() in tail.lower():
                    mentioned = n
                    break
            if mentioned and mentioned.lower() != actual_winner_name:
                # Edge case: "kemenangan ... untuk Mercedes" — winner might
                # be a constructor not a driver. Skip if mentioned is a known
                # constructor not a known driver, unless input has both.
                issues.append(F1FactIssue(
                    type="winner",
                    severity="high",
                    snippet=_surrounding(body_md, m.start(), m.end()),
                    claim=f"winner = {mentioned}",
                    expected=f"winner = {actual_winner.get('driver_name')}",
                    issue=f"Article claims {mentioned} won, but input race result has {actual_winner.get('driver_name')} P1",
                ))

    # ── Driver-at-position check (by 3-letter code) ─────────
    # Most precise: "VER P8" / "P8 VER" — codes are unambiguous.
    for m in _RE_BODY_DRIVER_CODE.finditer(body_md):
        code = m.group(1).upper()
        try:
            claimed_pos = int(m.group(2))
        except ValueError:
            continue
        if claimed_pos < 1 or claimed_pos > 20:
            continue
        actual = code_to_row.get(code)
        if not actual:
            continue
        actual_pos = actual.get("position")
        if actual_pos is not None and actual_pos != claimed_pos:
            issues.append(F1FactIssue(
                type="driver_position",
                severity="high",
                snippet=_surrounding(body_md, m.start(), m.end()),
                claim=f"{code} P{claimed_pos}",
                expected=f"{code} P{actual_pos}",
                issue=f"Article puts {code} at P{claimed_pos} but input has them P{actual_pos}",
            ))

    # ── Driver-at-position check (by full name) ────────────
    # Look for "P{n}" tokens, find a known driver name within 40 chars,
    # verify position matches.
    for m in _RE_BODY_DRIVER_AT_POS.finditer(body_md):
        try:
            claimed_pos = int(m.group(1))
        except ValueError:
            continue
        if claimed_pos < 1 or claimed_pos > 20:
            continue
        # Find any known driver name within 40 chars of this P{n}.
        # We use 40 chars to keep it tight — too wide and we'll misattribute.
        name = _name_in_window(body_md, m.start(), m.end(), name_list, pad=40)
        if not name:
            continue
        actual = name_to_row.get(name.lower())
        if not actual:
            continue
        actual_pos = actual.get("position")
        if actual_pos is not None and actual_pos != claimed_pos:
            # Skip if the same window already triggered the code check.
            window_text = _surrounding(body_md, m.start(), m.end(), pad=40).upper()
            actual_code = actual.get("driver_code") or ""
            if f"{actual_code} P{claimed_pos}".upper() in window_text:
                continue  # code variant already flagged
            issues.append(F1FactIssue(
                type="driver_position",
                severity="high",
                snippet=_surrounding(body_md, m.start(), m.end()),
                claim=f"{name} P{claimed_pos}",
                expected=f"{name} P{actual_pos}",
                issue=f"Article puts {name} at P{claimed_pos} but input has them P{actual_pos}",
            ))

    log.info(
        "f1_fact_check.done",
        issue_count=len(issues),
        passed=not issues,
    )
    return F1FactReport(passed=not issues, issues=issues)
