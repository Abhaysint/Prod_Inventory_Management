import { apiClient } from "@/api/client";
import { API_ENDPOINTS } from "@/api/endpoints";
import type {
  WarehouseRead,
  WarehouseCreate,
  StockBatchRead,
  StockBatchCreate,
  WarehouseStockSummary,
  SmartRouteRequest,
  SmartRouteResponse,
  FulfillDispatchRequest,
  FulfillDispatchResponse,
} from "@/types/api";

export async function listWarehouses(): Promise<WarehouseRead[]> {
  const { data } = await apiClient.get<WarehouseRead[]>(
    API_ENDPOINTS.warehouses.root
  );
  return data;
}

export async function createWarehouse(
  body: WarehouseCreate
): Promise<WarehouseRead> {
  const { data } = await apiClient.post<WarehouseRead>(
    API_ENDPOINTS.warehouses.root,
    body
  );
  return data;
}

export async function seedDemoWarehouses(): Promise<{
  message: string;
  warehouses_count: number;
  batches_created: number;
}> {
  const { data } = await apiClient.post<{
    message: string;
    warehouses_count: number;
    batches_created: number;
  }>(API_ENDPOINTS.warehouses.seedDemo);
  return data;
}

export async function getProductWarehouseStock(
  productId: number
): Promise<WarehouseStockSummary[]> {
  const { data } = await apiClient.get<WarehouseStockSummary[]>(
    API_ENDPOINTS.stock.byProductWarehouses(productId)
  );
  return data;
}

export async function createStockBatch(
  body: StockBatchCreate
): Promise<StockBatchRead> {
  const { data } = await apiClient.post<StockBatchRead>(
    API_ENDPOINTS.batches.root,
    body
  );
  return data;
}

export async function computeSmartRoute(
  body: SmartRouteRequest
): Promise<SmartRouteResponse> {
  const { data } = await apiClient.post<SmartRouteResponse>(
    API_ENDPOINTS.warehouses.smartRoute,
    body
  );
  return data;
}

export async function fulfillOrderDispatch(
  body: FulfillDispatchRequest
): Promise<FulfillDispatchResponse> {
  const { data } = await apiClient.post<FulfillDispatchResponse>(
    API_ENDPOINTS.warehouses.fulfillDispatch,
    body
  );
  return data;
}

export async function testLowStockEmail(): Promise<{
  sent: boolean;
  message: string;
}> {
  const { data } = await apiClient.post<{
    sent: boolean;
    message: string;
  }>(API_ENDPOINTS.alerts.testEmail);
  return data;
}

