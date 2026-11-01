import { apiClient } from "@/api/client";
import type { TransactionCreate, TransactionRead } from "@/types/api";

/**
 * Audit trail is strictly per-product at /transactions/{product_id}.
 * No global /transactions endpoint exists.
 */
export async function listProductTransactions(
  productId: number
): Promise<TransactionRead[]> {
  const { data } = await apiClient.get<TransactionRead[]>(
    `/transactions/${productId}`
  );
  return data;
}

export async function createTransaction(
  body: TransactionCreate
): Promise<TransactionRead> {
  const { data } = await apiClient.post<TransactionRead>(
    "/transactions",
    body
  );
  return data;
}

