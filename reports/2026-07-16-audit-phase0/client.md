# 16 July 2026 — Security fixes, safety nets, and a much faster homepage

**For:** anyone · *no technical knowledge needed*
**Status:** ✅ Done and live.

---

## The short version

The shop was reviewed end to end. Three things came out of it:

1. **A security hole was closed** — anyone on the internet could have created discount codes for your store.
2. **A bug that would have oversold stock was fixed** — two people buying the last item could both succeed.
3. **The homepage got dramatically faster** — the phone score went from 70 to 95, and desktop hit a perfect 100.

The headline finding from the review: **your admin panel is in much better shape than expected.**
Most of it genuinely works. The real gaps are elsewhere — and the biggest one is that **customers
still cannot actually pay you.**

---

## What was fixed

### Anyone could have created discount codes

The discount-code page in your admin panel had a missing lock. Every other admin page checked "are
you logged in?" before saving anything — this one page forgot. Someone who knew what they were
doing could have created themselves a 100%-off code without ever logging in.

It's fixed, and every other admin page was checked one by one to make sure this was the only one.

### Two people could buy the same last item

The shop checked stock and *then* subtracted it, as two separate steps. If two customers bought the
last hoodie at the same moment, both checks would pass before either subtraction happened — so both
orders would succeed, and your stock count would go **negative**.

This is now a single, indivisible step: the database itself refuses to let stock go below zero. To
prove it, we wrote a test that fires **eight simultaneous purchases at one item**. Against the old
code, all eight succeeded — stock would have gone to **minus five**. Now exactly one wins, every
time.

### The homepage was slow for a silly reason

Your big hero image was a **364 KB photo saved in the wrong file format** — and worse, the browser
couldn't even *find* it until it had finished loading the entire product list from the database.
The hero picture has nothing to do with products, but it was stuck in the queue behind them,
waiting about **4 seconds** to even start downloading.

Fixed by making the image discoverable immediately and shrinking it to **40 KB — 89% smaller**.
The fonts were also being fetched from Google's servers, which blocked the page from drawing; they
now come from your own site.

**Measured on the real live site** (Google PageSpeed, 16 July):

| Speed score | Before | **After the speed work** |
|---|---|---|
| Phone | 70 | **98** |
| Desktop | 90 | **100** 🏆 |

**A perfect 100 on desktop, on the real site.** The main image now appears in **half a second** —
it used to take five and a half seconds on a phone.

### …and then I broke it slightly, an hour later

The loading placeholders I added (the grey boxes that show while products load) **cost 5 points on
desktop and 4 on phone** — the score went to 95 and 94.

Why: those placeholders gently pulse to show they're loading. That pulse never stops until the
products arrive — and the speed test partly measures *"how quickly does the page stop moving?"*
A permanently pulsing page looks, to the test, like a page that never finishes loading. They also
made the page three times bigger to send.

**Fixed the same night.** The placeholders are now a plain, still grey instead of a pulsing one —
they still do both their jobs (showing products are coming, holding the space so nothing jumps)
without the cost:

| | With the pulse | **Fixed** |
|---|---|---|
| Desktop | 95 | **100** ✅ |
| Phone | 94 | **95** |

**Desktop is back to a perfect 100.**

I'd rather tell you I cost you 5 points than let it quietly sit there. *(These last figures are from
the development machine — worth one more real test on the live site to confirm.)*

Worth noting: **the page never had a "jumping content" problem**, before or after. That was measured
both times and it's perfect — no time was spent on a problem you didn't have.

**The single biggest thing left:** your product photos are about **1.2 MB** larger than they need to
be. That's already on the plan and it's the largest remaining win by a wide margin.

### A quiet email bug

Your contact form was set to send email from an address that didn't exist — a placeholder,
`yourgmail@gmail.com`, that had been left in by accident and was silently overriding the real
setting. Fixed.

---

## Safety nets added

**Every change is now checked automatically.** Previously, nothing ran the code checks — and that
turned out to matter enormously. **Both of the real bugs found today were already detectable by a
tool the project has had installed the whole time.** Nobody had ever run it.

Now it runs by itself on every change, so this can't quietly happen again. **48 automated tests**
were also added, covering the shop basket, the discount logic, and that stock bug.

---

## The site went down tonight — and it's back

**Fixed, and worth understanding, because it's the same problem as the section below.**

While testing the site's speed, every page stopped being able to load products. The shop showed
nothing again.

**Your database only accepts 15 conversations at once — and that limit is shared by everything.**
Not "15 for the live site and 15 for the development machine." Fifteen. Total. Between all of them.

Two things ate all fifteen:

1. **Leftovers from the speed testing.** Each test run opened conversations with the database. The
   test programs were shut down — but the database doesn't notice a program vanishing, it waits for
   a polite goodbye. It never came, so it kept holding those lines open for a dead program. Eight of
   them, some for nearly an hour.
2. **The speed test itself.** Scanning the live site made the hosting spin up extra copies of your
   site to handle the load, and each copy opened its own set of lines.

Together: all fifteen used, nothing left, every page fails.

**Fix:** the eight abandoned lines were closed (only the abandoned ones — the live site's own
connections were left alone). Confirmed working: **all 20 products loading again.**

**What you should take from this:** the site is currently fragile enough that *running a speed test
can knock it offline.* That's not sustainable, and it's the same root cause as the section below.
It needs fixing properly before you take real payments — but not at 1am, and not without your say-so.

---

## One new problem found at the very end

While adding the loading placeholders, the automated tests suddenly started failing. Chasing it down
turned up something worth knowing:

**Your database only allows 15 things to talk to it at once.** Right now the site doesn't limit how
many "phone lines" it opens, and the hosting runs several copies of your site at busy moments — each
one opening its own set of lines. **Two copies running at once could use up all 15 and lock everyone
out.**

It hasn't happened because you have no customers yet. But it's exactly the kind of thing that breaks
**the day you get busy** — which is the worst possible day for it.

Nothing was changed for this tonight; it's written down so it gets fixed properly before the payment
work goes live. The tests were made to use fewer connections so they stop tripping over it, and it
was double-checked that they still catch the original stock bug.

---

## What's still missing — the honest list

**Customers cannot pay you.** There's no payment system connected. Every order that arrives is
marked "unpaid" forever, and the checkout page collects card numbers it cannot charge — while
telling the customer "Order confirmed!" and promising a confirmation email that is never sent.
**This is the single biggest thing standing between you and taking real money.** The plan is
PayMongo (GCash + cards) with cash-on-delivery as a backup.

**Google cannot see your shop.** Every page of your storefront has the same web address. That means
no product can be shared, linked, or found in a search — and the back button leaves the site
entirely.

**Discount codes don't really work.** They show a discount in the basket, then quietly drop it at
checkout. The customer is charged full price. (The security hole above was in the admin page that
manages them — separate problem, same feature.)

**Some buttons don't do anything.** The search box, the newsletter signup, the "Size Guide" links,
and the social media icons all look real but aren't connected to anything.

**No order emails, and customers can lose their order.** The order number appears once on screen
and is never emailed. Refreshing that page loses it forever.

---

## What happens next

The order of work is: **make it possible to pay you** → **make Google able to see you** → then the
smaller polish items. Full detail lives in the project's plan document.

---

## One thing worth saying plainly

During this work, **five separate claims from the initial review turned out to be wrong** — problems
that were confidently written down but didn't actually exist when tested. They were all found the
same way: by running the code instead of reading it.

That's why the automated checks matter more than any single fix in this report. They're the
difference between "we think it works" and "we know it does."
