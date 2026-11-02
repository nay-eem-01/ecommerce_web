import { api, clearSession, getAccessToken, refreshSession, setSessionLostHandler, startSession, tokenExpiry } from './client'
import { ApiError } from './errors'
import { bodyOf, envelope, mockApi } from '../test/api'
import { tokens } from '../test/fixtures'

function jwt(expSeconds: number) {
  const part = btoa(JSON.stringify({ exp: expSeconds })).replace(/=+$/, '')
  return `h.${part}.s`
}

afterEach(() => clearSession())

describe('api', () => {
  it('returns the payload of the envelope', async () => {
    mockApi({ 'GET /api/categories': () => envelope(200, [{ slug: 'figures' }]) })
    await expect(api('/api/categories')).resolves.toEqual([{ slug: 'figures' }])
  })

  it('throws the backend message and keeps the payload of a 409', async () => {
    mockApi({ 'POST /api/orders': () => envelope(409, { productIds: [3] }, 'Only 1 left of Ronin.', 'c-1') })
    const error = await api('/api/orders', { method: 'POST', body: {} }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Only 1 left of Ronin.')
    expect((error as ApiError).payload).toEqual({ productIds: [3] })
    expect((error as ApiError).correlationId).toBe('c-1')
  })

  it('hides 5xx details behind a friendly message but keeps the correlation id', async () => {
    mockApi({ 'GET /api/products': () => envelope(500, null, 'NullPointerException', 'c-9') })
    const error = (await api('/api/products').catch((e: unknown) => e)) as ApiError
    expect(error.message).toBe('Something went wrong on our side. Please try again.')
    expect(error.correlationId).toBe('c-9')
  })

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = (await api('/api/products').catch((e: unknown) => e)) as ApiError
    expect(error.status).toBe(0)
  })

  it('refreshes once on a 401, stores the new refresh token and retries', async () => {
    startSession({ accessToken: 'old', refreshToken: 'refresh-1' })
    let calls = 0
    const fetchMock = mockApi({
      'GET /api/cart': (_url, init) => {
        calls += 1
        const auth = (init?.headers as Record<string, string> | undefined)?.Authorization
        return auth === 'Bearer access-1' ? envelope(200, { items: [] }) : envelope(401, null, 'Session ended.')
      },
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
    })
    await expect(api('/api/cart')).resolves.toEqual({ items: [] })
    expect(calls).toBe(2)
    expect(getAccessToken()).toBe('access-1')
    expect(localStorage.getItem('senpai.refreshToken')).toBe('refresh-2')
    const refresh = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/refresh-token'))
    expect(bodyOf(refresh?.[1])).toEqual({ refreshToken: 'refresh-1' })
  })

  it('shares one refresh between concurrent callers, so a single-use token is sent once', async () => {
    startSession({ accessToken: 'old', refreshToken: 'refresh-1' })
    const fetchMock = mockApi({ 'POST /api/auth/refresh-token': () => envelope(200, tokens) })
    await Promise.all([refreshSession(), refreshSession(), refreshSession()])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('takes the refresh lock and spends the token another tab stored meanwhile', async () => {
    startSession({ accessToken: 'old', refreshToken: 'refresh-1' })
    const request = vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
      // While this tab waited for the lock, another tab rotated the token and stored its new one.
      localStorage.setItem('senpai.refreshToken', 'refresh-from-other-tab')
      return callback()
    })
    vi.stubGlobal('navigator', { ...navigator, locks: { request } })
    const fetchMock = mockApi({ 'POST /api/auth/refresh-token': () => envelope(200, tokens) })
    await refreshSession()
    expect(request).toHaveBeenCalledWith('senpai.refresh', expect.any(Function))
    expect(bodyOf(fetchMock.mock.calls[0][1])).toEqual({ refreshToken: 'refresh-from-other-tab' })
    expect(localStorage.getItem('senpai.refreshToken')).toBe('refresh-2')
  })

  it('ends the session when the refresh token is refused', async () => {
    startSession({ accessToken: 'old', refreshToken: 'refresh-1' })
    const lost = vi.fn()
    setSessionLostHandler(lost)
    mockApi({ 'POST /api/auth/refresh-token': () => envelope(401, null, 'Please sign in again.') })
    await expect(refreshSession()).rejects.toBeInstanceOf(ApiError)
    expect(lost).toHaveBeenCalled()
    expect(localStorage.getItem('senpai.refreshToken')).toBeNull()
  })

  it('keeps the refresh token after a network failure, for a later try', async () => {
    startSession({ accessToken: 'old', refreshToken: 'refresh-1' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(refreshSession()).rejects.toBeInstanceOf(ApiError)
    expect(localStorage.getItem('senpai.refreshToken')).toBe('refresh-1')
  })

  it('refreshes ahead of expiry instead of waiting for a 401', async () => {
    startSession({ accessToken: jwt(Math.floor(Date.now() / 1000) + 30), refreshToken: 'refresh-1' })
    const fetchMock = mockApi({
      'POST /api/auth/refresh-token': () => envelope(200, tokens),
      'GET /api/users/me': () => envelope(200, { id: 5 }),
    })
    await api('/api/users/me')
    expect(String(fetchMock.mock.calls[0][0])).toContain('/refresh-token')
  })

  it('reads the expiry of a JWT', () => {
    expect(tokenExpiry(jwt(100))).toBe(100_000)
    expect(tokenExpiry('not-a-jwt')).toBeNull()
  })
})
