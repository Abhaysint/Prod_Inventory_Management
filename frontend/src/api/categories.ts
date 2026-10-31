import { apiClient } from "@/api/client";
import type {
  CategoryCreate,
  CategoryRead,
  PaginatedResponse,
} from "@/types/api";

/**
 * Categories are fetched once per session (page_size=100) into an
 * id -> name Map for the client-side join required by ProductRead,
 * and also paginated directly on /categories.
 */
export async function listCategories(
  page: number,
  pageSize: number
): Promise<PaginatedResponse<CategoryRead>> {
  const { data } = await apiClient.get<PaginatedResponse<CategoryRead>>(
    "/categories",
    { params: { page, page_size: pageSize } }
  );
  return data;
}

export async function getCategory(id: number): Promise<CategoryRead> {
  const { data } = await apiClient.get<CategoryRead>(`/categories/${id}`);
  return data;
}

export async function createCategory(
  body: CategoryCreate
): Promise<CategoryRead> {
  const { data } = await apiClient.post<CategoryRead>("/categories", body);
  return data;
}
