import type { Prisma } from "@/generated/prisma/client";

/**
 * Atomically take `qty` units of a variant. Returns false (without changing
 * anything) if there isn't enough stock.
 *
 * The `stockQty: { gte: qty }` predicate is what makes this safe under
 * concurrency, and it must stay in the `where`. Postgres re-evaluates it after
 * the row lock is released, so when two buyers race for the last unit the loser
 * matches zero rows instead of decrementing into the negative. Reading the stock
 * first and then updating cannot do this at Read Committed: both readers see the
 * old value and both writes land.
 *
 * Callers must treat `false` as "out of stock" and abort the transaction.
 */
export async function reserveStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  qty: number
): Promise<boolean> {
  const { count } = await tx.variant.updateMany({
    where: { id: variantId, stockQty: { gte: qty } },
    data: { stockQty: { decrement: qty } },
  });

  return count === 1;
}

/**
 * Give stock back — the inverse of reserveStock, for cancellations and refunds.
 * Unconditional: returning stock can never take it below zero.
 */
export async function releaseStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  qty: number
): Promise<void> {
  await tx.variant.update({
    where: { id: variantId },
    data: { stockQty: { increment: qty } },
  });
}
