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
