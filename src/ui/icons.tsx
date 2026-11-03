/** The design canvas's line icons (inline SVG, stroke = currentColor). */
type Name =
  | 'menu' | 'search' | 'bag' | 'user' | 'heart' | 'close' | 'back' | 'next' | 'chevron' | 'truck' | 'cash' | 'return'
  | 'shield' | 'rotate' | 'check' | 'plus' | 'minus' | 'filter' | 'grid2' | 'grid1' | 'clock' | 'home' | 'alert' | 'star'

const PATHS: Record<Name, React.ReactNode> = {
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  heart: <path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="m15 6-6 6 6 6" />,
  next: <path d="m9 6 6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
  return: <><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></>,
  rotate: <><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  grid2: <><rect x="4" y="4" width="7" height="16" rx="1" /><rect x="13" y="4" width="7" height="16" rx="1" /></>,
  grid1: <rect x="5" y="4" width="14" height="16" rx="1" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  home: <path d="M4 10 12 4l8 6v10H4z" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>,
  star: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 3 1-6.2L3 9.7l6.2-.9z" />,
}

export function Icon({ name, small = false, style }: { name: Name; small?: boolean; style?: React.CSSProperties }) {
  return (
    <svg className={small ? 'icon sm' : 'icon'} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      {PATHS[name]}
    </svg>
  )
}
