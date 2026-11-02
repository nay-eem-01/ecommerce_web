import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { signOut as signOutRequest } from '../../api/auth'
import { clearSession, hasStoredSession, restoreSession, setSessionLostHandler, startSession } from '../../api/client'
import type { Me, TokenResponse } from '../../api/types'

type Status = 'restoring' | 'anonymous' | 'signed-in'

interface Session {
  status: Status
  user: Me | null
  /** Why the last session ended (a ban, for example), for sign-in to show; null otherwise. */
  endNotice: string | null
  signedIn: (tokens: TokenResponse) => void
  signOut: () => Promise<void>
  /** Reflect an edit of the signed-in account without a round trip. */
  updateUser: (changes: Partial<Me>) => void
}

const SessionContext = createContext<Session | null>(null)

/**
 * Who is signed in. On start a stored refresh token is turned back into a session; until that settles the status
 * is `restoring`, so account pages wait instead of bouncing a signed-in shopper to sign-in.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>(() => (hasStoredSession() ? 'restoring' : 'anonymous'))
  const [user, setUser] = useState<Me | null>(null)
  const [endNotice, setEndNotice] = useState<string | null>(null)

  const becomeAnonymous = useCallback(() => {
    setUser(null)
    setStatus('anonymous')
    // Cached reads were made as the old shopper (cart, wishlist, orders); drop them.
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setSessionLostHandler((notice) => {
      if (notice) setEndNotice(notice)
      becomeAnonymous()
    })
    return () => setSessionLostHandler(() => {})
  }, [becomeAnonymous])

  useEffect(() => {
    if (!hasStoredSession()) return
    let active = true
    restoreSession().then((tokens) => {
      if (!active) return
      if (tokens?.user) {
        setUser(tokens.user)
        setStatus('signed-in')
      } else {
        setStatus('anonymous')
      }
    })
    return () => {
      active = false
    }
  }, [])

  const signedIn = useCallback(
    (tokens: TokenResponse) => {
      startSession(tokens)
      setEndNotice(null)
      setUser(tokens.user ?? null)
      setStatus('signed-in')
      queryClient.clear()
    },
    [queryClient],
  )

  const signOut = useCallback(async () => {
    try {
      await signOutRequest()
    } catch {
      // Signed out here either way; the server-side session expires on its own.
    }
    clearSession()
    setEndNotice(null)
    becomeAnonymous()
  }, [becomeAnonymous])

  const updateUser = useCallback((changes: Partial<Me>) => {
    setUser((current) => (current ? { ...current, ...changes } : current))
  }, [])

  const value = useMemo(
    () => ({ status, user, endNotice, signedIn, signOut, updateUser }),
    [status, user, endNotice, signedIn, signOut, updateUser],
  )
  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside SessionProvider')
  return session
}

/** The first word of the shopper's name, or "Account" when they have not given one yet. */
export function firstName(user: Me | null): string {
  return user?.name?.trim().split(/\s+/)[0] || 'Account'
}
