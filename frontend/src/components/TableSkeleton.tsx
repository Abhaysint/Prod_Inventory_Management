import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rowCount?: number;
  colCount?: number;
  className?: string;
}

export function TableSkeleton({
  rowCount = 5,
  colCount = 5,
  className,
}: TableSkeletonProps) {
  const columns = Array.from({ length: colCount });
  const rows = Array.from({ length: rowCount });

  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-full space-y-3 rounded-lg border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-center gap-4 border-b border-border pb-3">
        {columns.map((_, colIndex) => (
          <Skeleton key={`head-${colIndex}`} className="h-4 flex-1" />
        ))}
      </div>
      {rows.map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex items-center gap-4 py-1">
          {columns.map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn("h-4 flex-1", colIndex === 0 && "h-5")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
