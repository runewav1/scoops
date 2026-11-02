export type ProductCategory = 'dairy' | 'plant-based' | 'sorbet'
export type PaymentStatus = 'paid_online' | 'in_person' | 'unpaid'
export type ServiceStatus = 'new' | 'preparing' | 'ready' | 'completed'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: ProductCategory
  size: string
  flavorNote: string
  accent: 'coral' | 'pistachio' | 'chocolate' | 'lemon'
  imagePath: string
  dairyFree: boolean
  lactoseFree: boolean
  vegan: boolean
  glutenFree: boolean
  containsCoconut: boolean
  allergens: string[]
  credit: { artist: string; license: string; licenseUrl: string; source: string }
  isFeatured?: boolean
  isFlavorOfWeek?: boolean
  isAvailable?: boolean
}

export interface Topping {
  id: string
  name: string
  price: number
  category: 'crunchy' | 'saucy' | 'fresh'
}

export interface TransactionItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Transaction {
  id: number
  code: string
  firstInitial: string
  lastName: string
  paymentStatus: PaymentStatus
  serviceStatus: ServiceStatus
  createdAt: string
  total: number
  items: TransactionItem[]
}

export interface DayTotal {
  date: string
  label: string
  total: number
}

export interface FlavorTotal {
  name: string
  quantity: number
  revenue: number
}

export interface SalesReport {
  todayTotal: number
  transactionCount: number
  averageTicket: number
  changePercent: number
  weekTotal: number
  priorWeekTotal: number
  week: DayTotal[]
  recent: Transaction[]
  topFlavors: FlavorTotal[]
}

export interface ShopSettings {
  hours: string
  address_line: string
  address_city: string
}
