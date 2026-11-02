/** The prototype's line icons, drawn once as an SVG sprite (`IconSprite`, mounted by the layout) and used by id. */
export type IconName =
  | 'search' | 'cart' | 'user' | 'heart' | 'truck' | 'cash' | 'return' | 'shield' | 'rotate' | 'play' | 'pause'
  | 'check' | 'box' | 'star' | 'filter' | 'alert' | 'trash'

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className ? `icon ${className}` : 'icon'} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  )
}

export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></symbol>
        <symbol id="i-cart" viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" /><circle cx="9.5" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></symbol>
        <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></symbol>
        <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9Z" /></symbol>
        <symbol id="i-truck" viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></symbol>
        <symbol id="i-cash" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></symbol>
        <symbol id="i-return" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></symbol>
        <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></symbol>
        <symbol id="i-rotate" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></symbol>
        <symbol id="i-play" viewBox="0 0 24 24"><path d="M7 5v14l11-7z" /></symbol>
        <symbol id="i-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></symbol>
        <symbol id="i-box" viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></symbol>
        <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 3 1-6.2L3 9.7l6.2-.9z" /></symbol>
        <symbol id="i-filter" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4" /></symbol>
        <symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></symbol>
        <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></symbol>
      </defs>
    </svg>
  )
}
