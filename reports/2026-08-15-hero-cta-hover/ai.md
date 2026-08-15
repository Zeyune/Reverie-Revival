# 2026-08-15 — hero-cta-hover · AI report

**Audience:** AI agents. Dense by design. Human versions: [client.md](client.md), [dev.md](dev.md).
**Status:** 🚧 code change complete, **UNCOMMITTED**. Working tree dirty.
**Commits:** pending — Effie commits; agents in this repo do not.
**State:** typecheck 0 · lint 0 errors / 7 pre-existing `no-img-element` warnings · tests NOT run · build NOT run

Prior context: [`reports/2026-07-16-audit-phase0/ai.md`](../2026-07-16-audit-phase0/ai.md). Nothing
in it is contradicted by this session.

## Changed

| Area | File | Change |
|---|---|---|
| ui | `components/Hero.tsx:81` | Base label span `relative z-10` → `relative z-10 opacity-100 group-hover:opacity-0 transition-opacity duration-300` |
| ui | `components/Hero.tsx:83` | Overlay label span: removed `tracking-[0.2em]` (now inherits from the button) |

Nothing else touched. No new files, no deps, no config.

## The bug

`Hero.tsx:76-86`, the `SHOP NEW DROP` CTA. Three layers inside one `.group` button:

| z | Element | Was |
|---|---|---|
| 20 | overlay `<span>` white label | `opacity-0 group-hover:opacity-100` ✅ |
| auto | `<div>` red `#E10613` panel | `translate-y-full group-hover:translate-y-0` ✅ |
| 10 | base `<span>` black label | **no hover state — never faded** 🔴 |

The base span is `relative z-10`, so it also sits above the red panel (`position:absolute`,
`z-index:auto`). Hovering therefore painted **both** labels simultaneously.

Amplifier: button has `tracking-[0.2em] hover:tracking-[0.3em] transition-all`, overlay hardcoded
`tracking-[0.2em]`. The two copies animated to **different widths**, so the overlap read as smeared
text rather than a clean double-exposure. Fixed by deleting the override — `letter-spacing` is an
inherited property, so the overlay now re-inherits the button's animated value each frame.

## ✅ Verified — command + result

| Claim | Command | Result |
|---|---|---|
| Typecheck clean | `npx tsc --noEmit` | exit 0 |
| Lint unchanged from baseline | `npm run lint` | **0 errors, 7 warnings** — all `@next/next/no-img-element`, identical to the 2026-07-16 baseline |
| `group-hover:opacity-0` is actually generated | `npx @tailwindcss/cli -i src/app/globals.css -o tw.css` then grep | `.group-hover\:opacity-0:is(:where(.group):hover *) { opacity: 0% }` |
| …and beats the co-located `opacity-100` | selector specificity, read off the emitted CSS | `(0,2,0)` vs plain `.opacity-100` `(0,1,0)` → **wins on specificity, source order irrelevant** |
| Overlay inherits the animated tracking | same compiled CSS | `.hover\:tracking-\[0\.3em\]:hover { letter-spacing: 0.3em }` set **on the button**; `letter-spacing` inherits; overlay declares none |

Tailwind **v4.3.3**, `@import "tailwindcss" source(none)` + `@source "../**/*.{js,ts,jsx,tsx,mdx}"`
(`src/app/globals.css:5-6`). `group-hover:opacity-0` had **zero** prior uses in `src/` — hence
compiling the CSS rather than assuming JIT would emit it.

## ⚠️ Provisional — the one thing not checked

**The hover was never watched in a browser.** No dev server, no Lighthouse, no screenshot.

Deliberate: [`2026-07-16-audit-phase0/ai.md`](../2026-07-16-audit-phase0/ai.md) §INCIDENT — the
15-slot Supabase pool is **global across local and prod**, `lib/prisma.ts:17` is still uncapped, and
a local dev server has already taken production down once. A CSS hover fix does not justify that risk.

What the compiled-CSS check proves: the rules exist, are correctly scoped to `:where(.group):hover`,
and win their specificity contests. What it does **not** prove: that the crossfade *looks* right —
timing, whether the 300ms fade-out against the 300ms panel slide leaves a readable frame, or whether
any sub-pixel drift remains between the two centred copies.

**Next person with a browser open: confirm visually.** Cheap, ~10s.

## ❌ Corrections

None. No earlier claim in any doc was found false this session.

## Deliberately not done

| Item | Why |
|---|---|
| `npm test` (48 tests) | DB-backed (`tests/helpers/db.ts`), and the pool risk above applies. No test covers Hero markup |
| `npm run build` | Would need the DB for prerender; typecheck + CSS compile cover this change |
| `ProductCard.tsx` | Checked for the same double-label pattern — **it does not have it.** Its `group-hover:opacity-100` at `:60`/`:79` is a scrim + wishlist button, not a duplicated label. **Do not "fix" it.** |
| The other CTA (`Hero.tsx:88-94`) | `BROWSE ALL` uses `hover:bg-white hover:text-[#0B0B0C]` — single label, no overlay, no bug |

## Invariants — do not break

| Rule | Why |
|---|---|
| Overlay span at `Hero.tsx:83` must **not** re-declare `tracking-*` | It has to inherit the button's animated letter-spacing or the two labels desync mid-transition. That desync was half the reported symptom |
| Any label-crossfade button needs `group-hover:opacity-0` on the **base** copy | Two stacked labels is the default failure mode of this pattern, not an edge case |

## Follow-ups

1. **Visual confirm** of the CTA hover (see Provisional).
2. Unchanged from 2026-07-16, still open: cap the pg pool (`lib/prisma.ts:17`, `max: 1`) — still the
   highest-value open item, and the reason this session couldn't run a browser.
3. `CHANGELOG.md` was **created this session** (didn't exist). Every future change gets an entry.
