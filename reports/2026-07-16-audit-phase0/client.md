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

| Speed score | Before | After |
|---|---|---|
| Phone | 70 | **95** |
| Desktop | 90 | **100** ✅ |

Worth noting: **the page never had a "jumping content" problem.** That was measured and it was
already perfect — so no time was spent on a problem you didn't have.

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
