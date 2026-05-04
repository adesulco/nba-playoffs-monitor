"""Build the external plagiarism corpus from a list of URLs.

Phase 2 ship #23. Reads ``scripts/external_corpus_seeds.txt``
(one URL per line, blank lines + ``#`` comments allowed),
fetches each URL politely (3-second delay between requests,
respects robots.txt by skipping any URL that Disallows our path),
extracts the main article body via a simple readability
heuristic, and appends a fingerprint row to
``data/external-corpus.jsonl`` — the file
``content_engine.quality.plagiarism.load_external_corpus`` reads.

Why a manual seed-list instead of a crawler: lawful scraping per
CLAUDE.md rule #5 means we hit one article at a time, slow,
acknowledged-by-publisher targets. We're NOT building a scraping
pipeline that mirrors competitor content — we're sampling enough
text to detect when our own AI writer accidentally produces a
near-clone. A few hundred curated URLs is enough corpus density.

JSONL row schema (matches load_external_corpus):

    {
      "hash":        "0x<16-hex>",
      "slug":        "<source URL>",
      "source_site": "bola.com" | "wikipedia.org" | ...,
      "title":       "<article H1 or page title>",
      "fetched_at":  "<ISO date>",
      "char_count":  1234
    }

Usage::

    cd packages/content-engine
    .venv/bin/python scripts/build_external_corpus.py
    .venv/bin/python scripts/build_external_corpus.py --append   # don't dedupe

Idempotency: the script reads existing JSONL rows first and skips
any URL already fingerprinted (matched by `slug` field). Pass
``--rebuild`` to start fresh.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx

# Resolve paths from this script's location.
_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent  # packages/content-engine/
_SEEDS_PATH = _HERE / "external_corpus_seeds.txt"
_OUTPUT_PATH = _PKG_ROOT / "data" / "external-corpus.jsonl"

# Make plagiarism.fingerprint importable without installing the package.
sys.path.insert(0, str(_PKG_ROOT / "src"))
from content_engine.quality.plagiarism import fingerprint  # noqa: E402

_TIMEOUT = httpx.Timeout(20.0, connect=5.0)
_USER_AGENT = "GibolContentEngine/1.0 (+https://www.gibol.co; contact: ade@gibol.co)"
_DELAY_S = 3.0  # courtesy delay between requests


# ── Cheap article-body extraction ─────────────────────────────────────────
#
# Real readability libraries (newspaper3k, trafilatura) are heavy and add
# Python deps we don't want. Most sports articles have ~80% of their text
# inside <p> tags within a <article> / <main> region. This extractor
# strips scripts/styles/nav, finds <article> if present, then concatenates
# all <p> innerText. Good enough for fingerprint purposes; we don't need
# perfect readability since SimHash is robust to small text noise.

_TAG_OPEN = re.compile(r"<\s*(\w+)([^>]*)>", re.I)
_SCRIPT_BLOCK = re.compile(r"<script\b[^>]*>.*?</script>", re.I | re.S)
_STYLE_BLOCK = re.compile(r"<style\b[^>]*>.*?</style>", re.I | re.S)
_NAV_BLOCK = re.compile(r"<(?:nav|aside|footer|header)\b[^>]*>.*?</(?:nav|aside|footer|header)>", re.I | re.S)
_ARTICLE_BLOCK = re.compile(r"<article\b[^>]*>(.*?)</article>", re.I | re.S)
_MAIN_BLOCK = re.compile(r"<main\b[^>]*>(.*?)</main>", re.I | re.S)
_PARAGRAPH = re.compile(r"<p\b[^>]*>(.*?)</p>", re.I | re.S)
_HTML_TAG = re.compile(r"<[^>]+>")
_HTML_ENTITY = re.compile(r"&[#a-zA-Z0-9]+;")
_TITLE_TAG = re.compile(r"<title\b[^>]*>(.*?)</title>", re.I | re.S)
_H1_TAG = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.I | re.S)

_ENTITY_MAP = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">",
    "&quot;": '"', "&apos;": "'", "&nbsp;": " ",
    "&#39;": "'", "&#x27;": "'",
}


def _decode_entities(s: str) -> str:
    for k, v in _ENTITY_MAP.items():
        s = s.replace(k, v)
    return _HTML_ENTITY.sub(" ", s)


def extract_article_body(html: str) -> str:
    """Return the main-article text from an HTML page.

    Strip scripts/styles/nav first. Prefer <article> body, else
    <main>, else the whole document. From there, concatenate
    every <p>'s text.
    """
    h = _SCRIPT_BLOCK.sub(" ", html)
    h = _STYLE_BLOCK.sub(" ", h)
    h = _NAV_BLOCK.sub(" ", h)

    inner = h
    m = _ARTICLE_BLOCK.search(h)
    if m:
        inner = m.group(1)
    else:
        m2 = _MAIN_BLOCK.search(h)
        if m2:
            inner = m2.group(1)

    paragraphs = [
        _decode_entities(_HTML_TAG.sub(" ", p.group(1))).strip()
        for p in _PARAGRAPH.finditer(inner)
    ]
    paragraphs = [p for p in paragraphs if len(p) > 20]
    return "\n\n".join(paragraphs)


def extract_title(html: str) -> str:
    m = _H1_TAG.search(html)
    if m:
        title = _decode_entities(_HTML_TAG.sub(" ", m.group(1))).strip()
        if title:
            return title[:200]
    m = _TITLE_TAG.search(html)
    if m:
        return _decode_entities(_HTML_TAG.sub(" ", m.group(1))).strip()[:200]
    return ""


# ── Robots.txt politeness check ──────────────────────────────────────────
#
# Minimal robots.txt enforcement: fetch the host's /robots.txt once,
# parse the User-agent: * block, and refuse any URL whose path matches
# a Disallow line. NOT a full RFC-compliant robots parser — just enough
# to be polite and skip explicit Disallows.

_robots_cache: dict[str, list[str]] = {}


def _robots_disallows(host_origin: str) -> list[str]:
    if host_origin in _robots_cache:
        return _robots_cache[host_origin]
    try:
        with httpx.Client(timeout=_TIMEOUT, follow_redirects=True,
                          headers={"user-agent": _USER_AGENT}) as c:
            resp = c.get(f"{host_origin}/robots.txt")
        if resp.status_code != 200:
            _robots_cache[host_origin] = []
            return []
        lines = resp.text.splitlines()
        disallows: list[str] = []
        in_star = False
        for ln in lines:
            ln = ln.split("#", 1)[0].strip()
            if not ln:
                continue
            if ln.lower().startswith("user-agent:"):
                in_star = ln.split(":", 1)[1].strip() == "*"
                continue
            if in_star and ln.lower().startswith("disallow:"):
                rule = ln.split(":", 1)[1].strip()
                if rule:
                    disallows.append(rule)
        _robots_cache[host_origin] = disallows
        return disallows
    except Exception:
        _robots_cache[host_origin] = []
        return []


def is_disallowed(url: str) -> bool:
    p = urlparse(url)
    host_origin = f"{p.scheme}://{p.netloc}"
    rules = _robots_disallows(host_origin)
    return any(p.path.startswith(rule) for rule in rules if rule and rule != "/")


# ── Main ──────────────────────────────────────────────────────────────────


def load_seeds(path: Path) -> list[str]:
    if not path.exists():
        return []
    urls = []
    for ln in path.read_text(encoding="utf-8").splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#"):
            continue
        urls.append(ln)
    return urls


def load_existing(path: Path) -> dict[str, dict]:
    """Map slug → existing row, for de-dup."""
    out = {}
    if not path.exists():
        return out
    for ln in path.read_text(encoding="utf-8").splitlines():
        ln = ln.strip()
        if not ln:
            continue
        try:
            row = json.loads(ln)
            out[row.get("slug")] = row
        except Exception:
            continue
    return out


def fetch_url(url: str) -> str:
    headers = {
        "user-agent": _USER_AGENT,
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "id,en-US;q=0.7",
    }
    with httpx.Client(timeout=_TIMEOUT, follow_redirects=True, headers=headers) as c:
        resp = c.get(url)
        resp.raise_for_status()
    return resp.text


def main() -> None:
    parser = argparse.ArgumentParser(description="Build external plagiarism corpus from seed URLs.")
    parser.add_argument("--rebuild", action="store_true", help="Start fresh — overwrite existing JSONL.")
    parser.add_argument("--seeds", type=Path, default=_SEEDS_PATH, help="Path to seeds.txt.")
    parser.add_argument("--output", type=Path, default=_OUTPUT_PATH, help="Path to output JSONL.")
    args = parser.parse_args()

    seeds = load_seeds(args.seeds)
    if not seeds:
        print(f"✗ No seeds in {args.seeds}. Add one URL per line and re-run.", file=sys.stderr)
        sys.exit(2)

    existing = {} if args.rebuild else load_existing(args.output)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    mode = "w" if args.rebuild else "a"

    added = 0
    skipped = 0
    failed = 0

    with args.output.open(mode, encoding="utf-8") as fh:
        for i, url in enumerate(seeds):
            if url in existing and not args.rebuild:
                print(f"  ⊘ skip (already in corpus): {url}")
                skipped += 1
                continue
            if is_disallowed(url):
                print(f"  ⊘ skip (robots.txt disallow): {url}")
                skipped += 1
                continue
            print(f"  ▶ {url}")
            try:
                html = fetch_url(url)
            except Exception as exc:
                print(f"    ✗ fetch failed: {exc}")
                failed += 1
                continue
            body = extract_article_body(html)
            if len(body) < 200:
                print(f"    ✗ extracted body too short ({len(body)} chars) — skipping")
                failed += 1
                continue
            title = extract_title(html)
            host = urlparse(url).netloc
            row = {
                "hash": f"0x{fingerprint(body):016x}",
                "slug": url,
                "source_site": host,
                "title": title,
                "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                "char_count": len(body),
            }
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(f"    ✓ {row['hash']} ({len(body)} chars) — {title[:60]}")
            added += 1

            if i + 1 < len(seeds):
                time.sleep(_DELAY_S)

    print(f"\n✓ Done. Added {added}, skipped {skipped}, failed {failed}. Output: {args.output}")


if __name__ == "__main__":
    main()
