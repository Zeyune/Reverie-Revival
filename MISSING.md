# Missing / Incomplete — Reverie Revival

Working tracker. Check off items as they get done.

**Last full audit:** 2026-07-16 · **Phase 0 completed:** 2026-07-16 · **Status:** not live, no real orders yet · **Stack:** Next.js 16 App Router + Prisma → Supabase

- Fix order and how-to → **[PLAN.md](PLAN.md)**
- Done / wrong / rejected items → **[MISSING-ARCHIVE.md](MISSING-ARCHIVE.md)**

> **Headline:** the admin panel is largely complete (10 of 16 pages have working writes). The
> gaps are concentrated in three places: **customers can't pay**, **Google can't see the store**,
> and **the storefront shows things that aren't true** (discounts it won't honor, an email it
> never sends, stock it doesn't check).

> **Phase 0 + CI + the StoreContext refactor shipped 2026-07-16** — the promo authz hole, the
> overselling race, the XFF bypass, the fail-open rate limiter, the promo enumeration oracle, and
> the Gmail PII default are fixed and archived. CI runs typecheck + lint + tests + build on every
> PR against a throwaway Postgres. `StoreContext` now uses `useSyncExternalStore`, so `src/` has
> zero lint suppressions, the promo persists, and the cart syncs across tabs. **48 tests passing.**
> What's below is what's left.

---

## 🔴 Critical

- [ ] **No payment processing** — no gateway in `package.json`. Every order is created `UNPAID`
      (schema default, `schema.prisma:162`; `checkout/route.ts:245-276` never sets the field) and
      there is no way for a customer to ever pay. Meanwhile `CheckoutPage.tsx:318` renders
      "ORDER CONFIRMED!". **Target: PayMongo (GCash + cards) with COD as fallback.**
- [ ] **Raw card numbers collected with nothing to charge them** — `CheckoutPage.tsx:593` collects
      a full PAN; `:263-267` POSTs it in cleartext to `/api/checkout`, which validates it as
      `z.string().min(4)` (`route.ts:41`) — no Luhn, no format check — then strips to `last4`
      (`:232-238`) and discards the rest. *(Verified: the full PAN is never stored and never
      logged, and CVV never leaves the browser.)* This puts the app in PCI-DSS scope for data it
      throws away. Removed by the PayMongo work — the PAN must never touch our origin.
- [ ] **Promo discount is silently dropped between cart and checkout** — `CartPage.tsx:27`
      computes `subtotal + shippingCost - discount`, but `CheckoutPage.tsx:55` computes
      `getCartTotal() + shippingCost` with **no discount term**, and `CheckoutPage.tsx:16` never
      even reads `appliedPromo`. `/api/checkout` has no promo field in its schema
      (`route.ts:20-45`) and no discount in its total (`:213`). **`Order` has no `discount` or
      `promoCode` field at all** (`schema.prisma:153-175`), and `PromoCode` (`:265-274`) is an
      orphaned table with no FK from anything. Net: the customer is shown a discount that is
      never honored and never recorded.
      > Phase 0 note: `reserveStock` and the promo *validation* path are now safe, but the
      > **discount still never reaches the server**. This is Phase 2.5, and it's the last
      > money-correctness bug.

---

## 🟠 High

- [ ] **The storefront has zero URLs — it is invisible to Google** — `src/app/page.tsx` is
      `"use client"` and renders the whole store; "routing" is `useState<Page>('home')`
      (`App.tsx:29`) switched by a `switch` (`:69-151`). **Every page is `/`.** Consequences, all
      verified: no product can be bookmarked/shared/linked; the back button *exits the site*; one
      global `<title>` for the entire catalog (`layout.tsx:16-19` is the only metadata in the
      codebase); no `generateMetadata` anywhere; no sitemap; no robots.txt; no OG images; no
      JSON-LD. `VisitTracker.tsx:44` also logs `path: '/'` for every pageview.
      → **`Product.slug` already exists in the schema and API and is read by nothing** — the data
      layer for `/shop/[slug]` is already waiting.
- [ ] **No order confirmation email** — `checkout/route.ts` imports no mailer and sends nothing,
      to the customer *or* the owner. `CheckoutPage.tsx:326` explicitly promises *"You will
      receive a confirmation email shortly with your order details and tracking information."*
      Nodemailer is already working in `contact/route.ts:58` — this is mostly plumbing.
- [ ] **The customer can permanently lose their order** — the order number lives only in React
      state (`CheckoutPage.tsx:21,286`). It's never emailed and never persisted client-side.
      **Refreshing the confirmation screen destroys it forever.** There is no order-lookup route
      and no account, so `trackingNumber`/`courier` (`schema.prisma:165-166`) are admin-writable
      fields with **no customer-facing read path at all**.
- [ ] **Cancel and refund never restore stock** — `orders/[id]/page.tsx:117-120`
      (`cancelOrderAction`) writes only `fulfillmentStatus: "CANCELLED"`; `:30-33`
      (`updatePaymentStatusAction`) writes only `paymentStatus`. Neither touches `variant.stockQty`
      or writes a `StockMovement`. Every cancellation permanently strands inventory until someone
      hand-corrects it in `/admin/inventory`. Combined with the oversell race above, stock drifts
      in **both** directions with no self-correction.
- [ ] **No security headers** — `next.config.ts` is the untouched 7-line scaffold with no
      `headers()`. Missing CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options,
      Referrer-Policy, Permissions-Policy. The admin panel is framable → clickjacking on every
      state-changing form.
- [ ] **🔥 Connection-pool exhaustion — ALREADY TOOK PRODUCTION DOWN (2026-07-16)** — `lib/prisma.ts:17` builds
      `new Pool({ connectionString })` with **no `max`**, so `pg` defaults to **10 connections per
      pool**. Production `DATABASE_URL` uses **port 5432 = session mode**, which holds a connection
      per client for the whole session, and the pooler's **`pool_size` is 15** (measured). Vercel
      runs many function instances and **each gets its own pool** → *two* concurrent instances can
      request 20 > 15 and fail with:
      > `DriverAdapterError: (EMAXCONNSESSION) max clients reached in session mode — pool_size: 15`

      **This is not hypothetical — it took production down on 2026-07-16 for ~10 minutes.** Every DB
      route 500'd. Cause: 8 connections orphaned by local Lighthouse benchmarking (session mode holds
      a connection until the client disconnects *cleanly*; killed processes never do, and Supavisor
      left them idle for 20-48 minutes) **plus** a PageSpeed scan spinning up Vercel instances that
      took the rest. Recovered by terminating the idle orphans. See
      [reports/2026-07-16-audit-phase0/dev.md](reports/2026-07-16-audit-phase0/dev.md).

      **⚠️ The 15-slot budget is GLOBAL, not per-environment.** A local dev machine and production
      Vercel functions draw from the same pool. **Local benchmarking can take production down**, and
      right now **a PageSpeed scan alone is enough to do it.**

      **Fix before Phase 2 ships payments** — and before the next benchmarking session. Options:
      cap the pool (`max: 1` is the usual serverless answer, since each instance handles one request
      at a time), and/or move to **transaction mode (port 6543)** which is what Supabase recommends
      for serverless — it returns connections between statements instead of holding them.
      `prisma/seed.ts:17` has the same uncapped pool, but it's a one-shot script so it matters less.
- [ ] **No migration history** — `prisma/` contains only `schema.prisma` and `seed.ts`.
      `package.json:14` exposes `db push` only; there is no `prisma migrate` script. No version
      history, no reviewable SQL, no rollback, no `migrate deploy` gate, and no way to reproduce
      prod schema state. Telling: `prisma.config.ts:14-16` already *declares* a
      `prisma/migrations` path that doesn't exist.

---

## 🟡 Medium

### Storefront lies about itself

- [ ] **Every `Settings` field is write-only** — the admin edits `announcementBarText`,
      `shippingPolicy`, `returnsPolicy`, `privacyPolicy`, `termsPolicy`, `socialLinks`,
      `contactEmail/Phone/Address`, `homepageFeaturedProductIds`, `homepageFeaturedCollectionIds`
      (`settings/page.tsx:109-235`) — and the storefront reads **none** of it. `getSettings()` is
      called from exactly one place: the admin settings page itself (`:66`).
      `/api/storefront/products` returns only `{ products, categories }` (`route.ts:102`).
      So: no announcement bar renders, and `HomePage.tsx:27-28` hardcodes "BEST SELLERS" as
      `products.slice(0,8)` (the 8 *newest* products) while ignoring the admin's curation entirely.
- [ ] **No stock display** — the API computes `inStock` (`route.ts:86`) and the type declares it
      (`data/storefront.ts:23`), but **no component reads it**. A sold-out product looks fully
      purchasable, "QUICK ADD" accepts it, it survives the whole checkout form, and only *after*
      the customer enters shipping + card details does `/api/checkout:197-202` reject with a
      generic 409 toast that never names the offending item.
- [ ] **Dead UI that looks functional** — all verified as unbound inputs / buttons with no `onClick`:
      - **Search box** — `Navigation.tsx:107-116`, no `value`, no `onChange`, no `onSubmit`. Typing does nothing.
      - **Newsletter signup** — `HomePage.tsx:238-249`, input and SUBSCRIBE both unbound, no API.
      - **Size Guide** — dead in two places: `ProductDetailPage.tsx:220-222` and `Footer.tsx:92`.
      - **All 5 Customer Service footer links** — `Footer.tsx:84-100` (Shipping Info, Returns, Size Guide, Privacy, Terms).
      - **All 3 social icons** — `Footer.tsx:141-149`. `Settings.socialLinks` holds the real URLs.
- [ ] **No policy pages — a compliance gap, not just dead UX** — no `/shipping`, `/returns`,
      `/privacy`, `/terms` routes exist, and the footer links to them are dead. You collect names,
      emails, phones, addresses, and card data. Missing Privacy Policy and ToS is a PH Data
      Privacy Act exposure. The text for four of them is already in the DB.
- [ ] **No error state when the catalog fails to load** — the grid just renders empty. Show a real
      "couldn't load products, try again" state. *(Replaces the rejected hardcoded-fallback idea —
      see [MISSING-ARCHIVE.md](MISSING-ARCHIVE.md).)*
- [ ] **Footer contact info + "© 2024" are hardcoded** — `Footer.tsx:112-130,138`, duplicating
      `Settings.contactEmail/Phone/Address`.

### Commerce

- [ ] **No tax handling** — grep for `tax|vat` across `src/**` returns **zero matches**. No field
      on `Order`, no line in any summary. For a PH store that means no 12% VAT anywhere.
- [ ] **Shipping fee hardcoded in four places** — `checkout/route.ts:47-48`, `CheckoutPage.tsx:54`,
      `CartPage.tsx:25`, and the copy at `CartPage.tsx:190-194`. No shared constant, no `Settings`
      field. Flat ₱150 nationwide — Metro Manila and a remote island barangay bill identically,
      even though `/api/locations` gives you full PSGC region data and `region` is captured
      (`route.ts:31`) and stored (`:228`) but read by no pricing code.
- [ ] **Region/province/city are never validated** — the server receives display *names* and
      accepts any string via `z.string().min(1)` (`checkout/route.ts:28-35`); nothing checks them
      against PSGC.
- [ ] **No customer accounts** — no login, signup, account page, order history, password reset, or
      address book. `Customer` rows are auto-created by email (`checkout/route.ts:255-264`) and can
      never be logged into. Wishlist is device-local `localStorage` only, lost when storage clears.
- [ ] **Promo hardening** (beyond the Critical item above) — *mostly done now*. Still open: no
      expiry, no usage caps, no min-subtotal; admin can't **edit** a promo or toggle `isActive` —
      the badge is read-only, so the only "deactivate" is a destructive delete.
      *(Done: server-side value caps, enum validation, case-insensitive lookup, duplicate check,
      client-side discount clamped to `[0, subtotal]`, and `appliedPromo` now persists.)*

### Security / ops

- [ ] **Unprotected public API routes** — *`/api/promo/validate` fixed in Phase 0.* Still open:
      `/api/storefront/products` (no limit, `force-dynamic`, full catalog + all variants per hit);
      `/api/locations` (no limit; first hit parses a multi-MB `barangay.json` into module memory —
      a cheap DoS lever); `/api/admin/upload` (authenticated, but no rate limit).
- [ ] **Three unbounded tables with no reaper** — (a) `VisitorLog` stores `ipAddress` + UA +
      referrer + session per pageview forever, with **no retention job and no cron**
      (`schema.prisma:276-295`); that's personal data under GDPR/the PH Data Privacy Act, and
      `@@index([visitedAt])` already exists so a TTL job is cheap. (b) `AdminSession` rows are
      deleted only opportunistically on access (`admin-auth.ts:81`) — sessions never revisited
      accumulate past expiry forever. (c) `RateLimitBucket` is only ever created/updated
      (`rate-limit.ts:110,135`); the sole `deleteMany` (`:276`) fires on successful admin login
      only → combined with the XFF spoof above, that's **unbounded attacker-controlled table growth**.
- [ ] **No error boundaries, no monitoring** — no `error.tsx`, `global-error.tsx`, `not-found.tsx`,
      or `loading.tsx` anywhere in `src/`. No Sentry/OTel/structured logging. Observability is 17
      `console.*` calls. Any unhandled throw in a Server Component renders Next's default error
      screen with no recovery UI — and in prod the message becomes a digest, so with no error
      tracker **the actual error is unrecoverable**.
- [ ] **Admin account management is seed-only** — `prisma.adminUser.upsert` (`seed.ts:43-51`) is the
      only creation path, and `update: { passwordHash }` (`:45`) means **re-running the seed is the
      only way to change a password**. No password-change UI, no reset, no 2FA. `AdminRole` has one
      value and **`.role` is never read by any app code** — RBAC is nonexistent, not merely single-role.

### Cleanup

- [ ] **`/admin` is a byte-identical copy of `/admin/products`** — confirmed via md5 (both
      `50c238c57532e75129e89a6510bc613c`, 445 lines). `(app)/page.tsx:177` exports a component
      literally named `ProductsPage`, titled `PRODUCTS` (`:252`), whose actions redirect to
      `/admin/products`. **There is no dashboard** — no KPIs, revenue, or recent orders anywhere.
- [ ] **Drop the `Reverie` table** — *`/starter` deleted in Phase 0; the model is now unused by any
      code but still in `schema.prisma` (marked deprecated there).* Deliberately deferred to the
      migration baseline (PLAN 5.1) so the `DROP TABLE` lands as reviewable, versioned SQL rather
      than an untracked `db push`. The table has 0 rows, so there's no rush.
- [ ] **No pagination anywhere in admin** — no `skip`/`cursor` in any admin file. products, orders,
      customers, collections, inventory, messages, promos all `findMany` unbounded. Audit is a hard
      `take: 50` and visitors a hard `take: 250` — **truncated, not paged**, so visitors' HOT PAGES /
      ACTIVE HOSTS panels (`visitors/page.tsx:108-115`) silently misreport once the table passes 250
      rows. Aggravators: customers `include: { orders: true }` then sums in JS (`:25,55-58`);
      settings renders a checkbox per product (`:187`).
- [ ] **Admin read-only pages that should have actions** — `orders/page.tsx` (no bulk ops, no search
      by order #/email), `customers/page.tsx` (no search), `customers/[id]` (notes only — **can't
      edit name/email/phone**), `messages/page.tsx` (no reply/mark-read/delete; `ContactMessage` has
      no status field, `schema.prisma:249-258`).
- [ ] **`data/products.ts` is the seed's data source, not dead code** — `prisma/seed.ts:9` imports
      `products` and `categories` from it, so it **must not be deleted**. It is, however, doing two
      jobs: seed fixture *and* legacy storefront catalog (with `testimonials` at `:457` feeding the
      fabricated homepage reviews). Move the seed fixture to `prisma/` and drop the rest.

---

## 🟢 Low / polish

- [ ] **🆕 Accessibility: insufficient colour contrast** — Lighthouse scores a11y **96** on both
      mobile and desktop, failing only the contrast check: *"Background and foreground colors do not
      have a sufficient contrast ratio."* Predictable for a dark theme leaning on `text-white/60` and
      `text-white/40` (e.g. `ProductCard.tsx:100,112`, `Footer.tsx:112`). Cheap, and it's the only
      thing between you and 100. *(Measured 2026-07-16 — full PSI run in
      [reports/2026-07-16-audit-phase0/dev.md](reports/2026-07-16-audit-phase0/dev.md).)*
- [ ] **`ShopPage` hardcodes sizes/colors** (`:38-44`) instead of deriving them from the loaded
      catalog, so filters can offer options no product has — and miss ones they do.
      *(The sort-mutation and missing-dep bugs in this file were fixed in Phase 0.)*
- [ ] **`duplicateAction` silently drops product copy** — `products/page.tsx:129-164` omits `details`,
      `materials`, `fit`, `care`, and `category`. They're `@default("")` / `@default("Uncategorized")`
      so it won't throw — the duplicate just comes back blanked with its category reset.
- [ ] **`next/image` is used zero times** — every image is a raw `<img>` (`ProductCard.tsx:72`,
      `ProductDetailPage.tsx:125,141`, `CartPage.tsx:83`, `CheckoutPage.tsx:673`) pulling remote
      1080px Unsplash URLs into 64×80px cart thumbnails. That's a **bandwidth and LCP** cost.
      `next.config.ts` has no `remotePatterns`, so **the moment anyone swaps in `next/image` every
      remote host throws** — do that config first.
      > **Correction:** an earlier pass of this file claimed "no width/height → CLS on every card".
      > **That was wrong, and it was measured wrong.** Lighthouse reports **CLS = 0** on both mobile
      > and desktop. Every image already sits in a reserved box (`aspect-[3/4]` on cards and the
      > product page, `w-32 h-40` in the cart, `w-16 h-20` at checkout), so nothing shifts when they
      > load. Switch to `next/image` for **weight**, not for layout stability.
- [ ] **Cart stores whole product objects** — `storefront/lib/store.ts` serializes the full product
      (all image URLs, description) per line item, with prices frozen at add-time. The server
      re-snapshots authoritative prices (`checkout/route.ts:177`), so the risk is a **silent price
      mismatch between what the user saw and what they're charged**, not an exploit.
- [ ] **bcrypt cost 10 → 12** — `seed.ts:41`. Also `bcryptjs@2.4.3` (`package.json:24`) is a 2016
      release, pure-JS and ~3-5× slower than native, so cost 10 costs *you* more than it costs a
      GPU-equipped attacker. Password floor is `z.string().min(6)` (`login/page.tsx:15`) — weak.
- [ ] **Login's `?next=` redirect is dead code** — `middleware.ts:20` sets it, but the login page's
      `searchParams` type only accepts `error`/`retry` (`:104-106`) and always `redirect("/admin")`
      (`:98`).
- [ ] **`promos/page.tsx` doesn't use the shared `Input`/`Select` primitives** and uses 4-space
      indent against the repo's 2. *(The silent-failure-on-invalid-input and `$`→`₱` bugs in this
      file were fixed in Phase 0.)*
- [ ] **`inventory/page.tsx:27` clamps stored stock to 0 but logs the raw delta** (`:38`), so
      `StockMovement` rows can desync from actual stock. Same read-then-write-outside-tx shape as
      checkout, lower stakes.
- [ ] ~~`contact/route.ts` leaks `debugError`~~ — **fixed in Phase 0.** The `ok: true`-when-unsent
      behaviour was reviewed and **kept**: the message is written to `ContactMessage` *before* the
      email attempt, so it's visible in `/admin/messages` regardless — the email is a notification,
      not the storage. A missing-config failure now logs loudly server-side instead.
- [ ] **Hardcoded store contact in seed** — `seed.ts:58-60` (`reverierevival.co@gmail.com`,
      `09106960483`, "Pampanga, Philippines"). Benign seed defaults, but should be env-driven.
- [ ] **Testimonials are fabricated** — `HomePage.tsx:192-210` renders 6 hardcoded 5-star reviews with
      invented names from `data/storefront.ts:43-86`. There's no review model and no per-product
      ratings. Either build reviews or drop the section — inventing customer quotes is a real
      liability once you're taking money.

---

## What's actually solid

Worth recording so it doesn't get "fixed":

- **Session handling** — 32 random bytes (`admin-auth.ts:17`), **SHA-256 hashed at rest** (`:9-10,23`),
  so a DB compromise yields no usable tokens. httpOnly + sameSite lax + secure-in-prod (`:30-36`).
  Expiry genuinely enforced server-side (`:80-84`), not cookie-only.
- **Checkout re-derives prices server-side** (`checkout/route.ts:177`) instead of trusting the client.
- **Upload allowlist correctly excludes `image/svg+xml`** (`upload/route.ts:7`) — no stored-XSS via SVG.
- **Secret hygiene** — `.env` never committed in any of the 7 commits, no `NEXT_PUBLIC_` leak of the
  service-role key, no hardcoded credentials.
- **The rate limiter itself is well-built** — DB-backed, multi-key, most-restrictive-wins
  (`rate-limit.ts:43-59`). Its weaknesses are the trusted XFF header and the fail-open default, not the design.
- **The Tor privacy carve-out** (`visit/route.ts:74-82`) nulls IP/geo for `.onion` visitors.
- **Audit logging is broad** — product, collection, order, customer, inventory, and settings writes all
  log. Promos are the one gap.
