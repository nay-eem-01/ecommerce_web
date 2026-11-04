import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminUsers, useSetUserStatus } from '../../api/admin'
import { ApiError } from '../../api/errors'
import type { AdminUser } from '../../api/types'
import { PageLoading } from '../../layout/AppLayout'
import { shortDate } from '../../lib/dates'
import { useTitle } from '../../lib/useTitle'

/** Accounts, searched by name, phone or email; ban stops sign-in and ends the account's sessions. */
export function UsersPage() {
  useTitle('Users')
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const pageNo = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const [text, setText] = useState(q)
  const { data, isPending, isError, error } = useAdminUsers(q, pageNo)
  const setStatus = useSetUserStatus()
  const [message, setMessage] = useState<string | null>(null)

  const search = (e: FormEvent) => {
    e.preventDefault()
    setParams(text.trim() ? { q: text.trim() } : {})
  }

  const toggle = (u: AdminUser) => {
    setMessage(null)
    const ban = u.status === 'ACTIVE'
    const who = u.name || u.phone || u.email
    if (!window.confirm(ban ? `Suspend ${who}? They are signed out and cannot sign in.` : `Allow ${who} to sign in again?`)) return
    setStatus.mutate({ id: u.id, status: ban ? 'BANNED' : 'ACTIVE' }, {
      onError: (e) => setMessage(e instanceof ApiError ? e.message : 'Could not update the account. Try again.'),
    })
  }

  return (
    <>
      <div className="adm-head">
        <h1 className="adm-h1">Users</h1>
        <form className="adm-filters" onSubmit={search} role="search">
          <label className="vh" htmlFor="user-q">Name, phone or email</label>
          <input id="user-q" className="input" placeholder="Name, phone or email" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="tbtn" type="submit">Search</button>
        </form>
      </div>
      {message && <p className="err" role="alert">{message}</p>}
      {isPending && <PageLoading />}
      {isError && <p className="err" role="alert">{error.message}</p>}
      {data && (
        <div className="panel adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Phone</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Joined</th><th scope="col">Status</th><th scope="col"><span className="vh">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.content.length === 0 && <tr><td colSpan={7} className="muted">No accounts match.</td></tr>}
              {data.content.map((u) => (
                <tr key={u.id}>
                  <td>{u.name ?? <span className="muted">No name yet</span>}</td>
                  <td>{u.phone}</td>
                  <td>{u.email}</td>
                  <td>{u.roles.includes('ADMIN') ? 'Staff' : 'Shopper'}</td>
                  <td>{shortDate(u.creationDate)}</td>
                  <td>{u.status === 'BANNED' ? <span className="tag warn">Suspended</span> : 'Active'}</td>
                  <td>
                    <button type="button" className="tbtn" disabled={setStatus.isPending} onClick={() => toggle(u)}
                      aria-label={`${u.status === 'ACTIVE' ? 'Suspend' : 'Allow back'} ${u.name || u.phone || u.email}`}>
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Allow back'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.totalPages > 1 && (
        <nav className="adm-filters" aria-label="Pages">
          <button className="tbtn" type="button" disabled={pageNo === 0} onClick={() => setParams({ ...(q ? { q } : {}), page: String(pageNo - 1) })}>Previous</button>
          <span className="muted" style={{ fontSize: 13 }}>Page {pageNo + 1} of {data.totalPages}</span>
          <button className="tbtn" type="button" disabled={data.last} onClick={() => setParams({ ...(q ? { q } : {}), page: String(pageNo + 1) })}>Next</button>
        </nav>
      )}
    </>
  )
}
