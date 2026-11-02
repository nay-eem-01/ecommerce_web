import { useRef, useState } from 'react'
import { tk } from '../../lib/money'

const PRIZES: Array<[string, string]> = [
  ['Fox spirit keychain', 'Acrylic, 6 cm'],
  ['Mecha pilot pin', 'Enamel, 3 cm'],
  ['Swordsman acrylic stand', '12 cm, with base'],
  ['Sakura charm', 'Rubber, 5 cm'],
  ['Ramen cat keychain', 'Acrylic, 6 cm'],
  ['Gold pin', 'The rare one'],
]

/**
 * The prototype's gacha corner. Capsules are not on sale yet (roadmap 4.6), so a turn is a practice draw and says
 * so; the price shown is the planned one.
 */
export function Gacha({ random = Math.random }: { random?: () => number }) {
  const [prize, setPrize] = useState<[string, string] | null>(null)
  const capsule = useRef<HTMLDivElement>(null)

  function turn() {
    setPrize(PRIZES[Math.floor(random() * PRIZES.length)])
    const el = capsule.current
    if (el) {
      el.classList.remove('spin')
      void el.offsetWidth // restart the spin animation
      el.classList.add('spin')
    }
  }

  return (
    <section className="sec">
      <div className="panel gacha">
        <div>
          <h2 className="h2">Gacha corner, {tk(350)} a capsule</h2>
          <p>
            Each capsule holds a keychain, an acrylic stand or a pin, and you see which one when it opens. Capsules go on
            sale soon; until then, every turn is a practice draw.
          </p>
          <div style={{ marginTop: 20 }}>
            <button className="btn" type="button" onClick={turn}>
              {prize ? 'Turn again' : 'Turn the handle'}
            </button>
          </div>
        </div>
        <div className="capsule-wrap" aria-live="polite">
          <div className="capsule" ref={capsule} aria-hidden="true" />
          <div>
            <strong>{prize ? prize[0] : 'Ready'}</strong>
            <br />
            <span className="muted">{prize ? `${prize[1]}. Practice draw.` : 'Turn the handle to draw'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
