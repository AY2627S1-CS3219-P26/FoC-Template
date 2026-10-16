import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/http'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Trying again only helps without a connection (0) or on a server error (5xx).
      // A refusal like 401, 403 or 404 will not change on its own.
      retry: (failureCount, error) =>
        failureCount < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500),
    },
    mutations: {
      // Sending a form twice could create something twice.
      retry: false,
    },
  },
})