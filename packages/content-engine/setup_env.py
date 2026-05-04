#!/usr/bin/env python3
"""One-shot helper to write DATABASE_URL into .env securely.

Phase 0 setup. Avoids the chat-paste-mangling problem (markdown auto-links
URLs containing `user@host:port`) by keeping all URL construction out of
shell commands. Run once after `pip install -e ".[dev]"` and after you've
reset your Postgres password in Supabase.

Usage:
    python setup_env.py

The script:
  1. Prompts for the Postgres password using getpass (no terminal echo,
     no shell history)
  2. Drops any existing DATABASE_URL line from .env
  3. Appends the new DATABASE_URL with the password substituted in
  4. Prints a redacted verification (host + user + password length)

Hard-coded constants below match the Supabase project's session-pooler
endpoint. If the project is ever migrated, update CONFIG and re-run.
"""

from __future__ import annotations

import getpass
import sys
from pathlib import Path

CONFIG = {
    "project_ref": "egzacjfbmgbcwhtvqixc",
    "host": "aws-1-ap-south-1.pooler.supabase.com",
    "port": 5432,
    "database": "postgres",
}


def _prompt(label: str, expected_prefix: str | None = None, min_len: int = 8) -> str:
    """getpass loop with a sanity check on length + optional prefix."""
    while True:
        try:
            val = getpass.getpass(f"  {label}: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n  Cancelled.")
            sys.exit(1)
        if not val:
            print("    ⚠ Empty input. Try again or Ctrl+C to abort.")
            continue
        if len(val) < min_len:
            print(f"    ⚠ Got {len(val)} chars — that's shorter than expected ({min_len}+).")
            try:
                ok = input("    Continue anyway? [y/N]: ").strip().lower()
            except (KeyboardInterrupt, EOFError):
                print("\n  Cancelled.")
                sys.exit(1)
            if ok != "y":
                continue
        if expected_prefix and not val.startswith(expected_prefix):
            print(f"    ⚠ Doesn't start with expected prefix '{expected_prefix}'.")
            try:
                ok = input("    Continue anyway? [y/N]: ").strip().lower()
            except (KeyboardInterrupt, EOFError):
                print("\n  Cancelled.")
                sys.exit(1)
            if ok != "y":
                continue
        return val


def main() -> int:
    env_path = Path(__file__).parent / ".env"
    user = f"postgres.{CONFIG['project_ref']}"
    host_port = f"{CONFIG['host']}:{CONFIG['port']}"

    print(f"\n  Configuring .env at: {env_path}")
    print(f"  This script collects 3 secrets via getpass (no echo, no shell")
    print(f"  history). Each prompt accepts paste (Cmd+V) + Enter.")
    print()
    print(f"  Press Ctrl+C at any prompt to abort.")
    print()

    print("  [1/3] Anthropic API key — from https://console.anthropic.com/settings/keys")
    print("        (starts with 'sk-ant-api03-...', ~108 chars)")
    anthropic = _prompt("Paste ANTHROPIC_API_KEY", expected_prefix="sk-ant-", min_len=80)

    print()
    print("  [2/3] API-Football key — from https://dashboard.api-football.com")
    print("        (32-char hex string, no prefix)")
    af = _prompt("Paste API_FOOTBALL_KEY", min_len=20)

    print()
    print("  [3/3] Postgres password — from Supabase reset (or your password manager)")
    print(f"        Will build: postgresql://{user}:***@{host_port}/{CONFIG['database']}")
    pg_pwd = _prompt("Paste Postgres password", min_len=8)

    db_url = f"postgresql://{user}:{pg_pwd}@{host_port}/{CONFIG['database']}"

    # Read existing .env (preserve unrelated vars), drop the three keys we're
    # writing so we don't double up, then append fresh. Idempotent — re-running
    # always overwrites only these three lines.
    drop_keys = {"ANTHROPIC_API_KEY", "API_FOOTBALL_KEY", "DATABASE_URL"}
    existing_lines: list[str] = []
    if env_path.exists():
        with env_path.open(encoding="utf-8") as f:
            existing_lines = [
                line for line in f
                if not any(line.startswith(f"{k}=") for k in drop_keys)
            ]

    existing_lines.extend([
        f"ANTHROPIC_API_KEY={anthropic}\n",
        f"API_FOOTBALL_KEY={af}\n",
        f"DATABASE_URL={db_url}\n",
    ])

    with env_path.open("w", encoding="utf-8") as f:
        f.writelines(existing_lines)

    print()
    print("  ✓ .env written")
    print(f"    ANTHROPIC_API_KEY : {len(anthropic)} chars stored")
    print(f"    API_FOOTBALL_KEY  : {len(af)} chars stored")
    print(f"    DATABASE_URL      : postgresql://{user}:***@{host_port}/{CONFIG['database']}")
    print()
    print("  Next: run `python -m content_engine.cli health`")
    return 0


if __name__ == "__main__":
    sys.exit(main())
