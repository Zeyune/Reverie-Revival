# 2026-08-15 — Hero CTA hover: stop stacking two copies of the label

**Audience:** developers
**Status:** 🚧 change complete, uncommitted — see [Handing over](#handing-over)
**Commits:** pending

## What changed

Two class edits in [Hero.tsx](../../src/storefront/components/Hero.tsx), both on the `SHOP NEW DROP`
CTA ([Hero.tsx:76-86](../../src/storefront/components/Hero.tsx#L76-L86)):

```diff
- <span className="relative z-10">SHOP NEW DROP</span>
+ <span className="relative z-10 opacity-100 group-hover:opacity-0 transition-opacity duration-300">SHOP NEW DROP</span>
  <div className="absolute inset-0 bg-[#E10613] transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
- <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 tracking-[0.2em]">
+ <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
```

## Why

The button renders its label **twice** — a black base copy and a white overlay copy — so the label
can flip colour as the red panel slides up. The overlay had a hover state; the base copy didn't.

| z-index | Element | Hover behaviour before |
|---|---|---|
| `z-20` | white overlay label | fades in ✅ |
| auto | red `#E10613` panel | slides up ✅ |
| `z-10` | black base label | **nothing — stayed fully opaque** 🔴 |

Note the base span is `relative z-10`, which lifts it above the red panel too (`absolute` with
`z-index: auto`). So hovering showed white text over still-visible black text.

**The second edit is why it looked as bad as it did.** The button animates
`tracking-[0.2em] → hover:tracking-[0.3em]` under `transition-all duration-300`, but the overlay
pinned itself at `tracking-[0.2em]`. Mid-hover the two copies were at *different letter-spacings*, so
they drifted apart horizontally — smeared rather than a clean double-image. `letter-spacing` is an
inherited property, so removing the override lets the overlay pick up the button's animated value
frame by frame. Both copies now stay registered throughout the 300ms.

### Rejected alternative

Delete the white overlay, keep only the black label. Black `#0B0B0C` on red `#E10613` is ≈2.1:1
contrast — under the 4.5:1 WCAG AA floor. White-on-red was Effie's call when asked.

## ✅ Verified

| Claim | Command | Result |
|---|---|---|
| Typecheck clean | `npx tsc --noEmit` | exit 0 |
| No new lint problems | `npm run lint` | 0 errors, 7 warnings — all pre-existing `@next/next/no-img-element`, matching the 2026-07-16 baseline |
| The utility actually compiles | `npx @tailwindcss/cli -i src/app/globals.css -o /tmp/tw.css` | emits `.group-hover\:opacity-0:is(:where(.group):hover *) { opacity: 0% }` |
| It beats the sibling `opacity-100` | read from that output | `(0,2,0)` vs `(0,1,0)` — wins on specificity, so source order can't flip it |
| Overlay inherits the animated tracking | same output | `letter-spacing: 0.3em` lands on the **button** via `.hover\:tracking-\[0\.3em\]:hover`; the overlay declares none |

Worth explaining the third check: `group-hover:opacity-0` had **no** prior use anywhere in `src/`.
Tailwind v4 is JIT with `source(none)` + an explicit `@source` glob
([globals.css:5-6](../../src/app/globals.css#L5-L6)), so "it's a standard utility" is an assumption,
not a fact. Compiling the stylesheet and grepping it turns it into a fact.

## ⚠️ Provisional

**Not verified in a browser.** No dev server was started, so the crossfade's *appearance* — timing,
whether any frame reads as unlabelled, residual sub-pixel drift — is unconfirmed.

That was deliberate. Per [2026-07-16 → INCIDENT](../2026-07-16-audit-phase0/ai.md), the Supabase
pooler's 15 connections are shared **globally between local dev and production**, the pool at
[prisma.ts:17](../../src/lib/prisma.ts#L17) is still uncapped, and a local dev server has already
caused a ~10 minute production outage. Not a trade worth making for a CSS hover state.

If you have the app running for another reason, glance at the CTA and confirm — then update this
section.

## Deliberately not done

- **`npm test` / `npm run build`** — both want the database, same pool risk. No test asserts on Hero
  markup, and typecheck plus the CSS compile cover what changed.
- **[ProductCard.tsx](../../src/storefront/components/ProductCard.tsx)** — grepped for the same
  pattern. It doesn't have it: the `group-hover:opacity-100` at
  [:60](../../src/storefront/components/ProductCard.tsx#L60) and
  [:79](../../src/storefront/components/ProductCard.tsx#L79) are a wishlist button and a quick-add
  scrim, not a duplicated label. Nothing to fix.
- **`BROWSE ALL`** ([Hero.tsx:88-94](../../src/storefront/components/Hero.tsx#L88-L94)) — single
  label, swaps colours with `hover:bg-white hover:text-[#0B0B0C]`. Never had the bug.

## Follow-ups

1. Visual confirmation of the hover, next time the app is up.
2. Still open from 2026-07-16: cap the pg pool (`max: 1`) — it's the reason this session couldn't
   just look at the thing.
3. [`CHANGELOG.md`](../../CHANGELOG.md) was created this session; it didn't exist before.

## Handing over

Nothing is committed — commits in this repo are Effie's alone.

```bash
git add src/storefront/components/Hero.tsx CHANGELOG.md reports/
git status                          # confirm only the intended files are staged
git commit -m "Crossfade Hero CTA label instead of stacking two copies"
git push
```
