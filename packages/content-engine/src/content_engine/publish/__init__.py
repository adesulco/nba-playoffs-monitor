"""Publishing — write generated articles to the SPA's content tree.

Phase 1: ``json_writer`` lands first. It writes per-article JSON files
to ``public/content/{type}/{slug}.json`` for the Vite SPA's lazy routes
to consume (per docs/content-engine-response.md § 1 architectural
amendment — Vite stack, NOT Next.js MDX).

Phase 1 also: ``schema`` (NewsArticle + SportsEvent JSON-LD builder).
Phase 2: ``slug`` (slug generator with Bahasa-friendly transliteration),
``commit`` (git commit + branch helpers), ``deploy`` (Vercel trigger).
"""
