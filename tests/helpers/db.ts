import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Integration tests run against a real Postgres — the behaviour under test
 * (concurrent transactions racing for the same row) only exists in a real
 * engine and cannot be reproduced against a mock.
 *
 * Fixtures are namespaced with TEST_PREFIX and torn down in afterAll.
 */
export const TEST_PREFIX = "__test__";

/**
 * Keep this modest. Against Supabase's session-mode pooler the whole project
 * shares a **pool_size of 15**, and Supavisor holds idle connections for a while
 * after a client goes away — so a dev server you started earlier still counts.
 * Ask for too many and the suite dies with:
 *
 *   DriverAdapterError: (EMAXCONNSESSION) max clients reached in session mode
 *
 * It only has to exceed the stock under test to prove the race; it does not have
 * to be large. CI is unaffected (throwaway Postgres allows ~100), but the local
 * run is the one people actually watch.
 */
export const TEST_POOL_MAX = 6;

export function createTestClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run integration tests.");
  }

  // max must exceed the concurrency under test, or the "concurrent" writers
  // queue on the pool and serialise — which would make a broken decrement pass.
  const pool = new Pool({ connectionString, max: TEST_POOL_MAX });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  return { prisma, pool };
}

/**
 * Force `n` live connections into the pool before a concurrency test.
 *
 * Without this the first concurrent test pays the cost of opening every
 * connection from cold, which staggers the writers enough that they serialise
 * by accident — and a read-then-write decrement then *passes* a race test it
 * should fail. Warming the pool makes the overlap real.
 */
export async function warmPool(pool: Pool, n: number) {
  const clients = await Promise.all(
    Array.from({ length: n }, () => pool.connect())
  );
  clients.forEach((client) => client.release());
}

export async function createStockFixture(
  prisma: PrismaClient,
  { stockQty, tag }: { stockQty: number; tag: string }
) {
  const product = await prisma.product.create({
    data: {
      title: `${TEST_PREFIX}${tag}`,
      slug: `${TEST_PREFIX}${tag}`,
      description: "Integration test fixture.",
      status: "ACTIVE",
      basePrice: 1000,
      tags: [],
      variants: {
        create: {
          sku: `${TEST_PREFIX}${tag}`,
          size: "M",
          color: "Black",
          stockQty,
          isActive: true,
        },
      },
    },
    include: { variants: true },
  });

  return { product, variant: product.variants[0] };
}

export async function cleanupFixtures(prisma: PrismaClient) {
  // OrderItem/Variant/StockMovement all cascade from Product, but orders created
  // by a test are top-level rows and have to go first.
  await prisma.order.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
  await prisma.product.deleteMany({
    where: { slug: { startsWith: TEST_PREFIX } },
  });
}
