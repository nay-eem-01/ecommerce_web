import { useState, type FormEvent } from 'react'
import { useProductStock, useUpdateStock } from '../../api/admin'
import { ApiError } from '../../api/errors'

/** Set exact stock: one number, or one per option (the product's stock is their sum). */
export function StockEditor({ productId, name, onDone }: { productId: number; name: string; onDone: () => void }) {
  const { data, isPending, isError } = useProductStock(productId)
  const update = useUpdateStock()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  if (isPending) return <p className="muted">Loading stock…</p>
  if (isError || !data) return <p className="err">Could not load the stock. Try again.</p>

  const lines = data.options.length > 0
    ? data.options.map((o) => ({ key: String(o.id), optionId: o.id as number | null, label: o.value, stock: o.stock }))
    : [{ key: 'product', optionId: null, label: 'In stock', stock: data.stock }]
  const valueOf = (key: string, stock: number) => values[key] ?? String(stock)
  const changed = lines.filter((l) => valueOf(l.key, l.stock) !== String(l.stock))
  const invalid = changed.some((l) => !/^\d{1,7}$/.test(valueOf(l.key, l.stock)))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (invalid || changed.length === 0) return
    setSaved(false)
    try {
      // One call per changed line; the backend recomputes the product total each time.
      for (const l of changed) {
        await update.mutateAsync({ id: productId, optionId: l.optionId, stock: Number(valueOf(l.key, l.stock)) })
      }
      setValues({})
      setSaved(true)
    } catch {
      // shown below from update.error
    }
  }

  return (
    <form onSubmit={save} className="adm-filters" aria-label={`Stock for ${name}`} style={{ alignItems: 'flex-end' }}>
      {lines.map((l) => (
        <div key={l.key} className="field" style={{ width: 120 }}>
          <label htmlFor={`stock-${productId}-${l.key}`}>{l.label}</label>
          <input id={`stock-${productId}-${l.key}`} className="input" inputMode="numeric" value={valueOf(l.key, l.stock)}
            aria-invalid={!/^\d{1,7}$/.test(valueOf(l.key, l.stock))}
            onChange={(e) => setValues((v) => ({ ...v, [l.key]: e.target.value.trim() }))} />
        </div>
      ))}
      <button className="btn" type="submit" disabled={update.isPending || invalid || changed.length === 0} style={{ minHeight: 40 }}>
        Save stock
      </button>
      <button className="tbtn" type="button" onClick={onDone}>Close</button>
      {invalid && <span className="err">Use a whole number, 0 or more.</span>}
      {update.error && <span className="err" role="alert">{update.error instanceof ApiError ? update.error.message : 'Could not save. Try again.'}</span>}
      {saved && <span className="okmsg" role="status">Stock saved.</span>}
    </form>
  )
}
