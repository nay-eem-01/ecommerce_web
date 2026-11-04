import { useState, type FormEvent } from 'react'
import { useEarlyAccess } from '../../api/catalog'
import { errorMessage } from '../../api/errors'
import type { Category } from '../../api/types'
import { localDigits, phoneError } from '../../lib/phone'
import { Icon } from '../../ui/icons'

/** "Get first access when the drop opens": a phone or an email for a coming-soon category. */
export function EarlyAccessDialog({ category, onClose }: { category: Category; onClose: () => void }) {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const signUp = useEarlyAccess()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!phone.trim() && !email.trim()) return setError('Enter a mobile number or an email so we can tell you.')
    if (phone.trim() && phoneError(phone)) return setError(phoneError(phone))
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('This email looks incomplete. Check for the @ and the domain.')
    setError('')
    signUp.mutate(
      { categorySlug: category.slug, phone: phone.trim() ? localDigits(phone) : undefined, email: email.trim() || undefined },
      { onError: (e) => setError(errorMessage(e)) },
    )
  }

  return (
    <>
      <button className="scrim-fill" aria-label="Close" onClick={onClose} />
      <div className="dialog" role="dialog" aria-labelledby="ea-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p className="eyebrow pink">Coming soon{category.label ? ` · ${category.label}` : ''}</p>
            <h2 id="ea-title" className="display" style={{ fontSize: 24, marginTop: 6 }}>
              {category.name}: get first access
            </h2>
          </div>
          <button className="ibtn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {signUp.isSuccess ? (
          <>
            <p style={{ color: 'var(--text-2)' }}>You are on the list. We will tell you first when the drop opens.</p>
            <button className="btn block" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{category.blurb ?? 'A new drop is on the way.'} One message when it opens, nothing else.</p>
            <div className="field">
              <label htmlFor="ea-phone">Mobile number</label>
              <div className="prefix">
                <span>+88</span>
                <input className="input" id="ea-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="ea-email">
                Or email <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
              </label>
              <input className="input" id="ea-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && (
              <p className="err" role="alert">
                <Icon name="alert" />
                {error}
              </p>
            )}
            <button className="btn block" type="submit" disabled={signUp.isPending}>
              {signUp.isPending ? 'Adding you…' : 'Get first access'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
