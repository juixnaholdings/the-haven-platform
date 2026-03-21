import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry(failureCount, error) {
        if (error instanceof ApiError && error.statusCode > 0 && error.statusCode < 500) {
          return false;
        }

        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
