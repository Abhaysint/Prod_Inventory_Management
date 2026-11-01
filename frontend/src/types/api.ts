import type { TransactionType, UserRole } from "./enums";

// ============ USER / AUTH ============

export interface UserRead {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// ============ CATEGORY ============

export interface CategoryCreate {
  name: string;
  description?: string | null;
}

export interface CategoryRead {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

// ============ PRODUCT ============

export interface ProductCreate {
  name: string;
  category_id: number;
  sku: string;
  description?: string | null;
  unit_price: number;
  reorder_level?: number;
}

export interface ProductRead {
  id: number;
  name: string;
  category_id: number;
  sku: string;
  description: string | null;
  unit_price: number;
  reorder_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductUpdate {
  name?: string;
  description?: string | null;
  unit_price?: number;
  reorder_level?: number;
  is_active?: boolean;
}

// ============ STOCK ============

export interface StockAdjustment {
  new_quantity: number;
  reason?: string | null;
  adjusted_by?: string | null;
}

export interface StockRead {
  id: number;
  product_id: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  last_counted_at: string;
  updated_at: string;
}

// ============ TRANSACTION ============

export interface TransactionCreate {
  product_id: number;
  transaction_type: TransactionType;
  quantity: number;
  reference_doc?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface TransactionRead {
  id: number;
  product_id: number;
  transaction_type: TransactionType;
  quantity: number;
  reference_doc: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

// ============ PAGINATION ============

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export type PaginatedCategories = PaginatedResponse<CategoryRead>;
export type PaginatedProducts = PaginatedResponse<ProductRead>;

// ============ LOW STOCK ============

export interface LowStockRead {
  product_id: number;
  product_name: string;
  sku: string;
  quantity_on_hand: number;
  reorder_level: number;
  shortage: number;
}


// ============ WAREHOUSE & BATCHES ============

export interface WarehouseCreate {
  name: string;
  code: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface WarehouseRead {
  id: number;
  name: string;
  code: string;
  city: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
}

export interface StockBatchCreate {
  product_id: number;
  warehouse_id: number;
  batch_number: string;
  quantity: number;
  expiry_date: string;
}

export interface StockBatchRead {
  id: number;
  product_id: number;
  warehouse_id: number;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  created_at: string;
}

export interface WarehouseStockSummary {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  city: string;
  total_quantity: number;
  nearest_expiry: string | null;
  batches: StockBatchRead[];
}

// ============ SMART ORDER ROUTING ============

export interface SmartRouteRequest {
  product_id: number;
  quantity: number;
  destination_name: string;
  destination_lat: number;
  destination_lon: number;
  prioritize_expiry?: boolean;
}

export interface RouteCandidate {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  city: string;
  distance_km: number;
  estimated_transit_days: number;
  available_quantity: number;
  can_fulfill: boolean;
  selected_batch_id: number | null;
  selected_batch_number: string | null;
  nearest_expiry_date: string | null;
  days_until_expiry: number | null;
  has_expiring_soon_batch: boolean;
  score: number;
  is_recommended: boolean;
  recommendation_reason: string;
}

export interface SmartRouteResponse {
  product_id: number;
  product_name: string;
  sku: string;
  requested_quantity: number;
  destination_name: string;
  recommended_warehouse_id: number | null;
  candidates: RouteCandidate[];
}

export interface FulfillDispatchRequest {
  product_id: number;
  warehouse_id: number;
  quantity: number;
  destination_name: string;
  notes?: string | null;
}

export interface FulfillDispatchResponse {
  transaction_id: number;
  product_id: number;
  warehouse_id: number;
  warehouse_name: string;
  dispatched_quantity: number;
  remaining_product_stock: number;
  reorder_level: number;
  is_low_stock_now: boolean;
  low_stock_email_sent: boolean;
  alert_message: string | null;
}
