import type { Transaction, TransactionItem } from './models'

export const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function customerLabel(transaction: Pick<Transaction, 'firstInitial' | 'lastName'>) {
  return `${transaction.firstInitial.toUpperCase()}. ${transaction.lastName}`
}

export function itemSummary(items: TransactionItem[]) {
  return items.map((item) => `${item.quantity} × ${item.productName}`).join(', ')
}

export function transactionWhen(value: string) {
  const [datePart, timePart = '00:00:00'] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  return new Date(year, (month ?? 1) - 1, day, hour, minute).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export const paymentLabels = { paid_online: 'Paid online', in_person: 'In person', unpaid: 'Not paid yet' } as const
export const serviceLabels = { new: 'New', preparing: 'Preparing', ready: 'Ready', completed: 'Completed' } as const
