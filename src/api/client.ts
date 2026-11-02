import { ApiError, NETWORK_ERROR_MESSAGE, SERVER_ERROR_MESSAGE } from './errors'
import type { TokenResponse } from './types'

/** The envelope around every response body (backend `Response`). */
interface Envelope<T> {
  status: string
  message: string
  payload: T | null
  success: boolean
  correlationId?: string
}

/** Empty in development (the Vite proxy forwards `/api`); set VITE_API_BASE_URL only for a split deploy. */
const BASE_URL: string = import.meta.env?.VITE_API_BASE_URL ?? ''

const REFRESH_TOKEN_KEY = 'senpai.refreshToken'
const REFRESH_PATH = '/api/auth/refresh-token'
/** Web Lock shared by every tab of the shop, so only one of them spends the refresh token at a time. */
const REFRESH_LOCK = 'senpai.refresh'

/** Refresh this long before the access token's `exp`, so a request never goes out with a token about to die. */
const REFRESH_AHEAD_MS = 60_000

/**
 * The access token lives in memory only. The refresh token has to survive a reload, and the backend returns it in
 * the JSON body (not an HttpOnly cookie), so it is kept in localStorage until the backend changes that.
 * Each refresh token works once (the backend treats reuse as theft), so every refresh goes through one shared
 * in-flight promise and the new token is stored before anything else runs.
 */
let accessToken: string | null = null
let accessTokenExpiresAt: number | null = null
let refreshing: Promise<TokenResponse> | null = null
let onSessionLost: (notice?: string) => void = () => {}

export function getAccessToken(): string | null {
  return accessToken
}

export function hasStoredSession(): boolean {
  return readRefreshToken() !== null
}

/** Store the tokens from sign-in or a refresh. */
export function startSession(tokens: Pick<TokenResponse, 'accessToken' | 'refreshToken'>): void {
  accessToken = tokens.accessToken ?? null
  accessTokenExpiresAt = accessToken ? tokenExpiry(accessToken) : null
  writeRefreshToken(tokens.refreshToken ?? null)
}

export function clearSession(): void {
  accessToken = null
  accessTokenExpiresAt = null
  writeRefreshToken(null)
}

/** Called when the session can't be refreshed any more (expired, revoked, signed out elsewhere, banned). */
export function setSessionLostHandler(handler: (notice?: string) => void): void {
  onSessionLost = handler
}

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Query string values; null, undefined and "" are left out. */
  params?: Record<string, QueryValue>
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * Calls the API and returns the envelope's payload; throws {@link ApiError} for anything else.
 * A 401 on a non-auth path triggers one refresh (shared by concurrent callers) and one retry.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isAuthPath = path.startsWith('/api/auth/')
  if (!isAuthPath && isAccessTokenExpiring()) {
    // Best effort: if it fails the request still goes out and the 401 path takes over.
    await refreshSession().catch(() => undefined)
  }
  const first = await send(path, options)
  if (first.status === 401 && accessToken !== null && !isAuthPath) {
    try {
      await refreshSession()
    } catch {
      return parse<T>(first)
    }
    return parse<T>(await send(path, options))
  }
  return parse<T>(first)
}

/** Get a new access token with the stored refresh token. Concurrent callers share one request. */
export function refreshSession(): Promise<TokenResponse> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

/** On app start: turn a stored refresh token into a session, or resolve null when there is none. */
export async function restoreSession(): Promise<TokenResponse | null> {
  if (!hasStoredSession()) return null
  try {
    return await refreshSession()
  } catch {
    return null
  }
}

function isAccessTokenExpiring(now = Date.now()): boolean {
  return accessToken !== null && accessTokenExpiresAt !== null && accessTokenExpiresAt - now <= REFRESH_AHEAD_MS
}

/** The JWT's `exp` in milliseconds, or null when the token can't be read (then only a 401 triggers a refresh). */
export function tokenExpiry(token: string): number | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Every tab restores its session on load by spending the stored refresh token, and the backend ends the session
 * when a spent token is sent again. Two tabs opened together would do exactly that, so refreshes run one tab at a
 * time under a Web Lock, each reading the token from storage only once it holds the lock: the second tab then
 * spends the token the first one just stored. (Browsers without Web Locks refresh unguarded.)
 */
function doRefresh(): Promise<TokenResponse> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  // request() resolves to what the callback resolves to; its typing nests the promise.
  return locks ? (locks.request(REFRESH_LOCK, refreshWithStoredToken) as unknown as Promise<TokenResponse>) : refreshWithStoredToken()
}

async function refreshWithStoredToken(): Promise<TokenResponse> {
  const refreshToken = readRefreshToken()
  if (!refreshToken) throw new ApiError(401, 'Please sign in again.')
  // A network failure throws before the try: the stored token is kept so a later attempt can still succeed.
  const response = await send(REFRESH_PATH, { method: 'POST', body: { refreshToken } }, false)
  try {
    const tokens = await parse<TokenResponse>(response)
    startSession(tokens)
    return tokens
  } catch (error) {
    // Expired, revoked or reused refresh token: the session is over. A 5xx leaves it for another try.
    if (error instanceof ApiError && error.status < 500) {
      clearSession()
      onSessionLost(error.status === 403 ? error.message : undefined)
    }
    throw error
  }
}

async function send(path: string, options: RequestOptions, withToken = true): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  let body: BodyInit | undefined
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }
  if (withToken && accessToken) headers.Authorization = `Bearer ${accessToken}`

  try {
    return await fetch(BASE_URL + path + queryString(options.params), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, NETWORK_ERROR_MESSAGE)
  }
}

export function queryString(params?: Record<string, QueryValue>): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

async function parse<T>(response: Response): Promise<T> {
  let envelope: Envelope<T> | null = null
  try {
    envelope = (await response.json()) as Envelope<T>
  } catch {
    envelope = null
  }

  if (response.ok && envelope?.success !== false) {
    return (envelope?.payload ?? null) as T
  }

  const correlationId = envelope?.correlationId ?? null
  // 5xx messages are not written for shoppers; show ours and keep the id for a bug report.
  if (response.status >= 500) throw new ApiError(response.status, SERVER_ERROR_MESSAGE, correlationId)
  throw new ApiError(response.status, envelope?.message || SERVER_ERROR_MESSAGE, correlationId, envelope?.payload ?? null)
}

function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

function writeRefreshToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
    else localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Storage blocked (private mode): the session lasts until reload.
  }
}
