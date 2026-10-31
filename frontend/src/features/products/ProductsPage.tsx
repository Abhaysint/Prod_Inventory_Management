import { useEffect, useMemo, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Ban, Package, Pencil, Plus, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "@/components/ui/use-toast";
import { normalizeApiError } from "@/lib/errors";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PAGE_SIZE_OPTIONS, useUrlPagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/features/auth/useAuth";
import type { ProductRead, StockRead } from "@/types/api";
import { ProductFormDialog } from "./ProductFormDialog";
import { StockCell } from "./StockCell";
import {
  useCategoryList,
  useCategoryMap,
  useDeactivateProduct,
  usePageStock,
  useProductList,
} from "./useProducts";

export default function ProductsPage() {
  const { user } = useAuth();
  // Role gating is UX only — the backend enforces admin/manager on POST/PUT.
  const canManage = user?.role === "admin" || user?.role === "manager";

  const { page, pageSize, setPage, setPageSize } = useUrlPagination();

  const [nameFilter, setNameFilter] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const debouncedName = useDebounce(nameFilter, 350);
  const debouncedSku = useDebounce(skuFilter, 350);
  const categoryId = categoryFilter === "" ? null : Number(categoryFilter);

  const filters = useMemo(
    () => ({ name: debouncedName, sku: debouncedSku, categoryId }),
    [debouncedName, debouncedSku, categoryId]
  );

  const isFirstFilterChange = useRef(true);
  useEffect(() => {
    // Changing any filter always jumps back to page 1 of the (hidden) list.
    // Skipped on mount so a shared ?page=2 link still works.
    if (isFirstFilterChange.current) {
      isFirstFilterChange.current = false;
      return;
    }
    setPage(1);
  }, [debouncedName, debouncedSku, categoryId, setPage]);

  const { data, isPending, isError, refetch, isSearching } = useProductList(
    page,
    pageSize,
    filters
  );

  const categoriesQuery = useCategoryList();
  const categoryMapQuery = useCategoryMap();
  const categoryMap = categoryMapQuery.data;

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;

  // Section 3.8 item 1: fan out stock queries over ONLY this page's ids.
  const productIds = useMemo(() => items.map((p) => p.id), [items]);
  const stockQueries = usePageStock(productIds);
  const stockByProductId = useMemo(() => {
    const map = new Map<number, UseQueryResult<StockRead, Error>>();
    productIds.forEach((id, index) => {
      const query = stockQueries[index];
      if (query) map.set(id, query);
    });
    return map;
  }, [productIds, stockQueries]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<ProductRead | null>(null);
  const [deactivating, setDeactivating] = useState<ProductRead | null>(null);

  const deactivateMutation = useDeactivateProduct();

  const openCreate = () => {
    setDialogMode("create");
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: ProductRead) => {
    setDialogMode("edit");
    setEditing(product);
    setDialogOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!deactivating) return;
    try {
      await deactivateMutation.mutateAsync(deactivating.id);
      setDeactivating(null);
    } catch (error) {
      // The ConfirmDialog stays open; the toast renders above it.
      toast({
        title: "Could not deactivate product",
        description: normalizeApiError(error).message,
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setNameFilter("");
    setSkuFilter("");
    setCategoryFilter("");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage products, pricing and reorder levels"
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              Add product
            </Button>
          ) : undefined
        }
      />

      {/* Search + filters */}
      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="filter-name">Name</Label>
            <Input
              id="filter-name"
              placeholder="Search by name"
              autoComplete="off"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filter-sku">SKU</Label>
            <Input
              id="filter-sku"
              placeholder="Search by SKU"
              autoComplete="off"
              value={skuFilter}
              onChange={(e) => setSkuFilter(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filter-category">Category</Label>
            <NativeSelect
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex items-end gap-2">
            {isSearching && (
              <Button variant="outline" onClick={clearFilters}>
                <X aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {isPending ? (
        <TableSkeleton rowCount={Math.min(pageSize, 8)} colCount={7} />
      ) : isError ? (
        <ErrorState
          title="Could not load products"
          description="The products request failed. Check your connection and try again."
          onRetry={refetch}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" aria-hidden="true" />}
          title={isSearching ? "No products match your filters" : "No products yet"}
          description={
            isSearching
              ? "Try a different name, SKU or category — or clear the filters."
              : "Create your first product to start tracking inventory."
          }
          action={
            isSearching ? (
              <Button variant="outline" onClick={clearFilters}>
                <X aria-hidden="true" />
                Clear filters
              </Button>
            ) : canManage ? (
              <Button onClick={openCreate}>
                <Plus aria-hidden="true" />
                Add product
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3" scope="col">
                    ID
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Name
                  </th>
                  <th className="px-4 py-3" scope="col">
                    SKU
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right" scope="col">
                    Unit price
                  </th>
                  <th className="px-4 py-3 text-right" scope="col">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-right" scope="col">
                    <span className="sr-only">Actions</span>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => {
                  const stockQuery = stockByProductId.get(product.id);
                  const quantity = stockQuery?.data?.quantity_on_hand;
                  const isLowStock =
                    quantity !== undefined &&
                    quantity <= product.reorder_level;
                  return (
                    <tr
                      key={product.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {product.id}
                      </td>
                      <td className="max-w-[16rem] px-4 py-3">
                        <div className="truncate font-medium text-foreground">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="truncate text-xs text-muted-foreground">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {product.sku}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {categoryMapQuery.isPending ? (
                          <span
                            className="inline-block h-4 w-20 animate-pulse rounded bg-muted"
                            aria-label="Loading category"
                          />
                        ) : (
                          categoryMap?.get(product.category_id) ??
                          `Category #${product.category_id}`
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(product.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex justify-end"
                          aria-busy={stockQuery?.isPending ? true : undefined}
                        >
                          <StockCell
                            query={stockQuery}
                            reorderLevel={product.reorder_level}
                          />
                          {isLowStock && (
                            <span className="sr-only">
                              Low stock: at or below reorder level of{" "}
                              {formatNumber(product.reorder_level)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${product.name}`}
                              onClick={() => openEdit(product)}
                            >
                              <Pencil aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              aria-label={`Deactivate ${product.name}`}
                              onClick={() => setDeactivating(product)}
                            >
                              <Ban aria-hidden="true" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination is HIDDEN entirely while any search filter is active
              (Section 3.8 item 4) — /products/search returns a bare array. */}
          {!isSearching && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {formatNumber(rangeStart)}–{formatNumber(rangeEnd)} of{" "}
                {formatNumber(total)} products
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="page-size" className="sr-only">
                  Rows per page
                </Label>
                <NativeSelect
                  id="page-size"
                  className="h-8 w-24"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        product={editing ?? undefined}
        categories={(categoriesQuery.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
        }))}
      />

      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        title={`Deactivate ${deactivating?.name ?? "product"}?`}
        description="This cannot be undone from this interface. The product will disappear from the products list and can no longer receive stock adjustments or new transactions."
        confirmLabel="Deactivate product"
        destructive
        onConfirm={() => {
          void confirmDeactivate();
        }}
      />
    </div>
  );
}
