import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { CATEGORIES_STALE_TIME } from "@/lib/queryClient";
import { listCategories } from "@/api/categories";
import {
  createProduct,
  deactivateProduct,
  listProducts,
  searchProducts,
  updateProduct,
  type ProductListResult,
  type ProductSearchParams,
} from "@/api/products";
import { getStock } from "@/api/stock";
import { queryKeys } from "@/lib/queryKeys";
import type { CategoryRead, ProductCreate, ProductRead, ProductUpdate, StockRead } from "@/types/api";

/**
 * Section 3.8 item 1: categories are fetched ONCE (page_size=100) into an
 * id -> name Map used for the client-side join ProductRead requires.
 */
export function useCategoryMap() {
  return useQuery({
    queryKey: queryKeys.categories.list({ page: 1, page_size: 100 }),
    queryFn: () => listCategories(1, 100),
    staleTime: CATEGORIES_STALE_TIME,
    select: (data): Map<number, string> =>
      new Map(data.items.map((category) => [category.id, category.name])),
  });
}

export function useCategoryList() {
  return useQuery({
    queryKey: queryKeys.categories.list({ page: 1, page_size: 100 }),
    queryFn: () => listCategories(1, 100),
    staleTime: CATEGORIES_STALE_TIME,
    select: (data): CategoryRead[] => data.items,
  });
}

export interface ProductFilters {
  name: string;
  sku: string;
  categoryId: number | null;
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.name.trim() !== "" ||
    filters.sku.trim() !== "" ||
    filters.categoryId !== null
  );
}

interface ProductListQuery {
  data: ProductListResult | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  isSearching: boolean;
}

/**
 * Single query hook for the products table. Hitting /products/search returns a
 * bare array while /products returns a paginated envelope; both are normalized
 * into ProductListResult by src/api/products.ts, so the table never branches.
 */
export function useProductList(
  page: number,
  pageSize: number,
  filters: ProductFilters
): ProductListQuery {
  const isSearching = hasActiveFilters(filters);

  const searchParams: ProductSearchParams = {
    name: filters.name.trim() || undefined,
    sku: filters.sku.trim() || undefined,
    categoryId: filters.categoryId ?? undefined,
  };

  const listQuery = useQuery({
    queryKey: queryKeys.products.list({ page, page_size: pageSize }),
    queryFn: () => listProducts(page, pageSize),
    enabled: !isSearching,
    placeholderData: keepPreviousData,
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.products.search({
      name: searchParams.name,
      sku: searchParams.sku,
      category_id: searchParams.categoryId,
    }),
    queryFn: () => searchProducts(searchParams),
    enabled: isSearching,
    placeholderData: keepPreviousData,
  });

  const active = isSearching ? searchQuery : listQuery;

  return {
    data: active.data,
    isPending: active.isPending,
    isError: active.isError,
    refetch: () => {
      void active.refetch();
    },
    isSearching,
  };
}

/**
 * Section 3.8 item 1: fan out stock lookups over ONLY the current page's
 * product ids, cached per ['stock', productId]. Parallel, never sequential,
 * never all products at once.
 */
export function usePageStock(productIds: number[]) {
  return useQueries({
    queries: productIds.map((id) => ({
      queryKey: queryKeys.stock.detail(id),
      queryFn: () => getStock(id),
      staleTime: CATEGORIES_STALE_TIME,
    })),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductCreate) => createProduct(body),
    onSuccess: (product) => {
      toast({
        title: "Product created",
        description: `${product.name} was added to the catalogue.`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.root() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stock.root() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProductUpdate }) =>
      updateProduct(id, body),
    onSuccess: (product) => {
      toast({
        title: "Product updated",
        description: `${product.name} was saved.`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.root() });
    },
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deactivateProduct(id),
    onSuccess: (product) => {
      toast({
        title: "Product deactivated",
        description: `${product.name} no longer appears in the product list.`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.root() });
    },
  });
}

export type { ProductRead, StockRead };
