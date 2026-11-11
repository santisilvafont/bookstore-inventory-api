import type { ApiErrorBody } from './types'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

export type QueryParams = Record<string, string | number | undefined>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS'
  params?: QueryParams
  body?: unknown
  signal?: AbortSignal
}

/** Every failed request becomes an ApiError; status 0 means the server could not be reached. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string[]>

  constructor(status: number, code: string, message: string, fieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body, signal } = options

  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    // A cancelled request (e.g. the user changed page) is not a failure to report.
    if (isAbortError(error)) throw error
    throw new ApiError(0, 'network_error', 'No se pudo conectar con el servidor.')
  }

  if (response.status === 204) return undefined as T

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw toApiError(response.status, data)
  return data as T
}

function buildUrl(path: string, params: QueryParams = {}): string {
  const url = new URL(`${API_URL}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function isAbortError(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'AbortError'
}

function toApiError(status: number, data: unknown): ApiError {
  if (isApiErrorBody(data)) {
    return new ApiError(status, data.code, data.detail, data.errors)
  }
  // Responses that do not come from the API itself, e.g. an HTML page from a proxy.
  return new ApiError(
    status,
    'unexpected_response',
    `Respuesta inesperada del servidor (${status}).`,
  )
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as ApiErrorBody).code === 'string' &&
    typeof (data as ApiErrorBody).detail === 'string'
  )
}
