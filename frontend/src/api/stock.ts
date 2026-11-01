import { apiClient } from "@/api/client";
import type { StockAdjustment, StockRead, TransactionRead } from "@/types/api";

/**
 * ProductRead carries no stock quantity, so the products table fans out
 * one of these per visible product id and caches under ['stock', productId].
 */
export async function getStock(productId: number): Promise<StockRead> {
  const { data } = await apiClient.get<StockRead>(`/stock/${productId}`);
  return data;
}

/**
 * Adjust stock to an exact quantity.
 * Auto-creates an adjustment transaction server-side.
 * The UI must NEVER call POST /transactions on stock adjustment.
 */
export async function adjustStock(
  productId: number,
  body: StockAdjustment
): Promise<TransactionRead> {
  const { data } = await apiClient.post<TransactionRead>(
    `/stock/${productId}/adjust`,
    body
  );
  return data;
}
