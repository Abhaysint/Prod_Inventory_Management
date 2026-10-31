import { useQuery } from "@tanstack/react-query";
import { listCategories } from "@/api/categories";
import { listLowStockProducts, listProducts } from "@/api/products";
import { CATEGORIES_STALE_TIME } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";

export function useTotalProductsCount() {
  return useQuery({
    queryKey: queryKeys.products.list({ page: 1, page_size: 1 }),
    queryFn: () => listProducts(1, 1),
    select: (data): number => data.total,
  });
}

export function useTotalCategoriesCount() {
  return useQuery({
    queryKey: queryKeys.categories.list({ page: 1, page_size: 100 }),
    queryFn: () => listCategories(1, 100),
    staleTime: CATEGORIES_STALE_TIME,
    select: (data): number => data.total,
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: queryKeys.products.lowStock(),
    queryFn: () => listLowStockProducts(),
  });
}

