import { useMemo } from "react";
import { ArrowLeftRight, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { LowStockRead } from "@/types/api";

interface LowStockAlertProps {
  items: LowStockRead[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  canManage: boolean;
}

export function LowStockAlert({
  items,
  isPending,
  isError,
  onRetry,
  canManage,
}: LowStockAlertProps) {
  // Prioritize out-of-stock and largest shortage items at the top of the table.
  const sortedItems = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      if (a.quantity_on_hand === 0 && b.quantity_on_hand !== 0) return -1;
      if (b.quantity_on_hand === 0 && a.quantity_on_hand !== 0) return 1;
      return b.shortage - a.shortage;
    });
  }, [items]);

  return (
    <section aria-labelledby="low-stock-heading" className="mt-8">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="low-stock-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Low-stock alerts
            </h2>
            {!isPending && !isError && sortedItems.length > 0 && (
              <span className="inline-flex items-center rounded-md bg-[#fef3c7] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#92400e] dark:bg-warning/15 dark:text-warning">
                {formatNumber(sortedItems.length)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Active products where quantity on hand is at or below the reorder
            level
          </p>
        </div>
      </div>

      {isPending ? (
        <TableSkeleton rowCount={5} colCount={6} />
      ) : isError ? (
        <ErrorState
          title="Could not load low-stock alerts"
          description="The low-stock request failed. Check your connection and try again."
          onRetry={onRetry}
        />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
          title="All stock levels are healthy"
          description="Every active product is currently stocked above its reorder threshold."
          action={
            <Button asChild variant="outline">
              <Link to="/products">View products</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3" scope="col">
                  Product
                </th>
                <th className="px-4 py-3" scope="col">
                  SKU
                </th>
                <th className="px-4 py-3 text-right" scope="col">
                  On hand
                </th>
                <th className="px-4 py-3 text-right" scope="col">
                  Reorder level
                </th>
                <th className="px-4 py-3 text-right" scope="col">
                  Shortage
                </th>
                <th className="px-4 py-3 text-right" scope="col">
                  <span className="sr-only">Actions</span>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => {
                const isOut = item.quantity_on_hand === 0;
                return (
                  <tr
                    key={item.product_id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="max-w-[18rem] px-4 py-3">
                      <div className="truncate font-medium text-foreground">
                        {item.product_name}
                      </div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        ID #{item.product_id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {item.sku}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          isOut
                            ? "inline-flex items-center gap-1.5 rounded-md bg-[#fee2e2] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#991b1b] dark:bg-destructive/15 dark:text-destructive"
                            : "inline-flex items-center gap-1.5 rounded-md bg-[#fef3c7] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#92400e] dark:bg-warning/15 dark:text-warning"
                        }
                      >
                        {formatNumber(item.quantity_on_hand)}
                        <span className="font-medium">
                          {isOut ? "Out" : "Low"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatNumber(item.reorder_level)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.shortage > 0 ? (
                        <span className="font-medium text-foreground">
                          {formatNumber(item.shortage)} below
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          At threshold
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              to={`/stock-adjustment?productId=${item.product_id}`}
                              aria-label={`Adjust stock for ${item.product_name}`}
                            >
                              <SlidersHorizontal aria-hidden="true" />
                              Adjust stock
                            </Link>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            to={`/transactions/${item.product_id}`}
                            aria-label={`View transactions for ${item.product_name}`}
                          >
                            <ArrowLeftRight aria-hidden="true" />
                            History
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

