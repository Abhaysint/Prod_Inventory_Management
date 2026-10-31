import {
  AlertTriangle,
  FolderTree,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { LowStockAlert } from "./LowStockAlert";
import {
  useLowStockProducts,
  useTotalCategoriesCount,
  useTotalProductsCount,
} from "./useDashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const productsCountQuery = useTotalProductsCount();
  const categoriesCountQuery = useTotalCategoriesCount();
  const lowStockQuery = useLowStockProducts();

  const lowStockCount = lowStockQuery.data?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Inventory overview at a glance"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/products">
                <Package aria-hidden="true" />
                Browse products
              </Link>
            </Button>
            {canManage && (
              <Button asChild>
                <Link to="/stock-adjustment">
                  <SlidersHorizontal aria-hidden="true" />
                  Adjust stock
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <section
        aria-label="Key inventory metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <StatCard
          label="Active products"
          value={productsCountQuery.data}
          description="Products currently in the catalogue"
          icon={<Package className="h-4 w-4" aria-hidden="true" />}
          isPending={productsCountQuery.isPending}
          isError={productsCountQuery.isError}
          href="/products"
        />

        <StatCard
          label="Categories"
          value={categoriesCountQuery.data}
          description="Product groupings"
          icon={<FolderTree className="h-4 w-4" aria-hidden="true" />}
          isPending={categoriesCountQuery.isPending}
          isError={categoriesCountQuery.isError}
          href="/categories"
        />

        <StatCard
          label="Low-stock items"
          value={lowStockQuery.data?.length}
          description={
            lowStockCount > 0
              ? "At or below reorder level"
              : "All items above threshold"
          }
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          isPending={lowStockQuery.isPending}
          isError={lowStockQuery.isError}
          tone={lowStockCount > 0 ? "warning" : "default"}
        />
      </section>

      <LowStockAlert
        items={lowStockQuery.data}
        isPending={lowStockQuery.isPending}
        isError={lowStockQuery.isError}
        onRetry={() => {
          void lowStockQuery.refetch();
          void productsCountQuery.refetch();
          void categoriesCountQuery.refetch();
        }}
        canManage={canManage}
      />
    </div>
  );
}
