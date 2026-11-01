import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTransaction, listProductTransactions } from "@/api/transactions";
import { toast } from "@/components/ui/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import type { TransactionCreate } from "@/types/api";

export function useProductTransactions(productId: number) {
  return useQuery({
    queryKey: queryKeys.transactions.byProduct(productId),
    queryFn: () => listProductTransactions(productId),
    enabled: !isNaN(productId) && productId > 0,
  });
}

export function useCreateTransaction(productId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TransactionCreate) => createTransaction(body),
    onSuccess: (data) => {
      toast({
        title: "Transaction recorded",
        description: `Successfully logged ${data.quantity} units as ${data.transaction_type}.`,
      });
      // Invalidate transactions, stock, and low-stock queries
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.byProduct(productId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.root(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stock.detail(productId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stock.root(),
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

