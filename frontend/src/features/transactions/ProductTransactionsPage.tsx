import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Filter,
  Package,
  Plus,
  RefreshCcw,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/useAuth";
import { useCategoryMap } from "@/features/products/useProducts";
import { useProductDetail, useProductStock } from "@/features/stock/useStock";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import type { TransactionRead } from "@/types/api";
import { TransactionType } from "@/types/enums";
import { TransactionFormDialog } from "./TransactionFormDialog";
import { useProductTransactions } from "./useTransactions";

function TransactionBadge({ type }: { type: TransactionType }) {
  switch (type) {
    case TransactionType.INBOUND:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          <ArrowDownLeft className="h-3 w-3" aria-hidden="true" />
          Inbound
        </span>
      );
    case TransactionType.OUTBOUND:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          Outbound
        </span>
      );
    case TransactionType.RETURN:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#166534] dark:bg-emerald-950/40 dark:text-emerald-400">
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Return
        </span>
      );
    case TransactionType.ADJUSTMENT:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
          <RefreshCcw className="h-3 w-3" aria-hidden="true" />
          Adjustment
        </span>
      );
    default:
      return (
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {type}
        </span>
      );
  }
}

function QuantityEffect({
  type,
  quantity,
}: {
  type: TransactionType;
  quantity: number;
}) {
  if (type === TransactionType.INBOUND || type === TransactionType.RETURN) {
    return (
      <span className="font-semibold tabular-nums text-foreground">
        +{formatNumber(quantity)}
      </span>
    );
  }
  if (type === TransactionType.OUTBOUND) {
    return (
      <span className="font-semibold tabular-nums text-warning">
        -{formatNumber(quantity)}
      </span>
    );
  }
  return (
    <span className="font-semibold tabular-nums text-foreground">
      ={formatNumber(quantity)}
    </span>
  );
}

export default function ProductTransactionsPage() {
  const { productId } = useParams<{ productId: string }>();
  const numId = Number(productId);
  const isValidId = !isNaN(numId) && numId > 0;

  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const productQuery = useProductDetail(isValidId ? numId : null);
  const stockQuery = useProductStock(isValidId ? numId : null);
  const transactionsQuery = useProductTransactions(isValidId ? numId : 0);
  const categoryMapQuery = useCategoryMap();

  const product = productQuery.data;
  const currentStock = stockQuery.data?.quantity_on_hand;

  // Filter and sort transactions descending by date
  const filteredTransactions = useMemo(() => {
    const list = transactionsQuery.data ?? [];
    const sorted = [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (typeFilter === "all") return sorted;
    return sorted.filter((tx) => tx.transaction_type === typeFilter);
  }, [transactionsQuery.data, typeFilter]);

  if (!isValidId) {
    return (
      <div>
        <PageHeader
          title="Product Audit Trail"
          subtitle="Transaction history and stock movement records"
        />
        <EmptyState
          icon={<Package className="h-6 w-6" aria-hidden="true" />}
          title="Invalid product selected"
          description="Please choose a product from the catalogue to inspect its transaction history."
          action={
            <Button asChild>
              <Link to="/products">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/products">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to products
          </Link>
        </Button>
      </div>

      <PageHeader
        title={product ? `${product.name} — Audit Trail` : `Product #${numId} — Audit Trail`}
        subtitle="Complete chronological transaction log and stock movements for this item"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to={`/stock-adjustment?productId=${numId}`}>
                <SlidersHorizontal aria-hidden="true" />
                Adjust stock
              </Link>
            </Button>
            {canManage && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus aria-hidden="true" />
                Record transaction
              </Button>
            )}
          </div>
        }
      />

      {/* Product Summary Header Card */}
      <div className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {product ? product.name : <Skeleton className="h-6 w-48 inline-block" />}
              </h2>
              {product && (
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                  {product.sku}
                </code>
              )}
              {product && (
                <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {categoryMapQuery.data?.get(product.category_id) ??
                    `Category #${product.category_id}`}
                </span>
              )}
            </div>
            {product?.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Unit price</span>
              <p className="font-semibold tabular-nums text-foreground">
                {product ? formatCurrency(product.unit_price) : "—"}
              </p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Reorder level</span>
              <p className="font-semibold tabular-nums text-foreground">
                {product ? formatNumber(product.reorder_level) : "—"}
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/40 px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Current on hand</span>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {stockQuery.isPending ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  formatNumber(currentStock ?? 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">Filter by type:</span>
          <NativeSelect
            id="tx-type-filter"
            aria-label="Filter by type"
            className="h-8 w-44"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All movements ({transactionsQuery.data?.length ?? 0})</option>
            <option value={TransactionType.INBOUND}>Inbound (Receipts)</option>
            <option value={TransactionType.OUTBOUND}>Outbound (Fulfillments)</option>
            <option value={TransactionType.RETURN}>Returns</option>
            <option value={TransactionType.ADJUSTMENT}>Adjustments</option>
          </NativeSelect>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {formatNumber(filteredTransactions.length)} transaction
          {filteredTransactions.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Audit Trail Table */}
      {transactionsQuery.isPending ? (
        <TableSkeleton rowCount={6} colCount={7} />
      ) : transactionsQuery.isError ? (
        <ErrorState
          title="Could not load audit transactions"
          description="The transactions request failed. Check your connection and try again."
          onRetry={() => {
            void transactionsQuery.refetch();
          }}
        />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-6 w-6" aria-hidden="true" />}
          title={
            typeFilter === "all"
              ? "No transactions recorded yet"
              : `No ${typeFilter} transactions found`
          }
          description={
            typeFilter === "all"
              ? "Stock movements, supplier receipts, and adjustments for this product will appear here."
              : "Try switching the filter back to 'All movements' to see other transactions."
          }
          action={
            typeFilter !== "all" ? (
              <Button variant="outline" onClick={() => setTypeFilter("all")}>
                Show all movements
              </Button>
            ) : canManage ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus aria-hidden="true" />
                Record first transaction
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="w-16 px-4 py-3" scope="col">
                  ID
                </th>
                <th className="w-48 px-4 py-3" scope="col">
                  Date & Time
                </th>
                <th className="w-32 px-4 py-3" scope="col">
                  Type
                </th>
                <th className="w-28 px-4 py-3 text-right" scope="col">
                  Quantity
                </th>
                <th className="w-36 px-4 py-3" scope="col">
                  Reference doc
                </th>
                <th className="px-4 py-3" scope="col">
                  Notes / Reason
                </th>
                <th className="w-32 px-4 py-3" scope="col">
                  Recorded by
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx: TransactionRead) => (
                <tr
                  key={tx.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    #{tx.id}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatDateTime(tx.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <TransactionBadge type={tx.transaction_type} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <QuantityEffect
                      type={tx.transaction_type}
                      quantity={tx.quantity}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {tx.reference_doc ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                        {tx.reference_doc}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="max-w-[20rem] px-4 py-3 text-muted-foreground">
                    {tx.notes ? (
                      <span className="line-clamp-2 text-foreground">
                        {tx.notes}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tx.created_by ? (
                      <span className="font-medium text-foreground">
                        {tx.created_by}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Transaction Dialog */}
      {isValidId && (
        <TransactionFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          productId={numId}
          productName={product?.name ?? `Product #${numId}`}
          currentStock={currentStock}
        />
      )}
    </div>
  );
}
