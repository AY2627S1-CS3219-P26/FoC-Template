// The one way the web client talks to the services. Every request goes through the
// gateway as /api/<service>/<path>, so no host, port or URL of a service appears in code.

export type ServiceName = 'user' | 'supplier' | 'order' | 'credit'

export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
}

export async function request<T>(
  service: ServiceName,
  path: `/${string}`,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, signal } = options

  const response = await fetch(buildUrl(service, path, query), {
    method,
    signal,
    // Same origin as the gateway, so the session cookie goes along automatically.
    credentials: 'same-origin',
    headers:
      body === undefined
        ? { Accept: 'application/json' }
        : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) throw await toApiError(response)
  // 204 No Content has no body to parse, e.g. logout.
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function buildUrl(service: ServiceName, path: string, query: RequestOptions['query']): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value))
  }
  const search = params.toString()
  return `/api/${service}${path}${search ? `?${search}` : ''}`
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  if (isErrorBody(body)) {
    return new ApiError(response.status, body.error.code, body.error.message)
  }
  return new ApiError(response.status, 'UNEXPECTED_RESPONSE', `Unexpected response (${response.status})`)
}

// The services and the gateway all answer errors as {"error":{"code":"...","message":"..."}}.
function isErrorBody(body: unknown): body is { error: { code: string; message: string } } {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false
  const error = body.error
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}