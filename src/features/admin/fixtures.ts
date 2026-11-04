import type { InsightTotals, Overview, ProductEdit, ProductInsight, TokenResponse } from '../../api/types'
import { envelope } from '../../test/api'
import { me, tokens } from '../../test/fixtures'

export const adminTokens: TokenResponse = {
  ...tokens,
  user: { ...me, name: 'Staff', phone: null, email: 'admin@senpai.local', roles: ['ADMIN'], hasPassword: true, mustChangePassword: false },
}

/** A restored admin session plus the shop calls any signed-in session makes on start. */
export const adminSession = {
  'POST /api/auth/refresh-token': () => envelope(200, adminTokens),
  'GET /api/cart': () => envelope(200, { items: [], itemCount: 0, subtotal: 0 }),
  'GET /api/wishlist/ids': () => envelope(200, []),
}

export const totals = (over: Partial<InsightTotals> = {}): InsightTotals => ({
  orders: 0, units: 0, revenue: 0, averageOrder: null, deliveryFees: 0, cancelled: 0, cancelRate: 0, returned: 0,
  newBuyers: 0, returningBuyers: 0, views: 0, searches: 0, zeroResultSearches: 0, ...over,
})

export const overview = (current: InsightTotals, previous = totals()): Overview => ({
  from: '2026-10-07', to: '2026-11-05', current, previous,
  daily: Array.from({ length: 30 }, (_, i) => ({
    day: new Date(Date.parse('2026-10-07') + i * 86_400_000).toISOString().slice(0, 10),
    orders: i === 29 ? current.orders : 0,
    revenue: i === 29 ? current.revenue : 0,
  })),
})

export const insight = (over: Partial<ProductInsight> = {}): ProductInsight => ({
  id: 7, slug: 'kitsune-bottle', name: 'Kitsune bottle', category: 'Bottles', character: 'Kitsune', preorder: false,
  stock: 4, views: 120, orders: 3, units: 3, revenue: 4350, conversion: 0.025, wishlists: 5, cartUnits: 1, cartMembers: 1,
  daysLeft: 40, signals: [], ...over,
})

/** A product as the edit view returns it: two colour options (stock 4 and 0), a photo, two 360 frames, two tags. */
export const productEdit: ProductEdit = {
  id: 7, slug: 'kitsune-bottle', categoryId: 3, characterId: 4, name: 'Kitsune Night bottle', maker: null,
  summary: 'Steel, 750 ml.', description: 'Keeps tea hot.\n\nSix hours.', story: null, storyQuote: null, specLine: '750 ml',
  price: 1450, compareAtPrice: null, stock: 4, preorder: false, preorderRelease: null, deposit: null, sized: false,
  status: 'ACTIVE', optionName: 'Colour',
  options: [{ id: 1, value: 'Petal pink', priceDelta: 0, stock: 4, swatch: '#f2a7c3' }, { id: 2, value: 'Night navy', priceDelta: 100, stock: 0, swatch: null }],
  facts: [{ label: 'Capacity', value: '750 ml' }], boxItems: ['Bottle', 'Spare lid'],
  media: [
    { kind: 'PHOTO', url: 'https://cdn/p1.webp', altText: 'Front' },
    { kind: 'SPIN_FRAME', url: 'https://cdn/s1.webp', altText: null },
    { kind: 'SPIN_FRAME', url: 'https://cdn/s2.webp', altText: null },
  ],
  bundleProductIds: [], tags: [{ group: 'Capacity', value: '750 ml' }, { group: 'Material', value: 'Steel' }],
}

