import { useState } from "react";
import { FolderTree, Plus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useAuth } from "@/features/auth/useAuth";
import { PAGE_SIZE_OPTIONS, useUrlPagination } from "@/hooks/usePagination";
import { formatDate, formatNumber } from "@/lib/format";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { usePaginatedCategories } from "./useCategories";

export default function CategoriesPage() {
  const { user } = useAuth();
  // Role gating is UX only — the backend enforces admin/manager on POST /categories.
  const canManage = user?.role === "admin" || user?.role === "manager";

  const { page, pageSize, setPage, setPageSize } = useUrlPagination();
  const { data, isPending, isError, refetch } = usePaginatedCategories(
    page,
    pageSize
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize products into categories"
        actions={
          canManage ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus aria-hidden="true" />
              Add category
            </Button>
          ) : undefined
        }
      />

      {isPending ? (
        <TableSkeleton rowCount={Math.min(pageSize, 8)} colCount={4} />
      ) : isError ? (
        <ErrorState
          title="Could not load categories"
          description="The categories request failed. Check your connection and try again."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-6 w-6" aria-hidden="true" />}
          title="No categories yet"
          description="Create your first category before adding products to the catalogue."
          action={
            canManage ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus aria-hidden="true" />
                Add category
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="w-20 px-4 py-3" scope="col">
                    ID
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Name
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Description
                  </th>
                  <th className="w-40 px-4 py-3 text-right" scope="col">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {category.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {category.name}
                    </td>
                    <td className="max-w-[28rem] px-4 py-3 text-muted-foreground">
                      {category.description ? (
                        <span className="line-clamp-2">
                          {category.description}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatDate(category.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {formatNumber(rangeStart)}–{formatNumber(rangeEnd)} of{" "}
              {formatNumber(total)} categories
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="categories-page-size" className="sr-only">
                Rows per page
              </Label>
              <NativeSelect
                id="categories-page-size"
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
              <span className="text-sm tabular-nums text-muted-foreground">
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
        </>
      )}

      <CategoryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
