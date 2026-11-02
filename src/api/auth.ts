import { useMutation } from '@tanstack/react-query'
import { api } from './client'
import type { OtpSent, Schemas, TokenResponse } from './types'

/** Texts a 6-digit code; also the first step of creating an account. 429 after too many requests. */
export function useRequestOtp() {
  return useMutation({
    mutationFn: (phone: string) => api<OtpSent>('/api/auth/otp/request', { method: 'POST', body: { phone } }),
  })
}

/** Checks the code and signs in; the backend creates the account on first sign-in. */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: (request: Schemas['OtpVerifyRequest']) =>
      api<TokenResponse>('/api/auth/otp/verify', { method: 'POST', body: request }),
  })
}

/** Ends this session on the server. */
export function signOut(): Promise<null> {
  return api<null>('/api/auth/sign-out', { method: 'POST' })
}
