import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { normalizeApiError } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import type { TransactionCreate } from "@/types/api";
import { TransactionType } from "@/types/enums";
import {
  transactionSchema,
  type TransactionFormValues,
} from "./transactionSchema";
import { useCreateTransaction } from "./useTransactions";

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  productName: string;
  currentStock?: number;
}

const DEFAULTS: TransactionFormValues = {
  transaction_type: TransactionType.INBOUND,
  quantity: "",
  reference_doc: "",
  notes: "",
};

export function TransactionFormDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currentStock,
}: TransactionFormDialogProps) {
  const createMutation = useCreateTransaction(productId);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: DEFAULTS,
  });

  const watchedType = watch("transaction_type");
  const watchedQty = watch("quantity");

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      reset(DEFAULTS);
    }
  }, [open, reset]);

  const isOutbound = watchedType === TransactionType.OUTBOUND;
  const isOverdraft =
    isOutbound &&
    currentStock !== undefined &&
    watchedQty !== "" &&
    !isNaN(Number(watchedQty)) &&
    Number(watchedQty) > currentStock;

  const isBusy = createMutation.isPending;

  const applyApiErrors = (error: unknown) => {
    const normalized = normalizeApiError(error);

    if (normalized.status === 403) {
      toast({
        title: "Permission denied",
        description: normalized.message,
        variant: "destructive",
      });
      return;
    }

    if (
      normalized.status === 400 &&
      normalized.message.toLowerCase().includes("insufficient stock")
    ) {
      setError("quantity", { message: normalized.message });
      return;
    }

    let mapped = false;
    for (const [field, message] of Object.entries(normalized.fieldErrors)) {
      if (
        field === "transaction_type" ||
        field === "quantity" ||
        field === "reference_doc" ||
        field === "notes"
      ) {
        setError(field as keyof TransactionFormValues, { message });
        mapped = true;
      }
    }

    if (!mapped) {
      setSubmitError(normalized.message);
    }
  };

  const onSubmit = async (values: TransactionFormValues) => {
    setSubmitError(null);
    const qty = Number(values.quantity);

    // Client-side guard for outbound overdraft
    if (isOutbound && currentStock !== undefined && qty > currentStock) {
      setError("quantity", {
        message: `Insufficient stock. Requested: ${qty}, Available: ${currentStock}`,
      });
      return;
    }

    const body: TransactionCreate = {
      product_id: productId,
      transaction_type: values.transaction_type,
      quantity: qty,
      reference_doc:
        values.reference_doc.trim() === "" ? null : values.reference_doc.trim(),
      notes: values.notes.trim() === "" ? null : values.notes.trim(),
    };

    try {
      await createMutation.mutateAsync(body);
      onOpenChange(false);
    } catch (error) {
      applyApiErrors(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record inventory transaction</DialogTitle>
          <DialogDescription>
            Log stock movement for <strong>{productName}</strong>. This updates
            quantity on hand and creates an indelible audit entry.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          {/* Transaction Type */}
          <div className="grid gap-2">
            <Label htmlFor="tx-type">
              Transaction type <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              id="tx-type"
              aria-invalid={errors.transaction_type ? true : undefined}
              {...register("transaction_type")}
            >
              <option value={TransactionType.INBOUND}>
                Inbound (+ stock received from supplier / PO)
              </option>
              <option value={TransactionType.OUTBOUND}>
                Outbound (- stock shipped / customer fulfillment)
              </option>
              <option value={TransactionType.RETURN}>
                Return (+ stock returned to inventory)
              </option>
              <option value={TransactionType.ADJUSTMENT}>
                Adjustment (= set quantity directly)
              </option>
            </NativeSelect>
            {errors.transaction_type && (
              <p className="text-sm text-destructive" role="alert">
                {errors.transaction_type.message}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tx-quantity">
                Quantity <span className="text-destructive">*</span>
              </Label>
              {currentStock !== undefined && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Current on hand: <strong>{formatNumber(currentStock)}</strong>
                </span>
              )}
            </div>

            <Input
              id="tx-quantity"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 10"
              aria-invalid={errors.quantity || isOverdraft ? true : undefined}
              {...register("quantity")}
            />

            {errors.quantity && (
              <p className="text-sm text-destructive" role="alert">
                {errors.quantity.message}
              </p>
            )}

            {isOverdraft && !errors.quantity && (
              <p className="text-sm text-destructive" role="alert">
                Requested quantity ({watchedQty}) exceeds current on-hand stock (
                {currentStock}). Outbound requests cannot overdraft.
              </p>
            )}
          </div>

          {/* Reference Document */}
          <div className="grid gap-2">
            <Label htmlFor="tx-ref">Reference document</Label>
            <Input
              id="tx-ref"
              placeholder="e.g. PO-9812, INV-2026-01, RMA-402"
              autoComplete="off"
              aria-invalid={errors.reference_doc ? true : undefined}
              {...register("reference_doc")}
            />
            {errors.reference_doc && (
              <p className="text-sm text-destructive" role="alert">
                {errors.reference_doc.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="tx-notes">Notes</Label>
            <Textarea
              id="tx-notes"
              rows={2}
              placeholder="Optional context, carrier details, or inspection notes"
              aria-invalid={errors.notes ? true : undefined}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-sm text-destructive" role="alert">
                {errors.notes.message}
              </p>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{submitError}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy || Boolean(isOverdraft)}>
              {isBusy && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              {isBusy ? "Recording…" : "Record transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

