import type { Category, Character, DeliveryOptions, Me, ProductDetail, ProductSummary, TokenResponse } from '../api/types'

export const categories: Category[] = [
  { id: 1, slug: 'figures', name: 'Figures', label: '像', blurb: 'Scale figures, chibi figures and model kits', sortOrder: 1, active: true, productCount: 3, comingSoon: false },
  { id: 2, slug: 'costumes', name: 'Costumes', label: '衣', blurb: 'Full cosplay sets, wigs and props', sortOrder: 2, active: true, productCount: 3, comingSoon: false },
  { id: 3, slug: 'bottles', name: 'Bottles', label: '水', blurb: 'Steel and tritan, 500 to 1000 ml', sortOrder: 3, active: true, productCount: 3, comingSoon: false },
  { id: 4, slug: 'bags', name: 'Bags', label: '鞄', blurb: 'Backpacks, totes and sling bags', sortOrder: 4, active: true, productCount: 3, comingSoon: false },
  { id: 5, slug: 'apparel', name: 'Apparel', label: '衣', blurb: 'Tees and hoodies. Coming soon.', sortOrder: 5, active: true, productCount: 0, comingSoon: true },
]

export const characters: Character[] = [
  { id: 1, slug: 'kitsune', name: 'Kitsune', label: '狐', blurb: 'Fox spirit.', sortOrder: 1, active: true, productCount: 4 },
  { id: 2, slug: 'ramen-cat', name: 'Ramen Cat', label: '猫', blurb: 'Kids range.', sortOrder: 2, active: true, productCount: 2 },
  { id: 3, slug: 'ronin', name: 'Ronin', label: '侍', blurb: 'Black and red.', sortOrder: 3, active: true, productCount: 2 },
]

export function summary(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: 7, slug: 'sakura-bottle', name: 'Sakura steel bottle, 750 ml', categorySlug: 'bottles', specLine: '750 ml, cold for 24 h',
    price: 1450, compareAtPrice: null, stockState: 'IN_STOCK', stockLeft: null, preorderRelease: null, deposit: null,
    hasOptions: false, thumbnailUrl: null, characterSlug: null, newArrival: false, swatches: [], set: false, ...overrides,
  }
}

export function detail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 1, slug: 'ronin-swordsman', name: 'Ronin Swordsman 1/7 scale figure', maker: 'Kurogane Studio',
    category: { slug: 'figures', name: 'Figures' },
    summary: 'A wandering swordsman mid-draw.', description: 'Who it is for: collectors.\n\nThe coat is a separate part.',
    story: 'The sculptor started from a sketch.', storyQuote: 'We wanted the figure to look like it was about to move.',
    specLine: '24 cm, PVC and ABS', price: 6800, compareAtPrice: 7500, stockState: 'LOW_STOCK', stockLeft: 4,
    preorder: false, preorderRelease: null, deposit: null, sized: false, optionName: 'Edition',
    options: [
      { id: 11, value: 'Standard', priceDelta: 0, price: 6800, stockState: 'LOW_STOCK', stockLeft: 3, swatch: null },
      { id: 12, value: 'Deluxe, with alt face', priceDelta: 1200, price: 8000, stockState: 'LOW_STOCK', stockLeft: 1, swatch: null },
    ],
    facts: [{ label: 'Height', value: '24 cm with base' }, { label: 'Scale', value: '1/7' }, { label: 'Material', value: 'PVC, ABS' }, { label: 'Weight', value: '620 g boxed' }],
    boxItems: ['Figure', 'Two swords'], photos: [], spinFrames: [], storyImage: null, status: 'ACTIVE',
    character: null, tags: [], newArrival: false, bundleItems: [], sets: [], ...overrides,
  }
}

export const deliveryOptions: DeliveryOptions = {
  districts: ['Dhaka', 'Gazipur', 'Chattogram'], insideDistricts: ['Dhaka'], insideFee: 70, outsideFee: 130,
  freeDeliveryThreshold: 3000, insideEstimate: '1 to 2 days', outsideEstimate: '2 to 4 days', paymentMethods: ['COD', 'BKASH'],
}

export const me: Me = { id: 5, name: 'Nayeem Ahmed', phone: '01712345678', email: null, roles: ['CUSTOMER'], hasPassword: false, mustChangePassword: false }

export const tokens: TokenResponse = { accessToken: 'access-1', refreshToken: 'refresh-2', tokenType: 'Bearer', expiresIn: 900, user: me }
