import { useEffect, useRef } from 'react'
import { useGoogleSignIn } from '../../api/auth'
import { errorMessage } from '../../api/errors'
import type { TokenResponse } from '../../api/types'

const CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID

interface GoogleId {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let script: Promise<GoogleId> | undefined

function loadGoogle(): Promise<GoogleId> {
  if (window.google) return Promise.resolve(window.google.accounts.id)
  script ??= new Promise<GoogleId>((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = 'https://accounts.google.com/gsi/client'
    tag.async = true
    tag.onload = () => {
      if (window.google) resolve(window.google.accounts.id)
      else reject(new Error('Google sign-in did not load'))
    }
    tag.onerror = () => reject(new Error('Google sign-in did not load'))
    document.head.append(tag)
  }).catch((error: unknown) => {
    script = undefined
    throw error
  })
  return script
}

export function GoogleButton({ disabled, onSignedIn }: {
  disabled: boolean
  onSignedIn: (tokens: TokenResponse) => Promise<void>
}) {
  const slot = useRef<HTMLDivElement>(null)
  const mutation = useGoogleSignIn(onSignedIn)
  const { mutate } = mutation
  const busy = useRef(disabled || mutation.isPending)

  useEffect(() => {
    busy.current = disabled || mutation.isPending
  }, [disabled, mutation.isPending])

  useEffect(() => {
    if (!CLIENT_ID) return
    const clientId = CLIENT_ID
    let active = true
    loadGoogle().then((google) => {
      if (!active || !slot.current) return
      google.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (active && !busy.current) mutate(credential)
        },
      })
      google.renderButton(slot.current, {
        theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'en',
      })
    }).catch(() => {
      // The email form remains available when Google's script is blocked.
    })
    return () => { active = false }
  }, [mutate])

  if (!CLIENT_ID) return null
  return (
    <div>
      <div ref={slot} inert={disabled || mutation.isPending} />
      {mutation.isPending && <p role="status">Signing in with Google…</p>}
      {mutation.isError && <p className="co-err" role="alert">{errorMessage(mutation.error)}</p>}
    </div>
  )
}
