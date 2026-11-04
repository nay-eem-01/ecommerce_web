import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useRequestOtp, useVerifyOtp } from '../../api/auth'
import { errorMessage } from '../../api/errors'
import { localDigits } from '../../lib/phone'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/icons'
import { CATEGORY_ART } from '../art/art'
import { ProductArt } from '../art/ProductArt'
import { CodeBoxes } from './CodeBoxes'
import { useToast } from '../../ui/Toast'
import { mergeGuestIntoAccount } from './mergeGuest'
import { firstName, useSession } from './session'

/** Only same-site paths are followed after sign-in (no open redirect through `?back=`). */
export function safeBack(back: string | null): string {
  return back && back.startsWith('/') && !back.startsWith('//') ? back : '/account'
}

/** Phone, then the 6-digit code from the SMS. The first sign-in creates the account; no password. */
export function SignInPage() {
  useTitle('Sign in')
  const { status, endNotice, signedIn } = useSession()
  const [params] = useSearchParams()
  const back = safeBack(params.get('back'))
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState(params.get('phone') ?? '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()
  const codeInput = useRef<HTMLInputElement>(null)
  // While the cart merges after sign-in, stay here instead of following the signed-in redirect below.
  const [finishing, setFinishing] = useState(false)

  // Tick while a resend is not allowed yet.
  useEffect(() => {
    if (resendAt <= now) return
    const timer = setTimeout(() => setNow(Date.now()), 1000)
    return () => clearTimeout(timer)
  }, [resendAt, now])

  if (status === 'signed-in' && !finishing) return <Navigate to={back} replace />

  const digits = localDigits(phone)

  function send(event?: FormEvent) {
    event?.preventDefault()
    if (!/^01[3-9]\d{8}$/.test(digits)) {
      setError('Use an 11-digit number starting with 01.')
      return
    }
    setError('')
    requestOtp.mutate(digits, {
      onSuccess: (sent) => {
        setStep('code')
        setCode('')
        setResendAt(Date.now() + (sent?.resendAfterSeconds ?? 60) * 1000)
        setNow(Date.now())
        requestAnimationFrame(() => codeInput.current?.focus())
      },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  function verify(value = code) {
    if (value.length !== 6) {
      setError('Enter all 6 digits from the SMS.')
      return
    }
    setError('')
    verifyOtp.mutate(
      { phone: digits, code: value, deviceLabel: 'Web browser' },
      {
        onSuccess: async (tokens) => {
          setFinishing(true)
          signedIn(tokens)
          try {
            await mergeGuestIntoAccount()
          } catch {
            toast('Signed in. Your cart could not be moved to your account yet; it is kept on this device.')
          }
          await queryClient.invalidateQueries({ queryKey: ['cart'] })
          await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
          toast(`Signed in as ${tokens.user.name ? firstName(tokens.user) : `+88 ${tokens.user.phone}`}`)
          navigate(back, { replace: true })
        },
        onError: (e) => {
          setError(errorMessage(e))
          setCode('')
          codeInput.current?.focus()
        },
      },
    )
  }

  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const fromCheckout = back === '/checkout'
  const errorLine = (id: string, help: string) => (
    <div id={id} aria-live="polite">
      {error ? (
        <span className="co-err" style={{ fontSize: 13 }}>
          <Icon name="alert" small />
          {error}
        </span>
      ) : (
        <span className="help">{help}</span>
      )}
    </div>
  )

  const form =
    step === 'phone' ? (
      <form onSubmit={send} noValidate className="si-form">
        <div className="field">
          <label htmlFor="au-phone">Mobile number</label>
          <div className="prefix">
            <span>+88</span>
            <input
              className="input"
              id="au-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="01XXXXXXXXX"
              value={phone}
              aria-invalid={error ? true : undefined}
              aria-describedby="au-phone-msg"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {errorLine('au-phone-msg', 'We text you a 6-digit code. New here? This also creates your account.')}
        </div>
        <button className="btn block" type="submit" disabled={requestOtp.isPending}>
          {requestOtp.isPending ? 'Sending…' : 'Send code'}
        </button>
      </form>
    ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          verify()
        }}
        noValidate
        className="si-form"
      >
        <p style={{ color: 'var(--text-2)' }}>
          Enter the code we sent to <b style={{ color: 'var(--text)' }}>+88 {digits}</b>.{' '}
          <button
            type="button"
            className="link"
            style={{ border: 0, background: 'transparent', padding: 0 }}
            onClick={() => {
              setStep('phone')
              setError('')
            }}
          >
            Change
          </button>
        </p>
        <CodeBoxes
          ref={codeInput}
          value={code}
          disabled={verifyOtp.isPending}
          invalid={!!error}
          describedBy="au-code-msg"
          onChange={(value) => {
            setCode(value)
            // The code arrives by SMS; signing in as soon as it is complete saves a tap.
            if (value.length === 6) verify(value)
          }}
        />
        {errorLine('au-code-msg', 'Signs you in as soon as all six digits are in. Code works for 5 minutes.')}
        <button className="btn block" type="submit" disabled={verifyOtp.isPending}>
          {verifyOtp.isPending ? 'Checking…' : 'Verify and sign in'}
        </button>
        <button
          type="button"
          className="link"
          style={{ border: 0, background: 'transparent', padding: 0, alignSelf: 'center', ...(wait > 0 ? { color: 'var(--muted)' } : {}) }}
          disabled={wait > 0 || requestOtp.isPending}
          onClick={() => send()}
        >
          {wait > 0 ? `Send a new code in ${wait} s` : 'Send a new code'}
        </button>
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
            Sign in with your phone.
          </p>
          <p className="display d-only si-hero-title">Your orders, wishlist and address in one place.</p>
        </div>
      </section>
      <section className="si-panel">
        <div className="si-col">
          <h1 className="display si-h1">Sign in with your phone</h1>
          <p className="d-only" style={{ color: 'var(--text-2)' }}>
            No password. New here? The same code creates your account.
          </p>
          {endNotice && (
            <div className="err-summary" role="alert" style={{ borderColor: 'var(--warn)' }}>
              {endNotice}
            </div>
          )}
          {form}
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
