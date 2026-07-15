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

## Project quick facts

- **Stack:** Next.js 16 (App Router) storefront + admin panel; Prisma → Supabase Postgres.
- **Dev:** `npm install`, then `npm run dev` → http://localhost:3000. Secrets live in
  `.env` (never commit secrets).
- **Deploy (Vercel):** `DATABASE_URL` must use the **IPv4 Supabase pooler** host, not the
  IPv6-only direct host (`db.<ref>.supabase.co`) — Vercel functions can't reach IPv6.
- **Prisma:** the client is **engine-less** (`engineType = "client"` in
  `prisma/schema.prisma`), using the `@prisma/adapter-pg` driver adapter. Keep it that way
  so no native query-engine binary is required on any platform.
