# 15 July 2026 — The shop was showing no products

**For:** anyone · *no technical knowledge needed*
**Status:** ✅ Fixed. The shop is showing all 20 products again, both on the live site and on the development machine.

---

## What went wrong

The website loaded fine — the logo, the menu, the footer, all of it. But where the clothes should
have been, there was nothing. An empty shop.

## Why

Nothing was wrong with the website itself. The problem was the **database** — the filing cabinet
where all the product information lives. The website was asking for the products perfectly well;
nothing was answering.

There turned out to be **three separate problems stacked on top of each other**, which is why it
took a while to unpick. Each one had to be fixed before the next became visible.

**1. The database had gone to sleep.**
The database sits on a free plan, and free plans switch themselves off after about a week of nobody
using them. It hadn't been touched in a while, so it had quietly powered down. Waking it back up
brought all the data straight back — nothing was lost.

**2. The live site was dialling the wrong number.**
Databases can be reached at two different addresses. One of them is a newer type of address that
the live site's hosting simply cannot dial — like having a phone that can't call international
numbers. The site was trying that address, waiting about 12 seconds, and giving up. Switching it to
the address the host *can* reach fixed it.

**3. A missing part on the live server.**
The software that talks to the database needs a small component built specifically for the type of
computer it's running on. The development machine is a Windows PC; the live server is a different
kind of machine entirely. The Windows part had been sent up to a server that couldn't use it.

The fix was to switch to a version of the software that doesn't need that component at all — so
this particular problem can't come back on any machine.

## Where things stand

| | Result |
|---|---|
| Live site | ✅ Showing all 20 products |
| Development machine | ✅ Showing all 20 products |
| Product data | ✅ All intact — nothing was lost at any point |

## Worth knowing for next time

**If the shop ever looks empty again, it's almost certainly the database asleep, not the website
broken.** The free plan powers down after roughly a week of inactivity. Waking it up in the database
dashboard brings everything back, and the products are always still there — sleeping isn't deleting.

The other two problems were both one-time setup issues on the live server. They're fixed permanently
and shouldn't recur.
