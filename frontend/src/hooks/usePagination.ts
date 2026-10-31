import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Page + page_size kept in the URL query string so a product list view is
 * shareable and survives a reload. Values are clamped to the API contract:
 * page >= 1, 1 <= page_size <= 100.
 */
export function useUrlPagination() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page")) || DEFAULT_PAGE);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("page_size")) || DEFAULT_PAGE_SIZE)
  );

  const setPage = useCallback(
    (next: number) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next <= 1) params.delete("page");
          else params.set("page", String(next));
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setPageSize = useCallback(
    (next: number) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === DEFAULT_PAGE_SIZE) params.delete("page_size");
          else params.set("page_size", String(next));
          params.delete("page");
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return useMemo(() => ({ page, pageSize, setPage, setPageSize }), [
    page,
    pageSize,
    setPage,
    setPageSize,
  ]);
}
