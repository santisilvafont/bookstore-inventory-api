import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'

import { type BookFilter, listBooks, listCountries } from '../../api/books'
import { PAGE_SIZE } from './catalogParams'

export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
  list: (filter: BookFilter, page: number, pageSize: number) =>
    [...bookKeys.lists(), filter, page, pageSize] as const,
  detail: (id: number) => [...bookKeys.all, 'detail', id] as const,
  countries: ['countries'] as const,
}

export function useBookList(filter: BookFilter, page: number) {
  return useQuery({
    queryKey: bookKeys.list(filter, page, PAGE_SIZE),
    queryFn: ({ signal }) => listBooks(filter, { page, pageSize: PAGE_SIZE }, signal),
    // Keep the current page on screen while the next one loads, so the table does not jump.
    placeholderData: keepPreviousData,
  })
}

/** Totals shown on the stock tabs. Each one is a one-item page: only `count` is needed. */
export function useStockCounts(threshold: number) {
  const filters: BookFilter[] = [
    { kind: 'all' },
    { kind: 'lowStock', threshold },
    { kind: 'lowStock', threshold: 0 },
  ]
  const [all, low, out] = useQueries({
    queries: filters.map((filter) => ({
      queryKey: bookKeys.list(filter, 1, 1),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listBooks(filter, { page: 1, pageSize: 1 }, signal),
      select: (page: { count: number }) => page.count,
    })),
  })
  return { all: all.data, low: low.data, out: out.data }
}

export function useCountries() {
  return useQuery({
    queryKey: bookKeys.countries,
    queryFn: ({ signal }) => listCountries(signal),
    // The supported countries only change with a backend release.
    staleTime: Infinity,
  })
}
