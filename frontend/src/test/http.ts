import { vi } from 'vitest'

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Replaces the global fetch with a mock and returns it. Restore with vi.unstubAllGlobals(). */
export function mockFetch(...outcomes: (Response | Error | DOMException)[]) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const outcome of outcomes) {
    if (outcome instanceof Response) fetchMock.mockResolvedValueOnce(outcome)
    else fetchMock.mockRejectedValueOnce(outcome)
  }
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function requestedUrl(fetchMock: ReturnType<typeof mockFetch>, call = 0): URL {
  return new URL(String(fetchMock.mock.calls[call][0]))
}
