/**
 * Centralized registry of all API endpoints exposed by the StockSense backend.
 *
 * Rules:
 * - Endpoints must always start with a leading slash `/`.
 * - No hardcoded paths inside components or query hooks; reference this single source of truth.
 */
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",
  },
  products: {
    root: "/products",
    search: "/products/search",
    lowStock: "/products/low-stock",
    byId: (id: number | string) => `/products/${id}`,
  },
  categories: {
    root: "/categories",
    byId: (id: number | string) => `/categories/${id}`,
  },
  stock: {
    byId: (productId: number | string) => `/stock/${productId}`,
    adjust: (productId: number | string) => `/stock/${productId}/adjust`,
    byProductWarehouses: (productId: number | string) => `/stock/${productId}/warehouses`,
  },
  transactions: {
    root: "/transactions",
    byProduct: (productId: number | string) => `/transactions/${productId}`,
  },
  warehouses: {
    root: "/warehouses",
    seedDemo: "/warehouses/seed-demo",
    smartRoute: "/warehouses/smart-route",
    fulfillDispatch: "/warehouses/fulfill-dispatch",
  },
  batches: {
    root: "/batches",
  },
  alerts: {
    testEmail: "/alerts/test-email",
  },
} as const;
