import type { SearchTerm } from '../../api/types'

function Terms({ title, terms, count }: { title: string; terms: SearchTerm[]; count: (t: SearchTerm) => number }) {
  return (
    <div>
      <h3 className="eyebrow" style={{ marginBottom: 8 }}>{title}</h3>
      {terms.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>None yet.</p>
      ) : (
        <table className="adm-table">
          <tbody>
            {terms.map((t) => (
              <tr key={t.term}>
                <td style={{ whiteSpace: 'normal' }}>{t.term}</td>
                <td className="num">{count(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** What shoppers typed: the most searched, and what we do not have (the next things to stock). */
export function SearchTerms({ top, zeroResults }: { top: SearchTerm[]; zeroResults: SearchTerm[] }) {
  return (
    <section className="panel adm-card" aria-labelledby="st-h">
      <h2 id="st-h">Searches</h2>
      <div className="adm-two" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Terms title="Found nothing" terms={zeroResults} count={(t) => t.zeroResults} />
        <Terms title="Most searched" terms={top} count={(t) => t.searches} />
      </div>
    </section>
  )
}
