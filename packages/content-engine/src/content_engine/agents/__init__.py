"""Content-generation agents.

Phase 1 lands ``preview`` + ``recap``. Phase 2+ adds ``standings``,
``profile``, ``race``, ``qc``. All call through ``anthropic_client``
so caching, budget enforcement, and cost tracking happen consistently.
"""
