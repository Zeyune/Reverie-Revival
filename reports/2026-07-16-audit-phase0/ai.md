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
