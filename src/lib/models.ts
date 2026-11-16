export type ProductCategory = 'dairy' | 'plant-based' | 'sorbet'
export type PaymentStatus = 'paid_online' | 'in_person' | 'unpaid'
export type ServiceStatus = 'new' | 'preparing' | 'ready' | 'completed'

export interface Product {
  id: string
  productNumber: number
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
  detailId: number
  productId: string
  productNumber: number
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Transaction {
  id: number
  code: string
  customerId: number
  firstName: string
  lastName: string
  allergies: string
  phoneNumber: string
  customerPoints: number
  paymentStatus: PaymentStatus
  serviceStatus: ServiceStatus
  orderDate: string
  orderTime: string
  createdAt: string
  pointsAwarded: number
  pointsRedeemed: number
  discount: number
  total: number
  items: TransactionItem[]
}

export interface Customer {
  id: number
  firstName: string
  lastName: string
  allergies: string
  phoneNumber: string
  points: number
  orderCount: number
  canSignIn: boolean
}

export interface LoyaltyRules {
  pointsPerDollar: number
  rewardPoints: number
  rewardValue: number
}

export interface AccountSnapshot {
  customer: Customer
  orders: Transaction[]
  rules: LoyaltyRules
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
