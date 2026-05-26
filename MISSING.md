# Missing / Incomplete — Reverie Revival

Working tracker. Check off items as they get done.

## Blockers (can't run the app without these)

- [ ] **`.env` file** — needs all vars (see `.env.example`)
- [ ] **`.env.example`** — reference for what env vars are needed
- [ ] **`dotenv` package** — imported by `prisma.config.ts` but not in `package.json`. Run `npm i -D dotenv`
- [ ] **Prisma client generated** — `src/generated/prisma/` is gitignored and missing. Run `npx prisma generate`
- [ ] **Prisma migration history** — no `prisma/migrations/` directory. Run `npx prisma migrate dev --name init`

## Large functional gaps

- [ ] **No real payment processing** — checkout collects raw card numbers (PCI violation). Need to integrate PayMongo or Stripe.
- [x] **No image upload** — all product images are hardcoded Unsplash URLs. Admin editor has no upload mechanism. Need an upload API route + storage (Vercel Blob, Cloudinary, etc.)
- [ ] **No storefront customer auth** — Customer model exists but no signup/login, no order history page, no address management. Checkout connects by email only.
- [ ] **No order confirmation emails** — checkout creates the order but never sends a confirmation email to the customer. Nodemailer is already set up for contact form, just needs wiring.

## Medium gaps

- [ ] **Storefront API has no fallback** — `/api/storefront/products` returns empty arrays when DB is down, but 20 hardcoded products exist in `src/storefront/data/products.ts`. Should fall back to those when `prisma` is undefined.
- [ ] **No SEO on storefront pages** — products have `seoTitle`/`seoDescription` fields but storefront pages don't use `generateMetadata`. No `sitemap.xml`, no `robots.txt`.
- [ ] **No CSP headers** — `next.config.ts` is empty. Google Fonts loaded externally with no CSP.
- [ ] **Vestigial `Reverie` model** — appears unused anywhere in the codebase. Either build the feature or delete the model.

## Polish / future

- [ ] **No tests** — zero test files in the project
- [ ] **No CSRF protection on server actions** — Next.js provides some built-in, but worth auditing
- [ ] **Hardcoded email in seed** — `reverierevival.co@gmail.com` in `prisma/seed.ts:59`
