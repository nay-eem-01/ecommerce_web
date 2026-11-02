import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useRequestOtp, useVerifyOtp } from '../../api/auth'
import { errorMessage } from '../../api/errors'
import { localDigits } from '../../lib/phone'
import { useTitle } from '../../lib/useTitle'
import { Icon } from '../../ui/Icon'
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

  return (
    <div className="wrap">
      <div className="auth">
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 className="page-title" style={{ padding: 0 }}>
            Sign in or create an account
          </h1>
          <p className="muted">Track orders, save addresses and keep a wishlist.</p>
        </div>
        {endNotice && (
          <div className="notice warn" role="alert">
            {endNotice}
          </div>
        )}
        <div className="panel">
          {step === 'phone' ? (
            <form onSubmit={send} noValidate style={{ display: 'grid', gap: 20 }}>
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
                <div id="au-phone-msg" aria-live="polite">
                  {error ? (
                    <span className="err">
                      <Icon name="alert" />
                      {error}
                    </span>
                  ) : (
                    <span className="help">We text you a 6-digit code. New here? This also creates your account.</span>
                  )}
                </div>
              </div>
              <button className="btn lg block" type="submit" disabled={requestOtp.isPending}>
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
              style={{ display: 'grid', gap: 20 }}
            >
              <p>
                Enter the code we sent to <strong>+88 {digits}</strong>.{' '}
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setStep('phone')
                    setError('')
                  }}
                >
                  Change number
                </button>
              </p>
              <div className="field">
                <label htmlFor="au-code">6-digit code</label>
                <input
                  ref={codeInput}
                  className="input otp"
                  id="au-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  aria-invalid={error ? true : undefined}
                  aria-describedby="au-code-msg"
                  disabled={verifyOtp.isPending}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setCode(value)
                    // The code arrives by SMS; signing in as soon as it is complete saves a tap.
                    if (value.length === 6) verify(value)
                  }}
                />
                <div id="au-code-msg" aria-live="polite">
                  {error ? (
                    <span className="err">
                      <Icon name="alert" />
                      {error}
                    </span>
                  ) : (
                    <span className="help">The code works for 5 minutes.</span>
                  )}
                </div>
              </div>
              <button className="btn lg block" type="submit" disabled={verifyOtp.isPending}>
                {verifyOtp.isPending ? 'Checking…' : 'Verify and sign in'}
              </button>
              <button type="button" className="link" disabled={wait > 0 || requestOtp.isPending} onClick={() => send()}>
                {wait > 0 ? `Send a new code in ${wait} s` : 'Send a new code'}
              </button>
            </form>
          )}
        </div>
        {fromCheckout ? (
          <Link className="link" to="/checkout">
            Continue to checkout as a guest
          </Link>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>
            You can also check out as a guest. An account is never required to buy.
          </p>
        )}
      </div>
    </div>
  )
}
