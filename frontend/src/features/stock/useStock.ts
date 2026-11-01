import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProduct, listProducts } from "@/api/products";
import { adjustStock, getStock } from "@/api/stock";
import { toast } from "@/components/ui/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import type { StockAdjustment } from "@/types/api";

export function useProductStock(productId: number | null) {
  return useQuery({
    queryKey: queryKeys.stock.detail(productId ?? 0),
    queryFn: () => getStock(productId!),
    enabled: productId !== null && !isNaN(productId) && productId > 0,
  });
}

export function useProductDetail(productId: number | null) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId ?? 0),
    queryFn: () => getProduct(productId!),
    enabled: productId !== null && !isNaN(productId) && productId > 0,
  });
}

export function useActiveProductsList() {
  return useQuery({
    queryKey: queryKeys.products.list({ page: 1, page_size: 100 }),
    queryFn: () => listProducts(1, 100),
    select: (data) => data.items,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: number;
      body: StockAdjustment;
    }) => adjustStock(productId, body),
    onSuccess: (_, variables) => {
      toast({
        title: "Stock adjusted",
        description: `Quantity on hand successfully set to ${variables.body.new_quantity}.`,
      });
      // Invalidate stock, transactions, and low stock per Section 7 of AGENTS.md
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stock.detail(variables.productId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stock.root(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.byProduct(variables.productId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.root(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.lowStock(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.root(),
      });
    },
  });
}

