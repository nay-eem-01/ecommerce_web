import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChangePassword } from '../../api/admin'
import { clearSession } from '../../api/client'
import { ApiError } from '../../api/errors'
import { useTitle } from '../../lib/useTitle'
import { useSession } from '../auth/session'

/** First sign-in of the bootstrap admin (and any staff later): set a new password, then sign in again with it. */
export function ChangePasswordPage() {
  useTitle('Set a new password')
  const { user } = useSession()
  const navigate = useNavigate()
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const mismatch = repeat.length > 0 && repeat !== next

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          // The backend has ended every session. Drop the tokens; the sign-in page ends the session state, so the guard
          // here does not redirect over its notice.
          clearSession()
          navigate('/admin/sign-in?notice=password-changed', { replace: true })
        },
      },
    )
  }

  return (
    <div className="app adm" style={{ display: 'block' }}>
      <main id="main">
        <form className="panel adm-form" onSubmit={submit} noValidate>
          <h1 className="adm-h1">Set a new password</h1>
          <p className="muted" style={{ fontSize: 14 }}>
            {user?.mustChangePassword
              ? 'This account was set up with a temporary password. Choose your own before you continue.'
              : 'Choose a new password. You will sign in again on every device.'}
          </p>
          <div className="field">
            <label htmlFor="pw-current">Current password</label>
            <input id="pw-current" className="input" type="password" autoComplete="current-password" value={current}
              onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pw-new">New password</label>
            <input id="pw-new" className="input" type="password" autoComplete="new-password" value={next}
              onChange={(e) => setNext(e.target.value)} aria-describedby="pw-help" />
            <span className="help" id="pw-help">8 to 64 characters with a letter, a number and a symbol, no spaces.</span>
          </div>
          <div className="field">
            <label htmlFor="pw-repeat">New password again</label>
            <input id="pw-repeat" className="input" type="password" autoComplete="new-password" value={repeat}
              onChange={(e) => setRepeat(e.target.value)} aria-invalid={mismatch} />
            {mismatch && <span className="err">The two passwords are different.</span>}
          </div>
          {change.error && (
            <p className="err" role="alert">
              {change.error instanceof ApiError ? change.error.message : 'Could not change the password. Try again.'}
            </p>
          )}
          <button className="btn block" type="submit" disabled={change.isPending || !current || !next || mismatch}>
            Save password
          </button>
        </form>
      </main>
    </div>
  )
}
