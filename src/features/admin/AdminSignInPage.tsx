import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useStaffSignIn } from '../../api/admin'
import { ApiError } from '../../api/errors'
import { useTitle } from '../../lib/useTitle'
import { useSession } from '../auth/session'
import { isStaff } from './RequireAdmin'

/** `back` only within the admin area, so the link cannot send staff to another site. */
export function adminBack(back: string | null): string {
  return back && back.startsWith('/admin') && !back.startsWith('/admin/sign-in') ? back : '/admin'
}

export function AdminSignInPage() {
  useTitle('Staff sign in')
  const { status, user, signedIn, signOut } = useSession()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const signIn = useStaffSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const back = adminBack(params.get('back'))
  const notice = params.get('notice')

  // After a password change the tokens are already gone; end the session state here.
  useEffect(() => {
    if (notice === 'password-changed' && status === 'signed-in') void signOut()
  }, [notice, status, signOut])

  if (status === 'signed-in' && isStaff(user?.roles) && !notice) return <Navigate to={back} replace />
  const wrongAccount = status === 'signed-in' && !isStaff(user?.roles) && !notice

  const submit = (e: FormEvent) => {
    e.preventDefault()
    signIn.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (tokens) => {
          signedIn(tokens)
          if (!isStaff(tokens.user?.roles)) return
          navigate(tokens.user?.mustChangePassword ? '/admin/password' : back, { replace: true })
        },
      },
    )
  }

  return (
    <div className="app adm" style={{ display: 'block' }}>
      <main id="main">
        <form className="panel adm-form" onSubmit={submit} noValidate>
          <Link className="mark" to="/">
            senpai<span>.</span>supply
          </Link>
          <h1 className="adm-h1">Staff sign in</h1>
          {notice === 'password-changed' && <p className="okmsg" style={{ fontSize: 14 }}>Password changed. Sign in with the new one.</p>}
          {wrongAccount && (
            <p className="err" role="alert">
              This account has no staff access. Sign in with a staff email.
            </p>
          )}
          <div className="field">
            <label htmlFor="adm-email">Email</label>
            <input id="adm-email" className="input" type="email" autoComplete="username" required value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="adm-password">Password</label>
            <input id="adm-password" className="input" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {signIn.error && (
            <p className="err" role="alert">
              {signIn.error instanceof ApiError ? signIn.error.message : 'Could not sign in. Try again.'}
            </p>
          )}
          <button className="btn block" type="submit" disabled={signIn.isPending || !email || !password}>
            {signIn.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}
