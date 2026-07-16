# 2026-07-15 — Storefront products not displaying

**Audience:** developers · see [client.md](client.md) for the plain-English version, [ai.md](ai.md) for the dense one
**Status:** ✅ resolved — both environments serving the full catalog
**Date:** 2026-07-15 *(written after midnight, so the original file was stamped the 16th)*
**Project:** Reverie Revival (Next.js 16 App Router + Prisma → Supabase Postgres)
**Affected:** Storefront product catalog (`/`, `/shop`) on both local and production (Vercel)

---

## Summary

The storefront showed **no products**. The page loaded, but the catalog area was empty.
Root cause was **not** the app code — the frontend correctly requests
`GET /api/storefront/products`, but that endpoint could not return data because of a
chain of **database-connection and deployment-packaging** problems.

Three distinct issues were found and fixed. After the fixes, both environments serve the
full catalog (**20 products, 5 categories**).

---

## How the storefront loads products

```
Browser → GET /api/storefront/products → Prisma → Supabase Postgres
```

- `src/storefront/App.tsx` fetches `/api/storefront/products` on load.
- `src/app/api/storefront/products/route.ts` queries Prisma for products where
  `status = ACTIVE` and `deletedAt = null`.
- If the database is unreachable, the catalog comes back empty (or the request errors),
  so the site renders with no products.

---

## Problem 1 — Local: database was paused / project not set up

**Symptom:** Local site (`localhost:3000`) showed no products.

**Root cause (two parts):**
1. The working copy was missing `node_modules`, the generated Prisma client
   (`src/generated/prisma`), and the `.env` file — so `DATABASE_URL` was undefined and the
   API returned an empty list.
2. The Supabase free-tier project had **auto-paused** (free projects pause after ~1 week
   idle). While paused, its hosts don't resolve, so no connection is possible.

**Fix:**
- Un-paused the Supabase project from the dashboard, then flushed DNS
  (`Clear-DnsClientCache`) so the restored host resolved.
- Restored `.env`, ran `npm install` (which also generates the Prisma client).
- Confirmed the database still held its data (**20 ACTIVE products**) — no re-seed needed.

**Result:** Local storefront returned all products (HTTP 200).

---

## Problem 2 — Production (Vercel): 500 error, ~12-second hang

**Symptom:** On `reverie-revival.vercel.app`, `/api/storefront/products` and `/api/visit`
returned **500**, each after hanging ~**12 seconds**. Locally the same code worked.

**Root cause:** Vercel's serverless functions egress over **IPv4 only**. The production
`DATABASE_URL` pointed at Supabase's **direct** database host
(`db.<ref>.supabase.co`), which is **IPv6-only**. The function tried to open a connection
that could never be answered, hung until timeout, and returned 500. (Local worked because
the local `.env` used the IPv4 pooler host.)

**Fix:** Changed the Vercel `DATABASE_URL` environment variable to the **IPv4 pooler** host:

```
postgresql://postgres.<ref>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

Then redeployed (environment-variable changes do not apply to existing deployments).

**Evidence it worked:** response time dropped from **~12 s (hang)** to **~278 ms (fast
fail)** — the network problem was gone, revealing a different, faster error (Problem 3).

---

## Problem 3 — Production (Vercel): 500 error, fast fail

**Symptom:** After Problem 2 was fixed, the endpoint still returned **500**, but now in
~300–450 ms. The Vercel function log showed:

```
PrismaClientInitializationError: Prisma Client could not locate the Query Engine
for runtime "rhel-openssl-3.0.x".
... libquery_engine-rhel-openssl-3.0.x.so.node has [not] been copied ...
```

**Root cause:** Prisma's query engine is a **native binary compiled per platform**.
`prisma generate` on the Windows dev machine produces the Windows engine, but Vercel's
serverless runtime is **Linux (`rhel-openssl-3.0.x`)**. The Linux engine binary was not
present in the deployed function bundle, so the Prisma client could not initialize and
every database route 500'd. This was Vercel-only, which is why local was unaffected.

**Fix:** Made the Prisma client **engine-less**. Because the project already uses the
`@prisma/adapter-pg` driver adapter (in `src/lib/prisma.ts` and `prisma/seed.ts`), the
native query-engine binary can be dropped entirely. Added one line to the generator in
`prisma/schema.prisma`:

```prisma
generator client {
  provider   = "prisma-client"
  output     = "../src/generated/prisma"
  engineType = "client"   // engine-less: uses the pg driver adapter, no native binary
}
```

This produces a pure-JavaScript client — nothing platform-specific to bundle, so the
"engine not found" error cannot occur on any platform. Verified locally that the
engine-less client queries the live database successfully before deploying.

**Result:** After committing the schema change and redeploying, the production endpoint
returned **HTTP 200 with all 20 products**.

---

## Additional fix

- **README.md:** the file had a corrupted trailing line — a `# Reverie-Revival` title had
  been appended in the wrong text encoding (UTF-16), rendering as `# R e v e r i e ...`.
  Removed the garbled bytes; the README now ends cleanly.

---

## Current state

| Environment | Endpoint | Result |
|---|---|---|
| Local (`localhost:3000`) | `/api/storefront/products` | ✅ 200 — 20 products, 5 categories |
| Production (`reverie-revival.vercel.app`) | `/api/storefront/products` | ✅ 200 — 20 products, 5 categories |

- Database: Supabase project active, data intact (20 ACTIVE products).
- Prisma client: engine-less, works identically on Windows and Vercel/Linux.
- Production `DATABASE_URL`: IPv4 pooler host.

---

## How to run

**Local development**
```powershell
npm.cmd install
npm.cmd run dev        # http://localhost:3000
```

**Production (Vercel)**
- Push to `main` → Vercel builds automatically (`postinstall` runs `prisma generate`).
- Required env var: `DATABASE_URL` must use the **IPv4 Supabase pooler** host, set for the
  **Production** environment.

---

## Preventing recurrence

- **Empty catalog again?** First check the database, not the code — the Supabase free
  project auto-pauses after ~1 week idle. Un-pause it and flush DNS.
- **New Vercel 500s?** Confirm `DATABASE_URL` uses the pooler (IPv4) host, never the
  direct (`db.<ref>.supabase.co`, IPv6-only) host.
- **"Query Engine not found" on any host?** The engine-less client (`engineType = "client"`)
  prevents this; keep that setting in `prisma/schema.prisma`.
