# Reports

A dated log of work done on Reverie Revival. One folder per day, three versions of each report — so
whoever's reading gets the version written for them.

**Newest first.** Folders are named `YYYY-MM-DD-slug`, so they sort chronologically on their own.

---

## Which file do I read?

| You are… | Read | What it's like |
|---|---|---|
| **Anyone** — a client, a friend, someone being shown the project, anyone who doesn't code | **`client.md`** | Plain English. No file paths, no jargon. What broke, what got fixed, what it means, what's still missing. |
| **A developer** | **`dev.md`** | File links, reasoning, the commands that prove each claim, what was deliberately skipped and why. |
| **An AI agent** | **`ai.md`** | Dense tables, `file:line`, settled decisions, invariants, and *what not to do*. Written to be read cheaply — **read only this one.** |

Same day, same work, three lenses. Nothing in `client.md` is dumbed down — it's just told without
requiring you to know what a transaction is.

---

## Reports

### [2026-07-16 — audit-phase0](2026-07-16-audit-phase0/)
**Security fixes, safety nets, and a much faster homepage.**

A full codebase audit, then the fixes it justified. Closed a hole that let **anyone on the internet
create discount codes**. Fixed a race where two buyers of the last item both succeeded and stock went
**negative**. Added CI and 48 tests. Rewrote the cart to have a single source of truth. Cut the hero
image by **89%** and took the homepage from **70 → 95 on mobile and 90 → 100 on desktop**.

The audit's headline: the admin panel is in better shape than expected — the real gaps are that
**customers still can't pay** and **Google can't see the store**.

> The most useful thing in here is the **Corrections** section. Five confident claims from the audit
> turned out to be false when actually tested. If you're picking this project up, read those before
> you trust any earlier write-up.

📄 [client.md](2026-07-16-audit-phase0/client.md) · [dev.md](2026-07-16-audit-phase0/dev.md) · [ai.md](2026-07-16-audit-phase0/ai.md)

---

### [2026-07-15 — db-outage](2026-07-15-db-outage/)
**The storefront was showing no products.**

Not an app bug — three stacked infrastructure failures, each hiding the next. The free-tier database
had **auto-paused** after a week idle. The live site was pointed at an **IPv6-only** database address
its host can't reach (12-second hang → 500). And Prisma's query engine is a **per-platform binary** —
the Windows one had been shipped to a Linux server.

Resolved. All 20 products intact; nothing was lost.

> Still the best triage doc in the repo: **if the catalog is ever empty again, check the database
> before the code.**

📄 [client.md](2026-07-15-db-outage/client.md) · [dev.md](2026-07-15-db-outage/dev.md) · [ai.md](2026-07-15-db-outage/ai.md)

---

## Where the other docs live

Reports are **history** — what happened on a given day. They aren't trackers. For current state:

| Doc | What it is |
|---|---|
| [MISSING.md](../MISSING.md) | What's still broken or missing, ranked by severity |
| [PLAN.md](../PLAN.md) | How to fix it, in phases, with the decisions behind the order |
| [MISSING-ARCHIVE.md](../MISSING-ARCHIVE.md) | Done / wrong / rejected items, kept so they aren't re-raised |
| [AGENTS.md](../AGENTS.md) | Rules for AI agents — including how to write one of these |

---

## Adding a report

**One folder per day.** If today's folder doesn't exist, create it; if it does, add to it rather than
starting a second one. The protocol and the template are in
[AGENTS.md → Session reports](../AGENTS.md#session-reports-required).

Two rules worth repeating here, because they're what make these worth keeping:

1. **Separate what you measured from what you believe.** Every report has a **Verified** section
   (with the command that produced each number) and a **Provisional** section. A number without a
   command is a claim, not a fact.
2. **Write down what turned out wrong.** The **Corrections** section exists because a confident,
   plausible, well-argued, *false* claim will otherwise be inherited by whoever reads next — and
   they'll go and "fix" a bug that was never there.
