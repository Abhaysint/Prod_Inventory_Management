import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  listWarehouses,
  getProductWarehouseStock,
  seedDemoWarehouses,
  createStockBatch,
  computeSmartRoute,
  fulfillOrderDispatch,
  testLowStockEmail,
} from "@/api/warehouses";
import type {
  WarehouseRead,
  WarehouseStockSummary,
  StockBatchCreate,
  StockBatchRead,
  SmartRouteRequest,
  SmartRouteResponse,
  FulfillDispatchRequest,
  FulfillDispatchResponse,
} from "@/types/api";

export function useWarehouses() {
  return useQuery<WarehouseRead[], Error>({
    queryKey: queryKeys.warehouses.all(),
    queryFn: listWarehouses,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductWarehouseStock(productId: number, enabled = true) {
  return useQuery<WarehouseStockSummary[], Error>({
    queryKey: queryKeys.warehouses.productBatches(productId),
    queryFn: () => getProductWarehouseStock(productId),
    enabled: enabled && productId > 0,
    staleTime: 30 * 1000,
  });
}

export function useSeedDemoWarehouses() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string; warehouses_count: number; batches_created: number }, Error>({
    mutationFn: seedDemoWarehouses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stock.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.root() });
    },
  });
}

export function useCreateStockBatch() {
  const queryClient = useQueryClient();

  return useMutation<StockBatchRead, Error, StockBatchCreate>({
    mutationFn: createStockBatch,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.productBatches(data.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stock.detail(data.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byProduct(data.product_id) });
    },
  });
}

export function useSmartRouteMutation() {
  return useMutation<SmartRouteResponse, Error, SmartRouteRequest>({
    mutationFn: computeSmartRoute,
  });
}

export function useFulfillDispatchMutation() {
  const queryClient = useQueryClient();

  return useMutation<FulfillDispatchResponse, Error, FulfillDispatchRequest>({
    mutationFn: fulfillOrderDispatch,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.productBatches(data.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stock.detail(data.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byProduct(data.product_id) });
    },
  });
}

export function useTestLowStockEmail() {
  return useMutation<{ sent: boolean; message: string }, Error>({
    mutationFn: testLowStockEmail,
  });
}

