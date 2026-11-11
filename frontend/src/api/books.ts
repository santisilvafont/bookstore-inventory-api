import { apiRequest } from './client'
import type { Book, BookInput, Country, Paginated, PriceCalculation } from './types'

/** The backend exposes one endpoint per filter, so filters cannot be combined. */
export type BookFilter =
  { kind: 'all' } | { kind: 'category'; category: string } | { kind: 'lowStock'; threshold: number }

export interface PageRequest {
  page: number
  pageSize: number
}

export function listBooks(
  filter: BookFilter,
  { page, pageSize }: PageRequest,
  signal?: AbortSignal,
): Promise<Paginated<Book>> {
  const pagination = { page, page_size: pageSize }

  switch (filter.kind) {
    case 'category':
      return apiRequest('/books/search', {
        params: { ...pagination, category: filter.category },
        signal,
      })
    case 'lowStock':
      return apiRequest('/books/low-stock', {
        params: { ...pagination, threshold: filter.threshold },
        signal,
      })
    case 'all':
      return apiRequest('/books', { params: pagination, signal })
  }
}

export function getBook(id: number, signal?: AbortSignal): Promise<Book> {
  return apiRequest(`/books/${id}`, { signal })
}

export function createBook(input: BookInput): Promise<Book> {
  return apiRequest('/books', { method: 'POST', body: input })
}

export function updateBook(id: number, input: BookInput): Promise<Book> {
  return apiRequest(`/books/${id}`, { method: 'PUT', body: input })
}

export function deleteBook(id: number): Promise<void> {
  return apiRequest(`/books/${id}`, { method: 'DELETE' })
}

export function calculatePrice(id: number): Promise<PriceCalculation> {
  return apiRequest(`/books/${id}/calculate-price`, { method: 'POST' })
}

interface BookMetadata {
  actions: {
    POST: {
      supplier_country: { choices: { value: string; display_name: string }[] }
    }
  }
}

/** Supported supplier countries, read from the API so the list lives in a single place. */
export async function listCountries(signal?: AbortSignal): Promise<Country[]> {
  const metadata = await apiRequest<BookMetadata>('/books', { method: 'OPTIONS', signal })
  return metadata.actions.POST.supplier_country.choices.map(({ value, display_name }) => ({
    code: value,
    name: display_name,
  }))
}
