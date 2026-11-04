import type { Category } from '../api/types'

export interface NavItem {
  to: string
  label: string
  soon?: boolean
}

/** The store menu: New, the categories on sale, Characters, Sets, then categories that are coming soon. */
export function navItems(categories: Category[] | undefined): NavItem[] {
  const list = categories ?? []
  return [
    { to: '/shop', label: 'New' },
    ...list.filter((c) => !c.comingSoon).map((c) => ({ to: `/shop/${c.slug}`, label: c.name })),
    { to: '/characters', label: 'Characters' },
    { to: '/sets', label: 'Sets' },
    ...list.filter((c) => c.comingSoon).map((c) => ({ to: `/shop/${c.slug}`, label: c.name, soon: true })),
  ]
}
