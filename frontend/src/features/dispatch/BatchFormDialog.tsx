import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PackagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "@/components/ui/use-toast";
import { normalizeApiError } from "@/lib/errors";
import { useCreateStockBatch, useWarehouses } from "./useDispatch";
import type { ProductRead } from "@/types/api";

const batchFormSchema = z.object({
  product_id: z.coerce.number().positive("Please select a product"),
  warehouse_id: z.coerce.number().positive("Please select a warehouse"),
  batch_number: z
    .string()
    .trim()
    .min(1, "Batch number is required")
    .max(50, "Batch number cannot exceed 50 characters"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1 unit"),
  expiry_date: z
    .string()
    .min(1, "Expiration date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

type BatchFormValues = z.infer<typeof batchFormSchema>;

interface BatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductRead[];
  defaultProductId?: number;
}

export function BatchFormDialog({
  open,
  onOpenChange,
  products,
  defaultProductId,
}: BatchFormDialogProps) {
  const { data: warehouses = [] } = useWarehouses();
  const createBatchMutation = useCreateStockBatch();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      product_id: defaultProductId ?? (products[0]?.id || 0),
      warehouse_id: warehouses[0]?.id || 0,
      batch_number: "",
      quantity: 10,
      expiry_date: "",
    },
  });

  useEffect(() => {
    if (open) {
      const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      reset({
        product_id: defaultProductId ?? (products[0]?.id || 0),
        warehouse_id: warehouses[0]?.id || 0,
        batch_number: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
        quantity: 10,
        expiry_date: defaultExpiry,
      });
    }
  }, [open, defaultProductId, products, warehouses, reset]);

  const onSubmit = async (values: BatchFormValues) => {
    try {
      const result = await createBatchMutation.mutateAsync({
        product_id: values.product_id,
        warehouse_id: values.warehouse_id,
        batch_number: values.batch_number,
        quantity: values.quantity,
        expiry_date: values.expiry_date,
      });

      toast({
        title: "Batch Received Successfully",
        description: `Added batch ${result.batch_number} (${result.quantity} units). Stock updated!`,
      });

      reset();
      onOpenChange(false);
    } catch (err) {
      const normalized = normalizeApiError(err);
      toast({
        variant: "destructive",
        title: "Failed to Receive Batch",
        description: normalized.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <PackagePlus className="h-5 w-5" aria-hidden="true" />
            <DialogTitle>Receive Inventory Batch</DialogTitle>
          </div>
          <DialogDescription>
            Add a new perishable inventory batch into a specific warehouse with expiration tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="batch-product">Product</Label>
            <NativeSelect
              id="batch-product"
              {...register("product_id")}
              disabled={isSubmitting}
            >
              <option value="0">Select a product...</option>
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

          <div className="space-y-1.5">
            <Label htmlFor="batch-warehouse">Destination Warehouse</Label>
            <NativeSelect
              id="batch-warehouse"
              {...register("warehouse_id")}
              disabled={isSubmitting}
            >
              <option value="0">Select a warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.city})
                </option>
              ))}
            </NativeSelect>
            {errors.warehouse_id && (
              <p className="text-xs text-destructive">{errors.warehouse_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="batch-number">Batch / Lot #</Label>
              <Input
                id="batch-number"
                placeholder="e.g. LOT-2026-X1"
                {...register("batch_number")}
                disabled={isSubmitting}
              />
              {errors.batch_number && (
                <p className="text-xs text-destructive">{errors.batch_number.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-qty">Quantity</Label>
              <Input
                id="batch-qty"
                type="number"
                min="1"
                {...register("quantity")}
                disabled={isSubmitting}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="batch-expiry">Expiration Date (FEFO)</Label>
            <Input
              id="batch-expiry"
              type="date"
              {...register("expiry_date")}
              disabled={isSubmitting}
            />
            {errors.expiry_date && (
              <p className="text-xs text-destructive">{errors.expiry_date.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Receiving..." : "Receive Batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

