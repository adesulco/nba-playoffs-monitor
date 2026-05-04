"""Quality gates.

Phase 1 lands ``banned_phrase`` (regex-based, hard fail). Phase 1 also
lands ``voice_lint`` (Haiku 4.5 naturalness), ``fact_check``, ``dedup``
(simhash), and ``plagiarism`` (7-gram simhash vs external corpus per
docs/content-engine-response.md § 6).

A draft is publishable only if all hard gates pass. Per CLAUDE.md non-
negotiable rule #4: no override flags, no bypass.
"""
