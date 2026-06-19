import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Do not retry for auth or client side validation errors
        if (error?.response?.status === 401 || error?.response?.status === 403 || error?.response?.status === 400) {
          return false;
        }
        return failureCount < 2; // Retry other errors max twice
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes stale time
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
    },
    mutations: {
      retry: false,
    },
  },
});
