import { SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export default function StockAdjustmentPage() {
  return (
    <div>
      <PageHeader
        title="Stock Adjustment"
        subtitle="Set an accurate on-hand quantity for a product"
      />
      <EmptyState
        icon={<SlidersHorizontal className="h-6 w-6" aria-hidden="true" />}
        title="Coming soon"
        description="The adjustment form with live delta calculation will be built in a later step."
      />
    </div>
  );
}
