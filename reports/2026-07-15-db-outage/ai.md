# 2026-07-15 — db-outage · AI report

**Audience:** AI agents. Dense by design. Human versions: [client.md](client.md), [dev.md](dev.md).
**Status:** RESOLVED. Both envs serve 20 ACTIVE products.

## TL;DR

Empty storefront. **Not app code.** Three stacked infra failures, each masking the next.

## Causes → fixes

| # | Env | Symptom | Root cause | Fix |
|---|---|---|---|---|
| 1 | local | empty catalog | Supabase free tier **auto-paused** (~1wk idle); also missing `.env`, `node_modules`, generated client | Un-pause in dashboard → `Clear-DnsClientCache` → restore `.env` → `npm install` |
| 2 | Vercel | 500 after ~12s hang | `DATABASE_URL` pointed at direct host `db.<ref>.supabase.co`, which is **IPv6-only**; Vercel functions egress **IPv4-only** | Switch to IPv4 pooler `aws-1-ap-northeast-2.pooler.supabase.com:5432`, redeploy |
| 3 | Vercel | 500 in ~300-450ms | Prisma query engine is a **per-platform native binary**; Windows-generated engine ≠ Vercel's `rhel-openssl-3.0.x` | `engineType = "client"` in `prisma/schema.prisma` → engine-less JS client via `@prisma/adapter-pg` |

Diagnostic signal for #2→#3: response time **12s → 278ms**. A hang becoming a fast failure means the
network problem is gone and a *different* error is now reachable.

## Load path

```
src/storefront/App.tsx  → GET /api/storefront/products
  → src/app/api/storefront/products/route.ts  (status=ACTIVE, deletedAt=null)
    → Prisma → Supabase Postgres
```

`route.ts:25-26` returns `{products:[], categories:[]}` when `prisma` is undefined (no
`DATABASE_URL`). **An empty catalog is therefore a DB/connection signal, not an app bug.**

## Invariants — do not break

| Rule | Why |
|---|---|
| Vercel `DATABASE_URL` **must** be the IPv4 pooler host | Direct host is IPv6-only → ~12s hang → 500 |
| Keep `engineType = "client"` in `prisma/schema.prisma` | Engine-less client = no native binary = works on every platform |
| Do **not** use `previewFeatures = ["queryCompiler","driverAdapters"]` | Deprecated, and still emits a binary |
| Do **not** add a hardcoded-product fallback to the storefront API | Rejected — see `MISSING-ARCHIVE.md`. Would mask exactly this outage and serve stale prices |

## Triage order for a future empty catalog

1. **Check the DB before the code.** Free tier auto-pauses after ~1wk idle. Un-pause, flush DNS, wait ~2min for the pooler tenant to re-register.
2. Paused symptoms: pooler → `"tenant or user not found"`; direct → NXDOMAIN.
3. Restored projects **keep their data** — `prisma:push`/`prisma:seed` are NOT needed. Just `npm run dev`.
4. `DIRECT_URL` is IPv6-only and fails from the dev machine; it's migrations-only. Runtime uses `DATABASE_URL` (pooler, IPv4).

## Also fixed

`README.md` had a garbled trailing line — a `# Reverie-Revival` title appended in UTF-16, rendering as `# R e v e r i e`. Removed.
