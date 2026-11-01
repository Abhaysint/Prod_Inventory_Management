import { apiClient } from "@/api/client";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  LowStockRead,
  PaginatedResponse,
  ProductCreate,
  ProductRead,
  ProductUpdate,
} from "@/types/api";

/**
 * Normalized shape for BOTH GET /products (paginated envelope) and
 * GET /products/search (bare array). The table consumes this one shape and
 * never branches on which endpoint answered.
 *
 * Search responses are unpaginated, so page === 1 and pageSize === items.length.
 */
export interface ProductListResult {
  items: ProductRead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductSearchParams {
  name?: string;
  sku?: string;
  categoryId?: number;
}

export async function listProducts(
  page: number,
  pageSize: number
): Promise<ProductListResult> {
  const { data } = await apiClient.get<PaginatedResponse<ProductRead>>(
    API_ENDPOINTS.products.root,
    {
      params: { page, page_size: pageSize },
    }
  );
  return {
    items: data.items,
    total: data.total,
    page: data.page,
    pageSize: data.page_size,
  };
}

export async function searchProducts(
  params: ProductSearchParams
): Promise<ProductListResult> {
  const { data } = await apiClient.get<ProductRead[]>(
    API_ENDPOINTS.products.search,
    {
      params: {
        name: params.name?.trim() || undefined,
        sku: params.sku?.trim() || undefined,
        category_id: params.categoryId ?? undefined,
      },
    }
  );
  // Bare array: there is no pagination envelope, so total === items.length.
  return {
    items: data,
    total: data.length,
    page: 1,
    pageSize: data.length,
  };
}

export async function getProduct(id: number): Promise<ProductRead> {
  const { data } = await apiClient.get<ProductRead>(
    API_ENDPOINTS.products.byId(id)
  );
  return data;
}

export async function createProduct(body: ProductCreate): Promise<ProductRead> {
  const { data } = await apiClient.post<ProductRead>(
    API_ENDPOINTS.products.root,
    body
  );
  return data;
}

/** Partial update. `sku` and `category_id` are immutable after creation. */
export async function updateProduct(
  id: number,
  body: ProductUpdate
): Promise<ProductRead> {
  const { data } = await apiClient.put<ProductRead>(
    API_ENDPOINTS.products.byId(id),
    body
  );
  return data;
}

/**
 * There is NO DELETE endpoint (DELETE /products/{id} returns 405).
 * Deactivation is a soft delete via PUT with is_active: false.
 * Irreversible from the UI — product reactivation is out of scope.
 */
export async function deactivateProduct(id: number): Promise<ProductRead> {
  const { data } = await apiClient.put<ProductRead>(
    API_ENDPOINTS.products.byId(id),
    {
      is_active: false,
    }
  );
  return data;
}

/**
 * GET /products/low-stock returns a bare array of LowStockRead items
 * where quantity_on_hand <= reorder_level for active products.
 */
export async function listLowStockProducts(): Promise<LowStockRead[]> {
  const { data } = await apiClient.get<LowStockRead[]>(
    API_ENDPOINTS.products.lowStock
  );
  return data;
}
