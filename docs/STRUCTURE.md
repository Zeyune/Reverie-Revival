# File & Folder Structure — cleanup plan

Written 2026-07-16. **Nothing here has been done yet.** This is a plan for future-you.

**Scope: file and folder layout only.** The storefront's `switch`-based routing is the biggest
structural problem in this repo, but it already has a plan — **[PLAN.md](PLAN.md) Phase 1 "Real
routes"**. This doc does *not* restate it. Everything here is either independent of Phase 1, or
noted as "do it as part of Phase 1."

---

## Read this first

**1. Commit before you move anything.** Right now ~16 files are modified and several are untracked
(`PLAN.md`, `REPORT.md`, `tests/`, `.github/`, `vitest.config.ts`, `.env.example`,
`src/lib/inventory.ts`, `src/storefront/lib/`). Phase 0 work is done but not committed.

A restructure is mostly `git mv`. Doing that on top of a dirty tree means renames and edits blur
into one unreviewable diff, and if you `git checkout` to undo a bad move you take real work with
it. Land what you have first:

```
git status                 # look at it properly
git add -A
git commit -m "..."        # or several smaller commits
```

Then do the restructure as its **own commit, touching nothing but paths.** If a "move" commit also
changes logic, you can't review either half.

**2. Do them one at a time.** Every item below is independent. After each: `npm run typecheck &&
npm run lint && npm test`, then commit. Don't batch — if something breaks you want to know which
move did it.

**3. This is cosmetic work.** None of it fixes a bug or ships a feature. It makes the tree
readable. If you're short on time, [PLAN.md](PLAN.md) has things that matter more. The one
exception is §4 (the `docs/` move), which fixes an actually-broken thing — see below.

---

## 1. The root directory — the honest math

You asked to de-clutter the root. Here's every loose file and the verdict on each.

**The ceiling is lower than you'd hope: of 22 root files, 16 must stay.** They're tool convention —
each tool looks for its config at the project root and moving it either breaks the tool or requires
a flag on every invocation. That's not clutter you can fix; that's the cost of the stack.

**Only 5 files actually move.** Root goes 22 → 17.

| File | Git | Verdict |
|---|---|---|
| `MISSING.md` | tracked | **→ `docs/`** |
| `MISSING-ARCHIVE.md` | untracked | **→ `docs/`** |
| `PLAN.md` | untracked | **→ `docs/`** |
| `REPORT.md` | untracked | **→ `docs/incidents/2026-07-16-products-not-displaying.md`** |
| `middleware.ts` | tracked | **→ `src/middleware.ts`** |
| `README.md` | tracked | Stay — the front door |
| `AGENTS.md` | tracked | Stay — agents look for it at root, by convention |
| `CLAUDE.md` | tracked | Stay — same |
| `.env` | ignored | Stay — Next.js loads it from root only |
| `.env.example` | untracked | Stay — pairs with `.env` |
| `.gitignore` `.gitattributes` | tracked | Stay — git requires root |
| `package.json` `package-lock.json` | tracked | Stay |
| `tsconfig.json` | tracked | Stay |
| `next.config.ts` | tracked | Stay |
| `eslint.config.mjs` | tracked | Stay |
| `postcss.config.mjs` | tracked | Stay |
| `prisma.config.ts` | tracked | Stay |
| `vitest.config.ts` | untracked | Stay |
| `next-env.d.ts` | ignored | Stay — Next regenerates it; don't edit or move |
| `tsconfig.tsbuildinfo` | ignored | Build artifact. Delete anytime, it comes back on next `typecheck`. Harmless. |

So: the root looks cluttered mostly because it *is* a Next + Prisma + ESLint + PostCSS + Vitest
project, and each of those wants a root config file. The four markdown working docs are the only
real noise, and they're the fix below.

---

## 2. `middleware.ts` → `src/middleware.ts`

Everything else lives under `src/`. Next supports both locations, but it must match your setup:
**`src/middleware.ts` is only valid because you have a `src/app/`** — Next looks for middleware
next to the app dir, not in both places.

```
git mv middleware.ts src/middleware.ts
```

Nothing imports it (Next picks it up by filename), and no config references it — checked. So this
is a one-line change with no follow-up. Verify by loading `/admin` while logged out and confirming
you still get redirected to the login page; if middleware silently stopped being picked up, that
redirect is what breaks.

---

## 3. Admin UI kit → `src/components/ui/`

Ten generic primitives sit at `src/app/admin/(app)/_components/ui/`:

```
Badge  Button  InlineAlert  Input  Modal  Select  Table  Tabs  Textarea  Toast
```

Two problems. They're five levels deep inside a route group, and `_components` is Next's
convention for *"private to this route"* — so when the storefront eventually needs a `Modal`,
nobody looks here and someone builds a second one. These aren't admin components; they're a design
system that happens to be parked in the admin folder.

```
mkdir -p src/components/ui
git mv "src/app/admin/(app)/_components/ui/"* src/components/ui/
```

Then update the imports — ~13 files import from `_components/ui`. They're all under
`src/app/admin/(app)/`, and since the `@/*` alias already points at `src/`, the new import is
`@/components/ui/Button`. Find them with:

```
grep -rn "_components/ui" src
```

Leave `ProductEditorForm.tsx` and `AuditDiffViewer.tsx` where they are — those *are* route-specific,
which is exactly what `_components` is for.

---

## 4. The four working docs → `docs/`

This is the one item that fixes something real, not just tidiness.

`MISSING.md` is **tracked** in git and links to `PLAN.md` and `MISSING-ARCHIVE.md`, which are
**untracked**. So on a fresh clone — or for anyone but you — `MISSING.md` has two dead links to
files that don't exist. The tracker points at a plan nobody else can see.

```
mkdir -p docs/incidents
git mv MISSING.md docs/MISSING.md
mv MISSING-ARCHIVE.md PLAN.md docs/
mv REPORT.md docs/incidents/2026-07-16-products-not-displaying.md
```

(`git mv` for the tracked one, plain `mv` for the untracked three.)

The relative links *inside* `MISSING.md` keep working, because all three land in the same directory
together. Nothing else links to them — README, AGENTS, and CLAUDE were checked and have no inbound
links. But `REPORT.md` gets renamed, so fix the one link to it if `MISSING.md` has one.

**Then make the real decision:** do you want `PLAN.md` and `MISSING-ARCHIVE.md` in the repo or not?

- **Track them** (`git add docs/`) — links resolve for everyone, history is shared. Right answer if
  anyone else ever touches this repo, including future-you on another machine.
- **Ignore them properly** — add to `.gitignore` and drop the links from the tracked `MISSING.md`,
  so it stops promising files that aren't there.

Either is fine. The current in-between state — tracked file linking to untracked files — is the one
that's actually broken.

`REPORT.md` is a solved incident (the Supabase/products-not-displaying one). It's history, not a
tracker. Filing it under `docs/incidents/` with a dated name is what keeps it findable in two years
without sitting at the root pretending to be current.

---

## 5. `src/data/philippine-addresses/` — think before touching

4.8 MB of vendored JSON inside your **source** directory, tracked in git, read at runtime by
[`src/app/api/locations/route.ts`](../src/app/api/locations/route.ts) via
`path.join(process.cwd(), ...)`.

It's data, not code, so it doesn't belong in `src/`. Repo-root `data/` is the natural home. **But
don't just move it.**

That `process.cwd()` read only works in production if Next's file tracing includes the JSON in the
serverless bundle. Your `next.config.ts` is currently empty — no `outputFileTracingIncludes`. It
works today, probably because the path sits under `src/` where tracing already looks. Move it to
`data/` and it can silently fall out of the bundle: **works locally, 500s on Vercel**, and you find
out from a customer at checkout.

If you do this:

1. Move it, update `DATA_DIR` in the route.
2. Add `outputFileTracingIncludes` to `next.config.ts` for the new path.
3. `npm run build && npm start` locally — that's a real production build, unlike `npm run dev`.
4. Exercise the address dropdowns in checkout **against the production build**, not dev.
5. Deploy to a preview URL and exercise them again before merging.

Honestly: the win is "a folder is in a tidier place" and the risk is a broken checkout. **Low
priority.** The better long-term answer is seeding the addresses into Postgres — you already have a
database, and then the route is a query instead of a disk read — but that's a real task, not a
file move, and it belongs in PLAN.md if you want it.

---

## 6. Two `lib/` folders

There are now two: `src/lib/` (server: prisma, auth, audit, rate-limit, inventory…) and
`src/storefront/lib/` (just `store.ts`, imported by `StoreContext`).

Not worth fixing on its own — but `src/storefront/` disappears in **PLAN.md Phase 1**, so
`store.ts` needs a home when that happens. `src/lib/store.ts` is the obvious one. Do it as part of
Phase 1, not before; moving it now just means touching it twice.

Same applies to `src/storefront/data/storefront.ts` (86 lines of types) → `src/types/storefront.ts`.

---

## ⚠️ Do NOT delete `src/storefront/data/products.ts`

It **looks** like dead code. Nothing in `src/` or `tests/` imports it, it's 494 lines of hardcoded
products/categories/testimonials, and the real catalog comes from Prisma. Every audit of this repo
so far has flagged it for deletion.

**It is the seed's data source.** [`prisma/seed.ts:9`](../prisma/seed.ts#L9):

```ts
import {
  products as seedProducts,
  categories as seedCategories,
} from "../src/storefront/data/products";
```

Delete it and `npm run prisma:seed` breaks — which you won't notice until you next set up a fresh
database, long after the commit that broke it. PLAN.md item 0.9 already caught one plan making this
mistake. This doc's first draft made it too.

If it bothers you that seed data lives in a storefront folder, **move it, don't delete it** —
`prisma/seed-data.ts` is where it belongs, next to the only thing that uses it. Then update the
import in `seed.ts`. That's a fine cleanup. It's the deletion that's the trap.

**The general lesson:** grep the whole repo, not just `src/`. `prisma/`, `scripts/`, and
`tests/` import from `src/` too.

---

## Suggested order

1. **Commit what's in the tree now.** Non-negotiable first step.
2. §4 `docs/` move — highest value, fixes the broken links, zero code risk.
3. §2 `middleware.ts` — one line.
4. §3 admin UI kit — mechanical, ~13 import updates, do it when you have a clear hour.
5. §5 philippine-addresses — only if it's really bothering you, and only with the production-build
   check. Otherwise leave it.
6. §6 the `lib/` merge — later, folded into PLAN.md Phase 1.

Steps 2–4 are maybe an hour total and touch no logic. Step 5 is the only one that can break
production.

---

## What I'd leave alone

- **`src/lib/` being a flat 8 files.** It's fine. Splitting it into `lib/db/`, `lib/auth/` at this
  size adds folders without adding clarity. Revisit around 20 files.
- **`src/app/admin/logout/route.ts`** sitting outside both the `(app)` and `(auth)` route groups.
  Slightly odd, harmless, and it's a route handler rather than a page so it doesn't inherit the
  layouts anyway. Not worth a commit.
- **`public/assets/`** — 364 KB, correctly placed.
- **`src/generated/prisma/`** — generated and gitignored. Correct as-is. Don't "clean it up."
