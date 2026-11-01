import { Warehouse, Calendar, AlertTriangle, CheckCircle, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useProductWarehouseStock } from "@/features/dispatch/useDispatch";
import { formatDate } from "@/lib/format";
import type { ProductRead } from "@/types/api";

interface WarehouseBatchesDialogProps {
  product: ProductRead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WarehouseBatchesDialog({
  product,
  open,
  onOpenChange,
}: WarehouseBatchesDialogProps) {
  const { data: summaries = [], isLoading, isError } = useProductWarehouseStock(
    product?.id ?? 0,
    open && !!product
  );

  const totalStockAcrossWarehouses = summaries.reduce(
    (sum, wh) => sum + wh.total_quantity,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Warehouse className="h-5 w-5" aria-hidden="true" />
            <DialogTitle>Warehouse Stock & Batch Expiry</DialogTitle>
          </div>
          <DialogDescription>
            Live stock distribution and batch tracking for{" "}
            <span className="font-semibold text-foreground">
              {product?.name}
            </span>{" "}
            (SKU:{" "}
            <span className="font-mono text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">
              {product?.sku}
            </span>
            ).
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            Loading warehouse locations and batches...
          </div>
        ) : isError ? (
          <div className="py-6 text-center text-sm text-destructive">
            Failed to load warehouse data. Please try again.
          </div>
        ) : summaries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No warehouses registered in the system yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Total Multi-Warehouse Stock:
              </span>
              <span className="font-semibold text-foreground">
                {totalStockAcrossWarehouses} units
              </span>
            </div>

            <div className="space-y-3">
              {summaries.map((wh) => (
                <div
                  key={wh.warehouse_id}
                  className="rounded-lg border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">
                        {wh.warehouse_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {wh.city} • Code: {wh.warehouse_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {wh.total_quantity} units
                      </span>
                    </div>
                  </div>

                  {wh.batches.length === 0 ? (
                    <p className="pt-3 text-xs text-muted-foreground italic">
                      No inventory batches assigned to this warehouse.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Batches (Sorted by Expiry / FEFO)
                      </p>
                      <div className="divide-y divide-border/40 rounded-md border border-border/60 bg-background/50">
                        {wh.batches.map((batch) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const expDate = new Date(batch.expiry_date);
                          const diffTime = expDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(
                            diffTime / (1000 * 60 * 60 * 24)
                          );

                          const isExpired = diffDays < 0;
                          const isExpiringSoon = !isExpired && diffDays <= 30;

                          return (
                            <div
                              key={batch.id}
                              className="flex items-center justify-between px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-mono font-medium text-foreground">
                                  {batch.batch_number}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-foreground">
                                  {batch.quantity} units
                                </span>
                                <div className="flex items-center gap-1.5 min-w-[120px] justify-end">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {formatDate(batch.expiry_date)}
                                  </span>
                                  {isExpired ? (
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
                                      title="Expired batch"
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      Expired
                                    </span>
                                  ) : isExpiringSoon ? (
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400"
                                      title={`Expiring in ${diffDays} days`}
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      {diffDays}d
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
                                      title="Healthy stock"
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                      Healthy
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

