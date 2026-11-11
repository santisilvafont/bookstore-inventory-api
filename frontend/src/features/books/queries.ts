import {
  type QueryClient,
  keepPreviousData,
  skipToken,
  useIsMutating,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { type BookFilter, calculatePrice, getBook, listBooks, listCountries } from '../../api/books'
import { ApiError } from '../../api/client'
import type { Book, Paginated, PriceCalculation } from '../../api/types'
import { formatMoney } from '../../lib/format'
import { notifyError } from '../../lib/notify'
import { PAGE_SIZE } from './catalogParams'
import { detailLinkState } from './navigation'

export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
  list: (filter: BookFilter, page: number, pageSize: number) =>
    [...bookKeys.lists(), filter, page, pageSize] as const,
  // Totals have their own prefix: a new price changes a page, never how many books there are.
  count: (filter: BookFilter) => [...bookKeys.all, 'count', filter] as const,
  detail: (id: number) => [...bookKeys.all, 'detail', id] as const,
  priceCalculation: (id: number) => [...bookKeys.all, 'price-calculation', id] as const,
  countries: ['countries'] as const,
}

const calculatePriceMutationKey = (id: number) => ['calculate-price', id] as const

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
      queryKey: bookKeys.count(filter),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listBooks(filter, { page: 1, pageSize: 1 }, signal),
      select: (page: { count: number }) => page.count,
    })),
  })
  return { all: all.data, low: low.data, out: out.data }
}

export function useBook(id: number) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: ({ signal }) => getBook(id, signal),
    // Opening a book from the table shows its row data at once, while the API confirms it.
    placeholderData: () => findBookInLists(queryClient, id),
  })
}

/**
 * The breakdown of the last calculation made in this session. It only exists in the
 * calculate-price response (the backend stores the final price, not the breakdown).
 */
export function useLatestPriceCalculation(id: number) {
  return useQuery<PriceCalculation>({
    queryKey: bookKeys.priceCalculation(id),
    queryFn: skipToken,
    staleTime: Infinity,
  })
}

/**
 * Calculates a book's selling price and reports the outcome with a toast. The feedback lives
 * here, not at the call site, so it still runs if the user navigates away mid-request.
 */
export function useCalculatePrice(book: Pick<Book, 'id' | 'title'>) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const mutationKey = calculatePriceMutationKey(book.id)

  const mutation = useMutation({
    mutationKey,
    mutationFn: () => calculatePrice(book.id),
    onSuccess: (calculation) => {
      queryClient.setQueryData(bookKeys.priceCalculation(book.id), calculation)
      queryClient.setQueryData<Book>(
        bookKeys.detail(book.id),
        (current) =>
          current && { ...current, selling_price_local: calculation.selling_price_local },
      )

      const detailPath = `/books/${book.id}`
      toast.success(`Precio calculado para «${book.title}»`, {
        description: formatMoney(calculation.selling_price_local, calculation.currency),
        action:
          location.pathname === detailPath
            ? undefined
            : {
                label: 'Ver desglose',
                onClick: () =>
                  navigate(
                    { pathname: detailPath, search: location.search },
                    { state: detailLinkState },
                  ),
              },
      })
      // Returning the promise keeps the mutation pending until the tables show the new price.
      return queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
    },
    onError: (error) => {
      notifyError(error)
      // The book was deleted elsewhere: refresh everything so it disappears.
      if (error instanceof ApiError && error.status === 404) {
        return queryClient.invalidateQueries({ queryKey: bookKeys.all })
      }
    },
  })

  // Shared across the table row and the detail panel, so one book is never calculated twice
  // at the same time.
  const isCalculating = useIsMutating({ mutationKey }) > 0

  return { calculate: () => mutation.mutate(), isCalculating }
}

export function useCountries() {
  return useQuery({
    queryKey: bookKeys.countries,
    queryFn: ({ signal }) => listCountries(signal),
    // The supported countries only change with a backend release.
    staleTime: Infinity,
  })
}

function findBookInLists(queryClient: QueryClient, id: number): Book | undefined {
  const pages = queryClient.getQueriesData<Paginated<Book>>({ queryKey: bookKeys.lists() })
  for (const [, page] of pages) {
    const book = page?.results.find((candidate) => candidate.id === id)
    if (book) return book
  }
  return undefined
}
