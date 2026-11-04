import type { components } from './schema'

/** Request bodies, generated from the backend's OpenAPI (`npm run gen:api`). */
export type Schemas = components['schemas']

/*
 * Response payloads. The backend's OpenAPI types every response as the generic envelope with `payload: unknown`,
 * so these mirror its Java records (named the same, without the `Response` suffix where it reads better). Keep them
 * in step with the backend's docs/API.md; docs/BACKEND_REQUESTS.md asks for typed responses so these can be generated.
 */

export type StockState = 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT' | 'PREORDER'
export type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD' | 'CARD'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED'
export type OrderStatus = 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'

/** Spring-style page from the backend's `PageResponse`. */
export interface Page<T> {
  content: T[]
  pageNo: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface Me {
  id: number
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
  hasPassword: boolean
  mustChangePassword: boolean
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: Me
}

export interface OtpSent {
  expiresInSeconds: number
  resendAfterSeconds: number
}

export interface Address {
  id: number
  fullName: string
  phone: string
  district: string
  area: string
  addressLine: string
  defaultAddress: boolean
}

export interface Category {
  id: number
  slug: string
  name: string
  /** The Japanese sign on the category tile (像, 衣, 水, 鞄). */
  label: string | null
  blurb: string | null
  sortOrder: number
  active: boolean
  productCount: number
  /** Announced, no products yet: the storefront offers early access. */
  comingSoon: boolean
}

/** One of the shop's own characters; its products form a collection. */
export interface Character {
  id: number
  slug: string
  name: string
  /** The sign on the collection tile (狐, 猫, 侍). */
  label: string | null
  blurb: string | null
  sortOrder: number
  active: boolean
  productCount: number
}

/** A colour option as a card shows it (dots, quick add). */
export interface Swatch {
  optionId: number
  value: string
  swatch: string
  stockState: StockState
}

export interface Facets {
  groups: Array<{ name: string; values: Array<{ value: string; count: number }> }>
}

export interface ProductSummary {
  id: number
  slug: string
  name: string
  categorySlug: string
  specLine: string | null
  price: number
  compareAtPrice: number | null
  stockState: StockState
  /** Only while LOW_STOCK. */
  stockLeft: number | null
  /** "2027-01" for a pre-order. */
  preorderRelease: string | null
  deposit: number | null
  hasOptions: boolean
  thumbnailUrl: string | null
  characterSlug: string | null
  /** Listed in the last 30 days. */
  newArrival: boolean
  /** Colour options only; empty when the options are not colours. */
  swatches: Swatch[]
  /** A set of other products. */
  set: boolean
}

export interface ProductOption {
  id: number
  value: string
  priceDelta: number
  price: number
  stockState: StockState
  stockLeft: number | null
  /** A CSS colour ("#f4a6c0") for colour options. */
  swatch: string | null
}

export interface Media {
  url: string
  altText: string | null
}

export interface ProductDetail {
  id: number
  slug: string
  name: string
  maker: string | null
  category: { slug: string; name: string }
  summary: string | null
  /** Plain text; paragraphs are split by a blank line. */
  description: string | null
  story: string | null
  storyQuote: string | null
  specLine: string | null
  price: number
  compareAtPrice: number | null
  stockState: StockState
  stockLeft: number | null
  preorder: boolean
  preorderRelease: string | null
  deposit: number | null
  sized: boolean
  optionName: string | null
  options: ProductOption[]
  facts: Array<{ label: string; value: string }>
  boxItems: string[]
  photos: Media[]
  /** The 360 viewer's frames, in order. */
  spinFrames: string[]
  storyImage: Media | null
  status: string
  character: { slug: string; name: string; label: string | null } | null
  tags: Array<{ group: string; value: string }>
  newArrival: boolean
  /** For a set: the products it holds. */
  bundleItems: ProductSummary[]
  /** Sets containing this product, with what the set saves ("Complete the set"). */
  sets: Array<{ set: ProductSummary; saving: number | null }>
}

export interface Review {
  id: number
  rating: number
  body: string
  authorName: string
  verifiedBuyer: boolean
  creationDate: string
  mine: boolean
}

export interface ReviewPage {
  summary: { average: number | null; count: number; distribution: Record<string, number> }
  reviews: Page<Review>
}

export interface CartLine {
  itemId: number
  productId: number
  optionId: number | null
  slug: string
  name: string
  optionName: string | null
  optionValue: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
  stockState: StockState
  /** False when the product was archived or its option removed. */
  available: boolean
  preorder: boolean
  preorderRelease: string | null
  thumbnailUrl: string | null
}

export interface Cart {
  items: CartLine[]
  itemCount: number
  subtotal: number
}

export interface DeliveryOptions {
  districts: string[]
  insideDistricts: string[]
  insideFee: number
  outsideFee: number
  freeDeliveryThreshold: number
  insideEstimate: string
  outsideEstimate: string
  paymentMethods: PaymentMethod[]
}

export interface QuoteLine {
  productId: number
  optionId: number | null
  slug: string
  name: string
  optionLabel: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
  preorder: boolean
  preorderRelease: string | null
  depositPerUnit: number | null
  stockState: StockState
  enoughStock: boolean
  thumbnailUrl: string | null
}

export interface Quote {
  lines: QuoteLine[]
  subtotal: number
  district: string
  deliveryFee: number
  total: number
  depositTotal: number
  freeDeliveryThreshold: number
  amountToFreeDelivery: number
  deliveryEstimate: string
  allInStock: boolean
}

export interface PaymentAction {
  type: 'NONE' | 'REDIRECT'
  url: string | null
}

export interface OrderItem {
  productId: number
  optionId: number | null
  slug: string
  name: string
  optionLabel: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
  preorder: boolean
  depositPerUnit: number | null
  thumbnailUrl: string | null
}

export interface TimelineEntry {
  status: OrderStatus
  at: string
  note: string | null
}

export interface Order {
  orderNumber: string
  status: OrderStatus
  placedAt: string
  deliveredAt: string | null
  fullName: string
  phone: string
  email: string | null
  district: string
  area: string
  addressLine: string
  note: string | null
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  depositTotal: number
  amountDueOnDelivery: number
  deliveryEstimate: string
  timeline: TimelineEntry[]
  canCancel: boolean
  /** NONE for COD; REDIRECT right after placing an online order; null when the provider was unreachable. */
  paymentAction: PaymentAction | null
}

export interface OrderSummary {
  orderNumber: string
  status: OrderStatus
  placedAt: string
  total: number
  paymentMethod: PaymentMethod
  itemCount: number
  items: OrderItem[]
}

export interface Tracking {
  orderNumber: string
  status: OrderStatus
  placedAt: string
  items: Array<{ name: string; optionLabel: string | null; quantity: number }>
  total: number
  paymentMethod: PaymentMethod
  deliveryEstimate: string
  timeline: TimelineEntry[]
}

/** A line as the storefront sends it to quote, checkout, cart and merge. */
export interface LineInput {
  productId: number
  optionId: number | null
  quantity: number
}

// ---------- admin (staff only; the backend checks every privilege) ----------

/** A period of shop days, ISO dates, both inclusive. */
export interface Period {
  from: string
  to: string
}

export interface InsightTotals {
  orders: number
  units: number
  revenue: number
  averageOrder: number | null
  deliveryFees: number
  cancelled: number
  /** 0 to 1. */
  cancelRate: number
  returned: number
  newBuyers: number
  returningBuyers: number
  views: number
  searches: number
  zeroResultSearches: number
}

export interface DailySales {
  day: string
  orders: number
  revenue: number
}

export interface Overview {
  from: string
  to: string
  current: InsightTotals
  previous: InsightTotals
  daily: DailySales[]
}

export type SignalType =
  | 'RESTOCK_SOON'
  | 'WANTED_SOLD_OUT'
  | 'LOW_STOCK_HIGH_DEMAND'
  | 'LOOKED_NOT_BOUGHT'
  | 'SLOW_MOVER'
  | 'SEARCH_GAP'
  | 'COMING_SOON_DEMAND'

export interface ProductInsight {
  id: number
  slug: string
  name: string
  category: string
  character: string | null
  preorder: boolean
  stock: number
  views: number
  orders: number
  units: number
  revenue: number
  /** orders / views, 0 to 1; null without views. */
  conversion: number | null
  wishlists: number
  cartUnits: number
  cartMembers: number
  /** null when nothing sold in the period. */
  daysLeft: number | null
  signals: SignalType[]
}

export interface Signal {
  type: SignalType
  title: string
  reason: string
  productId: number | null
  productSlug: string | null
  term: string | null
  categorySlug: string | null
  value: number
}

export type BreakdownBy = 'CATEGORY' | 'CHARACTER' | 'DISTRICT' | 'PAYMENT_METHOD'

export interface BreakdownRow {
  name: string
  orders: number
  units: number
  revenue: number
  /** 0 to 1. */
  share: number
}

export interface SearchTerm {
  term: string
  searches: number
  zeroResults: number
}

export interface Searches {
  top: SearchTerm[]
  zeroResults: SearchTerm[]
}

export type ProductInsightSort = 'revenue' | 'units' | 'views' | 'conversion' | 'wishlists' | 'daysLeft' | 'stock'

/** Exact stock (staff only); a product with options sells from each option. */
export interface ProductStock {
  productId: number
  stock: number
  options: Array<{ id: number; value: string; stock: number }>
}

export type OrderAction = 'PACK' | 'SHIP' | 'DELIVER' | 'CANCEL' | 'RETURN'
