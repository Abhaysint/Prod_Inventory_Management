import { ArrowLeftRight } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export default function ProductTransactionsPage() {
  const { productId } = useParams();

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={
          productId ? `Audit trail for product #${productId}` : "Product audit trail"
        }
      />
      <EmptyState
        icon={<ArrowLeftRight className="h-6 w-6" aria-hidden="true" />}
        title="Coming soon"
        description="The per-product transaction history and add-transaction dialog will be built in a later step."
      />
    </div>
  );
}
