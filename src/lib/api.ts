import type { PaymentStatus, Product, SalesReport, ServiceStatus, ShopSettings, Topping, Transaction } from './models'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init })
  const body = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? 'Request failed')
  return body
}

export function fetchCatalog() {
  return request<{ products: Product[]; flavorOfWeek: Product | null }>('/api/catalog')
}

export function fetchToppings() {
  return request<{ toppings: Topping[] }>('/api/toppings')
}

export function fetchSettings() {
  return request<{ settings: ShopSettings }>('/api/settings')
}

export function fetchReport() {
  return request<SalesReport>('/api/reporting')
}

export function fetchTransactions() {
  return request<{ transactions: Transaction[] }>('/api/transactions')
}

export function createTransaction(input: { firstInitial: string; lastName: string; paymentStatus: PaymentStatus; serviceStatus: ServiceStatus; items: Array<{ productId: string; quantity: number }> }) {
  return request<{ transaction: Transaction }>('/api/transactions', { method: 'POST', body: JSON.stringify(input) })
}

export function updateTransaction(id: number, changes: { paymentStatus?: PaymentStatus; serviceStatus?: ServiceStatus }) {
  return request<{ transaction: Transaction }>(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })
}

export function updateProduct(id: string, changes: { isFlavorOfWeek?: boolean; isAvailable?: boolean }) {
  return request<{ product: Product }>(`/api/catalog/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })
}

export function updateSettings(settings: Partial<ShopSettings>) {
  return request<{ settings: ShopSettings }>('/api/settings', { method: 'PATCH', body: JSON.stringify(settings) })
}
