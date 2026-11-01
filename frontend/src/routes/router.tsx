import { Suspense, lazy } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { RouteFallback } from "@/components/RouteFallback";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const AppShell = lazy(() => import("@/layouts/AppShell"));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const ProductsPage = lazy(() => import("@/features/products/ProductsPage"));
const CategoriesPage = lazy(() => import("@/features/categories/CategoriesPage"));
const StockAdjustmentPage = lazy(
  () => import("@/features/stock/StockAdjustmentPage")
);
const ProductTransactionsPage = lazy(
  () => import("@/features/transactions/ProductTransactionsPage")
);
const DispatchPage = lazy(() => import("@/features/dispatch/DispatchPage"));

const pageFallback = <RouteFallback />;

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={pageFallback}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: (
          <Suspense fallback={pageFallback}>
            <AppShell />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={pageFallback}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: "products",
            element: (
              <Suspense fallback={pageFallback}>
                <ProductsPage />
              </Suspense>
            ),
          },
          {
            path: "categories",
            element: (
              <Suspense fallback={pageFallback}>
                <CategoriesPage />
              </Suspense>
            ),
          },
          {
            path: "stock-adjustment",
            element: (
              <Suspense fallback={pageFallback}>
                <StockAdjustmentPage />
              </Suspense>
            ),
          },
          {
            path: "transactions/:productId",
            element: (
              <Suspense fallback={pageFallback}>
                <ProductTransactionsPage />
              </Suspense>
            ),
          },
          {
            path: "dispatch",
            element: (
              <Suspense fallback={pageFallback}>
                <DispatchPage />
              </Suspense>
            ),
          },
          {
            path: "*",
            element: <Navigate to="/" replace />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
