# Changelog

Why each change was made. Git records *what* changed; this records *why* — the part that's lost
otherwise. Newest entries at the top, under a `## YYYY-MM-DD` heading (Philippine time, UTC+08:00).

Past entries are never edited or deleted. A correction is a **new** entry that supersedes an old one.

This file starts on 2026-08-15, the day the changelog rule reached this project. Work before that
date is recorded in [`reports/`](reports/) — see [`reports/README.md`](reports/README.md).

---

## 2026-08-15

### Crossfade the Hero "SHOP NEW DROP" button label instead of stacking two copies
**Type:** Fixed
**Time:** 14:09 +08:00
**Files:** `src/storefront/components/Hero.tsx`
**Related:** —

The primary CTA renders its label twice: a black base `<span>` (`z-10`) and a white overlay `<span>`
(`z-20`) that fades in as the red panel slides up on hover. The base span had no hover state, so on
hover **both** copies were visible at once — white text sitting on top of still-visible black text.

Two changes on the button:

1. Base span gained `opacity-100 group-hover:opacity-0 transition-opacity duration-300`, so the two
   labels now crossfade over the same 300ms as the panel rather than overlapping.
2. Removed the hardcoded `tracking-[0.2em]` from the overlay span so it inherits letter-spacing from
   the button instead.

**Why:** (1) is the actual reported bug — the black label never disappeared, so the hover state read
as doubled/smeared text. (2) is what made it look worse than a simple overlap: the button animates
`tracking-[0.2em] → hover:tracking-[0.3em]`, but the overlay pinned itself at `0.2em`, so the two
copies drifted to visibly different widths *during* the transition. `letter-spacing` is an inherited
property, so dropping the override makes the overlay track the button's animated value frame by frame
and the copies stay registered.

Alternative rejected: deleting the white overlay and keeping only the black label. Black `#0B0B0C` on
the red `#E10613` panel is roughly 2.1:1 contrast — below the 4.5:1 WCAG AA threshold for body text.
The white-on-red direction was Effie's call.

Not verified: the hover was **not** watched in a browser. No dev server was started — the newest
session report's operational rule is that local servers share a global 15-connection Supabase pool
with production, and running one has already taken prod down once. Verification was done against the
compiled stylesheet instead; see the report for exactly what that does and doesn't prove.
