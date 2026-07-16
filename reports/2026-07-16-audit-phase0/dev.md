# 2026-07-16 — Audit + Phase 0 + CI + store refactor + LCP

**Audience:** developers · [client.md](client.md) for the plain-English version, [ai.md](ai.md) for the dense one
**Status:** ✅ shipped
**Commits:** `ffc70b3` (Phase 0), `3631290` (LCP)
**Trackers touched:** [MISSING.md](../../MISSING.md), [MISSING-ARCHIVE.md](../../MISSING-ARCHIVE.md), [PLAN.md](../../PLAN.md)

---

## What changed

### 🔴 Critical — unauthenticated Server Actions on `/admin/promos`

`createPromoCode` and `deletePromoCode` were the **only** two Server Actions in the codebase with no
`requireAdmin()`. The `(app)/layout.tsx` guard does **not** cover them — Next.js executes a Server
Action *before* rendering the layout — and `middleware.ts` only checks that the session cookie is
non-empty. `discountValue` was unbounded, so a 100%-off code was mintable by anyone with the action
ID (a build-stable hash, not a secret).

Fixed: `requireAdmin()` + zod (percentage ≤100, fixed ≤₱100k, enum-checked type, code normalised to
uppercase) + duplicate check + `recordAuditLog` on both. Promos were also the only write path with
no audit trail.

Then verified **all 11** `"use server"` files guard *inside* the action, not in a layout. The login
action is the one intentional exception.

### 🔴 Critical — overselling race in checkout

The stock check sat **outside** the transaction (`route.ts:145` read, `:173` compared, `:244` opened
the tx) and the decrement was unconditional. At Read Committed, two buyers of the last unit both
read `stockQty=1`, both pass, both decrement → **-1**.

Fixed with [src/lib/inventory.ts](../../src/lib/inventory.ts) — `reserveStock` does a conditional
`updateMany({ where: { id, stockQty: { gte: qty } } })`. Postgres re-evaluates the predicate under
the row lock, so the loser matches **0 rows** instead of decrementing. Checkout now reserves
**inside** the tx and **before** creating the order, sorted by `variantId` so two carts holding the
same variants can't deadlock.

### 🟠 Rate limiting

- `normalizeIp` took the **leftmost** `X-Forwarded-For` hop — client-controlled. Rotate it per request → the `ip:` bucket never accumulates; set it to a victim's IP → burn their quota. Now takes the **rightmost** hop, and prefers platform headers (`x-vercel-forwarded-for`, `cf-connecting-ip`).
- `buildNetworkRateLimitRules` defaulted to `limit: Infinity` — the limiter was opt-in, and a caller who forgot to `.map()` an override got nothing, silently. Now finite per-rule-type defaults (`host: 1000`, `ip: 60`, `extra: 30`). Per-type on purpose: every request shares the one `host:` key, so a single global default tight enough for `ip:` would take the site down.

### 🟡 `/api/promo/validate`

No rate limit, no zod, and an **enumeration oracle** — distinct responses for not-found vs inactive
vs valid. Added limiting (20/IP/10min), zod, collapsed all failures into one identical response, and
made lookup case-insensitive (`save20` used to miss `SAVE20`).

### 🟡 Contact route + a live env bug

Removed the `?? "tankenneth207@gmail.com"` and `?? "no-reply@example.com"` fallbacks — a missing env
var silently routed customer PII to a personal inbox. Unset now means "don't send", logged loudly.
The message still persists to `ContactMessage` first, so `ok:true` is correct and was kept.

**Found while doing it:** `.env` defined `CONTACT_INBOX_EMAIL`/`CONTACT_FROM_EMAIL` **twice**, and
dotenv lets the later pair win — so the live sender was the literal placeholder
`yourgmail@gmail.com`. Deduped; sender now matches `SMTP_USER` (Gmail only permits sending as the
authenticated account).

### 🟢 Cleanup

`!.env.example` in `.gitignore` (the `.env*` pattern was hiding the template; `.env` itself verified
never committed across all 7 commits). Deleted `/starter`. Fixed conditional hooks in `ShopPage` and
`ProductDetailPage`.

---

## CI — the highest-leverage item

[.github/workflows/ci.yml](../../.github/workflows/ci.yml): typecheck → lint → test → build on every
PR and push to `main`, against a **throwaway Postgres service container** — never Supabase, since
the inventory tests write rows. CI needs no DB secret as a result.

**Why this mattered more than any single fix:** both real bugs today were *already* detectable by
tooling the repo has always had.

```
react-hooks/rules-of-hooks:
  "React Hook "useState" is called conditionally.
   Did you accidentally call a React Hook after an early return?"

React Compiler memoization rule:
  "The inferred dependency was `items`, but the source dependencies were [q]."
```

Neither had ever fired, because **nobody had ever run `npm run lint`.**

Verified before committing: pushed the schema into a scratch `ci_verify` schema, confirmed empty
(0 products), ran the full suite against it (20/20 green — so the tests are seed-independent), then
dropped it. Real data untouched.

---

## StoreContext → `useSyncExternalStore`

`react-hooks/set-state-in-effect` was suppressed with an `eslint-disable`. Removed it properly
instead: [src/storefront/lib/store.ts](../../src/storefront/lib/store.ts) makes localStorage the
single source of truth. `isHydrated` and all three effects deleted. **`src/` now has zero
`eslint-disable` comments.**

**Why not a lazy `useState` initializer** (the obvious fix): the server always renders an empty cart,
and `Navigation.tsx:90` renders a cart-count badge from that state — so a lazy initializer makes the
first client render disagree with the server HTML. That's a real hydration mismatch, strictly worse
than one extra render. `useSyncExternalStore` renders `getServerSnapshot` during hydration and
switches after, which is exactly the boundary needed.

**Free wins:** promo now persists across refresh; cart syncs across tabs via `storage` events;
`getDiscountAmount` clamps to `[0, subtotal]` (a ₱5000 FIXED code on a ₱1000 cart rendered
**₱-3,850**).

**The implementation trap:** `getSnapshot` runs every render and must return a referentially stable
value or `useSyncExternalStore` loops forever. The store caches the parsed snapshot against the raw
storage strings — three `getItem` calls per render, reparse only when the bytes change. Keying off
raw strings also makes the cache self-invalidating.

**Method:** 22 characterization tests written against the **old** implementation first, confirmed
green, then the rewrite passed them **unchanged**. That's what made it a refactor rather than a
rewrite-and-hope.

---

## Performance — LCP

Diagnosis from the phase data: LCP 5.5s mobile, of which **Load Delay was 3,954ms (71%)** — time the
browser didn't yet know the image existed. Confirmed against the served HTML: `assets`, `a908`,
`.png`, `bg-cover` all appeared **zero** times.

```
HTML (no hero) → JS bundle → hydrate → fetch /api/storefront/products
  → Supabase responds → isLoading=false → Hero renders → browser finally sees the image → 364 KB
```

The hero image was queued behind a database round-trip it has nothing to do with.

| Fix | Effect |
|---|---|
| 364 KB PNG → 40 KB grayscale WebP | −89%. It was a *photo* in PNG; CSS grayscales it at `opacity-30` anyway, so two colour channels were shipped and discarded |
| CSS `background-image` → `<img fetchPriority="high">` | The preload scanner reads raw HTML — it finds an `<img>`, never a URL in a style attribute. **Load delay 3,954ms → 0ms** |
| Ungated the Hero from `isLoading` | Takes the API off its critical path. Also the Speed Index fix |
| Poppins/Allura → `next/font` | Killed 905ms of render-blocking `@import` + 309ms preconnect |
| Poppins 6 weights → 4; Geist Sans deleted; Geist Mono `preload:false` | 700/800 used by nothing (no `font-bold`/`<strong>`/`<b>`); Geist Sans rendered nowhere; Geist Mono is admin-only. **8 preloaded fonts → 5** |

---

## ✅ Verified

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | **0 errors** (7 `<img>` warnings, tracked) |
| Tests | `npm test` | **48/48** |
| Build | `npm run build` | compiles |
| CI path | `prisma db push` into empty `ci_verify` schema + full suite | 20/20 on 0 seeded rows |
| Perf | `npx lighthouse@12 http://localhost:3000 --preset=desktop` / `--form-factor=mobile` | mobile **70→95**, desktop **90→100** |

**Mutation-tested** (revert the fix, confirm the test fails): missing `useMemo` dep ✅, discount clamp
✅, cross-tab listener ✅, promo persistence ✅.

## 📊 PageSpeed — production. **PHASE 0.5 HIT 100/98, THEN THE SKELETONS COST 5/4**

Two PSI runs, 50 minutes apart, same day, same URL. Lighthouse 13.4.0.

| | Baseline | **22:47 — after Phase 0.5** | **23:37 — after skeletons** |
|---|---|---|---|
| **Desktop** | 90 | **100** 🏆 | **95** (−5) |
| **Mobile** | 70 | **98** | **94** (−4) |

[22:47 run (best)](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/hxv5c23tv7?form_factor=desktop) ·
[23:37 run (regressed)](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/vxyfpeukoc?form_factor=desktop)

**Phase 0.5 hit a real 100 on production.** Not a lab number — PSI, real network, real Vercel.
The only change between the runs is commit `08f7613` "Add loading skeletons".

### The regression, per metric

| Metric | Desktop 22:47 | Desktop 23:37 | Mobile 22:47 | Mobile 23:37 |
|---|---|---|---|---|
| FCP | 0.3 s | 0.3 s | 0.9 s | 0.9 s |
| LCP | **0.5 s** | 0.6 s | **2.5 s** | 2.8 s |
| **TBT** | **70 ms** | **170 ms** 🔴 | **0 ms** | 20 ms |
| CLS | 0 | 0 | 0 | 0 |
| **SI** | **0.8 s** | 1.0 s | **1.8 s** | **4.1 s** 🔴 |
| long tasks | **1** | **3** 🔴 | *(none)* | **2** 🔴 |

**Insights that appear only in the 23:37 run:** `Optimize DOM size` · `Forced reflow` ·
`Layout shift culprits`

### Cause: the skeletons (mine)

1. **`animate-pulse` on 96 elements → Speed Index.** SI scores how quickly the page *stops changing*.
   A pulse never stops, so it never looks settled. **Mobile SI 1.8 → 4.1 s.**
2. **SSR HTML 17 KB → 57 KB → TBT.** 96 extra elements is more hydration work: **1 → 3 long tasks**,
   **+100 ms** desktop blocking. Hence the new `Optimize DOM size` insight.

### ✅ Fix applied — de-pulsed the skeletons

Removed `animate-pulse` entirely (static tint) and cut elements per card (~8 → 5). Dimensions
untouched, so CLS is unaffected.

| | With pulse | **De-pulsed** |
|---|---|---|
| Desktop | 95 (prod) | **100** (local, was 100 in prod pre-skeleton) |
| Mobile | 94 (prod) | **95** (local, 3 runs: 95/95/95) |
| Desktop TBT | 170 ms | **0 ms** |
| Desktop long tasks | 3 | **1** |
| **Mobile SI** | **4.1 s** | **0.8 s** |
| CLS | 0 | **0** ✅ |
| `animate-pulse` els | 96 | **0** |
| SSR HTML | 57 KB | 52.5 KB |

**Do not add an animation back** — see the comment block at the top of `Skeleton.tsx`. Not
`animate-pulse`, not a shimmer sweep. The shape alone reads as loading, and `sr-only` text covers
screen readers.

> **Noise warning, worth internalising for 5.10:** one mobile run came back **85 with TBT 370 ms** —
> a pure outlier. Three consecutive re-runs gave **95/95/95, TBT 50-70 ms**. On a busy machine TBT
> swings wildly. **This is exactly why a Lighthouse CI budget must assert individual metrics with
> headroom, never `score >= 100`** — that outlier would have failed the build and the check would be
> disabled inside a week.

**Still to confirm:** re-measure on production. Local and prod agreed exactly at 22:47 (both desktop
100), so local is a decent proxy here — but it's still a proxy.

### ❌ Correction — I retired this hypothesis for the wrong reason

I flagged the skeletons as an SI risk, then looked at desktop SI (1.0 s, "perfect"), concluded
*"so they didn't"*, and moved on. **That was one absolute number read as if it were a trend.**
Desktop SI had already gone 0.8 → 1.0, and mobile SI had **more than doubled**. The comparison run
existed; I just hadn't seen it.

**Lesson (again): a metric is only meaningful against its own history.** "1.0 s is perfect" and
"1.0 s is 25% worse than yesterday" are both true, and only the second one is the finding.

### Also wrong: "the lab was optimistic"

I attributed desktop 100 → 95 to localhost flattering the numbers. **It didn't** — production
independently scored 100 at 22:47. Localhost and production agreed. The drop was a real regression I
shipped 50 minutes later.

### What the numbers prove

- **Desktop LCP 0.6 s = perfect.** The hero fix (WebP + `<img fetchPriority="high">` + ungating)
  worked exactly as designed. Load delay is gone in the real world, not just the lab.
- **CLS 0 on both — the skeletons did not break it.** Matching ProductCard's dimensions paid off.
- **FCP perfect on both.** The `next/font` fix landed.

### Where the remaining points go

**Desktop loses ~5 to TBT alone (170 ms, "3 long tasks").** Mobile loses 4 to LCP + 2 to SI.

**The diagnostic oddity: desktop TBT 170 ms vs mobile 20 ms** — backwards, despite mobile being 4×
CPU-throttled. Explanation: on slow 4G the JS trickles in and executes in small chunks; on fast
desktop it all arrives at once and hydrates in **one burst** → long tasks. **Same root cause as
mobile's LCP render-delay: the whole storefront is a client bundle that must hydrate before
anything settles.** → **Phase 1.**

### PSI's own insights name the existing plan

| Insight | Ours |
|---|---|
| **Improve image delivery — 1,204 KiB** (desktop) / 962 KiB (mobile) | **Biggest single item left.** Unsplash product images at 1080px → `next/image` (Phase 4) |
| Avoid long main-thread tasks (3 desktop / 2 mobile) | Client-bundle hydration → Phase 1 |
| Reduce unused JavaScript (25 KiB) · Legacy JavaScript (14 KiB) | Bundle → Phase 1 / 5.10 budget |
| Optimize DOM size | 57 KB SSR HTML — skeletons are 96 elements of it |
| Render-blocking requests (20 ms desktop / 130 ms mobile) | Down from **905 ms**. Mostly resolved |

### ⚠️ Don't trust the other scores

- **SEO 100 is a lie of omission.** Lighthouse checks title/crawlability/structured data. It
  **cannot see that every storefront page shares one URL**. Do not let this score argue against
  Phase 1.
- **🆕 Accessibility 96 — insufficient colour contrast.** First time measured. Not yet in MISSING.md.
- Best Practices 100 — but its Trust & Safety section flags **CSP, COOP, XFO, Trusted Types**, which
  is the security-headers item (PLAN 5.2) it doesn't score.

### Caveat on this run

Taken while the connection pool was still degraded (12/15 held, catalog API TTFB **1.0-2.4 s** vs
~300 ms healthy). The homepage HTML itself was fast (TTFB 0.21-0.29 s) and the API isn't on the LCP
path any more, so the impact is probably small — but **re-measure once the pool is capped** to be sure.

**Hypothesis not needed after all:** the skeletons were suspected of hurting Speed Index (96
`animate-pulse` elements never letting the page visually settle). Desktop SI came back **1.0 s,
perfect** — so they didn't. They may contribute to desktop TBT via hydration work; unproven, and the
DOM-size insight is the only hint. *(Ruled out separately: skeletons animating forever on API
failure — `App.tsx:50-52` has `finally { setIsLoading(false) }`.)*

## ⚠️ Provisional — needs re-measuring

**The Lighthouse numbers are from a local production build, so they're optimistic.** Localhost has no
network; the live site pays 657ms (mobile) / 222ms (desktop) of TTFB these runs don't. **Re-measure
against Vercel and replace them.**

Mobile's remaining 5 points are a **Phase 1** problem: LCP is 2.9s and render delay is now 2,064ms —
the image arrives at ~860ms then waits for the main thread (373ms of script eval, ×4 under mobile CPU
throttle) because the whole storefront is a client bundle that must hydrate before anything paints.
Less client JS is the fix.

## ❌ Corrections — claims that were wrong

Five, all from reading code rather than running it. Recorded so nobody re-derives them:

| Claim | Reality |
|---|---|
| "Conditional hooks → crash when `isLoading` flips" | **Never fired.** React picks its dispatcher via `current.memoizedState === null`; a render that returned early takes the **mount** path next time — hooks mount fresh, no error. The crash only fires N→0 hooks. ShopPage only goes 0→7. Probed against React 19.2: does not throw. *(Still worth fixing: breaks the rules of hooks and would crash if anything makes `isLoading` go false→true.)* |
| "`filtered.sort()` mutates the products prop" | **Impossible.** The price filter at `ShopPage.tsx:65-67` is unconditional and `.filter()` always returns a new array, so sort always gets a fresh copy. Mutation-tested: removing the defensive copy fails nothing. |
| "`data/products.ts` is dead, delete it" | **`prisma/seed.ts:9` imports it.** Deleting breaks `npm run prisma:seed`. The original grep only searched `src/`. |
| "WishlistPage has conditional hooks" | Its only hook runs **before** the early return. No violation. |
| "No width/height on images → CLS on every card" | **CLS is 0**, measured, both platforms. Every image sits in a reserved box (`aspect-[3/4]`, `w-32 h-40`, `w-16 h-20`). Switch to `next/image` for **weight**, not layout. |

Also caught mid-session: the first Lighthouse run measured the **dev server** (an old process still
held :3000). Dev numbers are meaningless — rebuilt clean and re-measured.

## 🔥 INCIDENT — production down for ~10 min (connection exhaustion)

**Resolved.** But this is the important entry in this report, because the risk logged below stopped
being theoretical about twenty minutes after it was written.

**Symptom:** every DB route 500ing in production.
```
POST /api/visit                    -> 500
GET  /api/storefront/products      -> 500
Error: Failed to load storefront data.
DriverAdapterError: (EMAXCONNSESSION) max clients reached in session mode — pool_size: 15
```

**Cause — two things at once:**

1. **8 orphaned connections from local Lighthouse benchmarking.** Every dev/prod server started for
   measurement opened a pool. The processes were killed — but **session mode holds a connection until
   the client disconnects cleanly**, and a killed process never does. Supavisor did not reap them:
   they sat `idle` for **20-48 minutes** holding slots for servers that no longer existed.
2. **A PageSpeed scan took the rest.** Lighthouse hammers the site → Vercel spins up function
   instances → each builds its own pool, up to `pg`'s default of **10**, because `lib/prisma.ts:17`
   sets no `max`.

**The thing I got wrong:** I logged this as "will bite when traffic arrives" and assumed the pooler
budget was per-environment. **It's global** — a local dev machine and production Vercel functions
draw from the same 15 slots. Local benchmarking can take production down. It did.

**Diagnosis note:** `client_addr` is useless here — every row shows Supavisor's own IP, because
everything routes through the pooler. **`backend_start` age is what separates the clients:** 2864s/1258s
= orphans, ~355s = live Vercel.

**Fix applied (authorised):** `pg_terminate_backend` on connections that were **both `idle` and older
than 20 minutes** — the orphans only, leaving live Vercel connections alone. Terminated 8 → 7/15 held,
8 free. Verified: `/api/storefront/products` **200 × 3, 20 products, 5 categories**; `/api/visit` **200**.

**Prevention (NOT done — needs a deliberate change, not a 1am one):** see the risk item below. Until
the pool is capped, **a PageSpeed scan can take production down**, and so can any local dev server
left running. Cap the pool and/or move to transaction mode **before** Phase 2 ships payments.

## 🆕 Found late — connection-pool exhaustion (not fixed, logged)

Adding loading skeletons, the inventory tests went from 48/48 to **5 skipped**:

```
DriverAdapterError: (EMAXCONNSESSION) max clients reached in session mode — pool_size: 15
```

Queried the DB directly: **15 connections held, 14 idle.** Leftovers from the dev/prod servers
started while measuring Lighthouse — Supavisor reaps idle sessions slowly.

**It isn't just a local annoyance.** `lib/prisma.ts:17` creates `new Pool({connectionString})` with
**no `max`** → `pg` defaults to **10 per pool**. Production is **port 5432 (session mode)**, pooler
`pool_size` **15**, and Vercel gives **each function instance its own pool**. Two concurrent
instances = 20 > 15 → the same error, in production. Leaving dev servers running was an accidental
simulation of concurrent clients.

Not biting yet only because there's no traffic. **Must be fixed before Phase 2 ships payments** —
cap the pool (`max: 1` is the standard serverless answer) and/or move to transaction mode (6543).
Logged in [MISSING.md](../../MISSING.md) 🟠.

**Test-side mitigation applied:** concurrency 8 → 5, `TEST_POOL_MAX = 6`. Mutation-verified the
smaller race test still fails against read-then-write, so it lost no teeth. CI is unaffected
(throwaway Postgres allows ~100).

## Deliberately not done

| Item | Why | Tracked |
|---|---|---|
| Drop the `Reverie` table | Deferred so the `DROP TABLE` lands as reviewable, versioned SQL, not an untracked `db push`. 0 rows, no rush. | PLAN 5.1 |
| Server-side discount clamp | The server doesn't handle promos **at all** yet — there's nothing to guard. Must ship *with* the feature. | PLAN 2.5 |
| Lighthouse CI budget | SSR changes the perf profile; a budget written now gets rewritten. | PLAN 5.10 |
| `promos/page.tsx` UI primitives | Cosmetic; kept the security diff focused. | MISSING.md 🟢 |

## Follow-ups

1. **Re-measure Lighthouse against Vercel**, replace the provisional table.
2. **PLAN 5.1** — baseline migrations (`prisma migrate diff --from-empty` → `0_init` → `migrate resolve --applied`), then swap CI's `db push` step to `migrate deploy`.
3. **Phase 1** — real routes. Unblocks payments (GCash needs a redirect return URL), SEO, and mobile's last 5 points.
4. `docs/STRUCTURE.md` still proposes moving `PLAN.md`/`MISSING-ARCHIVE.md` into `docs/` — undecided.
