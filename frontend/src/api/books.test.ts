import { afterEach, describe, expect, it, vi } from 'vitest'

import { jsonResponse, mockFetch, requestedUrl } from '../test/http'
import { type BookFilter, listBooks, listCountries, updateBook } from './books'

afterEach(() => {
  vi.unstubAllGlobals()
})

const emptyPage = { count: 0, total_pages: 1, page: 1, page_size: 10, results: [] }

describe('listBooks', () => {
  it.each<[BookFilter, string, Record<string, string>]>([
    [{ kind: 'all' }, '/books', {}],
    [{ kind: 'category', category: 'Fantasía' }, '/books/search', { category: 'Fantasía' }],
    [{ kind: 'lowStock', threshold: 0 }, '/books/low-stock', { threshold: '0' }],
  ])('uses the endpoint that matches the %o filter', async (filter, path, extraParams) => {
    const fetchMock = mockFetch(jsonResponse(emptyPage))

    await listBooks(filter, { page: 2, pageSize: 10 })

    const url = requestedUrl(fetchMock)
    expect(url.pathname).toBe(path)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      page_size: '10',
      ...extraParams,
    })
  })
})

describe('updateBook', () => {
  it('replaces the book with PUT', async () => {
    const fetchMock = mockFetch(jsonResponse({ id: 7 }))

    await updateBook(7, {
      title: 'Rayuela',
      author: 'Julio Cortázar',
      isbn: '9788437604572',
      cost_usd: 16.2,
      stock_quantity: 4,
      category: 'Novela',
      supplier_country: 'ES',
    })

    expect(requestedUrl(fetchMock).pathname).toBe('/books/7')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT')
  })
})

describe('listCountries', () => {
  it('reads the supported countries from the API metadata', async () => {
    const fetchMock = mockFetch(
      jsonResponse({
        actions: {
          POST: {
            supplier_country: {
              choices: [
                { value: 'AR', display_name: 'Argentina' },
                { value: 'ES', display_name: 'España' },
              ],
            },
          },
        },
      }),
    )

    await expect(listCountries()).resolves.toEqual([
      { code: 'AR', name: 'Argentina' },
      { code: 'ES', name: 'España' },
    ])
    expect(fetchMock.mock.calls[0][1]?.method).toBe('OPTIONS')
  })
})
