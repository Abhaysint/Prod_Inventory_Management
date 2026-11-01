import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";
import { normalizeApiError } from "@/lib/errors";
import type { CategoryCreate } from "@/types/api";
import {
  createCategorySchema,
  type CreateCategoryValues,
} from "./categorySchema";
import { useCategoryList, useCreateCategory } from "./useCategories";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREATE_DEFAULTS: CreateCategoryValues = {
  name: "",
  description: "",
};

export function CategoryFormDialog({
  open,
  onOpenChange,
}: CategoryFormDialogProps) {
  const createMutation = useCreateCategory();
  const existingCategories = useCategoryList();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateCategoryValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      setSubmitError(null);
      reset(CREATE_DEFAULTS, { keepDefaultValues: true });
    }
  }, [open, reset]);

  const isBusy = createMutation.isPending;

  const applyApiErrors = (error: unknown) => {
    const normalized = normalizeApiError(error);

    // 409 conflict, or backend 500 when database unique constraint violation occurs
    const isConflict =
      normalized.status === 409 ||
      (normalized.status === 500 &&
        (normalized.message.toLowerCase().includes("unique") ||
          normalized.message.toLowerCase().includes("already exists") ||
          normalized.message.toLowerCase().includes("duplicate") ||
          normalized.message.toLowerCase().includes("integrity") ||
          normalized.message.toLowerCase().includes("server error")));

    if (isConflict) {
      setError("name", { message: "A category with this name already exists" });
      return;
    }

    if (normalized.status === 403) {
      toast({
        title: "You don't have permission",
        description: normalized.message,
        variant: "destructive",
      });
      return;
    }

    let mapped = false;
    for (const [field, message] of Object.entries(normalized.fieldErrors)) {
      if (field === "name" || field === "description") {
        setError(field, { message });
        mapped = true;
      }
    }

    if (!mapped) {
      setSubmitError(normalized.message);
    }
  };

  const onSubmit = async (values: CreateCategoryValues) => {
    setSubmitError(null);
    const trimmedName = values.name.trim();

    // Client-side conflict check: catch duplicate names immediately before hitting backend
    const isDuplicate = (existingCategories.data ?? []).some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setError("name", { message: "A category with this name already exists" });
      return;
    }

    const body: CategoryCreate = {
      name: trimmedName,
      description:
        values.description.trim() === "" ? null : values.description.trim(),
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
          <DialogTitle>Add category</DialogTitle>
          <DialogDescription>
            Create a category to group products in your catalogue. Categories
            cannot be edited or deleted once created.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              autoComplete="off"
              placeholder="e.g. Electronics"
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
            <Label htmlFor="category-description">Description</Label>
            <Input
              id="category-description"
              autoComplete="off"
              placeholder="Optional summary of items in this category"
              aria-invalid={errors.description ? true : undefined}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive" role="alert">
                {errors.description.message}
              </p>
            )}
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
              {isBusy && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              Create category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

