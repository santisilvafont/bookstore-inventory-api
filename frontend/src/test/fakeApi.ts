import { vi } from 'vitest'

import type { Book, Paginated } from '../api/types'
import { jsonResponse } from './http'

type Handler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response>

/**
 * Replaces fetch with a fake API that answers by "METHOD /path". Unknown routes return 404,
 * so a test fails loudly when the code calls something unexpected.
 */
export function fakeApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input))
    const handler = routes[`${init?.method ?? 'GET'} ${url.pathname}`]
    if (!handler) return jsonResponse({ status: 404, code: 'not_found', detail: 'Not found' }, 404)
    return handler(url, init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Requests made to `path`, as URLs, in order. */
export function requestsTo(fetchMock: ReturnType<typeof fakeApi>, path: string): URL[] {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname === path)
}

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 1,
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    isbn: '9788437604947',
    cost_usd: 15.99,
    selling_price_local: null,
    currency: 'EUR',
    stock_quantity: 25,
    category: 'Literatura clásica',
    supplier_country: 'ES',
    created_at: '2026-11-10T22:00:00Z',
    updated_at: '2026-11-10T22:00:00Z',
    ...overrides,
  }
}

/** A page of results, honouring page and page_size like the backend (404 past the last page). */
export function pageOf(books: Book[], url: URL): Response {
  const pageSize = Number(url.searchParams.get('page_size') ?? 10)
  const page = Number(url.searchParams.get('page') ?? 1)
  const totalPages = Math.max(1, Math.ceil(books.length / pageSize))
  if (page > totalPages) {
    return jsonResponse({ status: 404, code: 'not_found', detail: 'Página inválida.' }, 404)
  }
  const body: Paginated<Book> = {
    count: books.length,
    total_pages: totalPages,
    page,
    page_size: pageSize,
    next: page < totalPages ? 'next' : null,
    previous: page > 1 ? 'previous' : null,
    results: books.slice((page - 1) * pageSize, page * pageSize),
  }
  return jsonResponse(body)
}

export const countriesResponse = () =>
  jsonResponse({
    actions: {
      POST: {
        supplier_country: {
          choices: [
            { value: 'ES', display_name: 'España' },
            { value: 'JP', display_name: 'Japón' },
          ],
        },
      },
    },
  })
