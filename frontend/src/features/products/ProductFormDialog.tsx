import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
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
import { normalizeApiError } from "@/lib/errors";
import type { ProductCreate, ProductRead, ProductUpdate } from "@/types/api";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductValues,
} from "./productSchemas";
import { useCreateProduct, useUpdateProduct } from "./useProducts";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required when mode is "edit". */
  product?: ProductRead;
  categories: { id: number; name: string }[];
}

const CREATE_DEFAULTS: CreateProductValues = {
  name: "",
  sku: "",
  category_id: "",
  description: "",
  unit_price: "",
  reorder_level: "0",
};

function toEditDefaults(product: ProductRead): CreateProductValues {
  return {
    name: product.name,
    sku: product.sku,
    category_id: String(product.category_id),
    description: product.description ?? "",
    unit_price: String(product.unit_price),
    reorder_level: String(product.reorder_level),
  };
}

export function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  product,
  categories,
}: ProductFormDialogProps) {
  const isEdit = mode === "edit";
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateProductValues>({
    // SEPARATE schemas per Section 3.8 item 3. In edit mode the update schema
    // (no sku / category_id keys) is used, so those fields cannot be validated
    // or submitted even though their read-only inputs stay registered.
    resolver: zodResolver(
      isEdit ? updateProductSchema : createProductSchema
    ) as unknown as Resolver<CreateProductValues>,
    defaultValues: isEdit && product ? toEditDefaults(product) : CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      reset(isEdit && product ? toEditDefaults(product) : CREATE_DEFAULTS, {
        keepDefaultValues: true,
      });
    }
  }, [open, isEdit, product, reset]);

  const isBusy = createMutation.isPending || updateMutation.isPending;

  const applyApiErrors = (error: unknown, hasSkuField: boolean) => {
    const normalized = normalizeApiError(error);

    // 409 on POST /products is always a duplicate SKU. The API returns a plain
    // string detail, so it must be mapped to the field explicitly.
    if (normalized.status === 409 && hasSkuField) {
      setError("sku", { message: "This SKU already exists" });
      return;
    }

    let mapped = false;
    for (const [field, message] of Object.entries(normalized.fieldErrors)) {
      if (field === "name" || field === "sku" || field === "category_id" || field === "description" || field === "unit_price" || field === "reorder_level") {
        setError(field, { message });
        mapped = true;
      }
    }

    if (!mapped) {
      setSubmitError(normalized.message);
    }
  };

  const onCreate = async (values: CreateProductValues) => {
    setSubmitError(null);
    const body: ProductCreate = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      category_id: Number(values.category_id),
      description: values.description.trim() === "" ? null : values.description.trim(),
      unit_price: Number(values.unit_price),
      reorder_level: Number(values.reorder_level),
    };
    try {
      await createMutation.mutateAsync(body);
      onOpenChange(false);
    } catch (error) {
      applyApiErrors(error, true);
    }
  };

  const onUpdate = async (id: number, values: CreateProductValues) => {
    setSubmitError(null);
    // sku and category_id are intentionally omitted — ProductUpdate does not
    // accept them and the backend rejects any attempt to change them.
    const body: ProductUpdate = {
      name: values.name.trim(),
      description: values.description.trim() === "" ? null : values.description.trim(),
      unit_price: Number(values.unit_price),
      reorder_level: Number(values.reorder_level),
    };
    try {
      await updateMutation.mutateAsync({ id, body });
      onOpenChange(false);
    } catch (error) {
      applyApiErrors(error, false);
    }
  };

  const onSubmit = (values: CreateProductValues) => {
    if (isEdit && product) {
      return onUpdate(product.id, values);
    }
    return onCreate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "SKU and category are locked after creation and cannot be changed."
              : "Create a product. A stock row is created automatically."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-sku" className="flex items-center gap-1.5">
              SKU
              {isEdit && (
                <Lock
                  className="h-3 w-3 text-muted-foreground"
                  aria-label="Read only"
                />
              )}
            </Label>
            <Input
              id="product-sku"
              autoComplete="off"
              readOnly={isEdit}
              disabled={isEdit}
              aria-invalid={errors.sku ? true : undefined}
              {...register("sku")}
            />
            {errors.sku && (
              <p className="text-sm text-destructive" role="alert">
                {errors.sku.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category" className="flex items-center gap-1.5">
              Category
              {isEdit && (
                <Lock
                  className="h-3 w-3 text-muted-foreground"
                  aria-label="Read only"
                />
              )}
            </Label>
            {isEdit ? (
              <Input
                id="product-category"
                readOnly
                disabled
                value={
                  categories.find((c) => c.id === product?.category_id)?.name ??
                  `Category #${product?.category_id ?? ""}`
                }
                {...register("category_id")}
              />
            ) : (
              <NativeSelect
                id="product-category"
                aria-invalid={errors.category_id ? true : undefined}
                {...register("category_id")}
              >
                <option value="">Select a category…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
            )}
            {errors.category_id && (
              <p className="text-sm text-destructive" role="alert">
                {errors.category_id.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-description">Description</Label>
            <Input
              id="product-description"
              autoComplete="off"
              aria-invalid={errors.description ? true : undefined}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="product-price">Unit price</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                aria-invalid={errors.unit_price ? true : undefined}
                {...register("unit_price")}
              />
              {errors.unit_price && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.unit_price.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-reorder">Reorder level</Label>
              <Input
                id="product-reorder"
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                aria-invalid={errors.reorder_level ? true : undefined}
                {...register("reorder_level")}
              />
              {errors.reorder_level && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.reorder_level.message}
                </p>
              )}
            </div>
          </div>

          {submitError && (
            <p
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {submitError}
            </p>
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
            <Button type="submit" disabled={isBusy}>
              {isBusy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {isEdit ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
