import { Zap, Navigation, Clock, PackageCheck, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { SmartRouteResponse, RouteCandidate } from "@/types/api";

interface RouteRecommendationCardProps {
  routeData: SmartRouteResponse;
  onFulfill: (candidate: RouteCandidate) => void;
  isFulfilling: boolean;
  canManage: boolean;
}

export function RouteRecommendationCard({
  routeData,
  onFulfill,
  isFulfilling,
  canManage,
}: RouteRecommendationCardProps) {
  const recommended = routeData.candidates.find((c) => c.is_recommended);
  const alternates = routeData.candidates.filter((c) => !c.is_recommended);

  return (
    <div className="space-y-6">
      {/* Top Banner: Best Recommended Warehouse */}
      {recommended ? (
        <div className="relative overflow-hidden rounded-xl border-2 border-primary/60 bg-card p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <Zap className="h-3.5 w-3.5 fill-current" />
                #1 Recommended Fulfillment Route
              </span>
              <span className="text-xs text-muted-foreground">
                Destination: <strong className="text-foreground">{routeData.destination_name}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Match Score:</span>
              <span className="font-mono text-sm font-bold text-primary">
                {recommended.score.toFixed(1)} pts
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {/* Warehouse & Location */}
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">
                {recommended.warehouse_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {recommended.city} ({recommended.warehouse_code})
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Navigation className="h-3.5 w-3.5 text-primary" />
                <span>
                  <strong>{recommended.distance_km} km</strong> away
                </span>
                <span>•</span>
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>
                  ~<strong>{recommended.estimated_transit_days} day(s)</strong> transit
                </span>
              </div>
            </div>

            {/* Batch & FEFO Details */}
            <div className="space-y-1 border-t border-border/60 pt-3 md:border-t-0 md:border-l md:pl-5 md:pt-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Batch (FEFO Rule)
              </span>
              <div className="pt-1 flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">
                  {recommended.selected_batch_number || "Default Stock"}
                </span>
                {recommended.has_expiring_soon_batch && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    Expiring soon ({recommended.days_until_expiry}d)
                  </span>
                )}
              </div>
              {recommended.nearest_expiry_date && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Expiry: {formatDate(recommended.nearest_expiry_date)}</span>
                </div>
              )}
            </div>

            {/* Stock & Action */}
            <div className="flex flex-col justify-between space-y-3 border-t border-border/60 pt-3 md:border-t-0 md:border-l md:pl-5 md:pt-0">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Available Stock
                </span>
                <p className="text-lg font-bold text-foreground">
                  {recommended.available_quantity} units{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({routeData.requested_quantity} requested)
                  </span>
                </p>
              </div>

              {canManage && (
                <Button
                  onClick={() => onFulfill(recommended)}
                  disabled={isFulfilling}
                  className="w-full gap-2 shadow-sm font-semibold"
                >
                  <PackageCheck className="h-4 w-4" />
                  {isFulfilling ? "Dispatching..." : `Dispatch from ${recommended.warehouse_code}`}
                </Button>
              )}
            </div>
          </div>

          {/* Explanation rationale */}
          <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs leading-relaxed text-foreground">
            {recommended.recommendation_reason}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            No single warehouse has sufficient non-expired stock ({routeData.requested_quantity} units) to fulfill this order.
          </span>
        </div>
      )}

      {/* Alternate Warehouses Table */}
      {alternates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            Other Warehouses Considered
          </h4>
          <div className="relative overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Warehouse</th>
                  <th className="px-4 py-2.5">Distance</th>
                  <th className="px-4 py-2.5">Transit</th>
                  <th className="px-4 py-2.5">Available</th>
                  <th className="px-4 py-2.5">Earliest Expiry</th>
                  <th className="px-4 py-2.5">Status & Reason</th>
                  <th className="px-4 py-2.5 text-right">Override Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {alternates.map((c) => (
                  <tr key={c.warehouse_id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{c.warehouse_name}</div>
                      <div className="text-[11px] text-muted-foreground">{c.city}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{c.distance_km} km</td>
                    <td className="px-4 py-3">~{c.estimated_transit_days}d</td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {c.available_quantity}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.nearest_expiry_date ? formatDate(c.nearest_expiry_date) : "N/A"}
                    </td>
                    <td className="px-4 py-3 max-w-xs text-muted-foreground">
                      {c.recommendation_reason}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && c.can_fulfill && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onFulfill(c)}
                          disabled={isFulfilling}
                          className="h-7 text-xs"
                        >
                          Dispatch Here
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

