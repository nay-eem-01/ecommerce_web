import { vi } from 'vitest'

/** A backend response: the envelope with `payload`. */
export function envelope(status: number, payload: unknown, message = 'OK', correlationId?: string): Response {
  return new Response(JSON.stringify({ status: String(status), message, payload, success: status < 400, correlationId }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** The backend's `PageResponse` of `content`. */
export function page<T>(content: T[], pageNo = 0, last = true) {
  return { content, pageNo, pageSize: 48, totalElements: content.length, totalPages: 1, last }
}

type Handler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response>

/**
 * Stubs `fetch` with handlers keyed by "METHOD /path" (query string ignored). An unknown request fails the test.
 * Returns the mock so calls can be inspected; setup.ts removes it after each test.
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input), 'http://localhost')
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    const handler = routes[key]
    if (!handler) throw new Error(`Unexpected request: ${key}`)
    return handler(url, init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The JSON body a mocked request was sent with. */
export function bodyOf(init: RequestInit | undefined): unknown {
  return init?.body ? JSON.parse(String(init.body)) : undefined
}
