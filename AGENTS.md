# AGENTS.md

Instructions for **any** AI coding agent working in this repository — Claude Code, Cursor,
GitHub Copilot, Codex, Gemini, Windsurf, Aider, and others. Read this before committing.

## Attribution — never credit AI in this repo (required)

- **Do not add yourself, or any AI, as a commit author, co-author, or contributor.**
- **Do not** add `Co-Authored-By:` trailers that name an AI (e.g. Claude, Anthropic,
  Copilot, Cursor, ChatGPT / OpenAI, Gemini, Codeium, Windsurf).
- **Do not** add "Generated with <AI>", "🤖", or similar lines to commit messages or
  pull-request descriptions.
- Every commit must be authored **solely by the human developer**. Genuine human
  co-authors are fine.

This is a hard requirement. Commit messages should describe the change only — nothing
about the tool that produced it.

## Optional local enforcement (recommended)

Git does not clone hooks, so after pulling this repo you can install a one-line safety net
that strips AI attribution automatically. Create `.git/hooks/commit-msg` with:

```sh
#!/bin/sh
# Strip AI self-attribution from commit messages (human co-authors are preserved).
f="$1"
grep -viE '^Co-authored-by:.*(claude|anthropic|copilot|openai|chatgpt|gpt-|cursor|gemini|codeium|windsurf|bard|llama)|^[[:space:]]*(🤖[[:space:]]*)?Generated with (\[)?(Claude|Cursor|Copilot|Codeium|ChatGPT)' "$f" > "$f.deai"
mv "$f.deai" "$f"
```

Then make it executable: `chmod +x .git/hooks/commit-msg`.

## Session reports (required)

**Every session that changes something must be written up in `reports/`.** Not optional, not "if it
was interesting" — the log is only useful if it's complete.

### The protocol

1. **Check `reports/` for today's folder** (`YYYY-MM-DD-<slug>`, e.g. `2026-07-16-audit-phase0`).
2. **If it doesn't exist, create it** with all three files below. Pick a short slug for the day's
   main theme — shorter is better.
3. **If it already exists, add to it.** One folder per day. Do not start a second folder for the same
   date; append your work as a new section instead.
4. **Update [`reports/README.md`](reports/README.md)** — add or extend the entry, newest first.

### Three files, three audiences

| File | Reader | Rules |
|---|---|---|
| `client.md` | Anyone non-technical — a client, a friend being shown the project | **No file paths, no jargon, no code.** Explain what broke and why it mattered in plain language. Assume zero technical knowledge and zero context. Don't dumb it down — just don't require them to know what a transaction is. |
| `dev.md` | Developers | File links, reasoning, verification commands, deferred items with rationale. |
| `ai.md` | AI agents | **Dense. Token-efficient.** Tables over prose. `file:line` everywhere. Settled decisions, invariants, and what NOT to do. An agent should be able to read *only this file* and be caught up. |

### Required sections

Every report, in all three versions (adapted to the audience):

- **Header** — date, one-line headline, status, commit SHAs.
- **What changed** — and why.
- **✅ Verified** — **with the command that produced each result.** `Mobile 95` is a claim.
  `Mobile 95 — npx lighthouse@12 ... against a local prod build` is a fact someone can re-run.
- **⚠️ Provisional** — anything measured in a way that needs redoing (e.g. localhost numbers that
  need a re-check against production). Say so loudly.
- **❌ Corrections** — **any earlier claim, in any doc or report, that turned out to be false.**
- **Deliberately not done** — deferred items, why, and where they're tracked.
- **Follow-ups** — what the next session should pick up.

### Why Verified and Corrections are not negotiable

On 2026-07-16, **five** confident, well-argued claims from a codebase audit turned out to be plain
wrong — a "crash" that couldn't fire, a mutation that couldn't happen, a "dead" file the seed script
imports, a hooks violation that wasn't one, and a CLS problem on a site measuring **CLS 0**. Every
one came from reading code instead of running it. Two of them nearly caused "fixes" for bugs that
never existed.

The same day, `react-hooks/rules-of-hooks` was found to name one of the *real* bugs verbatim — it had
simply never fired, because nobody had ever run `npm run lint`.

So: **separate what you measured from what you believe, and write down what you got wrong.** A false
claim that isn't corrected gets inherited by whoever reads next.

### Template

```markdown
# YYYY-MM-DD — <headline>

**Audience:** <client | developers | AI agents>
**Status:** ✅ shipped | 🚧 in progress | ⛔ blocked
**Commits:** <sha(s) or "pending">

## What changed
## Why
## ✅ Verified          <- command + result for every claim
## ⚠️ Provisional        <- what still needs re-measuring, and how
## ❌ Corrections        <- earlier claims that turned out false
## Deliberately not done <- + why + where it's tracked
## Follow-ups
```

## Project quick facts

- **Stack:** Next.js 16 (App Router) storefront + admin panel; Prisma → Supabase Postgres.
- **Dev:** `npm install`, then `npm run dev` → http://localhost:3000. Secrets live in
  `.env` (never commit secrets).
- **Deploy (Vercel):** `DATABASE_URL` must use the **IPv4 Supabase pooler** host, not the
  IPv6-only direct host (`db.<ref>.supabase.co`) — Vercel functions can't reach IPv6.
- **Prisma:** the client is **engine-less** (`engineType = "client"` in
  `prisma/schema.prisma`), using the `@prisma/adapter-pg` driver adapter. Keep it that way
  so no native query-engine binary is required on any platform.
