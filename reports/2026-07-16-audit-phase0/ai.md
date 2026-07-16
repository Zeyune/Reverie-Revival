# 2026-07-16 — audit-phase0 · AI report

**Audience:** AI agents. Dense by design. Human versions: [client.md](client.md), [dev.md](dev.md).
**Status:** SHIPPED. Commits `ffc70b3`, `3631290`. Tree clean, pushed.
**State:** typecheck 0 · lint 0 errors · 48/48 tests · build ok · mobile 95 · desktop 100 · CLS 0

## Read this first — corrections

**Five claims in the original audit were WRONG.** All produced by reading code, none by running it.
Do not re-derive them.

| Wrong claim | Reality | Evidence |
|---|---|---|
| Conditional hooks crash when `isLoading` flips | **Never fires.** React picks dispatcher via `current === null \|\| current.memoizedState === null` → a render that returned early takes the **mount** path next render. Crash only fires **N→0** hooks. ShopPage goes **0→7**. | Probed React 19.2: does not throw |
| `filtered.sort()` mutates the `products` prop | **Impossible.** `ShopPage.tsx:65-67` price filter is **unconditional**; `.filter()` always returns a new array → sort always gets a copy | Mutation test: removing `[...products]` fails nothing |
| `data/products.ts` is dead → delete | **`prisma/seed.ts:9` imports it.** Deleting breaks `npm run prisma:seed` | Original grep only searched `src/` |
| `WishlistPage` has conditional hooks | Only hook (`useStore()`) runs **before** the early return | Read |
| Images lack width/height → CLS | **CLS = 0** both platforms. All images in reserved boxes: `aspect-[3/4]`, `w-32 h-40`, `w-16 h-20` | Lighthouse |

**Lesson:** mutation-test any fix for a bug you haven't watched fail. Two "fixes" today guarded
bugs that didn't exist, and one test passed against broken code (cold connection pool serialised
the writers it was meant to race).

## Changed

| Area | File | Change |
|---|---|---|
| authz | `admin/(app)/promos/page.tsx:8,37` | `requireAdmin()` + zod (pct≤100, fixed≤100k, enum, `.toUpperCase()`) + dup check + `recordAuditLog`. Was the **only** unguarded Server Action; layout guard does NOT cover actions (Next runs action → then layout) |
| race | `src/lib/inventory.ts` **(new)** | `reserveStock` = `updateMany({where:{id, stockQty:{gte:qty}}})`. Postgres re-checks predicate under row lock → loser matches 0 rows |
| race | `api/checkout/route.ts:254-270` | Reserve **inside** tx, **before** `order.create`, sorted by `variantId` (deadlock avoidance). Throws `OutOfStockError` → 409 |
| ratelimit | `lib/rate-limit.ts:39` | `normalizeIp` → **rightmost** XFF hop; platform headers preferred |
| ratelimit | `lib/rate-limit.ts` | `DEFAULT_LIMITS = {host:1000, ip:60, extra:30}` — was `Infinity` (fail-open) |
| oracle | `api/promo/validate/route.ts` | rate limit 20/IP/10min + zod + single `INVALID_RESPONSE` + case-insensitive |
| pii | `api/contact/route.ts:21,23` | Removed personal-Gmail + `no-reply@example.com` fallbacks → fail closed + loud log |
| store | `src/storefront/lib/store.ts` **(new)** | `useSyncExternalStore`; localStorage = single source of truth |
| perf | `components/Hero.tsx` | CSS `background-image` → `<img fetchPriority="high">`; 364KB PNG → 40KB grayscale WebP |
| perf | `pages/HomePage.tsx:20` | Removed `isLoading` early return + the now-unused prop |
| perf | `app/layout.tsx` | Poppins+Allura via `next/font` (4 weights); Geist Sans deleted; Geist Mono `preload:false` |
| ci | `.github/workflows/ci.yml` **(new)** | typecheck/lint/test/build on PR, throwaway Postgres service |

## Decisions — settled, do not re-litigate

| Decision | Rationale |
|---|---|
| `useSyncExternalStore`, **not** lazy `useState` init | Server renders empty cart; `Navigation.tsx:90` renders a badge from it → lazy init = **hydration mismatch**. Worse than one extra render |
| `<img fetchPriority`, **not** `<link rel=preload>` | Once the Hero is in SSR HTML the `<img>` is self-describing; a preload link is a second source of truth to drift |
| Grayscale WebP q80 (40KB), not AVIF q60 (29KB) | AVIF saved 4KB, decodes slower. `contrast(120%)` amplifies artifacts → keep quality headroom |
| CI uses a **throwaway Postgres**, not Supabase | Inventory tests write rows. Also → no DB secret in CI |
| Poppins 400/500/600/900 only | 700/800 used by nothing: no `font-bold`, no `<strong>`, no `<b>` |
| `contact` returns `ok:true` when email unsent | Message persists to `ContactMessage` **before** send; email is a notification, not storage |
| `Reverie` **table** drop deferred | Lands as versioned SQL in PLAN 5.1. 0 rows |
| No hardcoded-product fallback in storefront API | Rejected — would mask a DB outage + serve stale prices. See `MISSING-ARCHIVE.md` |

## Invariants — do not break

| Rule | Why |
|---|---|
| Every `"use server"` fn calls `requireAdmin()` **itself** | Layouts run AFTER actions. 11 files verified |
| Keep `stockQty: {gte: qty}` in `reserveStock`'s `where` | It IS the race fix. Read-then-write cannot work at Read Committed |
| `checkout/route.ts:177` re-derives prices from DB | Client must NEVER supply a price or discount |
| `getSnapshot` must return a referentially stable value | Else `useSyncExternalStore` loops forever. Cache is keyed on raw storage strings |
| Upload allowlist excludes `image/svg+xml` | Deliberate — stored-XSS. Do not "fix" |
| `src/` has **0** `eslint-disable` | Keep it |
| `data/products.ts` stays | `prisma/seed.ts:9` |

## Perf

LCP mobile 5.5s → 2.9s; score 70→95. Desktop 90→**100**.

| Phase | Before | After |
|---|---|---|
| TTFB | 657ms | 463ms |
| **Load Delay** | **3954ms (71%)** | **0ms** ✅ |
| Load Time | 863ms | 395ms |
| **Render Delay** | 62ms | **2064ms (71%)** ⚠️ |

Root cause was: hero image was a CSS `background-image` inside a component gated on `isLoading` →
undiscoverable until JS + hydrate + API resolved. Preload scanner can't see style attributes.

**⚠️ PROVISIONAL: localhost numbers.** No network → TTFB understated by ~200-450ms vs Vercel.
Re-measure post-deploy and replace.

**Remaining 5 mobile points = Phase 1.** Render delay 2064ms = image waits on main thread (373ms
script eval × 4 CPU throttle) because the storefront is a client bundle. Less JS is the only fix.

## 🔥 INCIDENT (resolved) — prod down ~10min, connection exhaustion

The "open risk" below **fired in production ~20 min after being logged.** Read this before touching
the DB or running local servers.

| | |
|---|---|
| Symptom | `/api/visit` + `/api/storefront/products` → **500**; `EMAXCONNSESSION ... pool_size: 15` |
| Cause A | **8 orphaned local connections.** Session mode holds a conn until the client disconnects *cleanly*; killed dev servers never do. Supavisor didn't reap → idle **20-48 min**, holding dead servers' slots |
| Cause B | **PageSpeed scan** → Vercel spun up instances → each built its own pool (`pg` default **10**, no `max` in `lib/prisma.ts:17`) → took the remaining slots |
| **Key correction** | **The 15-slot budget is GLOBAL, not per-environment.** Local dev + Vercel prod share it. **Local benchmarking can take production down. It did.** |
| Diagnosis gotcha | `client_addr` shows **Supavisor's IP for every row** (all traffic routes through the pooler) — useless for attribution. Use **`backend_start` age**: old = orphans, young = live Vercel |
| Fix applied | `pg_terminate_backend` where `state='idle' AND now()-backend_start > interval '20 minutes'` → killed 8, 7/15 held, 8 free |
| Verified | `/api/storefront/products` **200 ×3, 20 products / 5 categories**; `/api/visit` **200** |
| **Still unfixed** | The uncapped pool. **A PageSpeed scan can take prod down until it's capped.** |

**Operational rule until fixed:** don't leave local dev/prod servers running against this DB, and
don't benchmark prod while a local server is up. If prod 500s with `EMAXCONNSESSION`, terminate
idle connections older than 20 min (needs user authorisation — destructive on prod).

## 🆕 OPEN RISK — connection-pool exhaustion (logged, NOT fixed)

| | |
|---|---|
| Error | `DriverAdapterError: (EMAXCONNSESSION) max clients reached in session mode — pool_size: 15` |
| Cause | `lib/prisma.ts:17` → `new Pool({connectionString})` with **no `max`** → pg default **10/pool**. Prod `DATABASE_URL` = **:5432 session mode** (holds conn per session). Pooler `pool_size` **15**. Vercel = **pool per function instance** → 2 instances = 20 > 15 |
| Measured | 15 conns held, 14 idle (`pg_stat_activity`). Supavisor reaps idle slowly |
| Trigger found | Leaving dev servers running while benchmarking = accidental concurrency sim |
| Prod impact | **None yet (no traffic). Will bite when Phase 2 ships payments.** |
| Fix (not applied) | Cap pool (`max: 1`, standard for serverless — 1 req per instance) and/or transaction mode **:6543** (returns conns between statements; Supabase's serverless recommendation) |
| Also | `prisma/seed.ts:17` same uncapped pool — one-shot script, lower stakes |

**Test mitigation applied:** `CONCURRENCY` 8→5, `TEST_POOL_MAX=6` (`tests/helpers/db.ts`).
Mutation-verified: read-then-write still fails both race tests at 5. CI unaffected (throwaway PG ~100).

## 📊 PageSpeed — PROD HIT 100/98, SKELETONS COST 5/4 (PSI, LH 13.4.0)

Two runs, 50 min apart. **Only delta = commit `08f7613` "Add loading skeletons".**

| | Baseline | **22:47 post-0.5** | **23:37 post-skeleton** |
|---|---|---|---|
| Desktop | 90 | **100** 🏆 | **95** (−5) |
| Mobile | 70 | **98** | **94** (−4) |

| Metric | Dsk 22:47 | Dsk 23:37 | Mob 22:47 | Mob 23:37 |
|---|---|---|---|---|
| FCP | 0.3s | 0.3s | 0.9s | 0.9s |
| LCP | **0.5s** | 0.6s | **2.5s** | 2.8s |
| **TBT** | **70ms** | **170ms** 🔴 | **0ms** | 20ms |
| CLS | 0 | 0 | 0 | 0 |
| **SI** | **0.8s** | 1.0s | **1.8s** | **4.1s** 🔴 |
| long tasks | **1** | **3** 🔴 | — | **2** 🔴 |

**New insights at 23:37 only:** `Optimize DOM size` · `Forced reflow` · `Layout shift culprits`

**Cause (mine):**
1. `animate-pulse` × **96 els** → SI. SI = how fast the page stops changing; a pulse never stops.
   **Mobile SI 1.8 → 4.1s.**
2. SSR HTML **17KB → 57KB** → more hydration work → **1→3 long tasks**, **+100ms** desktop TBT.

**✅ FIX APPLIED — de-pulsed.** `animate-pulse` removed (static tint), els/card ~8→5, dims untouched.

| | pulse | **de-pulsed** |
|---|---|---|
| Desktop | 95 | **100** (local; prod was 100 pre-skeleton) |
| Mobile | 94 | **95** (3 runs: 95/95/95) |
| Dsk TBT | 170ms | **0ms** |
| Dsk long tasks | 3 | **1** |
| **Mob SI** | **4.1s** | **0.8s** |
| CLS | 0 | **0** ✅ |
| pulse els | 96 | **0** |
| SSR HTML | 57KB | 52.5KB |

**INVARIANT: never add animation back to `Skeleton.tsx`** — not `animate-pulse`, not a shimmer.
Any continuous motion tanks SI. Shape alone reads as loading; `sr-only` covers a11y. See the comment
block at the top of that file.

**Noise datum for 5.10:** one mobile run = **85, TBT 370ms**; three re-runs = **95/95/95, TBT
50-70ms**. TBT swings hard on a loaded machine. **Budget individual metrics with headroom, NEVER
`score >= 100`** — that outlier would red-build a correct commit.

**Proven good:** hero fix real-world (desktop LCP **0.5s** @22:47) · CLS **0** throughout, skeletons
did NOT break it · FCP perfect both · render-blocking **905ms → 20-40ms**.

## ❌ CORRECTION — two wrong calls on this, same night

1. **"Skeletons didn't hurt SI"** — I checked desktop SI (1.0s), saw "perfect", and retired the
   hypothesis. **One absolute number read as a trend.** Desktop SI had gone 0.8→1.0; mobile had
   **doubled**. → *A metric is only meaningful against its own history. "1.0s is perfect" and "1.0s
   is 25% worse than yesterday" are both true; only the second is the finding.*
2. **"Desktop 100→95 = the lab was optimistic"** — wrong. **Production independently scored 100** at
   22:47. Lab and prod agreed. It was a real regression shipped 50 min later.

**Remaining losses → already-planned phases:**
- **Desktop −5 = TBT 170ms (3 long tasks).** Oddity: desktop **170ms** vs mobile **20ms** despite 4×
  mobile CPU throttle. Slow 4G trickles JS → small chunks; fast desktop lands it all at once →
  **one hydration burst** → long tasks. Same root cause as mobile LCP render-delay → **Phase 1**.
- **Biggest item left: "Improve image delivery — 1,204 KiB"** (Unsplash 1080px product imgs) →
  `next/image` → **Phase 4**.

**Do not trust the sibling scores:**
- **SEO 100 is a lie of omission** — LH checks title/crawlable/structured-data. It **cannot see that
  every storefront page shares one URL**. Never cite it against Phase 1.
- **🆕 A11y 96 — insufficient colour contrast.** Not yet in MISSING.md.
- Best Practices 100, but its Trust & Safety panel flags CSP/COOP/XFO/Trusted Types → PLAN 5.2.

**Caveat:** measured while the pool was degraded (12/15 held, API TTFB 1.0-2.4s vs ~300ms). Homepage
TTFB was fine (0.21-0.29s) and the API is off the LCP path, so impact likely small — **re-measure
after capping the pool.**

**Hypothesis retired:** skeletons suspected of wrecking SI (96 `animate-pulse` els). Desktop SI came
back **1.0s perfect** → they didn't. May add desktop TBT via hydration; unproven.

## Verify commands

```bash
npx tsc --noEmit                 # 0
npm run lint                     # 0 errors, 7 img warnings
npm test                         # 48/48
npm run build                    # ok
npx lighthouse@12 http://localhost:3000 --preset=desktop --only-categories=performance
npx lighthouse@12 http://localhost:3000 --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --only-categories=performance
```
Lighthouse needs `CHROME_PATH` and a **production** build (`npm run build && npm run start`) — a dev
server gives meaningless numbers.

## Next

1. **Re-measure Lighthouse vs Vercel**; replace the provisional table in PLAN.md Phase 0.5.
2. **PLAN 5.1** — baseline migrations: `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql` → `prisma migrate resolve --applied 0_init`. Then CI step `db push` → `migrate deploy`.
3. **Phase 1** — real routes. Blocks payments (GCash redirect needs a return URL), SEO, and mobile's last 5 points.
4. Open: `docs/STRUCTURE.md` proposes `PLAN.md`/`MISSING-ARCHIVE.md` → `docs/`. Undecided.
