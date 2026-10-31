import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full-page loading fallback shared by ProtectedRoute and every lazy-route
 * Suspense boundary, so first authenticated paint never flashes blank.
 */
export function RouteFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-6"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="w-full max-w-5xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-4 border-b border-border pb-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
          </div>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-4 py-1">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
