import { QueryClient } from "@tanstack/react-query";

/**
 * Long stale-time constant for categories per Section 3.8:
 * Categories are fetched once (e.g. page_size=100) into an id -> name Map
 * and rarely change during a session.
 */
export const CATEGORIES_STALE_TIME = 60 * 60 * 1000; // 1 hour

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
