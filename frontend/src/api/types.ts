/** Mirrors the backend contract. Decimal fields are serialized as JSON numbers. */

export interface Book {
  id: number
  title: string
  author: string
  isbn: string
  cost_usd: number
  selling_price_local: number | null
  /** ISO 4217 code of the local currency, derived from supplier_country by the backend. */
  currency: string
  stock_quantity: number
  category: string
  supplier_country: string
  created_at: string
  updated_at: string
}

export type BookInput = Pick<
  Book,
  'title' | 'author' | 'isbn' | 'cost_usd' | 'stock_quantity' | 'category' | 'supplier_country'
>

export interface Paginated<T> {
  count: number
  total_pages: number
  page: number
  page_size: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface PriceCalculation {
  book_id: number
  cost_usd: number
  exchange_rate: number
  cost_local: number
  margin_percentage: number
  selling_price_local: number
  currency: string
  rate_source: 'live' | 'default'
  calculation_timestamp: string
}

export interface Country {
  code: string
  name: string
}

export interface ApiErrorBody {
  status: number
  code: string
  detail: string
  errors?: Record<string, string[]>
}
