# CLAUDE.md

Instructions for Claude Code in this repository.

## Attribution — never credit AI in this repo (required)

- **Do not add yourself, or any AI, as a commit author, co-author, or contributor.**
- **Do not** add `Co-Authored-By:` trailers naming Claude/Anthropic (or any other AI).
- **Do not** add "🤖 Generated with Claude Code" (or similar) lines to commit messages or
  pull-request descriptions.
- Every commit must be authored **solely by the human developer**. Genuine human
  co-authors are fine.

## Session reports — required

Every session that changes something gets written up in **[`reports/`](reports/)**: one folder per
day, three files (`client.md` / `dev.md` / `ai.md`) for non-technical readers, developers, and AI
agents. If today's folder doesn't exist, create it; if it does, add to it.

**Start by reading the newest `ai.md` in [`reports/`](reports/)** — it carries the settled decisions,
the invariants, and the list of earlier claims that turned out to be false. It'll save you from
re-deriving a bug that doesn't exist.

Full protocol, required sections, and the template: **[AGENTS.md → Session reports](AGENTS.md#session-reports-required)**.

See **[AGENTS.md](AGENTS.md)** for the full rules (shared with all AI tools), an optional
enforcement hook, and project quick facts.
