import { afterEach, describe, expect, it, vi } from 'vitest'

import { jsonResponse, mockFetch, requestedUrl } from '../test/http'
import { ApiError, apiRequest } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('builds the URL with the query parameters that have a value', async () => {
    const fetchMock = mockFetch(jsonResponse({}))

    await apiRequest('/books', { params: { page: 2, category: '', threshold: undefined } })

    const url = requestedUrl(fetchMock)
    expect(url.pathname).toBe('/books')
    expect(url.search).toBe('?page=2')
  })

  it('sends the body as JSON', async () => {
    const fetchMock = mockFetch(jsonResponse({ id: 1 }, 201))

    await apiRequest('/books', { method: 'POST', body: { title: 'Rayuela' } })

    const init = fetchMock.mock.calls[0][1]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"title":"Rayuela"}')
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('returns the parsed response', async () => {
    mockFetch(jsonResponse({ id: 1, title: 'Rayuela' }))

    await expect(apiRequest('/books/1')).resolves.toEqual({ id: 1, title: 'Rayuela' })
  })

  it('returns undefined for 204 No Content', async () => {
    mockFetch(new Response(null, { status: 204 }))

    await expect(apiRequest('/books/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('turns an API error into an ApiError with its field errors', async () => {
    mockFetch(
      jsonResponse(
        {
          status: 400,
          code: 'invalid',
          detail: 'Los datos enviados no son válidos.',
          errors: { isbn: ['Ya existe un libro con este ISBN.'] },
        },
        400,
      ),
    )

    const error = await apiRequest('/books', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'invalid',
      message: 'Los datos enviados no son válidos.',
      fieldErrors: { isbn: ['Ya existe un libro con este ISBN.'] },
    })
  })

  it('handles error responses that do not come from the API', async () => {
    mockFetch(new Response('<html>Bad Gateway</html>', { status: 502 }))

    const error = await apiRequest('/books').catch((e) => e)

    expect(error).toMatchObject({ status: 502, code: 'unexpected_response', fieldErrors: {} })
  })

  it('reports an unreachable server as status 0', async () => {
    mockFetch(new TypeError('Failed to fetch'))

    const error = await apiRequest('/books').catch((e) => e)

    expect(error).toMatchObject({ status: 0, code: 'network_error' })
  })

  it('lets cancellations through untouched', async () => {
    mockFetch(new DOMException('Aborted', 'AbortError'))

    await expect(apiRequest('/books')).rejects.toHaveProperty('name', 'AbortError')
  })
})
