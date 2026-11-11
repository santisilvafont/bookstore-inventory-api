import type { BookFilter } from '../../api/books'

/** Same default as the backend's /books/low-stock endpoint. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10
export const PAGE_SIZE = 10
/** Where focus goes when the element that had it disappears (e.g. a deleted row). */
export const CATALOG_HEADING_ID = 'catalog-heading'

export type StockView = 'all' | 'low' | 'out'

export interface CatalogParams {
  stock: StockView
  category: string
  threshold: number
  page: number
}

/**
 * The catalog state lives in the URL, so a view can be reloaded, shared, and navigated with
 * the browser's back button. The API cannot combine filters: a stock view ignores the category.
 */
export function parseCatalogParams(search: URLSearchParams): CatalogParams {
  const stockParam = search.get('stock')
  const stock: StockView = stockParam === 'low' || stockParam === 'out' ? stockParam : 'all'

  return {
    stock,
    category: stock === 'all' ? (search.get('category') ?? '').trim() : '',
    threshold: parseNonNegativeInteger(search.get('threshold')) ?? DEFAULT_LOW_STOCK_THRESHOLD,
    page: Math.max(1, parseNonNegativeInteger(search.get('page')) ?? 1),
  }
}

/** Builds the query string for a catalog state, leaving out default values. */
export function toSearchParams(params: CatalogParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.stock !== 'all') search.set('stock', params.stock)
  if (params.stock === 'all' && params.category) search.set('category', params.category)
  // Kept in every view: the "Stock bajo" count and the low-stock marks in the table depend on it.
  if (params.threshold !== DEFAULT_LOW_STOCK_THRESHOLD) {
    search.set('threshold', String(params.threshold))
  }
  if (params.page > 1) search.set('page', String(params.page))
  return search
}

export function toBookFilter({ stock, category, threshold }: CatalogParams): BookFilter {
  if (stock === 'out') return { kind: 'lowStock', threshold: 0 }
  if (stock === 'low') return { kind: 'lowStock', threshold }
  if (category) return { kind: 'category', category }
  return { kind: 'all' }
}

function parseNonNegativeInteger(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined
  return Number(value)
}
