import { useState, type FormEvent } from 'react'
import { useAdminCategories, useAdminCharacters, useDeleteCollection, useSaveCollection, type CollectionBody, type CollectionKind } from '../../api/admin'
import { ApiError } from '../../api/errors'
import type { Category, Character } from '../../api/types'
import { PageLoading } from '../../layout/AppLayout'
import { useTitle } from '../../lib/useTitle'
import { slugify } from './editor/productForm'

type Row = (Category | Character) & { comingSoon?: boolean }

/** Categories and characters: the shop's two ways of grouping products. */
export function CatalogPage() {
  useTitle('Catalog')
  const categories = useAdminCategories()
  const characters = useAdminCharacters()
  return (
    <>
      <h1 className="adm-h1">Catalog</h1>
      <Collection kind="categories" title="Categories" singular="category" rows={categories.data} pending={categories.isPending} />
      <Collection kind="characters" title="Characters" singular="character" rows={characters.data} pending={characters.isPending} />
    </>
  )
}

const blank = (comingSoon: boolean): CollectionBody => ({ slug: '', name: '', label: null, blurb: null, sortOrder: 0, active: true, ...(comingSoon ? { comingSoon: false } : {}) })

function Collection({ kind, title, singular, rows, pending }: { kind: CollectionKind; title: string; singular: string; rows?: Row[]; pending: boolean }) {
  const isCategory = kind === 'categories'
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const remove = useDeleteCollection(kind)
  const [message, setMessage] = useState<string | null>(null)

  const del = (row: Row) => {
    setMessage(null)
    if (!window.confirm(`Delete the ${singular} "${row.name}"? This cannot be undone.`)) return
    remove.mutate(row.id, { onError: (e) => setMessage(e instanceof ApiError ? e.message : 'Could not delete. Try again.') })
  }

  return (
    <section className="panel adm-card" aria-labelledby={`h-${kind}`}>
      <div className="adm-head">
        <h2 id={`h-${kind}`}>{title}</h2>
        {editing !== 'new' && <button type="button" className="tbtn" onClick={() => setEditing('new')}>New {singular}</button>}
      </div>
      {message && <p className="err" role="alert">{message}</p>}
      {editing === 'new' && <CollectionForm kind={kind} singular={singular} id={null} initial={blank(isCategory)} onDone={() => setEditing(null)} />}
      {pending && <PageLoading />}
      {rows && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Name</th><th scope="col">Sign</th><th scope="col" className="num">Order</th>
                <th scope="col" className="num">Products</th><th scope="col">Shown</th><th scope="col"><span className="vh">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="muted">No {title.toLowerCase()} yet.</td></tr>}
              {rows.map((row) =>
                editing === row.id ? (
                  <tr key={row.id}>
                    <td colSpan={6}>
                      <CollectionForm kind={kind} singular={singular} id={row.id} onDone={() => setEditing(null)}
                        initial={{ slug: row.slug, name: row.name, label: row.label, blurb: row.blurb, sortOrder: row.sortOrder, active: row.active,
                          ...(isCategory ? { comingSoon: !!row.comingSoon } : {}) }} />
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td style={{ whiteSpace: 'normal' }}>{row.name}<div className="muted" style={{ fontSize: 12 }}>/{row.slug}</div></td>
                    <td>{row.label}</td>
                    <td className="num">{row.sortOrder}</td>
                    <td className="num">{row.productCount}</td>
                    <td>{!row.active ? 'Hidden' : row.comingSoon ? 'Coming soon' : 'Yes'}</td>
                    <td>
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="tbtn" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row.id)}>Edit</button>
                        <button type="button" className="tbtn" aria-label={`Delete ${row.name}`} disabled={remove.isPending} onClick={() => del(row)}>Delete</button>
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function CollectionForm({ kind, singular, id, initial, onDone }: { kind: CollectionKind; singular: string; id: number | null; initial: CollectionBody; onDone: () => void }) {
  const save = useSaveCollection(kind)
  const [form, setForm] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(id !== null)
  const set = <K extends keyof CollectionBody>(k: K, v: CollectionBody[K]) => setForm((f) => ({ ...f, [k]: v }))
  const fid = (name: string) => `${kind}-${id ?? 'new'}-${name}`

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const body = { ...form, name: form.name.trim(), slug: form.slug.trim(), label: form.label?.trim() || null, blurb: form.blurb?.trim() || null }
    save.mutate({ id, body }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} noValidate className="adm-section" style={{ padding: 0 }} aria-label={id === null ? `New ${singular}` : `Edit ${initial.name}`}>
      <div className="adm-fields">
        <div className="field">
          <label htmlFor={fid('name')}>Name</label>
          <input id={fid('name')} className="input" maxLength={60} value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))} />
        </div>
        <div className="field">
          <label htmlFor={fid('slug')}>Address name (slug)</label>
          <input id={fid('slug')} className="input" maxLength={60} value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value) }} />
        </div>
        <div className="field">
          <label htmlFor={fid('label')}>Sign</label>
          <input id={fid('label')} className="input" maxLength={8} value={form.label ?? ''} onChange={(e) => set('label', e.target.value)} />
          <span className="help">The Japanese sign on its tile, like 狐.</span>
        </div>
        <div className="field">
          <label htmlFor={fid('sortOrder')}>Order</label>
          <input id={fid('sortOrder')} className="input" inputMode="numeric" value={String(form.sortOrder)}
            onChange={(e) => set('sortOrder', Number(e.target.value.replace(/\D/g, '')) || 0)} />
        </div>
        <div className="field wide">
          <label htmlFor={fid('blurb')}>Blurb</label>
          <input id={fid('blurb')} className="input" maxLength={160} value={form.blurb ?? ''} onChange={(e) => set('blurb', e.target.value)} />
        </div>
        <label className="adm-check"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Shown in the shop</label>
        {form.comingSoon !== undefined && (
          <label className="adm-check"><input type="checkbox" checked={form.comingSoon} onChange={(e) => set('comingSoon', e.target.checked)} /> Coming soon (early-access signups)</label>
        )}
      </div>
      {save.error && <p className="err" role="alert">{save.error instanceof ApiError ? save.error.message : 'Could not save. Try again.'}</p>}
      <div className="adm-actions">
        <button className="btn" type="submit" disabled={save.isPending}>{id === null ? `Create ${singular}` : 'Save'}</button>
        <button className="tbtn" type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}
