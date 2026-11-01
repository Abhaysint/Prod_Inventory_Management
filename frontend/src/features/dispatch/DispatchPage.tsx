import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Truck,
  Sparkles,
  Mail,
  Database,
  Plus,
  AlertTriangle,
  Building2,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { normalizeApiError } from "@/lib/errors";
import { useAuth } from "@/features/auth/useAuth";
import { useActiveProductsList } from "@/features/stock/useStock";
import {
  useWarehouses,
  useSeedDemoWarehouses,
  useSmartRouteMutation,
  useFulfillDispatchMutation,
  useTestLowStockEmail,
} from "./useDispatch";
import { RouteRecommendationCard } from "./RouteRecommendationCard";
import { BatchFormDialog } from "./BatchFormDialog";
import type {
  FulfillDispatchResponse,
  RouteCandidate,
  SmartRouteResponse,
} from "@/types/api";

const PRESET_DESTINATIONS = [
  { name: "Atlanta, GA", lat: 33.749, lon: -84.388 },
  { name: "Chicago, IL", lat: 41.8781, lon: -87.6298 },
  { name: "Denver, CO", lat: 39.7392, lon: -104.9903 },
  { name: "Miami, FL", lat: 25.7617, lon: -80.1918 },
  { name: "Seattle, WA", lat: 47.6062, lon: -122.3321 },
  { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074 },
  { name: "Boston, MA", lat: 42.3601, lon: -71.0589 },
  { name: "Austin, TX", lat: 30.2672, lon: -97.7431 },
  { name: "Las Vegas, NV", lat: 36.1699, lon: -115.1398 },
  { name: "Philadelphia, PA", lat: 39.9526, lon: -75.1652 },
] as const;

const dispatchFormSchema = z.object({
  product_id: z.coerce.number().positive("Please select a product"),
  quantity: z.coerce
    .number()
    .int("Must be a whole number")
    .positive("Quantity must be at least 1 unit"),
  destination_index: z.coerce.number().int().min(0, "Please choose a destination"),
  prioritize_expiry: z.boolean(),
});

type DispatchFormValues = z.infer<typeof dispatchFormSchema>;

export default function DispatchPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const { data: products = [] } = useActiveProductsList();
  const {
    data: warehouses = [],
    isLoading: isLoadingWarehouses,
    isError: isWarehousesError,
    error: warehousesError,
    refetch: refetchWarehouses,
  } = useWarehouses();

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [routeResult, setRouteResult] = useState<SmartRouteResponse | null>(null);
  const [lastDispatch, setLastDispatch] =
    useState<FulfillDispatchResponse | null>(null);

  const smartRouteMutation = useSmartRouteMutation();
  const fulfillDispatchMutation = useFulfillDispatchMutation();
  const seedDemoMutation = useSeedDemoWarehouses();
  const testEmailMutation = useTestLowStockEmail();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchFormSchema),
    defaultValues: {
      product_id: 0,
      quantity: 15,
      destination_index: 0,
      prioritize_expiry: true,
    },
  });

  const selectedProductId = Number(watch("product_id"));

  useEffect(() => {
    if (products.length > 0 && (!selectedProductId || selectedProductId === 0)) {
      const demoProd =
        products.find((p) => p.sku === "ALM-MILK-1L") ?? products[0];
      if (demoProd) {
        setValue("product_id", demoProd.id);
      }
    }
  }, [products, selectedProductId, setValue]);

  const onCalculateRoute = async (values: DispatchFormValues) => {
    const dest = PRESET_DESTINATIONS[values.destination_index];
    if (!dest) return;

    try {
      setLastDispatch(null);
      const res = await smartRouteMutation.mutateAsync({
        product_id: values.product_id,
        quantity: values.quantity,
        destination_name: dest.name,
        destination_lat: dest.lat,
        destination_lon: dest.lon,
        prioritize_expiry: values.prioritize_expiry,
      });
      setRouteResult(res);
      toast({
        title: "Smart Route Calculated",
        description: `Analyzed routes to ${dest.name} across ${res.candidates.length} warehouse hubs.`,
      });
    } catch (err) {
      const normalized = normalizeApiError(err);
      toast({
        variant: "destructive",
        title: "Routing Calculation Failed",
        description: normalized.message,
      });
    }
  };

  const onFulfillOrder = async (candidate: RouteCandidate) => {
    if (!routeResult) return;

    try {
      const res = await fulfillDispatchMutation.mutateAsync({
        product_id: routeResult.product_id,
        warehouse_id: candidate.warehouse_id,
        quantity: routeResult.requested_quantity,
        destination_name: routeResult.destination_name,
        notes: `Dispatched to customer in ${routeResult.destination_name}`,
      });

      setLastDispatch(res);

      toast({
        title: "Order Dispatched!",
        description: `Dispatched ${res.dispatched_quantity} units from ${res.warehouse_name}. Remaining total: ${res.remaining_product_stock}`,
      });

      // Clear current route calculation to prompt next order
      setRouteResult(null);
    } catch (err) {
      const normalized = normalizeApiError(err);
      toast({
        variant: "destructive",
        title: "Dispatch Failed",
        description: normalized.message,
      });
    }
  };

  const handleSeedDemo = async () => {
    try {
      const res = await seedDemoMutation.mutateAsync();
      toast({
        title: "Demo Data Ready",
        description: `${res.message} (${res.batches_created} batches generated across ${res.warehouses_count} hubs).`,
      });
    } catch (err) {
      const normalized = normalizeApiError(err);
      toast({
        variant: "destructive",
        title: "Demo Seeding Failed",
        description: normalized.message,
      });
    }
  };

  const handleTestEmail = async () => {
    try {
      const res = await testEmailMutation.mutateAsync();
      toast({
        title: res.sent ? "Email Alert Sent" : "Demo Alert Logged",
        description: res.message,
      });
    } catch (err) {
      const normalized = normalizeApiError(err);
      toast({
        variant: "destructive",
        title: "Email Test Failed",
        description: normalized.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Order Routing & Dispatch"
        subtitle="Calculate optimal warehouse fulfillment based on customer distance, available stock, and FEFO expiry dates."
        actions={
          canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedDemo}
                disabled={seedDemoMutation.isPending}
                className="gap-1.5"
              >
                <Database className="h-4 w-4" />
                {seedDemoMutation.isPending ? "Seeding..." : "Load Demo Hubs & Batches"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={testEmailMutation.isPending}
                className="gap-1.5"
              >
                <Mail className="h-4 w-4" />
                {testEmailMutation.isPending ? "Testing..." : "Test Low-Stock Email"}
              </Button>
              <Button
                size="sm"
                onClick={() => setBatchModalOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Receive Batch
              </Button>
            </div>
          )
        }
      />

      {/* Active Regional Fulfillment Hubs (Loading / Error / Empty / Data states) */}
      {isLoadingWarehouses ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      ) : isWarehousesError ? (
        <ErrorState
          title="Could not load warehouse hubs"
          description={normalizeApiError(warehousesError).message}
          onRetry={() => refetchWarehouses()}
        />
      ) : warehouses.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No regional warehouse hubs configured yet"
          description="Click 'Load Demo Hubs & Batches' to automatically seed 3 regional US fulfillment hubs (East Coast, Central, West Coast) and perishable FEFO inventory batches."
          action={
            canManage ? (
              <Button
                size="sm"
                onClick={handleSeedDemo}
                disabled={seedDemoMutation.isPending}
                className="gap-1.5"
              >
                <Database className="h-4 w-4" />
                {seedDemoMutation.isPending
                  ? "Seeding Demo Hubs..."
                  : "Load Demo Hubs & Batches"}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="rounded-xl border border-border bg-card p-3.5 shadow-2xs flex items-start justify-between gap-2"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-semibold text-foreground truncate">
                    {wh.name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {wh.city}
                </p>
              </div>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
                {wh.code}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Post-dispatch confirmation & Low-Stock Email Alert status banner */}
      {lastDispatch && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-start gap-3 ${
            lastDispatch.is_low_stock_now
              ? "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
          }`}
        >
          {lastDispatch.is_low_stock_now ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold text-sm">
              {lastDispatch.is_low_stock_now
                ? `FEFO Dispatch Completed (#TX-${lastDispatch.transaction_id}) — Low-Stock Email Alert Triggered!`
                : `FEFO Dispatch Completed (#TX-${lastDispatch.transaction_id})`}
            </p>
            <p>
              Dispatched <strong>{lastDispatch.dispatched_quantity} units</strong>{" "}
              from <strong>{lastDispatch.warehouse_name}</strong> using earliest-expiring batches.
              Remaining aggregate stock:{" "}
              <strong>{lastDispatch.remaining_product_stock} units</strong>{" "}
              (Reorder threshold: {lastDispatch.reorder_level} units).
            </p>
            {lastDispatch.is_low_stock_now && (
              <p className="pt-0.5 font-medium">
                📧{" "}
                {lastDispatch.alert_message ||
                  "Automated low-stock warning email triggered."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dispatch Calculator Form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Order Fulfillment Calculator
          </h2>
        </div>

        <form onSubmit={handleSubmit(onCalculateRoute)} className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Product selection */}
            <div className="space-y-1.5">
              <Label htmlFor="route-product">Select Product</Label>
              <NativeSelect
                id="route-product"
                {...register("product_id")}
                disabled={smartRouteMutation.isPending}
              >
                <option value="0">Choose product to dispatch...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </NativeSelect>
              {errors.product_id && (
                <p className="text-xs text-destructive">{errors.product_id.message}</p>
              )}
            </div>

            {/* Order Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="route-qty">Order Quantity</Label>
              <Input
                id="route-qty"
                type="number"
                min="1"
                placeholder="e.g. 5"
                {...register("quantity")}
                disabled={smartRouteMutation.isPending}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            {/* Customer Destination City */}
            <div className="space-y-1.5">
              <Label htmlFor="route-dest">Customer Destination</Label>
              <NativeSelect
                id="route-dest"
                {...register("destination_index")}
                disabled={smartRouteMutation.isPending}
              >
                {PRESET_DESTINATIONS.map((dest, idx) => (
                  <option key={dest.name} value={idx}>
                    {dest.name}
                  </option>
                ))}
              </NativeSelect>
              {errors.destination_index && (
                <p className="text-xs text-destructive">
                  {errors.destination_index.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/40">
            {/* FEFO Expiry Priority Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                {...register("prioritize_expiry")}
                disabled={smartRouteMutation.isPending}
              />
              <span>
                <strong>FEFO Urgency Mode:</strong> Prioritize batches expiring within 30 days to avoid spoilage
              </span>
            </label>

            <Button
              type="submit"
              disabled={smartRouteMutation.isPending}
              className="gap-2 font-semibold shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
              {smartRouteMutation.isPending ? "Analyzing Routes..." : "Find Best Warehouse Route"}
            </Button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {routeResult && (
        <RouteRecommendationCard
          routeData={routeResult}
          onFulfill={onFulfillOrder}
          isFulfilling={fulfillDispatchMutation.isPending}
          canManage={canManage}
        />
      )}

      {/* Modal to receive new batches */}
      <BatchFormDialog
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        products={products}
        defaultProductId={selectedProductId > 0 ? selectedProductId : undefined}
      />
    </div>
  );
}
