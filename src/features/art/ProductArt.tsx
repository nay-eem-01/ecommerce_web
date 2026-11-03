import type { ArtSpec } from './art'

interface Props {
  spec: ArtSpec
  label?: string
  /** Hide the print (the back of the product, or the far side while it turns). */
  back?: boolean
  className?: string
  style?: React.CSSProperties
}

/** The design's product illustration: a bottle, backpack, sling, tee or the backpack + bottle set. */
export function ProductArt({ spec, label, back = false, className, style }: Props) {
  const { kind, a, b, c, eye } = spec
  const face = back ? 'none' : spec.face
  const set = kind === 'set'
  const fox = face === 'fox'
  const cat = face === 'cat'
  return (
    <svg
      viewBox="0 0 240 300"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <ellipse cx="120" cy="287" rx={kind === 'pack' || set ? 84 : kind === 'tee' ? 70 : 56} ry="7" fill="#000" opacity=".45" />
      {(kind === 'bottle' || set) && (
        <g transform={set ? 'translate(118 92) scale(0.66)' : undefined}>
          <path d="M102 30 C102 6, 138 6, 138 30" stroke={c} strokeWidth="7" fill="none" />
          <rect x="88" y="26" width="64" height="40" rx="12" fill={c} />
          <rect x="92" y="60" width="56" height="24" rx="8" fill={a} />
          <rect x="76" y="78" width="88" height="204" rx="34" fill={a} />
          <rect x="76" y="138" width="88" height="90" fill={b} />
          <rect x="76" y="138" width="88" height="4" fill={c} />
          <rect x="76" y="224" width="88" height="4" fill={c} />
          {fox && (
            <>
              <path d="M98 166 L104 146 L115 160 L125 160 L136 146 L142 166 Q142 204 120 212 Q98 204 98 166Z" fill="#fff" />
              <path d="M106 174 L117 179 M134 174 L123 179" stroke={eye} strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="120" cy="198" r="3" fill={eye} />
            </>
          )}
          {cat && (
            <>
              <path d="M98 170 L101 148 L114 161 L126 161 L139 148 L142 170 Q142 202 120 204 Q98 202 98 170Z" fill="#fff" />
              <circle cx="110" cy="178" r="3.5" fill={eye} />
              <circle cx="130" cy="178" r="3.5" fill={eye} />
              <path d="M116 188 Q120 192 124 188 M92 186 H106 M134 186 H148" stroke={eye} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          )}
          {face === 'ronin' && (
            <>
              <path d="M96 160 H144 L138 172 H102 Z" fill="#fff" />
              <path d="M104 182 H136 M110 196 L130 196" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
              <path d="M150 146 L90 222" stroke={eye} strokeWidth="3" />
            </>
          )}
          <rect x="87" y="90" width="9" height="180" rx="4.5" fill="#fff" opacity=".24" />
          <rect x="148" y="92" width="9" height="178" rx="4.5" fill="#000" opacity=".2" />
        </g>
      )}
      {(kind === 'pack' || set) && (
        <g transform={set ? 'translate(-8 30) scale(0.86)' : undefined}>
          <path d="M98 66 Q120 30 142 66" stroke={c} strokeWidth="9" fill="none" strokeLinecap="round" />
          <rect x="50" y="58" width="140" height="222" rx="46" fill={a} />
          <rect x="50" y="58" width="140" height="222" rx="46" fill="none" stroke="#000" strokeOpacity=".25" strokeWidth="2" />
          <rect x="76" y="86" width="88" height="84" rx="20" fill={b} />
          <rect x="76" y="86" width="88" height="84" rx="20" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
          {fox && (
            <>
              <path d="M102 116 L106 100 L115 111 L125 111 L134 100 L138 116 Q138 146 120 152 Q102 146 102 116Z" fill="#fff" />
              <path d="M108 122 L117 126 M132 122 L123 126" stroke={eye} strokeWidth="3" strokeLinecap="round" />
            </>
          )}
          {cat && (
            <>
              <path d="M102 120 L104 100 L115 111 L125 111 L136 100 L138 120 Q138 146 120 148 Q102 146 102 120Z" fill="#fff" />
              <circle cx="112" cy="126" r="3" fill={eye} />
              <circle cx="128" cy="126" r="3" fill={eye} />
            </>
          )}
          {face === 'pins' && (
            <>
              <circle cx="98" cy="110" r="10" fill={c} />
              <circle cx="124" cy="104" r="8" fill="#fff" />
              <circle cx="144" cy="120" r="10" fill={eye} />
              <circle cx="106" cy="146" r="8" fill="#fff" />
              <circle cx="134" cy="148" r="9" fill={c} />
            </>
          )}
          <rect x="68" y="188" width="104" height="72" rx="22" fill="#000" opacity=".22" />
          <path d="M80 200 H160" stroke={c} strokeWidth="3" strokeLinecap="round" />
          <rect x="160" y="196" width="10" height="16" rx="3" fill={c} />
          <rect x="60" y="80" width="10" height="180" rx="5" fill="#fff" opacity=".14" />
        </g>
      )}
      {kind === 'sling' && (
        <>
          <path d="M64 150 L196 40" stroke={c} strokeWidth="10" strokeLinecap="round" />
          <rect x="54" y="136" width="132" height="118" rx="44" fill={a} />
          <path d="M66 172 H174" stroke={c} strokeWidth="3" strokeLinecap="round" />
          <path d="M90 196 L150 236 M150 196 L90 236" stroke={b} strokeWidth="4" strokeLinecap="round" />
          <rect x="66" y="148" width="9" height="90" rx="4.5" fill="#fff" opacity=".16" />
        </>
      )}
      {kind === 'tee' && (
        <>
          <path d="M84 40 L120 52 L156 40 L206 70 L188 112 L168 102 L168 270 L72 270 L72 102 L52 112 L34 70 Z" fill={a} />
          <path d="M104 46 Q120 64 136 46" stroke="#000" strokeOpacity=".3" strokeWidth="4" fill="none" />
          <circle cx="120" cy="150" r="40" fill={b} />
          <path d="M98 140 L104 120 L115 134 L125 134 L136 120 L142 140 Q142 174 120 180 Q98 174 98 140Z" fill="#fff" />
          <path d="M106 148 L117 152 M134 148 L123 152" stroke={eye} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
