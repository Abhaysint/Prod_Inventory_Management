import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Package,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/useAuth";
import { useCategoryMap } from "@/features/products/useProducts";
import { normalizeApiError } from "@/lib/errors";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import {
  stockAdjustmentSchema,
  type StockAdjustmentValues,
} from "./stockAdjustmentSchema";
import {
  useActiveProductsList,
  useAdjustStock,
  useProductDetail,
  useProductStock,
} from "./useStock";

const REASON_PRESETS = [
  "Physical count discrepancy",
  "Damaged goods write-off",
  "Supplier shipment reconciliation",
  "Returned item restock",
  "Routine inventory audit",
];

export default function StockAdjustmentPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [searchParams, setSearchParams] = useSearchParams();
  const initialProductId = searchParams.get("productId") || "";

  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    initialProductId ? Number(initialProductId) : null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastAdjustedId, setLastAdjustedId] = useState<number | null>(null);

  const productsQuery = useActiveProductsList();
  const categoryMapQuery = useCategoryMap();
  const stockQuery = useProductStock(selectedProductId);
  const singleProductQuery = useProductDetail(selectedProductId);
  const adjustMutation = useAdjustStock();

  // Combine products list with single product fallback (in case product is beyond first 100)
  const availableProducts = useMemo(() => {
    const list = productsQuery.data ?? [];
    if (
      singleProductQuery.data &&
      !list.some((p) => p.id === singleProductQuery.data.id)
    ) {
      return [singleProductQuery.data, ...list];
    }
    return list;
  }, [productsQuery.data, singleProductQuery.data]);

  const selectedProduct = useMemo(
    () => availableProducts.find((p) => p.id === selectedProductId) ?? null,
    [availableProducts, selectedProductId]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      productId: initialProductId,
      new_quantity: "",
      reason: "",
    },
  });

  const watchedNewQuantity = watch("new_quantity");
  const watchedProductId = watch("productId");

  // Keep state and URL parameter in sync when picker changes
  const handleProductChange = (newIdStr: string) => {
    const numId = newIdStr ? Number(newIdStr) : null;
    setSelectedProductId(numId);
    setValue("productId", newIdStr, { shouldValidate: true });
    setSubmitError(null);
    if (numId) {
      setSearchParams({ productId: String(numId) });
    } else {
      setSearchParams({});
    }
  };

  // Sync if URL query parameter changes externally
  useEffect(() => {
    const paramId = searchParams.get("productId") || "";
    if (paramId && Number(paramId) !== selectedProductId) {
      const num = Number(paramId);
      setSelectedProductId(num);
      setValue("productId", paramId, { shouldValidate: true });
    }
  }, [searchParams, selectedProductId, setValue]);

  // Compute live stock delta
  const currentOnHand = stockQuery.data?.quantity_on_hand;
  const delta = useMemo(() => {
    if (
      currentOnHand === undefined ||
      watchedNewQuantity === "" ||
      isNaN(Number(watchedNewQuantity))
    ) {
      return null;
    }
    return Number(watchedNewQuantity) - currentOnHand;
  }, [currentOnHand, watchedNewQuantity]);

  const onSubmit = async (values: StockAdjustmentValues) => {
    setSubmitError(null);
    const prodId = Number(values.productId);
    const newQty = Number(values.new_quantity);

    try {
      await adjustMutation.mutateAsync({
        productId: prodId,
        body: {
          new_quantity: newQty,
          reason: values.reason.trim(),
        },
      });

      setLastAdjustedId(prodId);
      // Reset only new_quantity and reason, keeping the selected product
      setValue("new_quantity", "");
      setValue("reason", "");
    } catch (error) {
      const normalized = normalizeApiError(error);
      setSubmitError(normalized.message);
    }
  };

  const isBusy = adjustMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Stock Adjustment"
        subtitle="Reconcile physical counts and set exact on-hand inventory levels"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/products">
                <Package aria-hidden="true" />
                Products catalogue
              </Link>
            </Button>
            {selectedProductId && (
              <Button asChild variant="ghost">
                <Link
                  to={`/transactions/${selectedProductId}`}
                  aria-label="View transaction history for this product"
                >
                  <ArrowLeftRight aria-hidden="true" />
                  Audit history
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Role permission warning for viewer users */}
      {!canManage && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm"
        >
          <HelpCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-foreground">Read-only role access</p>
            <p className="mt-0.5 text-muted-foreground">
              Your account has the <span className="font-semibold">{user?.role}</span> role.
              Stock adjustments modify live audit trails and require manager or administrator privileges.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Adjustment Form Card */}
        <div className="lg:col-span-7">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Inventory adjustment form</CardTitle>
              <CardDescription>
                Submitting updates quantity on hand and auto-records an adjustment transaction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {/* 1. Product Picker */}
                <div className="space-y-2">
                  <Label htmlFor="adjustment-product" className="flex items-center gap-1.5">
                    Select product
                    <span className="text-destructive">*</span>
                  </Label>
                  <NativeSelect
                    id="adjustment-product"
                    value={watchedProductId}
                    disabled={isBusy}
                    aria-invalid={errors.productId ? true : undefined}
                    onChange={(e) => handleProductChange(e.target.value)}
                  >
                    <option value="">Choose a product from catalogue…</option>
                    {availableProducts.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku})
                      </option>
                    ))}
                  </NativeSelect>
                  {errors.productId && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.productId.message}
                    </p>
                  )}
                </div>

                {/* 2. New Quantity & Computed Live Delta */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adjustment-new-quantity" className="flex items-center gap-1.5">
                      New on-hand quantity
                      <span className="text-destructive">*</span>
                    </Label>
                    {currentOnHand !== undefined && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        Current: <strong className="text-foreground">{formatNumber(currentOnHand)}</strong>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Input
                        id="adjustment-new-quantity"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="e.g. 50"
                        disabled={isBusy || !selectedProductId}
                        aria-invalid={errors.new_quantity ? true : undefined}
                        {...register("new_quantity")}
                      />
                      {errors.new_quantity && (
                        <p className="mt-1 text-sm text-destructive" role="alert">
                          {errors.new_quantity.message}
                        </p>
                      )}
                    </div>

                    {/* Live Delta Badge Card */}
                    <div
                      className={`flex h-9 items-center justify-between rounded-md border px-3 text-sm transition-colors ${
                        delta === null
                          ? "border-border bg-muted/40 text-muted-foreground"
                          : delta > 0
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : delta < 0
                          ? "border-warning/40 bg-warning/10 text-warning"
                          : "border-border bg-muted/50 text-foreground"
                      }`}
                      aria-live="polite"
                    >
                      <span className="text-xs font-medium">Calculated delta:</span>
                      {delta === null ? (
                        <span className="text-xs">—</span>
                      ) : delta > 0 ? (
                        <span className="flex items-center gap-1 font-semibold tabular-nums">
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          +{formatNumber(delta)}
                        </span>
                      ) : delta < 0 ? (
                        <span className="flex items-center gap-1 font-semibold tabular-nums">
                          <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                          {formatNumber(delta)}
                        </span>
                      ) : (
                        <span className="font-semibold tabular-nums">0 (no change)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Reason Field (Required per Section 7 of AGENTS.md) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adjustment-reason" className="flex items-center gap-1.5">
                      Adjustment reason
                      <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">Required for audit trail</span>
                  </div>

                  <Textarea
                    id="adjustment-reason"
                    rows={3}
                    placeholder="Provide a specific justification for this stock level correction…"
                    disabled={isBusy || !selectedProductId}
                    aria-invalid={errors.reason ? true : undefined}
                    {...register("reason")}
                  />
                  {errors.reason && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.reason.message}
                    </p>
                  )}

                  {/* Preset Quick Fill Pills */}
                  <div className="pt-1">
                    <p className="mb-1.5 text-xs text-muted-foreground">Quick presets:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REASON_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled={isBusy || !selectedProductId}
                          onClick={() => setValue("reason", preset, { shouldValidate: true })}
                          className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit & Reset Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBusy || (!watchedNewQuantity && !selectedProductId)}
                    onClick={() => {
                      reset();
                      setSelectedProductId(null);
                      setSearchParams({});
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset form
                  </Button>

                  <Button type="submit" disabled={isBusy || !canManage || !selectedProductId}>
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    )}
                    {isBusy ? "Applying adjustment…" : "Apply stock adjustment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Selected Product Summary & Live Inventory Card */}
        <div className="lg:col-span-5">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Product & live stock status</CardTitle>
              <CardDescription>
                Real-time stock figures recorded on server
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedProduct ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <Package className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
                  <p className="mt-3 font-medium text-foreground">No product selected</p>
                  <p className="mt-1 max-w-xs text-xs">
                    Choose a product from the dropdown selector on the left to inspect its live stock and calculate quantity adjustments.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      Product details
                    </span>
                    <h3 className="text-base font-semibold text-foreground">
                      {selectedProduct.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                        {selectedProduct.sku}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        {categoryMapQuery.data?.get(selectedProduct.category_id) ??
                          `Category #${selectedProduct.category_id}`}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      Current quantity on hand
                    </span>
                    {stockQuery.isPending ? (
                      <Skeleton className="mt-2 h-9 w-24" aria-label="Loading stock level" />
                    ) : stockQuery.isError ? (
                      <p className="mt-1 text-sm text-destructive">Failed to fetch stock</p>
                    ) : (
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                          {formatNumber(stockQuery.data?.quantity_on_hand ?? 0)}
                        </span>
                        <span className="text-xs text-muted-foreground">units in stock</span>

                        {/* Low stock pill */}
                        {stockQuery.data &&
                          stockQuery.data.quantity_on_hand <= selectedProduct.reorder_level && (
                            <span className="ml-auto rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                              Low stock
                            </span>
                          )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-md border border-border p-3">
                      <span className="text-muted-foreground">Reorder threshold</span>
                      <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
                        {formatNumber(selectedProduct.reorder_level)} units
                      </p>
                    </div>

                    <div className="rounded-md border border-border p-3">
                      <span className="text-muted-foreground">Unit price</span>
                      <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(selectedProduct.unit_price)}
                      </p>
                    </div>
                  </div>

                  {stockQuery.data?.last_counted_at && (
                    <p className="text-xs text-muted-foreground">
                      Last counted: {formatDateTime(stockQuery.data.last_counted_at)}
                    </p>
                  )}

                  {/* Audit Trail Shortcut */}
                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/transactions/${selectedProduct.id}`}>
                        <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                        View product transaction history
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post-Adjustment Success Callout */}
          {lastAdjustedId && (
            <div
              role="status"
              className="mt-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium text-foreground">Adjustment recorded server-side</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The stock table and transactions audit trail were automatically updated and query caches invalidated.
                </p>
                <Link
                  to={`/transactions/${lastAdjustedId}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Inspect recorded audit transaction
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
