import type { UseQueryResult } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import type { StockRead } from "@/types/api";

interface StockCellProps {
  query: UseQueryResult<StockRead, Error> | undefined;
  reorderLevel: number;
}

/**
 * One stock cell for one visible product row. Renders a per-cell skeleton
 * while that product's stock query is in flight, so the table never blocks
 * on the slowest join in the page.
 */
export function StockCell({ query, reorderLevel }: StockCellProps) {
  if (!query || query.isPending) {
    return (
      <Skeleton
        className="ml-auto block h-5 w-12"
        aria-label="Loading stock quantity"
      />
    );
  }

  if (query.isError) {
    return (
      <span className="text-muted-foreground" title="Stock unavailable">
        —
      </span>
    );
  }

  const quantity = query.data.quantity_on_hand;
  const isLowStock = quantity <= reorderLevel;

  if (isLowStock) {
    return (
      <span
        className="ml-auto inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning"
        title={`At or below reorder level of ${formatNumber(reorderLevel)}`}
      >
        {formatNumber(quantity)}
        <span className="font-medium uppercase tracking-wide">Low</span>
      </span>
    );
  }

  return (
    <span className="ml-auto block tabular-nums text-foreground">
      {formatNumber(quantity)}
    </span>
  );
}
