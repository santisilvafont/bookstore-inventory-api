import { QueryClient } from '@tanstack/react-query'

import { isRetryable } from './errors'

const MAX_RETRIES = 2

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => isRetryable(error) && failureCount < MAX_RETRIES,
      },
      mutations: {
        // A retried POST could create the same book twice.
        retry: false,
      },
    },
  })
}
