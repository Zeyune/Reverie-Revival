# 2026-08-15 — The main button's text looked doubled when you hovered over it

**Audience:** anyone — no technical background needed
**Status:** 🚧 Fixed, ready to publish (not live on the site yet)

## What was wrong

On the front page there are two buttons under the brand name. The first one, **SHOP NEW DROP**, is
meant to do something small and satisfying when you point at it: a red panel slides up to fill the
button, and the wording flips from black to white so it stays readable against the red.

It wasn't doing the second half. The white wording appeared on top, but the black wording never left.
So while your cursor was on the button you were looking at two sets of the same words at once —
black and white, layered — which read as blurry or smeared rather than as one clean label.

It got worse the longer you looked, because of a second detail. The button also spreads its letters
slightly further apart on hover, as a bit of polish. The black wording was doing that spreading; the
white wording had been told to stay at a fixed width. So the two copies weren't just stacked, they
were stretching apart from each other while you watched — one slowly widening, the other frozen.

## What was changed

The black wording now fades out over the same third of a second that the white wording fades in, so
they swap rather than pile up. And the white wording is no longer held at a fixed letter width — it
follows the button, so both copies stay lined up on top of each other through the whole transition.

Point at the button now and you get what was always intended: red panel rises, black text turns
white, one clean label.

## A choice you made

There were two sensible ways to end up with a single label instead of two. You could keep the white
wording, or keep the black one.

Keeping the black one would have left black text sitting on a bright red panel. That combination is
genuinely hard to read — it falls below the accessibility standard the web uses for text people need
to be able to read, and it's exactly the kind of thing that's fine for someone with sharp vision on a
good screen and a real problem for everyone else. You chose white-on-red, which is the readable one.

## What we're confident about, and what we're not

The change is confirmed correct at the level of the site's styling rules — the instruction to hide
the black text is definitely there, definitely applies only when you're hovering, and definitely
overrides the older instruction that was keeping it visible. That was all checked properly, not
assumed.

**What wasn't done is looking at it in a real browser.** That sounds like an odd thing to skip for a
visual fix, so here's the honest reason: this project's database allows only 15 simultaneous
connections in total, and that budget is shared between the live site and any copy running on a
developer's machine. Starting a local copy has already knocked the live site offline once, for about
ten minutes, back in July. That underlying weakness still hasn't been fixed. Risking the live store
to eyeball a hover effect isn't a good trade.

So: the fix is sound, and it should be given a quick look the next time the site is running for some
other reason. That's noted in the developer version so it isn't forgotten.

## What's still on the list

Nothing new. The database connection limit above is the same issue flagged in July and is still the
most valuable thing to fix next — this session is a small example of the cost of leaving it, since it
turned a ten-second visual check into something not worth doing.

The bigger items from July are unchanged: customers still can't pay, and search engines still can't
properly see the individual product pages.
