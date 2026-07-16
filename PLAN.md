# Implementation Plan — Reverie Revival

How to work through [MISSING.md](MISSING.md). Written 2026-07-16.

**Decisions this plan is built on:**
- Store is **not live** and has no real orders — we can sequence for correctness over damage control.
- Payments: **PayMongo** (GCash + cards) with **COD** as fallback for customers who can't pay cashless.
- Storefront: **full migration to real routes** (`/shop/[slug]` etc.), not a URL-sync patch.
- Promos: **wire through properly**, not hide or delete.

Sizes are relative: **S** = an afternoon · **M** = a day or two · **L** = a week-ish.

---

## Standing constraint: keep Lighthouse at 100

**The goal is a perfect score now, and 100 maintained as the site grows.** This is not a phase — it
is a constraint on every phase. Phase 1 decides what renders on the server, Phase 2 decides what
payment SDK enters the bundle, Phase 4 decides how images are served. Each of those can quietly
spend the budget.

**Measured baseline (2026-07-16, live site, Lighthouse 12):**

| | Mobile | Desktop |
|---|---|---|
| **Performance** | **70** | **90** |
| LCP | 5.5 s → **−21 pts** | 1.6 s → −6 pts |
| Speed Index | 5.8 s → −5 pts | 2.1 s → −4 pts |
| FCP | 2.7 s → −4 pts | 0.7 s → 0 |
| TBT | 70 ms → 0 | 0 ms → 0 |
| **CLS** | **0 → perfect** | **0 → perfect** |

Two things to take from that table before optimising anything:

1. **CLS is already 0 on both.** Nothing to fix. The images all sit in aspect-ratio/fixed-size
   boxes, the cart badge is absolutely positioned, and `next/font` handles the font metrics. Any
   claim that this site has a layout-shift problem is wrong — it was measured.
2. **Essentially the whole deficit is LCP**, and LCP is one root cause (Phase 0.5 below).

**How it gets maintained: 5.10 (Lighthouse CI), not discipline.** A score you check by hand rots —
and it rots faster than lint, because every feature makes it slightly worse. The same lesson as
`rules-of-hooks`: the tool existed, nobody ran it. Automate it or lose it.

**Two honest caveats to hold onto:**
- **Lighthouse is noisy** (±2-3 points run to run). "100" is often "99 on a bad run". Budget on
  individual metrics with headroom, never on the aggregate score, or CI will fail randomly and get
  switched off within a week.
- **This is a lab score.** PSI reports *"No Data"* for real users — not enough traffic yet. A green
  lab score is a proxy for customer experience, not proof of it. Revisit with Vercel Speed Insights
  once there's traffic.

---

## The one dependency that drives the order

**Routing must land before payments.** PayMongo's GCash flow is a *redirect*: the customer leaves
for PayMongo's page and comes back to a `success_url` you provide. A return URL has to be a real
route — and right now every page in the storefront is `/` with all state in React memory
(`App.tsx:29`). A customer returning from GCash would land on a fresh SPA with an empty cart and no
idea whether they paid.

So the SPA architecture doesn't just block SEO; it actively blocks the payment integration. Do
Phase 1 first and you build the checkout and confirmation pages **once**.

```
Phase 0  (independent, do now)
   ↓
Phase 1  Routing ──→ Phase 2  Payments ──→ Phase 3  Order lifecycle
   ↓                                              ↓
Phase 4  Storefront truth + SEO  ←────────────────┘
   ↓
Phase 5  Hardening & ops  (start the CI parts early — see note)
```

---

## Phase 0 — Quick wins · **S** · ✅ DONE (2026-07-16)

> Shipped. Details and evidence in [MISSING-ARCHIVE.md](MISSING-ARCHIVE.md). Verified with
> typecheck + lint + `npm test` (16 passing) + `npm run build`.
>
> **Two deviations from the plan as written:**
> 1. **0.9 — `data/products.ts` was NOT deleted.** The plan called it dead; it isn't.
>    `prisma/seed.ts:9` imports it, so deleting it would break `npm run prisma:seed`. The `Reverie`
>    *table* drop was also deferred to 5.1 so it lands as versioned SQL.
> 2. **0.10 pulled in part of 4.7.** The early return was masking a missing `products` dep in
>    ShopPage's `useMemo`. Fixing the hooks alone would have cached the empty first result and left
>    the shop grid permanently blank, so the dep fix had to ship with it.
>
> **Also found while working, not in the original plan:** `.env` defined `CONTACT_INBOX_EMAIL` and
> `CONTACT_FROM_EMAIL` twice, so the effective sender was the placeholder `yourgmail@gmail.com`.
> Deduped.
>
> **Three audit claims turned out to be wrong** — `WishlistPage` was not a hooks violation, the
> hooks "crash" never actually fired, and the sort never mutated its props. All three came from
> reading code rather than running it; mutation testing caught them. Details in
> [MISSING-ARCHIVE.md](MISSING-ARCHIVE.md).

Independent of everything else. Small, high-value, no architectural dependencies. Do these first
so they don't rot.

| # | Task | Where |
|---|---|---|
| 0.1 | Add `requireAdmin()` to `createPromoCode` and `deletePromoCode`. Add zod: cap `discountValue` (≤100 for PERCENTAGE, ≤ some ceiling for FIXED), validate `discountType` as an enum, `.trim().toUpperCase()` the code. Add `recordAuditLog` to both. | `admin/(app)/promos/page.tsx:8,37` |
| 0.2 | **Audit every other `"use server"` function** for its own authz check. Layouts never protect actions. The other 10 are fine today — add a comment or lint rule so the pattern doesn't get skipped again. | all `admin/**` |
| 0.3 | Fix the oversell race: make the decrement conditional and move the check inside the tx. Use `updateMany({ where: { id, stockQty: { gte: qty } }, data: { decrement } })` and assert `count === 1`, rolling back the tx if not. | `api/checkout/route.ts:145,173,280` |
| 0.4 | Fix `normalizeIp` to take the **rightmost** XFF entry (or `x-vercel-forwarded-for`). | `lib/rate-limit.ts:39,161-170` |
| 0.5 | Make `buildNetworkRateLimitRules` fail **closed** — a sane default limit instead of `Infinity`. | `lib/rate-limit.ts:184,188,196` |
| 0.6 | Add rate limiting + zod to `/api/promo/validate`. Collapse not-found / inactive into one identical response so it stops being an enumeration oracle. | `api/promo/validate/route.ts:26,30` |
| 0.7 | Drop the personal-Gmail fallback — fail closed if `CONTACT_INBOX_EMAIL` is unset. Dedupe the duplicate `CONTACT_*` keys in `.env` and set `CONTACT_FROM_EMAIL` to match `SMTP_USER`. | `api/contact/route.ts:21,23`, `.env:35-36,43-44` |
| 0.8 | `!.env.example` negation in `.gitignore`, then commit the file. | `.gitignore:34` |
| 0.9 | Delete `/starter` (the scaffold page). **Leave the `Reverie` model in schema for now** — the table drop lands with the migration baseline (5.1) so it's versioned rather than an untracked `db push`. Table has 0 rows, so there's no urgency. **Do not delete `storefront/data/products.ts`** — `prisma/seed.ts:9` imports it. | `app/starter/` |
| 0.10 | Fix the conditional-hooks crash — move the early `return`s below the `useState` calls. | `ShopPage.tsx:21`, `ProductDetailPage.tsx:21`, `WishlistPage.tsx:19` |

**Done when:** an unauthenticated POST to the promo action IDs is rejected; two concurrent checkouts
for the last unit produce exactly one order and `stockQty: 0`, never `-1`.

> 0.3 is the one to be careful with. Write the concurrent test *first* — it's the only item here
> you can't eyeball.

---

## Phase 0.5 — Performance: fix LCP · **S** · ✅ DONE (2026-07-16), pending a deploy re-measure

**Measured on PRODUCTION (PSI, Lighthouse 13.4.0). Full arc:**

| | Mobile | Desktop | PSI run |
|---|---|---|---|
| Before | 70 | 90 | — |
| After Phase 0.5 (22:47) | 98 | **100** 🏆 | [desktop](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/hxv5c23tv7?form_factor=desktop) · [mobile](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/hxv5c23tv7?form_factor=mobile) |
| After skeletons (23:37) — regression | 94 | 95 | [desktop](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/vxyfpeukoc?form_factor=desktop) · [mobile](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/vxyfpeukoc?form_factor=mobile) |
| **After de-pulse fix (00:05)** | **97** | **100** ✅ | [desktop](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/almkxsmj5e?form_factor=desktop) · [mobile](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/almkxsmj5e?form_factor=mobile) |
| *(same, 2 min earlier — noise)* | *96* | *98* | [desktop](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/yoj5yj3st8?form_factor=desktop) · [mobile](https://pagespeed.web.dev/analysis/https-reverie-revival-vercel-app/yoj5yj3st8?form_factor=mobile) |

> **State the range, not the point: desktop 98-100, mobile 96-97.** Two scans two minutes apart on
> *identical code* moved desktop TBT **120 ms → 10 ms** and mobile SI **3.9 s → 2.3 s** — 2 points
> each, from nothing but run-to-run variance.

*PSI links expire — the numbers here are the durable record. Full breakdown:
[reports/2026-07-16-audit-phase0/dev.md](reports/2026-07-16-audit-phase0/dev.md).*

### Mobile 97 → 100 needs Phase 1 — don't chase it before then

Mobile loses everything to **LCP 2.5 s** (needs ≈1.2 s for 25/25); FCP, TBT, CLS and SI are all
perfect. LCP phases: load delay **0 ms** ✅, load time ~395 ms, **render delay ~2 s**. TBT is 10 ms,
so this is *not* main-thread saturation — nothing can paint until the client bundle boots.

| Fix | Buys | Where |
|---|---|---|
| **Server-render the catalog** | most of the 1.3 s | **Phase 1** |
| Render-blocking CSS chunk (120-140 ms) — inline critical CSS | ~120 ms | small, independent |
| Legacy JS (14 KiB) — modern browserslist target | ~14 KiB | small, independent |
| Unused JS (25 KiB) — code-split | bundle | **Phase 1** |

The two independent wins land LCP at ~2.2-2.3 s, not 1.2 s. **Phase 1 is the fix, and it's doing this
work anyway.**

### ⚠️ Skeletons mask two audits — don't trust these scores

With placeholders up, **Lighthouse may finish auditing before product content exists**:
- **A11y 96 → 100** — the contrast failure vanished. Nothing about the colours changed; the
  low-contrast product text simply wasn't in the DOM to fail. **Still broken for real users.**
- **"Improve image delivery" 962 KiB → 7 KiB** — the Unsplash images never loaded during the audit.
  **The 1.2 MB is still there.**

**Any audit scoring product-dependent DOM is suspect until Phase 1 server-renders it.**

### 🆕 Best Practices 100 → 96 — "Browser errors were logged to the console"

The connection-exhaustion 500s. **Lighthouse is now scoring the pool bug** — one more reason it's the
next thing to fix.

**Phase 0.5 achieved a genuine 100 on production.** Then commit `08f7613` (loading skeletons) cost
**5 desktop / 4 mobile** — see the regression below.

| Metric | Desktop @100 | Mobile @98 |
|---|---|---|
| FCP | **0.3 s** ✅ | **0.9 s** ✅ |
| **LCP** | **0.5 s** ✅ | 2.5 s (−2) |
| **TBT** | 70 ms ✅ | **0 ms** ✅ |
| **CLS** | **0** ✅ | **0** ✅ |
| SI | **0.8 s** ✅ | **1.8 s** ✅ |

### ✅ Skeleton regression — found and fixed the same night

`animate-pulse` on **96 elements** + SSR HTML **17 KB → 57 KB** cost **5 desktop / 4 mobile**:
- **Mobile SI 1.8 → 4.1 s** — SI scores how fast a page *stops changing*; a pulse never stops.
- **Desktop TBT 70 → 170 ms**, long tasks **1 → 3** — more DOM in the hydration burst.
- New insights: `Optimize DOM size`, `Forced reflow`, `Layout shift culprits`.

**Fixed:** static tint, elements/card ~8 → 5, dimensions untouched. Local re-measure: **desktop 100**,
**mobile 95 (95/95/95)**, desktop TBT **0 ms**, long tasks **1**, mobile SI **0.8 s**, **CLS 0**.
**Never add animation back to `Skeleton.tsx`** — the comment block there explains why.

### After that, the remaining gap is all Phase 1 / Phase 4

- **Mobile −2 was LCP 2.5 s even at its best** — hydration render-delay. **Phase 1.**
- **Biggest single item: "Improve image delivery — 1,204 KiB"** — Unsplash product images at 1080px.
  `next/image`, **Phase 4**.

PSI's own insights (long main-thread tasks, unused JS, image delivery) name Phases 1 and 4 unprompted.

> **Lesson recorded (PLAN 5.10 exists because of this):** the skeleton regression shipped between two
> PSI runs 50 minutes apart, and was nearly missed because a metric was read as an absolute
> ("SI 1.0 s is perfect") rather than against its own history ("SI 1.0 s is 25% worse than the last
> run"). **This is exactly what a CI budget catches and a human eye does not.**

What actually moved, and it's the phase data that proves the diagnosis was right:

| Metric | Before | After |
|---|---|---|
| **LCP load delay** | **3,954 ms** | **0 ms** ✅ |
| LCP load time | 863 ms | 395 ms |
| Speed Index (mobile) | 5.8 s (score 50) | **0.8 s (perfect)** |
| FCP (mobile) | 2.7 s (score 60) | **0.8 s (perfect)** |
| CLS | 0 | **0 — unchanged** ✅ |
| Hero image | 364 KB PNG | **40 KB WebP (−89%)** |
| Preloaded fonts | 8 files | 5 files |
| Google Fonts requests | 2 render-blocking | **0 (self-hosted)** |

> ⚠️ **These are localhost numbers and therefore optimistic.** Localhost has no network, so TTFB is
> near zero; the live site measured 657 ms (mobile) / 222 ms (desktop) of TTFB that these runs don't
> pay. Expect the deployed scores to land a few points lower — **re-measure against Vercel after
> pushing** and replace this table with the real figures.

**The remaining 5 points on mobile are a Phase 1 problem, not a missed trick here.** LCP is now 2.9s
and its breakdown has inverted: load delay is gone, but **render delay is 2,064 ms (71%)**. The hero
image arrives at ~860 ms and then waits for the main thread — 373 ms of script evaluation, ×4 under
Lighthouse's mobile CPU throttle — because the entire storefront is a client-side bundle that has to
hydrate before anything paints. **Less client JS is the fix, and that is Phase 1.**

Independent of routing. Three of these four survive Phase 1 untouched; only 0.5c gets superseded,
and it's a three-line change — so this is worth doing now rather than waiting.

**The diagnosis, from the LCP phase breakdown (mobile):**

| Phase | Time | Share |
|---|---|---|
| TTFB | 657 ms | 12% |
| **Load Delay** | **3,954 ms** | **71%** |
| Load Time | 863 ms | 16% |
| Render Delay | 62 ms | 1% |

**"Load Delay" is time the browser doesn't yet know the image exists.** The LCP element is the hero
background — a **364 KB PNG** applied as a CSS `background-image` (`Hero.tsx:16`). Confirmed against
the served HTML: `assets`, `a908`, `.png`, and `bg-cover` all appear **zero** times. So the chain is:

```
HTML (no hero) → JS bundle → hydrate → fetch /api/storefront/products
  → Supabase responds → isLoading=false → Hero renders → browser finally sees the image → 364 KB
```

**The hero image — which has nothing to do with products — is blocked on a database round-trip.**

| # | Task | Why |
|---|---|---|
| 0.5a | Convert the 364 KB PNG to WebP/AVIF (`sharp` is already installed). Keep the PNG as a fallback only if needed. | Lighthouse: **saves 318 KB**. It's a decorative backdrop at `opacity-30` — it does not need to be lossless. Attacks *Load Time*. |
| 0.5b | Move Poppins + Allura from the `@import url(fonts.googleapis.com)` at `globals.css:1-2` into `next/font/google`. Drop **Geist Sans** — 52 KB of woff2 is preloaded but the body font is Poppins (`globals.css:225`, 118 usages). Keep Geist Mono (3 admin tables use `font-mono`). | The `@import` is **render-blocking: 905 ms**, plus 309 ms of preconnect to two Google origins. `next/font` self-hosts at build time — no external request at all. Attacks *FCP* and *Speed Index*. |
| 0.5c | Render the Hero regardless of `isLoading` — remove the early return at `HomePage.tsx:20`. | The Hero doesn't use products. This takes the API call off its critical path **and is the Speed Index fix**: above-the-fold currently paints nothing but "Loading products…". *Superseded by Phase 1, but 3 lines.* |
| 0.5d | ~~`<link rel="preload">` for the hero~~ → **superseded**: converted the CSS `background-image` to a real `<img>` with `fetchPriority="high"`. | The preload scanner reads raw HTML bytes — it can find an `<img>`, but **never** a URL inside a style attribute. Once 0.5c put the Hero in the server HTML, the `<img>` is discoverable at byte zero and a separate preload link would be a redundant second source of truth to keep in sync. **Load delay: 3,954 ms → 0 ms.** |

**Also done while in there (found by measuring, not planned):**
- **Poppins trimmed from 6 weights to 4.** Weights 700 and 800 were inherited from the old Google
  Fonts `@import` and are used by nothing — no `font-bold`, no `<strong>`, no `<b>` in the codebase.
  Each weight is a separate file that competes with the hero image for bandwidth.
- **Geist Mono set to `preload: false`.** It's only used by `font-mono` in three admin tables, so
  preloading it made every storefront visitor pay for a font they'd never see.

**Expected: mobile ~94+, desktop ~96+.** Not a promise — LCP arithmetic gets you there, but Speed
Index is the wildcard and mobile is throttled to slow 4G with a 4× CPU penalty. **Measure, don't
predict.** Re-run Lighthouse after and record the real numbers.

**If mobile doesn't reach 100 here, that's expected** — the remaining Speed Index gap needs the
product grid in the server HTML, which is Phase 1.

---

## Phase 1 — Real routes · **L**

The big one. Unblocks payments, SEO, sharing, and the back button in a single move — **and it's the
rest of the performance story**: server-rendering the catalog is what fixes Speed Index for good.

**1.1 — Build the route tree.** Replace the `switch` in `App.tsx:69-151` with actual App Router
routes:

```
/                     → home           (server, revalidated)
/shop                 → catalog        (server; filters/sort via searchParams)
/shop/[slug]          → product detail (server, generateMetadata, generateStaticParams)
/cart                 → cart           (client — reads localStorage)
/checkout             → checkout       (client)
/checkout/return      → PayMongo return target (Phase 2)
/orders/[orderNumber] → confirmation + lookup (Phase 3)
/about /contact /wishlist
/shipping /returns /privacy /terms  → policy pages from Settings (Phase 4)
```

**1.2 — Switch product lookup from `id` to `slug`.** `Product.slug` is already in the schema, already
returned by the API (`route.ts:70`), and read by nothing. `ProductDetailPage.tsx:28` currently does
`products.find(p => p.id === productId)` — that becomes a server-side `findUnique({ where: { slug } })`.

**1.3 — Move catalog fetching server-side.** The client `fetch('/api/storefront/products')` in
`App.tsx` becomes a direct Prisma query in a Server Component. Keep the API route — Phase 4 still
needs it for client-side filtering — but the first paint should be server-rendered.

**1.4 — `generateMetadata` per product** — real title, description (`seoTitle`/`seoDescription` are
already columns and unused), OG image from the first `ProductImage`.

**1.5 — Replace `onNavigate` with `next/link`** throughout. `Navigation.tsx`, `Footer.tsx`,
`ProductCard.tsx:42`. Delete the `Page` union type and `pageData`.

**1.6 — Fix `VisitTracker`** — `path: window.location.pathname` (`:44`) becomes meaningful once
routes exist. Drop the now-redundant `page`/`pageData` fields.

**Done when:** every product has its own shareable URL; back/forward work; `curl` on a product URL
returns HTML containing the product name and price; the cart survives navigation.

> **Sequencing note:** keep the cart in `localStorage` (`StoreContext.tsx`) — it works and it's
> orthogonal. Just make sure `StoreProvider` sits in a client boundary that wraps the tree without
> forcing the whole app client-side.

---

## Phase 2 — Payments: PayMongo + COD · **L**

> ⚠️ Verify every API detail against **current PayMongo docs** before building — the specifics below
> are the shape of the integration, not a spec to copy.

**2.1 — Use PayMongo Checkout Sessions (hosted), not your own card form.** This is the whole point:
the PAN never touches your origin, which takes you out of PCI scope. Their hosted page covers cards,
GCash, GrabPay, and Maya in one integration.

**Delete the card fields from `CheckoutPage.tsx:593,615-628` entirely.** (The CVV/expiry inputs are
already dead — they're collected and never sent.)

**2.2 — Schema changes** (all in one migration — see 5.1):

```prisma
enum PaymentMethod { PAYMONGO  COD }

model Order {
  paymentMethod     PaymentMethod  @default(COD)
  checkoutSessionId String?        @unique   // PayMongo reference
  paidAt            DateTime?
  discount          Int            @default(0)   // ← Phase 2.5
  promoCodeId       String?
  promoCode         PromoCode?     @relation(...)
  taxAmount         Int            @default(0)   // ← Phase 4.5
  reservedUntil     DateTime?                    // ← stock TTL, see 2.4
}
```

**2.3 — The two flows:**

- **COD** → order created, `paymentMethod: COD`, `paymentStatus: UNPAID`, fulfillment proceeds
  immediately. Settled on delivery: the courier hands over cash, admin marks PAID. This path is
  *already* most of what `checkout/route.ts` does today — it just needs to be labeled honestly
  instead of pretending a card was charged.
- **PayMongo** → create a Checkout Session, store its id, redirect. Customer pays on PayMongo's page,
  returns to `/checkout/return?order=<orderNumber>`.

**2.4 — Trust the webhook, not the redirect.** This is the part that's easy to get wrong. The return
URL is *not* proof of payment — a customer can hit it by typing it, or close the tab after paying and
never load it. So:

- **Webhook** (`/api/webhooks/paymongo`) is the source of truth. Verify the signature. On
  `checkout_session.payment.paid` → set `paymentStatus: PAID`, `paidAt`, then send the confirmation
  email (Phase 3). Make it **idempotent** — webhooks retry, and you'll get duplicates.
- **Return page** just *reads* current order state and says "confirmed" or "we're still waiting on
  your payment." It never mutates.

**Stock reservation:** decrement at order creation (atomically, per 0.3) and set
`reservedUntil = now + 30min`. A cleanup job releases stock for orders still `UNPAID` +
`PAYMONGO` past that window. Otherwise every abandoned GCash redirect strands inventory forever —
the same class of bug as the cancel/refund leak in 3.3.

**2.5 — Wire promos through server-side, finally.** Add `promoCode` to the checkout payload schema
(`route.ts:20-45`), re-validate it **server-side** (never trust the client's discount amount),
clamp it (`0 ≤ discount ≤ subtotal`), and persist `discount` + `promoCodeId` on the Order.

Then fix the client so it stops lying: `CheckoutPage.tsx:16` must read `appliedPromo`, and `:55`
must subtract the discount. Persist `appliedPromo` to localStorage alongside the cart
(`StoreContext.tsx:82-96`). Clamp `getDiscountAmount` (`:206-213`) so the ₱-3,850 total becomes
impossible.

**Done when:** a GCash payment marks the order PAID via webhook even if the customer never returns to
the site; a COD order is clearly labeled COD everywhere; an abandoned payment releases its stock; a
promo code produces the same total in cart, checkout, and the DB.

---

## Phase 3 — Order lifecycle · **M**

The customer currently gets an order number in React state that a refresh destroys, and an email
that never sends. Fix the whole loop.

**3.1 — Confirmation emails.** Nodemailer already works (`contact/route.ts:48-63`) — lift it into
`src/lib/mail.ts` with a proper template. Send on payment confirmation (PayMongo webhook) or order
creation (COD). **Also send the owner a new-order notification** — right now they'd have to poll
`/admin/orders` to know a sale happened.

> ⚠️ **Prerequisite: a real sending domain.** Today the app authenticates to `smtp.gmail.com` as a
> personal Gmail (`.env:39-41`) and Phase 0 set `CONTACT_FROM_EMAIL` to match it. That's fine for a
> contact form that emails *you*, but it does not scale to customer mail: free Gmail caps ~500
> recipients/day, isn't built for transactional sending, shows customers a personal address instead
> of the brand, and has no DKIM for your domain → spam folder.
>
> `RESEND_API_KEY` is already in `.env` but is **dead config** — `resend` is not in `package.json`
> and no code reads it. To use it you need a domain with SPF/DKIM records verified in Resend.
> **Buy/verify the domain before starting 3.1**, or order emails will land in spam.

**3.2 — `/orders/[orderNumber]` lookup.** Guest-accessible, gated on `orderNumber` + email match so
it isn't enumerable. Shows status, items, total, and `trackingNumber`/`courier` — which today are
admin-writable fields with no customer-facing read path at all. This is also the page 2.4's return
URL lands on.

**3.3 — Restore stock on cancel and refund.** `cancelOrderAction` (`orders/[id]/page.tsx:117-120`)
and `updatePaymentStatusAction` (`:30-33`) must re-increment `variant.stockQty` and write a
compensating `StockMovement`. Guard against double-cancel (check current status inside the tx) so a
double-click doesn't restore stock twice.

**3.4 — Status transition rules.** Today an order can be `REFUNDED` while `UNPAID`, or `DELIVERED`
while `UNPAID`. Add a guard.

**3.5 — Email on fulfillment.** When tracking is added, tell the customer. `CheckoutPage.tsx:326`
has been promising exactly this the whole time.

**Done when:** placing an order sends two emails; refreshing the confirmation page loses nothing;
cancelling an order returns its stock exactly once.

---

## Phase 4 — Make the storefront tell the truth · **M**

Everything here is the storefront claiming something false. Now unblocked by Phase 1.

**4.1 — Connect `Settings` to the storefront.** Every field is currently write-only — `getSettings()`
is called only by the admin page that writes it. Render the announcement bar; use
`homepageFeaturedProductIds`/`homepageFeaturedCollectionIds` instead of `HomePage.tsx:27-28`'s
hardcoded `slice(0,8)`; pull footer contact + social URLs from `socialLinks` rather than the
hardcoded values at `Footer.tsx:112-130`.

**4.2 — Policy pages** — `/shipping`, `/returns`, `/privacy`, `/terms`, rendered from the Settings
text that already exists. Wire the 5 dead footer links (`Footer.tsx:84-100`). **This is the
compliance item** — you collect names, addresses, and phone numbers.

**4.3 — Stock UI.** The API already computes `inStock` (`route.ts:86`) and nothing reads it. Show
"Sold out", disable QUICK ADD (`ProductCard.tsx:15`), and surface *which* item failed on the 409
(`CheckoutPage.tsx:280-282`) instead of a generic toast after the customer filled out the whole form.

**4.4 — Kill or build the dead UI.** Search (`Navigation.tsx:107`), newsletter
(`HomePage.tsx:238`), Size Guide (×2), social icons. Each is an unbound input or a button with no
`onClick`. **A removed feature is better than a fake one** — anything you don't want to build now
should come out of the DOM.

**4.5 — Tax.** Zero `tax`/`vat` matches in the codebase. Decide whether prices are VAT-inclusive
(usual for PH retail) and, if so, show the VAT breakdown on the order rather than adding a line.
Uses the `taxAmount` field from 2.2.

**4.6 — Shipping fee: one source of truth.** Currently hardcoded in four places
(`checkout/route.ts:47`, `CheckoutPage.tsx:54`, `CartPage.tsx:25`, and the copy at `:190`). Move to
`Settings`. Optionally use the PSGC `region` you already capture and store but never price against —
flat ₱150 to a remote island barangay is a real cost you're absorbing.

**4.7 — Fix `ShopPage` sort** — `filtered.sort()` (`:74-86`) mutates the props array in place, so
"Featured" order is destroyed permanently after any sort. Copy before sorting. Add `products` to the
`useMemo` deps. Derive sizes/colors from the catalog instead of the hardcoded list (`:38-44`).

**4.8 — SEO surface** (now that routes exist): `sitemap.ts`, `robots.ts`, `opengraph-image`, and
`Product` JSON-LD with price + availability.

**4.9 — Drop the fabricated testimonials** (`HomePage.tsx:192-210`) or build real reviews. Invented
5-star customer quotes are a liability once money is changing hands.

---

## Phase 5 — Hardening & ops · **M**

> **Start 5.4 (CI) now, not at the end.** Everything above is easier to land safely with a green
> pipeline, and it's the cheapest item here.

**5.1 — Baseline the migrations.** The DB was built with `db push` and holds live data, so don't
`migrate dev` into it — **baseline** it:

```bash
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init
```

Then commit `prisma/migrations/`, switch deploys to `migrate deploy`, and drop `db push` from the
prod path. `prisma.config.ts:14-16` already points at the path. **Do this before Phase 2's schema
changes** so they land as the first real migration.

**5.2 — Security headers** — a `headers()` block in `next.config.ts` (currently the empty scaffold):
CSP, HSTS, `X-Frame-Options: DENY` (the admin is framable today), `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `Permissions-Policy`.

**5.3 — Error boundaries + monitoring** — `error.tsx`, `global-error.tsx`, `not-found.tsx`. Add
Sentry. Right now a prod Server Component throw shows a digest with no tracker behind it, which
means **the actual error is unrecoverable**.

> **Mutation-test any fix for a bug you haven't seen fail.** Phase 0 shipped three "fixes" whose
> tests passed just as happily against the unfixed code — two of the bugs didn't exist, and one
> test was silently toothless (a cold connection pool serialised the writers it was supposed to
> race). Reverting the fix and watching the test go red is the only thing that told them apart. It
> takes a minute and it's the difference between a regression test and a decoration.

**5.4 — CI** — ✅ **DONE (2026-07-16).** `.github/workflows/ci.yml` runs typecheck + lint + test +
build on every PR and push to `main`, against a throwaway Postgres service container (never
Supabase — the inventory tests write rows, and this way CI needs no DB secret).

> **This turned out to be the highest-leverage item on the board.** Both real Phase 0 bugs were
> already detectable by the linter that ships with the project: `react-hooks/rules-of-hooks` names
> the conditional-hooks bug verbatim ("Did you accidentally call a React Hook after an early
> return?"), and the React Compiler memoization rule names the missing `useMemo` dep. Neither had
> ever fired because **nobody had ever run `npm run lint`.** The tooling was always there.

Tests still worth adding, in priority order:
1. ~~The concurrent-checkout stock test~~ — ✅ done in Phase 0 (5 inventory integration tests).
2. Promo total consistency across cart → checkout → DB (2.5).
3. Webhook idempotency + signature verification (2.4).
4. Authz: every Server Action rejects an unauthenticated call (0.1, 0.2).

When 5.1 lands, change the `Prepare test database` step from `prisma db push` to
`prisma migrate deploy` — CI then also verifies the migrations apply cleanly.

**5.5 — Retention jobs** (Vercel Cron; there's no `vercel.json` yet):
- `VisitorLog` TTL — IP + UA + referrer retained forever is a PH Data Privacy Act exposure.
  `@@index([visitedAt])` already exists, so this is cheap.
- `AdminSession` reaper for expired rows.
- `RateLimitBucket` reaper — with the XFF fix (0.4) this stops being attacker-controlled growth, but
  it still needs a sweeper.
- Stock-reservation release (2.4).

**5.6 — Admin account management** — password change UI (today re-running the seed is the *only* way
to change a password), then an invite/create flow. `AdminRole` exists but `.role` is read by no code —
either implement RBAC or drop the enum.

**5.7 — Admin pagination** — nothing paginates. Audit truncates at 50 and visitors at 250, and the
visitors HOT PAGES / ACTIVE HOSTS panels **silently misreport** once past 250 rows. Fix that one
first: wrong data beats missing data as a bug.

**5.8 — Build a real dashboard.** `/admin` is a byte-identical copy of `/admin/products` (verified —
same md5). Revenue, order count, low stock, recent orders.

**5.9 — bcrypt cost 10 → 12** (`seed.ts:41`), raise the 6-char password floor (`login/page.tsx:15`),
upgrade `bcryptjs` off the 2016 release.

**5.10 — Lighthouse CI — the mechanism that keeps the score at 100.** Do this **after Phase 1**, not
before: SSR changes the performance profile, so a budget written now just gets rewritten.

Add `@lhci/cli` to the CI workflow. Two decisions that determine whether it survives contact with
reality:

- **Assert on individual metrics with headroom, not the aggregate score.** `LCP < 1.5s`,
  `CLS < 0.05`, `TBT < 200ms` is stable. `score >= 100` fails on ±2-3 points of normal noise, and a
  check that cries wolf gets disabled within a week — at which point you have no budget at all.
  > **Measured proof (2026-07-16):** one mobile run returned **85 with TBT 370 ms**. Three immediate
  > re-runs on identical code returned **95/95/95 with TBT 50-70 ms**. That's a **10-point** swing
  > from machine load alone. An aggregate-score gate would have red-built a correct commit. **Median
  > several runs, and budget the metrics.**
- **Run against a local production build, not the deployed URL.** No network variance, no cold
  starts, no dependency on a deploy finishing. Far more stable, and it can block the PR that caused
  the regression rather than telling you after it shipped.

Also add a **bundle-size budget** — Phase 2's payment SDK is exactly the kind of thing that silently
costs 20 points of TBT.

Once there's real traffic, add **Vercel Speed Insights**: it measures actual customers instead of a
simulated phone, which is the thing the lab score is only a proxy for.

---

## Suggested order

1. **Phase 0** — cheap, independent, stops the bleeding.
2. **5.1 (migrations) + 5.4 (CI)** — before any schema work. ~1 day, saves pain in every later phase.
3. **Phase 1** — routing. The big architectural lift; everything else gets easier after it.
4. **Phase 2** — payments. This is what turns it into a store.
5. **Phase 3** — order lifecycle. Phase 2 isn't really done without it.
6. **Phase 4** — storefront truth + SEO. Ship-blocking for *launch*, not for *function*.
7. **Rest of Phase 5** — ongoing.

**Minimum to actually launch:** Phase 0 + 1 + 2 + 3, plus 4.2 (policy pages — legal), 4.3 (stock UI),
4.4 (remove fake features), and 5.1/5.2.

---

## Things worth not breaking

Carried from MISSING.md's "What's actually solid" — these are already right:

- Session tokens are hashed at rest (`admin-auth.ts:9-10,23`); a DB leak yields nothing usable.
- `checkout/route.ts:177` re-derives prices from the DB. **Keep this invariant through Phase 2** —
  the client must never supply a price or a discount amount.
- The upload allowlist excludes SVG (`upload/route.ts:7`) — that's deliberate. Don't "fix" it.
- The rate limiter's design is good; only its XFF input and fail-open default are wrong.
- The Tor carve-out (`visit/route.ts:74-82`) is intentional.
