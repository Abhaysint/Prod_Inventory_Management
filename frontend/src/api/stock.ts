import { apiClient } from "@/api/client";
import type { StockRead } from "@/types/api";

/**
 * ProductRead carries no stock quantity, so the products table fans out
 * one of these per visible product id and caches under ['stock', productId].
 */
export async function getStock(productId: number): Promise<StockRead> {
  const { data } = await apiClient.get<StockRead>(`/stock/${productId}`);
  return data;
}
