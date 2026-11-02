import type { IncomingMessage, ServerResponse } from 'node:http'
import { isStaffAuthenticated } from './staff-api.js'
import {
  createTransaction, dayTotal, listProducts, listSettings, listToppings, listTransactions,
  rangeTotal, topFlavors, updateProduct, updateSettings, updateTransaction,
  type PaymentStatus, type ServiceStatus,
} from './db.js'

const payments = new Set<PaymentStatus>(['paid_online', 'in_person', 'unpaid'])
const services = new Set<ServiceStatus>(['new', 'preparing', 'ready', 'completed'])

function sendJson(response: ServerResponse, status: number, body: object) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}

async function readJson(request: IncomingMessage) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 100_000) throw new Error('Request too large')
  }
  return body ? JSON.parse(body) as Record<string, unknown> : {}
}

function stamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function mapProduct(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category,
    size: row.size,
    flavorNote: row.flavor_note,
    accent: row.accent,
    imagePath: row.image_path,
    dairyFree: Boolean(row.dairy_free),
    lactoseFree: Boolean(row.lactose_free),
    vegan: Boolean(row.vegan),
    glutenFree: Boolean(row.gluten_free),
    containsCoconut: Boolean(row.contains_coconut),
    allergens: parseAllergens(row.allergens),
    credit: {
      artist: row.credit_artist,
      license: row.credit_license,
      licenseUrl: row.credit_license_url,
      source: row.credit_source,
    },
    isFeatured: Boolean(row.is_featured),
    isFlavorOfWeek: Boolean(row.is_flavor_of_week),
    isAvailable: Boolean(row.is_available),
  }
}

function parseAllergens(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? '[]'))
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function reporting() {
  const today = new Date()
  const todayKey = stamp(today)
  const lastWeek = new Date(today)
  lastWeek.setDate(today.getDate() - 7)
  const todayStats = dayTotal(todayKey)
  const previousStats = dayTotal(stamp(lastWeek))
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)
  const priorStart = new Date(weekStart)
  priorStart.setDate(weekStart.getDate() - 7)
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + index)
    const key = stamp(day)
    return { date: key, label: day.toLocaleDateString('en-US', { weekday: 'short' }), total: dayTotal(key).total }
  })
  const thisWeek = rangeTotal(`${stamp(weekStart)}T00:00:00`, `${stamp(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))}T00:00:00`)
  const priorWeek = rangeTotal(`${stamp(priorStart)}T00:00:00`, `${stamp(weekStart)}T00:00:00`)
  const changePercent = previousStats.total === 0 ? 0 : ((todayStats.total - previousStats.total) / previousStats.total) * 100
  return {
    todayTotal: Number(todayStats.total.toFixed(2)),
    transactionCount: todayStats.count,
    averageTicket: todayStats.count ? Number((todayStats.total / todayStats.count).toFixed(2)) : 0,
    changePercent: Number(changePercent.toFixed(1)),
    weekTotal: Number(thisWeek.toFixed(2)),
    priorWeekTotal: Number(priorWeek.toFixed(2)),
    week,
    recent: listTransactions().slice(0, 8),
    topFlavors: topFlavors(`${stamp(weekStart)}T00:00:00`).map((flavor) => ({ ...flavor, revenue: Number(flavor.revenue.toFixed(2)) })),
  }
}

export async function handleShopApi(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const { pathname } = url
  if (!pathname.startsWith('/api/')) return false

  if (request.method === 'GET' && pathname === '/api/catalog') {
    const products = (listProducts() as Array<Record<string, unknown>>).map(mapProduct)
    sendJson(response, 200, { products, flavorOfWeek: products.find((product) => product.isFlavorOfWeek) ?? null })
    return true
  }
  if (request.method === 'GET' && pathname === '/api/toppings') {
    sendJson(response, 200, { toppings: listToppings() })
    return true
  }
  if (request.method === 'GET' && pathname === '/api/settings') {
    sendJson(response, 200, { settings: listSettings() })
    return true
  }

  const staffOnly = pathname === '/api/reporting' || pathname === '/api/transactions' || pathname.startsWith('/api/transactions/') || pathname.startsWith('/api/catalog/') || pathname === '/api/settings'
  if (staffOnly && !isStaffAuthenticated(request)) {
    sendJson(response, 401, { error: 'Staff sign-in required' })
    return true
  }

  if (request.method === 'GET' && pathname === '/api/reporting') {
    sendJson(response, 200, reporting())
    return true
  }
  if (request.method === 'GET' && pathname === '/api/transactions') {
    sendJson(response, 200, { transactions: listTransactions() })
    return true
  }
  if (request.method === 'POST' && pathname === '/api/transactions') {
    const body = await readJson(request)
    const firstInitial = typeof body.firstInitial === 'string' ? body.firstInitial.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const paymentStatus = body.paymentStatus as PaymentStatus
    const serviceStatus = body.serviceStatus as ServiceStatus
    const items = Array.isArray(body.items) ? body.items.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const record = item as { productId?: unknown; quantity?: unknown }
      return typeof record.productId === 'string' ? [{ productId: record.productId, quantity: Number(record.quantity) }] : []
    }) : []
    if (!/^[A-Za-z]$/.test(firstInitial) || lastName.length < 2) {
      sendJson(response, 400, { error: 'Use a first initial and a last name' })
      return true
    }
    if (!payments.has(paymentStatus) || !services.has(serviceStatus)) {
      sendJson(response, 400, { error: 'Choose a payment status and a counter status' })
      return true
    }
    try {
      sendJson(response, 201, { transaction: createTransaction({ firstInitial, lastName, paymentStatus, serviceStatus, items }) })
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Could not save the transaction' })
    }
    return true
  }

  const transactionMatch = pathname.match(/^\/api\/transactions\/(\d+)$/)
  if (request.method === 'PATCH' && transactionMatch) {
    const body = await readJson(request)
    const paymentStatus = typeof body.paymentStatus === 'string' ? body.paymentStatus as PaymentStatus : undefined
    const serviceStatus = typeof body.serviceStatus === 'string' ? body.serviceStatus as ServiceStatus : undefined
    if ((paymentStatus && !payments.has(paymentStatus)) || (serviceStatus && !services.has(serviceStatus))) {
      sendJson(response, 400, { error: 'Unknown status' })
      return true
    }
    const transaction = updateTransaction(Number(transactionMatch[1]), { paymentStatus, serviceStatus })
    sendJson(response, transaction ? 200 : 404, transaction ? { transaction } : { error: 'Transaction not found' })
    return true
  }

  const productMatch = pathname.match(/^\/api\/catalog\/([^/]+)$/)
  if (request.method === 'PATCH' && productMatch) {
    const body = await readJson(request)
    const product = updateProduct(decodeURIComponent(productMatch[1]), {
      isFlavorOfWeek: body.isFlavorOfWeek === true ? true : undefined,
      isAvailable: typeof body.isAvailable === 'boolean' ? body.isAvailable : undefined,
    })
    sendJson(response, product ? 200 : 404, product ? { product: mapProduct(product as Record<string, unknown>) } : { error: 'Item not found' })
    return true
  }

  if (request.method === 'PATCH' && pathname === '/api/settings') {
    const body = await readJson(request)
    const settings = Object.fromEntries(Object.entries(body).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    sendJson(response, 200, { settings: updateSettings(settings) })
    return true
  }

  sendJson(response, 404, { error: 'Not found' })
  return true
}
