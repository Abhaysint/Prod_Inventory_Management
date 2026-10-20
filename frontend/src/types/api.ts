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
