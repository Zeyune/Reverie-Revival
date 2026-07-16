# Missing — Archive

Items moved out of [MISSING.md](MISSING.md) because they are **done**, **were wrong/have been
reworded**, or are **deliberately not being done**. Kept for history so they don't get
re-raised.

Archived 2026-07-16 after a full codebase audit.

---

## ✅ Completed — CI + StoreContext refactor (2026-07-16)

| Item | What was done |
|---|---|
| **No CI** 🟢 | `.github/workflows/ci.yml` — typecheck + lint + test + build on every PR and push to `main`. Runs against a **throwaway Postgres service container**, never Supabase: the inventory tests create and delete rows, and CI needs no DB secret this way. Verified end-to-end before committing by pushing the schema into a scratch `ci_verify` schema and running the full suite against an empty database (20/20 green, 0 seeded products), then dropping it. |
| **`react-hooks/set-state-in-effect` suppression** 🟡 | **Removed properly, not silenced.** `StoreContext` now reads through `useSyncExternalStore` (`src/storefront/lib/store.ts`), making localStorage the single source of truth. `isHydrated` and all three effects are gone; `src/` now contains **zero** `eslint-disable` comments. |
| **`appliedPromo` not persisted** 🟡 | Fixed for free by the refactor — the promo is now part of the persisted snapshot and survives a refresh. |
| **Unclamped client discount** 🟡 | `getDiscountAmount` now clamps to `[0, subtotal]`. A ₱5000 FIXED code on a ₱1000 cart rendered **₱-3,850**; it can't now. *(The server must still clamp independently in Phase 2.5 — this is display-side only.)* |
| **Cross-tab cart sync** 🟢 | New capability, free from the refactor: `subscribe` listens for `storage` events, so adding to the cart in one tab updates every other tab. |
| **No component tests** 🟢 | 28 StoreContext tests + 4 ShopPage tests. Written as **characterization tests first** — all 22 original ones passed against the old implementation, then passed unchanged against the rewrite, which is what made the refactor safe. |

**Why `useSyncExternalStore` rather than a lazy `useState` initializer:** the server always renders
an empty cart (no localStorage), and `Navigation` renders a cart-count badge from that state — so a
lazy initializer would make the first client render disagree with the server HTML and produce a
real hydration mismatch. `useSyncExternalStore` renders `getServerSnapshot` during hydration and
switches to `getSnapshot` afterwards, which is exactly the boundary we need.

**Honest caveat:** this does **not** remove the extra render. React still re-renders after hydration
when the snapshots differ. The win is one source of truth and no suppression, not performance.

**The one trap in the implementation:** `getSnapshot` runs on every render and must return a
referentially stable value or `useSyncExternalStore` loops forever. The store caches the parsed
snapshot against the raw storage strings — three `getItem` calls per render (cheap), reparsing only
when the bytes actually change. Keying off the raw strings also makes the cache self-invalidating.

---

## ✅ Completed — Phase 0 (2026-07-16)

Verified by `npm run typecheck`, `npm run lint`, `npm test` (16 passing), and `npm run build`.

| Item | What was done |
|---|---|
| **Unauthenticated promo Server Actions** 🔴 | `requireAdmin()` added to `createPromoCode` and `deletePromoCode`, plus a zod schema (percentage capped at 100, fixed capped at ₱100k, `discountType` as an enum, code normalised via `.trim().toUpperCase()`), a duplicate-code check, and `recordAuditLog` on both. Promos were the only write path with no audit trail; now they have one. |
| **Overselling race** 🔴 | New `src/lib/inventory.ts` with `reserveStock` — a conditional `updateMany({ where: { id, stockQty: { gte: qty } } })`. Postgres re-checks the predicate under the row lock, so the loser of a race matches 0 rows instead of decrementing into the negative. Checkout now reserves **inside** the transaction and **before** creating the order, in `variantId` order to avoid deadlocks between carts holding the same variants. Covered by 4 integration tests. |
| **All other Server Actions audited** 🔴 | Verified every `"use server"` function calls `requireAdmin()` *inside itself* (not just in the layout, which Next.js runs *after* the action). 11 files, all guarded. The login action is the one intentional exception. |
| **XFF rate-limit bypass** 🟠 | `normalizeIp` now takes the **rightmost** X-Forwarded-For hop, not the client-controlled leftmost, and platform headers (`x-vercel-forwarded-for`, `cf-connecting-ip`, …) are preferred over XFF entirely. Closes both evasion (rotate the header, never accumulate) and quota-poisoning (pin a victim's IP to lock them out). 7 unit tests. |
| **Rate limiter failed open** 🟡 | `buildNetworkRateLimitRules` no longer defaults to `limit: Infinity`. Defaults are now finite and per-rule-type (`host: 1000`, `ip: 60`, `extra: 30`) — a single global default can't work, since every request shares the one `host:` key. 4 unit tests. |
| **`/api/promo/validate` unprotected** 🟡 | Added rate limiting (20/IP per 10 min) and zod. Collapsed the not-found / inactive branches into one identical response, so it's no longer an unauthenticated oracle for enumerating the code namespace. Lookup is now case-insensitive, fixing `save20` ≠ `SAVE20`. |
| **Personal Gmail as a PII-routing default** 🟡 | Removed the `?? "tankenneth207@gmail.com"` and `?? "no-reply@example.com"` fallbacks — unset now means "don't send", logged loudly. Also found and fixed a **live bug**: `.env` defined `CONTACT_INBOX_EMAIL`/`CONTACT_FROM_EMAIL` **twice**, and dotenv let the later pair win, so the effective sender was the literal placeholder `yourgmail@gmail.com`. Deduped; sender now matches `SMTP_USER` (Gmail only permits sending as the authenticated account). |
| **`.env.example` not tracked** 🟡 | Added a `!.env.example` negation to `.gitignore`. Verified `.env.example` is now visible to git and `.env` is still ignored. Template updated: the contact vars are documented as **required**, with a note that Gmail SMTP forces `CONTACT_FROM_EMAIL` to match `SMTP_USER`. |
| **`/starter` scaffold page** 🟡 | Deleted. The `Reverie` model is **retained on purpose** — see the deferred item in MISSING.md. |
| **Conditional hooks** 🟢 | Early `return` moved below every hook in `ShopPage` and `ProductDetailPage`. **Correction — this was latent, not live** (see the note below the table). |
| **ShopPage `useMemo` deps** 🟢 | Added the missing `products` dep. **This one was mandatory**, not optional: once the hooks run on the loading render, the memo's first result is computed against an empty catalog, so without the dep it caches `[]` and the grid stays blank forever. Fixing the hooks *without* this would have introduced a real bug. Covered by a component test that fails if the dep is removed. |
| **ShopPage defensive copy** 🟢 | `[...products]` before the in-place sort. Insurance only — see the note below. |
| **Promo UX/correctness nits** 🟢 | Invalid input no longer fails silently (redirects with a real error message via `InlineAlert`); `$` → `₱` in the admin table; `contact/route.ts` no longer leaks its internal `debugError` reason to the client. |
| **No test infrastructure** 🟢 | Vitest added with `npm test` / `npm run test:watch` / `npm run typecheck`. 16 tests: 5 inventory integration (real Postgres) + 11 rate-limit unit. PLAN 5.4 pulled forward. |

**Not done in Phase 0, deliberately:** the `Reverie` **table drop** (deferred to the 5.1 migration
baseline so it lands as reviewable SQL, not an untracked `db push`; the table has 0 rows so there's
no urgency).

### ⚠️ Correction: two of the three "ShopPage bugs" were never real

Once component tests existed, I mutation-tested the Phase 0 fixes — reverted each one and checked
the tests actually failed. Two didn't, and investigating why showed the original audit (and my
first write-up of it) was wrong. Recording it so nobody re-derives the same wrong conclusion:

1. **The conditional-hooks "crash" never fired.** React picks its mount-vs-update dispatcher with
   `current === null || current.memoizedState === null`. A render that returned early leaves
   `memoizedState === null`, so the *next* render takes the **mount** path and the hooks mount
   fresh — no error. The "Rendered fewer hooks than expected" crash only fires in the opposite
   direction (N hooks → 0). `ShopPage` only ever goes `isLoading: true → false`, i.e. **0 → 7**.
   Verified with a probe against React 19.2: **it does not throw.**
   → Still worth fixing: it violates the rules of hooks, the loading render silently discarded all
   filter state, and it *would* crash the moment anything makes `isLoading` go `false → true`
   (a refetch, a retry button — both plausible in Phase 1/4).

2. **The sort never mutated the props array.** The audit said `filtered.sort()` reordered the
   caller's `products` "when no filters are active". It can't: the **price filter at
   `ShopPage.tsx:65-67` is unconditional**, and `.filter()` always returns a new array — so sort
   always receives a fresh copy. Confirmed by mutation testing (removing the `[...products]` copy
   fails nothing).
   → The copy stays as cheap insurance, but it is **not** a bug fix, and its test is labelled an
   invariant guard rather than a regression test.

3. **The missing `useMemo` dep was real but not yet biting** — the early return meant the memo
   always mounted fresh after loading, which masked it. It only becomes load-bearing *because* of
   the hooks fix, which is why the two had to ship together.

**The lesson:** all three claims came from reading code, not running it. The hooks and mutation
claims were plausible, well-argued, and wrong. Mutation testing — revert the fix, watch the test
fail — is the only thing that separated the real bug from the two imaginary ones.

---

## ✅ Completed — pre-audit

| Item | Evidence |
|---|---|
| **`.env` file** | Exists at repo root with 15 populated values. Canonical copy also lives in the sibling `Reverie-Revival-onion-ed/.env`. |
| **`dotenv` package** | `package.json:46` — `"dotenv": "^17.4.2"` in `devDependencies`. |
| **Prisma client generated** | `src/generated/prisma/` exists. `package.json:13` runs `prisma generate` on `postinstall`, so a fresh `npm install` produces it. |
| **Image upload** | Fully built and wired. `src/app/api/admin/upload/route.ts` — authenticated (`:12-15`), type allowlist (`:7,31-36`), 5 MB cap (`:8,38-43`), stores to Supabase bucket `product-images` (`:50-56`). Consumed by `ProductEditorForm.tsx:193` with client-side mirror validation (`:177-185`). |

---

## 🔄 Reworded — the original framing was wrong

These were real concerns, but the description was inaccurate. The corrected versions are
back in [MISSING.md](MISSING.md); only the *old wording* is retired here.

### "Vestigial `Reverie` model — appears unused anywhere in the codebase"

**Wrong.** It *is* used — `src/app/starter/page.tsx:17` calls `prisma.reverie.findMany()`.

`/starter` turned out to be the leftover Next.js + Supabase scaffold/setup-guide page. So the
model isn't orphaned; it's attached to a page that is itself scaffolding. The item is now
"delete `/starter` **and** the `Reverie` model together" rather than "build the feature or
delete the model."

### "No CSP headers — Google Fonts loaded externally with no CSP"

**Half wrong.** The CSP gap is real (`next.config.ts` is still the empty scaffold), but the
*reason* given is outdated: `src/app/layout.tsx:2` uses `next/font/google`, which self-hosts
fonts at build time. Nothing is fetched from Google at runtime.

Re-filed as a plain security-headers item (CSP, HSTS, X-Frame-Options, nosniff,
Referrer-Policy) with no font angle.

### "No CSRF protection on server actions — Next.js provides some built-in, but worth auditing"

**The audit has now been done, and CSRF was the wrong thing to worry about.** Next.js's
built-in Origin/Host check already covers CSRF for Server Actions.

The audit found a worse, concrete problem in the same area: **authorization**, not CSRF.
`createPromoCode` and `deletePromoCode` (`src/app/admin/(app)/promos/page.tsx:8,37`) are the
only two Server Actions in the codebase with no `requireAdmin()` call. The `(app)/layout.tsx`
guard does not cover them, because Next.js executes a Server Action *before* rendering the
layout.

Superseded by a specific 🔴 Critical item in MISSING.md.

### "`.env.example` — reference for what env vars are needed"

**Exists on disk, but is not in the repo.** `.gitignore:34` uses the pattern `.env*`, which
matches `.env.example` too. Confirmed: `git ls-files --error-unmatch .env.example` → *"did not
match any file(s)"*.

So a fresh clone still gets no env template — the original complaint stands, but the fix isn't
"write the file," it's "add a `!.env.example` negation to `.gitignore` and commit it." Re-filed
that way.

---

## ❌ Not doing

### "Storefront API has no fallback — should fall back to the 20 hardcoded products in `src/storefront/data/products.ts` when `prisma` is undefined"

**Deliberately rejected.** `src/app/api/storefront/products/route.ts:25-26` returns
`{ products: [], categories: [] }` when the DB is unreachable, and that is the safer behaviour.

Reasons:
1. **It would serve wrong data as if it were real.** `data/products.ts` holds hardcoded
   Unsplash URLs and prices frozen at authoring time. A customer could add a stale-priced item
   to their cart; `/api/checkout` would then reject it or silently charge the real DB price
   (`checkout/route.ts:177`). Showing a catalog you cannot actually sell from is worse than
   showing none.
2. **It would mask outages.** The empty catalog is the signal that the Supabase free tier
   auto-paused. A fallback hides exactly the symptom that makes that diagnosable.
3. **It would give a dev-only fixture a production job.** `data/products.ts` exists to seed the
   database (`prisma/seed.ts:9` imports `products` and `categories` from it). Wiring it into the
   live API path would make seed fixtures load-bearing at runtime — the two would then have to be
   kept in sync forever.

Replaced in MISSING.md by a better item: **surface a real error state** on the storefront when
the catalog fails to load, instead of rendering a silently empty grid.

> **Correction (2026-07-16):** an earlier pass of this audit called `data/products.ts` a dead file
> "imported by nothing" and queued it for deletion. That was wrong — the grep behind it searched
> only `src/` and missed `prisma/seed.ts:9`. **Deleting it would break `npm run prisma:seed`.**
> The file stays; see the reworded item in MISSING.md.
