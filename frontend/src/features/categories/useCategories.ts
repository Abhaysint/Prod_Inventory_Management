import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createCategory, listCategories } from "@/api/categories";
import { toast } from "@/components/ui/use-toast";
import { CATEGORIES_STALE_TIME } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import type { CategoryCreate } from "@/types/api";

export function usePaginatedCategories(page: number, pageSize: number) {
  return useQuery({
    queryKey: queryKeys.categories.list({ page, page_size: pageSize }),
    queryFn: () => listCategories(page, pageSize),
    staleTime: CATEGORIES_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useCategoryList() {
  return useQuery({
    queryKey: queryKeys.categories.list({ page: 1, page_size: 100 }),
    queryFn: () => listCategories(1, 100),
    staleTime: CATEGORIES_STALE_TIME,
    select: (data): import("@/types/api").CategoryRead[] => data.items,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryCreate) => createCategory(body),
    onSuccess: (category) => {
      toast({
        title: "Category created",
        description: `${category.name} was added to categories.`,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.categories.root(),
      });
    },
  });
}

