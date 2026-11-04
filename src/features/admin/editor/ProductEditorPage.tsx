import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAdminCategories, useAdminCharacters, useAdminProductList, useArchiveProduct, useProductEdit, useSaveProduct } from '../../../api/admin'
import { ApiError } from '../../../api/errors'
import type { MediaKind, ProductStatus } from '../../../api/types'
import { PageLoading } from '../../../layout/AppLayout'
import { useTitle } from '../../../lib/useTitle'
import { ImageList } from './ImageList'
import { emptyForm, fieldId, fromEdit, newKey, slugify, toRequest, validate, type ImageItem, type ProductForm } from './productForm'
import { LEAVE_MESSAGE, useLeaveGuard } from './useLeaveGuard'

const STATUSES: Array<[ProductStatus, string]> = [['DRAFT', 'Draft (hidden)'], ['ACTIVE', 'On sale'], ['ARCHIVED', 'Archived']]

/** Create (`/admin/products/new`) or edit (`/admin/products/:id`) a product: the whole document, saved at once. */
export function ProductEditorPage() {
  const { id: idParam } = useParams()
  const id = idParam && idParam !== 'new' ? Number(idParam) : null
  const loaded = useProductEdit(id)
  if (id !== null && loaded.isPending) return <PageLoading />
  if (id !== null && (loaded.isError || !loaded.data)) {
    return (
      <div className="empty">
        <p>{loaded.error instanceof ApiError && loaded.error.status === 404 ? 'No product with that id.' : 'Could not load the product.'}</p>
        <Link className="link" to="/admin/products">Back to products</Link>
      </div>
    )
  }
  // keyed so a different product starts from its own document
  return <Editor key={id ?? 'new'} id={id} initial={loaded.data ? fromEdit(loaded.data) : emptyForm()} />
}

function Editor({ id, initial }: { id: number | null; initial: ProductForm }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(() => JSON.stringify(toRequest(initial)))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(id !== null)
  const save = useSaveProduct()
  const archive = useArchiveProduct()
  const categories = useAdminCategories()
  const characters = useAdminCharacters()
  const allProducts = useAdminProductList('')
  useTitle(id === null ? 'New product' : `Edit ${initial.name}`)

  const uploading = Object.values(form.images).some((list) => list.some((i) => i.status === 'queued' || i.status === 'uploading'))
  const dirty = JSON.stringify(toRequest(form)) !== saved || uploading
  useLeaveGuard(dirty)

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setImages = useCallback(
    (kind: MediaKind) => (update: (items: ImageItem[]) => ImageItem[]) =>
      setForm((f) => ({ ...f, images: { ...f.images, [kind]: update(f.images[kind]) } })),
    [],
  )
  const photos = useMemo(() => setImages('PHOTO'), [setImages])
  const frames = useMemo(() => setImages('SPIN_FRAME'), [setImages])
  const story = useMemo(() => setImages('STORY'), [setImages])

  const showErrors = (found: Record<string, string>) => {
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      const el = document.getElementById(fieldId(first))
      el?.scrollIntoView?.({ block: 'center' })
      el?.focus()
    }
  }

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setBanner(null)
    const local = validate(form)
    if (Object.keys(local).length) return showErrors(local)
    const body = toRequest(form)
    save.mutate(
      { id, body },
      {
        onSuccess: (product) => {
          setErrors({})
          setSaved(JSON.stringify(body))
          setNotice('Saved.')
          if (id === null) navigate(`/admin/products/${product.id}`, { replace: true })
        },
        onError: (error) => {
          const field = error instanceof ApiError ? (error.payload as { field?: string } | null)?.field : undefined
          const message = error instanceof ApiError ? error.message : 'Could not save. Try again.'
          if (field && document.getElementById(fieldId(field))) showErrors({ [field]: message })
          else setBanner(message)
        },
      },
    )
  }

  const doArchive = () => {
    if (id === null || !window.confirm('Archive this product? It leaves the shop; orders keep it.')) return
    archive.mutate(id, {
      onSuccess: () => {
        setSaved(JSON.stringify(toRequest(form)))
        navigate('/admin/products', { replace: true })
      },
      onError: (error) => setBanner(error instanceof ApiError ? error.message : 'Could not archive. Try again.'),
    })
  }

  /** A labelled input with its error under it; `path` is the backend's field path. */
  const field = (path: string, label: string, control: ReactNode, help?: string, wide = false) => (
    <div className={wide ? 'field wide' : 'field'}>
      <label htmlFor={fieldId(path)}>{label}</label>
      {control}
      {help && <span className="help">{help}</span>}
      {errors[path] && <span className="err" role="alert">{errors[path]}</span>}
    </div>
  )
  const textInput = (path: keyof ProductForm & string, props: { maxLength?: number; inputMode?: 'decimal' | 'numeric'; type?: string } = {}) => (
    <input id={fieldId(path)} className="input" value={form[path] as string} aria-invalid={!!errors[path]}
      onChange={(e) => set(path, e.target.value as never)} {...props} />
  )

  const setCandidates = (allProducts.data?.content ?? []).filter((p) => !p.set && p.id !== id)

  return (
    <form onSubmit={submit} noValidate className="adm-main" style={{ padding: 0 }}>
      <div className="adm-head">
        <div>
          <Link className="ulink" to="/admin/products">Products</Link>
          <h1 className="adm-h1" style={{ marginTop: 8 }}>{id === null ? 'New product' : initial.name}</h1>
        </div>
        {id !== null && (
          <a className="link" href={`/p/${form.slug}`} target="_blank" rel="noopener" style={{ fontSize: 14 }}>View in the shop</a>
        )}
      </div>
      {banner && <p className="err" role="alert">{banner}</p>}

      <section className="panel adm-section" aria-labelledby="sec-basics">
        <h2 id="sec-basics">Basics</h2>
        <div className="adm-fields">
          {field('name', 'Name', <input id={fieldId('name')} className="input" maxLength={140} value={form.name} aria-invalid={!!errors.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugTouched ? f.slug : slugify(e.target.value) }))} />)}
          {field('slug', 'Address name (slug)', <input id={fieldId('slug')} className="input" maxLength={120} value={form.slug} aria-invalid={!!errors.slug}
            onChange={(e) => { setSlugTouched(true); set('slug', e.target.value) }} />, `The product page is /p/${form.slug || '…'}`)}
          {field('categoryId', 'Category', (
            <select id={fieldId('categoryId')} className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">Choose a category</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ))}
          {field('characterId', 'Character', (
            <select id={fieldId('characterId')} className="input" value={form.characterId} onChange={(e) => set('characterId', e.target.value)}>
              <option value="">None</option>
              {characters.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ))}
          {field('maker', 'Maker', textInput('maker', { maxLength: 80 }))}
          {field('status', 'Status', (
            <select id={fieldId('status')} className="input" value={form.status} onChange={(e) => set('status', e.target.value as ProductStatus)}>
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {field('summary', 'Summary', textInput('summary', { maxLength: 300 }), 'One sentence under the name.', true)}
          {field('specLine', 'Spec line', textInput('specLine', { maxLength: 120 }), 'Short, on cards: "750 ml · steel".')}
        </div>
      </section>

      <section className="panel adm-section" aria-labelledby="sec-price">
        <h2 id="sec-price">Price and stock</h2>
        <div className="adm-fields">
          {field('price', 'Price (৳)', textInput('price', { inputMode: 'decimal' }))}
          {field('compareAtPrice', 'Was price (৳)', textInput('compareAtPrice', { inputMode: 'decimal' }), 'Shown struck through; leave empty for none.')}
          {form.options.length === 0
            ? field('stock', 'Stock', textInput('stock', { inputMode: 'numeric' }))
            : <p className="help" style={{ alignSelf: 'end' }}>Stock is set per option below.</p>}
          <label className="adm-check"><input type="checkbox" checked={form.preorder} onChange={(e) => set('preorder', e.target.checked)} /> Pre-order</label>
          {form.preorder && field('preorderRelease', 'Release month', textInput('preorderRelease', { type: 'month' }))}
          {form.preorder && field('deposit', 'Deposit per item (৳)', textInput('deposit', { inputMode: 'decimal' }))}
          <label className="adm-check"><input type="checkbox" checked={form.sized} onChange={(e) => set('sized', e.target.checked)} /> Show the size guide</label>
        </div>
      </section>

      <section className="panel adm-section" aria-labelledby="sec-options">
        <h2 id="sec-options">Options</h2>
        <p className="help">One group, like Colour or Size. Leave empty for a product without options.</p>
        {form.options.length > 0 && field('optionName', 'Option group name', textInput('optionName', { maxLength: 30 }))}
        <div className="adm-rows">
          {form.options.map((o, i) => {
            const upd = (k: 'value' | 'priceDelta' | 'stock' | 'swatch', v: string) =>
              setForm((f) => ({ ...f, options: f.options.map((x) => (x.key === o.key ? { ...x, [k]: v } : x)) }))
            const cell = (k: 'value' | 'priceDelta' | 'stock' | 'swatch', label: string, mode?: 'decimal' | 'numeric') => {
              const path = `options[${i}].${k}`
              return field(path, `${label} (option ${i + 1})`, (
                <input id={fieldId(path)} className="input" value={o[k]} inputMode={mode} aria-invalid={!!errors[path]} onChange={(e) => upd(k, e.target.value)} />
              ))
            }
            return (
              <div key={o.key} className="adm-row">
                {cell('value', 'Value')}
                {cell('priceDelta', 'Extra price (৳)', 'decimal')}
                {cell('stock', 'Stock', 'numeric')}
                {cell('swatch', 'Swatch colour')}
                <button type="button" className="tbtn" aria-label={`Remove option ${i + 1}`}
                  onClick={() => setForm((f) => ({ ...f, options: f.options.filter((x) => x.key !== o.key) }))}>✕</button>
              </div>
            )
          })}
        </div>
        <button type="button" className="tbtn" style={{ alignSelf: 'flex-start' }}
          onClick={() => setForm((f) => ({ ...f, optionName: f.optionName || 'Colour', options: [...f.options, { key: newKey(), value: '', priceDelta: '0', stock: '0', swatch: '' }] }))}>
          Add option
        </button>
      </section>

      <section className="panel adm-section" aria-labelledby="sec-images">
        <h2 id="sec-images">Images</h2>
        <ImageList label="Photos" help="Gallery shots, first one on cards. JPEG, PNG or WebP up to 5 MB; stored as WebP." items={form.images.PHOTO} onChange={photos} />
        <ImageList label="360 frames" help="One photo per turn step, 24 to 36. Pick them all at once: they are ordered by file name." items={form.images.SPIN_FRAME} onChange={frames} sortByName />
        <ImageList label="Story image" help="Beside the story text." items={form.images.STORY} onChange={story} max={1} />
      </section>

      <section className="panel adm-section" aria-labelledby="sec-story">
        <h2 id="sec-story">Description and story</h2>
        <div className="adm-fields">
          {field('description', 'Description', <textarea id={fieldId('description')} className="input" maxLength={10000} value={form.description}
            onChange={(e) => set('description', e.target.value)} />, 'Plain text; a blank line starts a new paragraph.', true)}
          {field('story', 'Story', <textarea id={fieldId('story')} className="input" maxLength={10000} value={form.story}
            onChange={(e) => set('story', e.target.value)} />, undefined, true)}
          {field('storyQuote', 'Story quote', textInput('storyQuote', { maxLength: 200 }), undefined, true)}
        </div>
      </section>

      <section className="panel adm-section" aria-labelledby="sec-details">
        <h2 id="sec-details">Facts, box and filters</h2>
        <div className="adm-rows">
          {form.facts.map((x, i) => (
            <div key={x.key} className="adm-row">
              {field(`facts[${i}].label`, `Fact ${i + 1} label`, <input id={fieldId(`facts[${i}].label`)} className="input" maxLength={40} value={x.label}
                onChange={(e) => setForm((f) => ({ ...f, facts: f.facts.map((y) => (y.key === x.key ? { ...y, label: e.target.value } : y)) }))} />)}
              {field(`facts[${i}].value`, `Fact ${i + 1} value`, <input id={fieldId(`facts[${i}].value`)} className="input" maxLength={80} value={x.value}
                onChange={(e) => setForm((f) => ({ ...f, facts: f.facts.map((y) => (y.key === x.key ? { ...y, value: e.target.value } : y)) }))} />)}
              <button type="button" className="tbtn" aria-label={`Remove fact ${i + 1}`}
                onClick={() => setForm((f) => ({ ...f, facts: f.facts.filter((y) => y.key !== x.key) }))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="tbtn" style={{ alignSelf: 'flex-start' }}
          onClick={() => setForm((f) => ({ ...f, facts: [...f.facts, { key: newKey(), label: '', value: '' }] }))}>Add fact</button>
        <div className="adm-fields">
          {field('boxItems', 'In the box', <textarea id={fieldId('boxItems')} className="input" value={form.boxItems}
            onChange={(e) => set('boxItems', e.target.value)} />, 'One item per line.')}
          {field('tags', 'Filters', <textarea id={fieldId('tags')} className="input" value={form.tags}
            onChange={(e) => set('tags', e.target.value)} />, 'One per line as Group: Value, like "Capacity: 750 ml".')}
        </div>
      </section>

      <section className="panel adm-section" aria-labelledby="sec-set">
        <h2 id="sec-set">Set contents</h2>
        <p className="help">Tick products to make this a set of them. A set has its own price and stock.</p>
        <div className="adm-fields" id={fieldId('bundleProductIds')}>
          {setCandidates.map((p) => (
            <label key={p.id} className="adm-check">
              <input type="checkbox" checked={form.bundleProductIds.includes(p.id)}
                onChange={(e) => set('bundleProductIds', e.target.checked ? [...form.bundleProductIds, p.id] : form.bundleProductIds.filter((x) => x !== p.id))} />
              {p.name}
            </label>
          ))}
        </div>
        {errors.bundleProductIds && <span className="err" role="alert">{errors.bundleProductIds}</span>}
      </section>

      <div className="adm-savebar">
        <button className="btn" type="submit" disabled={save.isPending || uploading}>
          {save.isPending ? 'Saving…' : id === null ? 'Create product' : 'Save changes'}
        </button>
        {uploading && <span className="muted" style={{ fontSize: 13 }}>Waiting for images to finish uploading…</span>}
        {!uploading && dirty && <span className="muted" style={{ fontSize: 13 }}>Unsaved changes</span>}
        {notice && <span className="okmsg" role="status">{notice}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" className="tbtn" onClick={() => { if (!dirty || window.confirm(LEAVE_MESSAGE)) { setSaved(JSON.stringify(toRequest(form))); navigate('/admin/products') } }}>
          Cancel
        </button>
        {id !== null && form.status !== 'ARCHIVED' && (
          <button type="button" className="tbtn" onClick={doArchive} disabled={archive.isPending}>Archive</button>
        )}
      </div>
    </form>
  )
}
