import { useMutation } from '@tanstack/react-query'
import { api } from './client'
import type { Schemas, TokenResponse } from './types'

const signInPaths = {
  'sign-in': '/api/auth/sign-in',
  verify: '/api/auth/verify-email',
  reset: '/api/auth/password/reset',
}

export function useShopperSignIn() {
  return useMutation({
    mutationFn: ({ mode, email, password, token }: {
      mode: keyof typeof signInPaths
      email: Schemas['SignInRequest']['email']
      password: Schemas['SignInRequest']['password']
      token: string | null
    }) => api<TokenResponse>(signInPaths[mode], {
      method: 'POST',
      body: mode === 'sign-in' ? { email, password } : { token, password },
    }),
  })
}

export function useEmailLink() {
  return useMutation({
    mutationFn: ({ mode, email }: { mode: 'register' | 'forgot' } & Schemas['EmailRequest']) =>
      api<null>(mode === 'register' ? '/api/auth/register' : '/api/auth/password/forgot', {
        method: 'POST',
        body: { email },
      }),
  })
}

export function useGoogleSignIn(onSuccess: (tokens: TokenResponse) => Promise<void>) {
  return useMutation({
    mutationFn: (idToken: Schemas['GoogleRequest']['idToken']) => api<TokenResponse>('/api/auth/google', { method: 'POST', body: { idToken } }),
    onSuccess,
  })
}

/** Ends this session on the server. */
export function signOut(): Promise<null> {
  return api<null>('/api/auth/sign-out', { method: 'POST' })
}
