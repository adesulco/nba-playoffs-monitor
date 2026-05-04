"""Plagiarism + dedup gate (Phase 1 ship #4).

Per ``CLAUDE.md`` non-negotiable rule #9 ("Never publish if any quality
gate fails. Fact validator + banned-phrase regex + length check + dedup
hash + schema validity + (Phase 1 add) external sim-hash plagiarism
check. No bypass flags.") and ``docs/content-engine-response.md`` § 6,
this module is the **hard gate** that blocks publish on:

  1. **Internal dedup** — the writer just generated something
     near-identical to a previously-published article (e.g. a
     regenerate-loop produced a clone, or two preview generations for
     the same fixture diverged less than expected).

  2. **External plagiarism** — the writer's output overlaps too closely
     with text from external Indonesian sport sites
     (Bola.net / Detik Sport / Kompas Sport / Tempo Sport / Pikiran
     Rakyat). Per response doc § 6.

Approach: 64-bit SimHash over 7-gram character shingles. Robust to
paraphrase (light reorderings + word substitutions barely move the
hash) yet sensitive to cloning (full sentence overlap moves hash
< 8 bits / 64 = ≥87.5% similarity).

Phase 1 ship #4 details:

* **Internal corpus** = walk ``public/content/{type}/*.json``,
  fingerprint each ``body_md``, compare incoming article against
  every fingerprint. Distance ≤ 6 → match. Auto-skip self-comparison
  by slug (a regenerate-then-overwrite scenario should not block
  itself).

* **External corpus** = pluggable. ``EXTERNAL_CORPUS_PATH`` env var
  (or default ``data/external-corpus.jsonl``) points at a JSONL
  fingerprint file. Phase 1 ship #4 ships an EMPTY corpus + clear
  log when it's empty so we never silently skip the external check.
  Future ship adds a scraper that politely populates it.

Doctrine: hard gate, no bypass flag, no override env var. If you need
to skip the gate (extremely rare — e.g. the corpus has a stale
duplicate of yesterday's article), DELETE the offending fingerprint
from the corpus rather than disable the gate.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import structlog
from simhash import Simhash

log = structlog.get_logger()


# 7-gram character shingles per content-engine-response.md § 6.
# Char-level (not word-level) is more robust to Bahasa-specific
# paraphrase patterns (different connectors, dropped pronouns).
_SHINGLE_SIZE = 7

# Hamming distance threshold over a 64-bit hash. ≤6 / 64 = ≥90.6%
# similarity, the empirical "this is a duplicate" cutoff for SimHash
# on 500-700 word articles. 7-12 is a "warn" zone; >12 is normal
# unrelated content.
_HARD_FAIL_DISTANCE = 6
_WARN_DISTANCE = 12

# Repo-relative paths. Walk up from this file to the repo root then
# down to the content folder for internal dedup, and to the engine's
# data folder for the external corpus snapshot.
_REPO_ROOT = Path(__file__).resolve().parents[5]
_CONTENT_DIR = _REPO_ROOT / "public" / "content"
_DEFAULT_EXTERNAL_CORPUS = (
    _REPO_ROOT / "packages" / "content-engine" / "data" / "external-corpus.jsonl"
)


# ── Data classes ──────────────────────────────────────────────────────────


@dataclass
class Fingerprint:
    """A single SimHash fingerprint with its origin metadata.

    `source` is "internal" for fingerprints derived from
    public/content/, "external" for entries from the external corpus
    (with `source_site` further specifying e.g. "bola.net").
    """

    hash_value: int
    slug: str
    source: str  # "internal" | "external"
    source_site: str | None = None
    type: str | None = None  # "preview" | "recap" | None for external
    title: str | None = None


@dataclass
class PlagiarismMatch:
    """A near-match between the article being checked and a corpus entry."""

    distance: int
    similarity: float  # 1 - distance/64
    other: Fingerprint


@dataclass
class PlagiarismReport:
    """Result of a plagiarism check.

    `passed` is False iff any match has distance ≤ HARD_FAIL_DISTANCE.
    `warnings` is for matches in the 7-12 distance zone — surfaced
    to the operator but not publish-blocking.
    """

    passed: bool
    fingerprint: Fingerprint
    fail_matches: list[PlagiarismMatch] = field(default_factory=list)
    warn_matches: list[PlagiarismMatch] = field(default_factory=list)
    internal_corpus_size: int = 0
    external_corpus_size: int = 0

    def summary(self) -> str:
        lines = [
            f"plagiarism: {'PASS' if self.passed else 'FAIL'} "
            f"(corpus: internal={self.internal_corpus_size} external={self.external_corpus_size})"
        ]
        if self.fail_matches:
            lines.append(f"  {len(self.fail_matches)} blocking match(es):")
            for m in self.fail_matches:
                lines.append(
                    f"    distance={m.distance:>2}/64 similarity={m.similarity:.2%} "
                    f"vs [{m.other.source}] {m.other.slug}"
                )
        if self.warn_matches:
            lines.append(f"  {len(self.warn_matches)} warning match(es):")
            for m in self.warn_matches:
                lines.append(
                    f"    distance={m.distance:>2}/64 similarity={m.similarity:.2%} "
                    f"vs [{m.other.source}] {m.other.slug}"
                )
        return "\n".join(lines)


# ── Hashing ───────────────────────────────────────────────────────────────


_WS_RE = re.compile(r"\s+")
_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)


def _normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace.

    Goal: make the hash insensitive to formatting (markdown asterisks,
    em-dash polish, smart-quotes etc.) while keeping it sensitive to
    actual word choice. Bahasa-specific: keep diacritics (Sosa, João)
    by using the unicode word class.
    """
    text = text.lower()
    text = _PUNCT_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text)
    return text.strip()


def fingerprint(text: str) -> int:
    """Compute the 64-bit SimHash for a body of Bahasa text.

    Uses 7-gram character shingles after light normalization. Returns
    the integer hash value; convert to Fingerprint downstream.
    """
    normalized = _normalize(text)
    if len(normalized) < _SHINGLE_SIZE:
        # Too short to fingerprint meaningfully — return a deterministic
        # value derived from the (probably empty) string. Plagiarism
        # against tiny strings is not a real concern.
        return Simhash([normalized] if normalized else ["<empty>"]).value
    shingles = [
        normalized[i:i + _SHINGLE_SIZE]
        for i in range(len(normalized) - _SHINGLE_SIZE + 1)
    ]
    return Simhash(shingles).value


def hamming_distance(a: int, b: int) -> int:
    """Count bits where the two 64-bit integers differ."""
    return (a ^ b).bit_count()


# ── Corpus loading ────────────────────────────────────────────────────────


def load_internal_corpus(skip_slug: str | None = None) -> list[Fingerprint]:
    """Walk public/content/*/*.json and fingerprint each body_md.

    Auto-discovers every subdirectory under public/content/ — preview,
    recap, standings, team, race-preview, race-recap, h2h, glossary,
    pemain. New content types pick up corpus coverage automatically
    when their first article lands.

    `skip_slug` skips matching the article being regenerated against
    its own previous fingerprint — without this every regenerate would
    fail the gate. The check still catches near-duplicates from
    different fixtures (a real plagiarism scenario).
    """
    out: list[Fingerprint] = []
    if not _CONTENT_DIR.exists():
        return out
    for type_dir in sorted(_CONTENT_DIR.iterdir()):
        if not type_dir.is_dir():
            continue
        article_type = type_dir.name
        for f in sorted(type_dir.glob("*.json")):
            try:
                article = json.loads(f.read_text(encoding="utf-8"))
            except Exception as exc:  # noqa: BLE001
                log.warning("plagiarism.bad_corpus_file", path=str(f), error=str(exc))
                continue
            slug = article.get("slug") or f.stem
            if skip_slug and slug == skip_slug:
                continue
            body = article.get("body_md") or ""
            if not body:
                continue
            out.append(Fingerprint(
                hash_value=fingerprint(body),
                slug=slug,
                source="internal",
                type=article_type,
                title=article.get("title"),
            ))
    return out


def load_external_corpus(path: Path | None = None) -> list[Fingerprint]:
    """Load the JSONL external corpus.

    Schema (one object per line)::

        {"hash": "0xdeadbeef...",   # hex string of 64-bit int
         "slug": "...",             # source URL or article identifier
         "source_site": "bola.net", # which Indonesian sport site
         "title": "..."}

    Empty when the file doesn't exist — Phase 1 ship #4 ships with no
    corpus populated. The gate logs that loudly so it's never silent.
    """
    path = path or Path(os.environ.get("EXTERNAL_CORPUS_PATH") or _DEFAULT_EXTERNAL_CORPUS)
    if not path.exists():
        log.info("plagiarism.external_corpus_empty", path=str(path), reason="not_found")
        return []
    out: list[Fingerprint] = []
    try:
        with path.open(encoding="utf-8") as fh:
            for ln in fh:
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    obj = json.loads(ln)
                    hash_str = obj.get("hash") or ""
                    hv = int(hash_str, 16) if hash_str.startswith("0x") else int(hash_str)
                    out.append(Fingerprint(
                        hash_value=hv,
                        slug=str(obj.get("slug") or "?"),
                        source="external",
                        source_site=obj.get("source_site"),
                        title=obj.get("title"),
                    ))
                except Exception as exc:  # noqa: BLE001
                    log.warning("plagiarism.bad_external_corpus_row", error=str(exc))
    except Exception as exc:  # noqa: BLE001
        log.warning("plagiarism.external_corpus_load_failed", error=str(exc))
    if not out:
        log.warning(
            "plagiarism.external_corpus_empty_after_load",
            path=str(path),
            reason="empty_file_or_all_rows_invalid",
        )
    return out


# ── The gate ──────────────────────────────────────────────────────────────


def check(
    body_md: str,
    *,
    slug: str | None = None,
    article_type: str | None = None,
    title: str | None = None,
    external_corpus_path: Path | None = None,
) -> PlagiarismReport:
    """Run the full plagiarism + dedup gate against the body.

    Returns a `PlagiarismReport`. Caller (CLI) checks `passed` and
    exits non-zero on fail per CLAUDE.md rule #9.

    `slug`, `article_type`, `title` are optional metadata for the
    fingerprint record. `slug` is also used to skip self-matching
    against a previously-published article with the same slug
    (regeneration scenario).
    """
    article_hash = fingerprint(body_md)
    fp = Fingerprint(
        hash_value=article_hash,
        slug=slug or "<new>",
        source="self",
        type=article_type,
        title=title,
    )

    internal = load_internal_corpus(skip_slug=slug)
    external = load_external_corpus(path=external_corpus_path)

    fails: list[PlagiarismMatch] = []
    warns: list[PlagiarismMatch] = []

    for other in internal + external:
        d = hamming_distance(article_hash, other.hash_value)
        if d <= _HARD_FAIL_DISTANCE:
            fails.append(PlagiarismMatch(
                distance=d, similarity=1 - d / 64, other=other,
            ))
        elif d <= _WARN_DISTANCE:
            warns.append(PlagiarismMatch(
                distance=d, similarity=1 - d / 64, other=other,
            ))

    # Order by distance ascending — closest matches first.
    fails.sort(key=lambda m: m.distance)
    warns.sort(key=lambda m: m.distance)

    report = PlagiarismReport(
        passed=not fails,
        fingerprint=fp,
        fail_matches=fails,
        warn_matches=warns,
        internal_corpus_size=len(internal),
        external_corpus_size=len(external),
    )

    log.info(
        "plagiarism.checked",
        slug=fp.slug,
        passed=report.passed,
        fail_count=len(fails),
        warn_count=len(warns),
        internal_corpus=len(internal),
        external_corpus=len(external),
    )

    return report
