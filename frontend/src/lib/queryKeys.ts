export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  categories: {
    all: () => ["categories", "all"] as const,
    list: (params?: { page?: number; page_size?: number }) =>
      ["categories", "list", params] as const,
    detail: (id: number) => ["categories", "detail", id] as const,
  },
  products: {
    all: () => ["products", "all"] as const,
    list: (params?: { page?: number; page_size?: number }) =>
      ["products", "list", params] as const,
    search: (params?: { name?: string; sku?: string; category_id?: number }) =>
      ["products", "search", params] as const,
    lowStock: () => ["products", "low-stock"] as const,
    detail: (id: number) => ["products", "detail", id] as const,
  },
  stock: {
    detail: (productId: number) => ["stock", productId] as const,
  },
  transactions: {
    byProduct: (productId: number) => ["transactions", productId] as const,
  },
} as const;
