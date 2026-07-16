import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reserveStock } from "@/lib/inventory";
import {
  cleanupFixtures,
  createStockFixture,
  createTestClient,
  warmPool,
} from "./helpers/db";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Pool } from "pg";

// Only has to exceed the stock under test to force the race — 5 against 1 unit
// proves it exactly as well as 50 would, and stays inside the shared Supabase
// pooler budget (see TEST_POOL_MAX). Verified by mutation: a read-then-write
// decrement still fails these.
const CONCURRENCY = 5;

let prisma: PrismaClient;
let pool: Pool;

beforeAll(async () => {
  ({ prisma, pool } = createTestClient());
  await warmPool(pool, CONCURRENCY);
  await cleanupFixtures(prisma);
});

afterAll(async () => {
  await cleanupFixtures(prisma);
  await pool.end();
});

describe("reserveStock", () => {
  it("reserves stock when there is enough", async () => {
    const { variant } = await createStockFixture(prisma, {
      stockQty: 5,
      tag: "reserve-ok",
    });

    const ok = await prisma.$transaction((tx) =>
      reserveStock(tx, variant.id, 3)
    );

    expect(ok).toBe(true);
    const after = await prisma.variant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stockQty).toBe(2);
  });

  it("refuses to reserve more than is in stock", async () => {
    const { variant } = await createStockFixture(prisma, {
      stockQty: 2,
      tag: "reserve-insufficient",
    });

    const ok = await prisma.$transaction((tx) =>
      reserveStock(tx, variant.id, 3)
    );

    expect(ok).toBe(false);
    const after = await prisma.variant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stockQty).toBe(2);
  });

  // The regression test. With a read-then-write decrement, every one of these
  // transactions reads stockQty=1 before any of them writes, so all 8 "succeed"
  // and stock goes negative. A conditional decrement makes Postgres re-check the
  // predicate under the row lock, so exactly one can win.
  it("lets exactly one of N concurrent buyers take the last unit", async () => {
    const { variant } = await createStockFixture(prisma, {
      stockQty: 1,
      tag: "reserve-race",
    });

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        prisma.$transaction((tx) => reserveStock(tx, variant.id, 1))
      )
    );

    expect(results.filter(Boolean)).toHaveLength(1);

    const after = await prisma.variant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stockQty).toBe(0);
    expect(after.stockQty).toBeGreaterThanOrEqual(0);
  });

  // Checkout reserves every line in one transaction. If a later line can't be
  // filled it throws, and the earlier lines' stock must come back — otherwise a
  // failed checkout quietly eats inventory nobody bought.
  it("rolls back earlier reservations when a later one fails", async () => {
    const { variant: inStock } = await createStockFixture(prisma, {
      stockQty: 5,
      tag: "rollback-a",
    });
    const { variant: soldOut } = await createStockFixture(prisma, {
      stockQty: 0,
      tag: "rollback-b",
    });

    await expect(
      prisma.$transaction(async (tx) => {
        const first = await reserveStock(tx, inStock.id, 2);
        expect(first).toBe(true);

        const second = await reserveStock(tx, soldOut.id, 1);
        if (!second) {
          throw new Error("out of stock");
        }
      })
    ).rejects.toThrow("out of stock");

    const after = await prisma.variant.findUniqueOrThrow({
      where: { id: inStock.id },
    });
    expect(after.stockQty).toBe(5);
  });

  it("never oversells when demand exceeds supply", async () => {
    const { variant } = await createStockFixture(prisma, {
      stockQty: 3,
      tag: "reserve-partial",
    });

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        prisma.$transaction((tx) => reserveStock(tx, variant.id, 1))
      )
    );

    expect(results.filter(Boolean)).toHaveLength(3);

    const after = await prisma.variant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stockQty).toBe(0);
  });
});
