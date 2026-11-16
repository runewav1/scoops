import type { PaymentStatus, Product, SalesReport, ServiceStatus, ShopSettings, Topping, Transaction } from './models'

export interface CatalogRepository {
  listProducts(): Promise<Product[]>
  listToppings(): Promise<Topping[]>
}

export interface TransactionRepository {
  listTransactions(): Promise<Transaction[]>
  createTransaction(input: { firstName: string; lastName: string; phoneNumber: string; allergies: string; paymentStatus: PaymentStatus; serviceStatus: ServiceStatus; items: Array<{ productId: string; quantity: number }> }): Promise<Transaction>
  updateTransaction(id: number, changes: Partial<Pick<Transaction, 'paymentStatus' | 'serviceStatus'>>): Promise<Transaction>
}

export interface ReportingRepository {
  getSalesReport(): Promise<SalesReport>
}

export interface SettingsRepository {
  getSettings(): Promise<ShopSettings>
  updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings>
}

export interface AppRepositories {
  catalog: CatalogRepository
  transactions: TransactionRepository
  reporting: ReportingRepository
  settings: SettingsRepository
}
