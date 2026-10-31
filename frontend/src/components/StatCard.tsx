import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | undefined;
  description?: string;
  icon: ReactNode;
  isPending?: boolean;
  isError?: boolean;
  tone?: "default" | "warning";
  href?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon,
  isPending = false,
  isError = false,
  tone = "default",
  href,
}: StatCardProps) {
  const isWarning = tone === "warning";

  const content = (
    <div
      className={cn(
        "flex h-full flex-col justify-between rounded-lg border bg-card p-5 transition-colors",
        isWarning ? "border-warning/40" : "border-border",
        href && "hover:bg-muted/40"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            isWarning
              ? "bg-[#fef3c7] text-[#92400e] dark:bg-warning/15 dark:text-warning"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          {icon}
        </span>
      </div>

      <div className="mt-3">
        {isPending ? (
          <Skeleton className="h-8 w-20" aria-label={`Loading ${label}`} />
        ) : isError ? (
          <span
            className="text-2xl font-semibold text-muted-foreground"
            title="Unable to load count"
          >
            —
          </span>
        ) : (
          <p
            className={cn(
              "text-3xl font-semibold tracking-tight tabular-nums",
              isWarning ? "text-[#92400e] dark:text-warning" : "text-foreground"
            )}
          >
            {formatNumber(value ?? 0)}
          </p>
        )}
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return content;
}

