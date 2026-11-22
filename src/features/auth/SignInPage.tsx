import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEmailLink, useShopperSignIn } from '../../api/auth'
import type { TokenResponse } from '../../api/types'
import { GoogleButton } from './GoogleButton'
import { errorMessage } from '../../api/errors'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/icons'
import { CATEGORY_ART } from '../art/art'
import { ProductArt } from '../art/ProductArt'
import { useToast } from '../../ui/Toast'
import { mergeGuestIntoAccount } from './mergeGuest'
import { firstName, useSession } from './session'

/** Only same-site paths are followed after sign-in (no open redirect through `?back=`). */
export function safeBack(back: string | null): string {
  if (!back?.startsWith('/') || back.startsWith('//')) return '/account'
  const origin = 'https://storefront.invalid'
  try {
    return new URL(back, origin).origin === origin ? back : '/account'
  } catch {
    return '/account'
  }
}

export function SignInPage() {
  const { pathname, hash } = useLocation()
  const mode = pathname === '/verify-email' ? 'verify' : pathname === '/reset-password' ? 'reset' : 'sign-in'
  return <ShopperAuthForm key={pathname} mode={mode} token={new URLSearchParams(hash.slice(1)).get('token')} />
}

function ShopperAuthForm({ mode, token }: { mode: 'sign-in' | 'verify' | 'reset'; token: string | null }) {
  useTitle(mode === 'verify' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Sign in')
  const { status, endNotice, signedIn } = useSession()
  const [params] = useSearchParams()
  const back = safeBack(params.get('back'))
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [step, setStep] = useState<'login' | 'register' | 'forgot'>(params.get('mode') === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [finishing, setFinishing] = useState(false)
  const signIn = useShopperSignIn()
  const emailLink = useEmailLink()
  const fromCheckout = back === '/checkout'
  const completingLink = mode !== 'sign-in'
  const askingForLink = !completingLink && step !== 'login'
  const title = mode === 'reset' ? 'Reset your password' : mode === 'verify' || step === 'register'
    ? 'Create an account' : step === 'forgot' ? 'Forgot your password?' : 'Sign in'

  if (status === 'signed-in' && !finishing && !completingLink) return <Navigate to={back} replace />

  async function finish(tokens: TokenResponse) {
    setFinishing(true)
    signedIn(tokens)
    try {
      await mergeGuestIntoAccount()
    } catch {
      toast('Signed in. Your cart could not be moved to your account yet and is kept on this device.')
    }
    await queryClient.invalidateQueries({ queryKey: ['cart'] })
    await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    toast(`Signed in as ${tokens.user.name ? firstName(tokens.user) : (tokens.user.email ?? 'shopper')}`)
    navigate(back, { replace: true })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (askingForLink) {
      emailLink.mutate({ mode: step === 'register' ? 'register' : 'forgot', email: email.trim() }, {
        onSuccess: () => setNotice('If this address is eligible, we sent you a link. Check your inbox.'),
        onError: (e) => setError(errorMessage(e)),
      })
      return
    }
    if (completingLink && !token) {
      setError('Open the link from your email or request a new one.')
      return
    }
    signIn.mutate({ mode, email: email.trim(), password, token }, {
      onSuccess: finish,
      onError: (e) => setError(errorMessage(e)),
    })
  }

  function changeStep(next: typeof step) {
    setStep(next)
    setPassword('')
    setNotice('')
    setError('')
  }

  const busy = signIn.isPending || emailLink.isPending || finishing
  const form = (
    <form className="si-form" onSubmit={submit}>
      {!completingLink && (
        <div className="field">
          <label htmlFor="au-email">Email</label>
          <input className="input" id="au-email" type="email" autoComplete="email" required maxLength={254}
            value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      )}
      {!askingForLink && (
        <div className="field">
          <label htmlFor="au-password">{completingLink ? 'New password' : 'Password'}</label>
          <input className="input" id="au-password" type="password" required maxLength={64}
            autoComplete={completingLink ? 'new-password' : 'current-password'}
            value={password} onChange={(event) => setPassword(event.target.value)} />
          {completingLink && <span className="help">Use 8 to 64 characters with a letter, number and symbol.</span>}
        </div>
      )}
      {error && <p className="co-err" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button className="btn block" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : askingForLink ? 'Send email link' : completingLink ? 'Set password and sign in' : 'Sign in'}
      </button>
      {completingLink ? <Link className="link" to="/sign-in">Back to sign in</Link> : (
        <>
          {step === 'login' && <button className="link" type="button" disabled={busy} onClick={() => changeStep('forgot')}>Forgot password?</button>}
          <button className="link" type="button" disabled={busy}
            onClick={() => changeStep(step === 'login' ? 'register' : 'login')}>
            {step === 'login' ? 'Create an account' : 'Back to sign in'}
          </button>
        </>
      )}
    </form>
  )

  const guest = (
    <Link className="link" to={fromCheckout ? '/checkout' : '/shop'} style={{ fontSize: 14 }}>
      {fromCheckout ? 'Continue to checkout as a guest' : 'Continue as a guest'}
    </Link>
  )

  return (
    <div className="si">
      <section className="hero si-hero">
        <span className="sign" aria-hidden="true">
          おかえり
        </span>
        <div className="si-art d-only" aria-hidden="true">
          <ProductArt spec={{ ...CATEGORY_ART.bags, kind: 'set', a: '#f2a7c3', b: '#1d1838', c: '#ff5fa2', face: 'fox', eye: '#e0245e' }} />
        </div>
        <div className="scrim d-only" />
        <div className="si-hero-copy">
          <p className="eyebrow pink">Welcome back</p>
          <p className="display ph-only si-hero-title" aria-hidden="true">
            Your account
          </p>
          <p className="display d-only si-hero-title">Your orders, wishlist and address in one place.</p>
        </div>
      </section>
      <section className="si-panel">
        <div className="si-col">
          <h1 className="display si-h1">{title}</h1>
          {endNotice && (
            <div className="err-summary" role="alert" style={{ borderColor: 'var(--warn)' }}>
              {endNotice}
            </div>
          )}
          {form}
          {!completingLink && step !== 'forgot' && <GoogleButton disabled={busy} onSignedIn={finish} />}
          <div className="ph-only si-perks">
            <p className="eyebrow">With an account you can</p>
            <p className="note">
              <Icon name="truck" />
              Track every order in one place
            </p>
            <p className="note">
              <Icon name="heart" />
              Keep a wishlist across phone and laptop
            </p>
            <p className="note">
              <Icon name="home" />
              Check out faster with a saved address
            </p>
          </div>
          <div className="si-guest">
            <p className="d-only" style={{ fontSize: 14, color: 'var(--text-2)' }}>
              An account is never required to buy.
            </p>
            {guest}
          </div>
        </div>
      </section>
    </div>
  )
}
