import { apiClient } from "@/api/client";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { TransactionCreate, TransactionRead } from "@/types/api";

/**
 * Audit trail is strictly per-product at /transactions/{product_id}.
 * No global /transactions endpoint exists.
 */
export async function listProductTransactions(
  productId: number
): Promise<TransactionRead[]> {
  const { data } = await apiClient.get<TransactionRead[]>(
    API_ENDPOINTS.transactions.byProduct(productId)
  );
  return data;
}

export async function createTransaction(
  body: TransactionCreate
): Promise<TransactionRead> {
  const { data } = await apiClient.post<TransactionRead>(
    API_ENDPOINTS.transactions.root,
    body
  );
  return data;
}
