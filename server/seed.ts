import type { DatabaseSync } from 'node:sqlite'
import { catalogSeed } from './catalog-seed.js'
import { pointsEarned } from './loyalty.js'
import { hashPasswordSync, SAMPLE_ACCOUNT_PASSWORD } from './passwords.js'

type PaymentStatus = 'paid_online' | 'in_person' | 'unpaid'
type ServiceStatus = 'new' | 'preparing' | 'ready' | 'completed'

const exampleCustomers = [
  { id: 101, firstName: 'Chloe', lastName: 'Bennett', allergies: 'Milk', phone: '(206) 342-8631', points: 120 },
  { id: 102, firstName: 'Rowan', lastName: 'Nyx', allergies: 'None', phone: '(717) 550-1675', points: 63 },
  { id: 103, firstName: 'Marcus', lastName: 'Sterling', allergies: 'None', phone: '(248) 762-0356', points: 106 },
  { id: 104, firstName: 'Maya', lastName: 'Lin', allergies: 'Gluten', phone: '(253) 644-2182', points: 189 },
  { id: 105, firstName: 'Julian', lastName: 'Thorne', allergies: 'Peanuts', phone: '(212) 658-3916', points: 63 },
]

const exampleOrders = [
  { id: 1001, customerId: 101, date: '2026-11-12', time: '11:35:00', productNumber: 1, quantity: 2, detailId: 901 },
  { id: 1002, customerId: 104, date: '2026-11-12', time: '20:12:00', productNumber: 2, quantity: 1, detailId: 902 },
  { id: 1003, customerId: 102, date: '2026-11-13', time: '13:05:00', productNumber: 3, quantity: 2, detailId: 903 },
  { id: 1004, customerId: 104, date: '2026-11-13', time: '15:15:00', productNumber: 4, quantity: 3, detailId: 904 },
  { id: 1005, customerId: 105, date: '2026-11-13', time: '17:18:00', productNumber: 5, quantity: 1, detailId: 905 },
]

const historyPeople: Array<[string, string, string]> = [
  ['Mateo', 'Alvarez', 'None'],
  ['Talia', 'Brooks', 'None'],
  ['Camila', 'Nguyen', 'Milk'],
  ['Amira', 'Okonkwo', 'None'],
  ['Leila', 'Patel', 'Gluten'],
  ['Jonah', 'Moreau', 'None'],
  ['Sora', 'Ibrahim', 'Peanuts'],
  ['Rafael', 'Cohen', 'None'],
  ['Priya', 'Duarte', 'None'],
  ['Kenji', 'Sato', 'Milk'],
  ['Elena', 'Walsh', 'None'],
  ['Nico', 'Berg', 'None'],
  ['Hana', 'Singh', 'Gluten'],
  ['Diego', 'Keller', 'None'],
  ['Freya', 'Rossi', 'None'],
  ['Bianca', 'Cho', 'Peanuts'],
  ['Gideon', 'Haddad', 'None'],
  ['Vera', 'Novak', 'None'],
  ['Yara', 'Bennett', 'Milk'],
  ['Omar', 'Silva', 'None'],
]

function tableExists(db: DatabaseSync, name: string) {
  return Boolean(db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name))
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function localParts(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    orderDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    orderTime: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  }
}

function productPrices(db: DatabaseSync) {
  return new Map((db.prepare('SELECT product_id, price FROM products').all() as Array<{ product_id: number; price: number }>).map((row) => [row.product_id, row.price]))
}

function ensureExampleCustomers(db: DatabaseSync) {
  const insertCustomer = db.prepare(`INSERT INTO customers (customer_id, first_name, last_name, allergies, phone_number, points) VALUES (?, ?, ?, ?, ?, ?)`)
  const insertLogin = db.prepare(`INSERT INTO customer_logins (customer_id, password_hash) VALUES (?, ?)`)
  const pending: Array<{ id: number }> = []
  for (const customer of exampleCustomers) {
    const existing = db.prepare('SELECT customer_id FROM customers WHERE customer_id = ? OR phone_number = ?').get(customer.id, customer.phone) as { customer_id: number } | undefined
    if (!existing) insertCustomer.run(customer.id, customer.firstName, customer.lastName, customer.allergies, customer.phone, customer.points)
    const customerId = existing?.customer_id ?? customer.id
    const login = db.prepare('SELECT customer_id FROM customer_logins WHERE customer_id = ?').get(customerId)
    if (!login) pending.push({ id: customerId })
  }
  if (!pending.length) return
  const sampleHash = hashPasswordSync(SAMPLE_ACCOUNT_PASSWORD)
  for (const customer of pending) insertLogin.run(customer.id, sampleHash)
}

function seedExampleOrders(db: DatabaseSync) {
  if (db.prepare('SELECT order_id FROM orders WHERE order_id = 1001').get()) return
  const prices = productPrices(db)
  const insertOrder = db.prepare(`INSERT INTO orders (order_id, customer_id, order_date, order_time, payment_status, service_status, points_awarded, points_redeemed, discount) VALUES (?, ?, ?, ?, 'in_person', 'completed', 0, 0, 0)`)
  const insertDetail = db.prepare(`INSERT INTO order_details (order_detail_id, order_id, product_id, quantity, order_price) VALUES (?, ?, ?, ?, ?)`)
  for (const order of exampleOrders) {
    const price = prices.get(order.productNumber)
    if (price == null) throw new Error(`Product ${order.productNumber} is missing from the catalog`)
    insertOrder.run(order.id, order.customerId, order.date, order.time)
    insertDetail.run(order.detailId, order.id, order.productNumber, order.quantity, Number((price * order.quantity).toFixed(2)))
  }
}

function seedHistory(db: DatabaseSync) {
  const products = db.prepare('SELECT product_id, slug, price FROM products').all() as Array<{ product_id: number; slug: string; price: number }>
  const bySlug = new Map(products.map((product) => [product.slug, product]))
  const weighted = catalogSeed.flatMap((product) => {
    const row = bySlug.get(product.id)
    return row && product.price < 6 ? [row, row, row] : row ? [row] : []
  })
  if (!weighted.length) return
  const insertCustomer = db.prepare(`INSERT INTO customers (first_name, last_name, allergies, phone_number, points) VALUES (?, ?, ?, ?, 0)`)
  const findCustomer = db.prepare('SELECT customer_id FROM customers WHERE phone_number = ?')
  const customerIds: number[] = []
  for (const [index, [firstName, lastName, allergies]] of historyPeople.entries()) {
    const phone = `(404) 555-${String(100 + index).padStart(4, '0')}`
    const existing = findCustomer.get(phone) as { customer_id: number } | undefined
    if (existing) customerIds.push(existing.customer_id)
    else {
      const result = insertCustomer.run(firstName, lastName, allergies, phone)
      customerIds.push(Number(result.lastInsertRowid))
    }
  }
  const random = mulberry32(20261005)
  const pick = () => weighted[Math.floor(random() * weighted.length)]
  const payments: PaymentStatus[] = ['paid_online', 'in_person', 'in_person', 'unpaid']
  const insertOrder = db.prepare(`INSERT INTO orders (customer_id, order_date, order_time, payment_status, service_status, points_awarded, points_redeemed, discount) VALUES (?, ?, ?, ?, ?, ?, 0, 0)`)
  const insertDetail = db.prepare(`INSERT INTO order_details (order_id, product_id, quantity, order_price) VALUES (?, ?, ?, ?)`)
  const addPoints = db.prepare('UPDATE customers SET points = points + ? WHERE customer_id = ?')
  for (let daysAgo = 13; daysAgo >= 0; daysAgo -= 1) {
    const count = 6 + Math.floor(random() * 5)
    for (let index = 0; index < count; index += 1) {
      const when = new Date()
      when.setDate(when.getDate() - daysAgo)
      when.setHours(12 + Math.floor(random() * 8), Math.floor(random() * 60), Math.floor(random() * 60), 0)
      const customerId = customerIds[Math.floor(random() * customerIds.length)]
      const roll = random()
      const first = pick()
      let lines = [{ product: first, quantity: 1 }]
      if (roll < 0.22) lines = [{ product: first, quantity: 1 }]
      else if (roll < 0.4) lines = [{ product: first, quantity: 2 }]
      else if (roll < 0.5) lines = [{ product: first, quantity: 3 }]
      else if (roll < 0.72) {
        let second = pick()
        while (second.product_id === first.product_id) second = pick()
        lines = [{ product: first, quantity: 1 }, { product: second, quantity: 1 }]
      } else if (roll < 0.86) {
        let second = pick()
        while (second.product_id === first.product_id) second = pick()
        lines = [{ product: first, quantity: 2 }, { product: second, quantity: 1 }]
      } else {
        let second = pick()
        while (second.product_id === first.product_id) second = pick()
        let third = pick()
        while (third.product_id === first.product_id || third.product_id === second.product_id) third = pick()
        lines = [{ product: first, quantity: 1 }, { product: second, quantity: 1 }, { product: third, quantity: 1 }]
      }
      const paymentStatus = payments[Math.floor(random() * payments.length)]
      const serviceStatus: ServiceStatus = daysAgo > 0 ? 'completed' : (['new', 'preparing', 'ready', 'completed'] as const)[Math.floor(random() * 4)]
      const subtotal = Number(lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0).toFixed(2))
      const awarded = paymentStatus === 'unpaid' ? 0 : pointsEarned(subtotal)
      const { orderDate, orderTime } = localParts(when)
      const result = insertOrder.run(customerId, orderDate, orderTime, paymentStatus, serviceStatus, awarded)
      const orderId = Number(result.lastInsertRowid)
      for (const line of lines) insertDetail.run(orderId, line.product.product_id, line.quantity, Number((line.product.price * line.quantity).toFixed(2)))
      if (awarded) addPoints.run(awarded, customerId)
    }
  }
}

interface LegacyTransaction {
  id: number
  first_initial: string
  last_name: string
  payment_status: PaymentStatus
  service_status: ServiceStatus
  created_at: string
}

interface LegacyItem {
  transaction_id: number
  product_id: string
  quantity: number
  unit_price: number
}

const legacyNames: Record<string, string> = {
  M: 'Mateo', T: 'Talia', C: 'Camila', A: 'Amira', L: 'Leila', J: 'Jonah', S: 'Sora', R: 'Rafael',
  P: 'Priya', K: 'Kenji', E: 'Elena', N: 'Nico', H: 'Hana', D: 'Diego', F: 'Freya', B: 'Bianca',
  G: 'Gideon', V: 'Vera', Y: 'Yara', O: 'Omar', Q: 'Quinn',
}

export function migrateLegacyTransactions(db: DatabaseSync) {
  if (!tableExists(db, 'transactions')) return
  const already = db.prepare(`SELECT value FROM shop_settings WHERE key = 'legacy_orders_migrated'`).get() as { value: string } | undefined
  if (already) {
    db.exec('DROP TABLE IF EXISTS transaction_items')
    db.exec('DROP TABLE IF EXISTS transactions')
    return
  }
  const transactions = db.prepare('SELECT id, first_initial, last_name, payment_status, service_status, created_at FROM transactions ORDER BY id').all() as unknown as LegacyTransaction[]
  const items = tableExists(db, 'transaction_items')
    ? db.prepare('SELECT transaction_id, product_id, quantity, unit_price FROM transaction_items ORDER BY id').all() as unknown as LegacyItem[]
    : []
  const products = new Map((db.prepare('SELECT product_id, slug FROM products').all() as Array<{ product_id: number; slug: string }>).map((row) => [row.slug, row.product_id]))
  const insertCustomer = db.prepare(`INSERT INTO customers (customer_id, first_name, last_name, allergies, phone_number, points) VALUES (?, ?, ?, 'None', ?, 0)`)
  const insertOrder = db.prepare(`INSERT INTO orders (order_id, customer_id, order_date, order_time, payment_status, service_status, points_awarded, points_redeemed, discount) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`)
  const insertDetail = db.prepare(`INSERT INTO order_details (order_detail_id, order_id, product_id, quantity, order_price) VALUES (?, ?, ?, ?, ?)`)
  const addPoints = db.prepare('UPDATE customers SET points = points + ? WHERE customer_id = ?')
  const customers = new Map<string, number>()
  let customerId = 301
  let orderId = 2001
  let detailId = 2001
  db.exec('BEGIN')
  try {
    for (const transaction of transactions) {
      const key = `${transaction.first_initial.toUpperCase()}|${transaction.last_name.toLowerCase()}`
      let owner = customers.get(key)
      if (!owner) {
        const phone = `(404) 555-${String(200 + customers.size).padStart(4, '0')}`
        const firstName = legacyNames[transaction.first_initial.toUpperCase()] ?? transaction.first_initial.toUpperCase()
        insertCustomer.run(customerId, firstName, transaction.last_name.trim(), phone)
        owner = customerId
        customers.set(key, owner)
        customerId += 1
      }
      const lines = items.filter((item) => item.transaction_id === transaction.id && products.has(item.product_id))
      if (!lines.length) continue
      const [datePart, timePart = '12:00:00'] = transaction.created_at.split('T')
      const subtotal = Number(lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0).toFixed(2))
      const awarded = transaction.payment_status === 'unpaid' ? 0 : pointsEarned(subtotal)
      insertOrder.run(orderId, owner, datePart, timePart.slice(0, 8), transaction.payment_status, transaction.service_status, awarded)
      for (const line of lines) {
        const productId = products.get(line.product_id)
        if (productId == null) continue
        insertDetail.run(detailId, orderId, productId, line.quantity, Number((line.quantity * line.unit_price).toFixed(2)))
        detailId += 1
      }
      if (awarded) addPoints.run(awarded, owner)
      orderId += 1
    }
    db.prepare(`INSERT INTO shop_settings (key, value) VALUES ('legacy_orders_migrated', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run()
    db.exec('DROP TABLE IF EXISTS transaction_items')
    db.exec('DROP TABLE IF EXISTS transactions')
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function ensureReferenceData(db: DatabaseSync) {
  const orders = db.prepare('SELECT COUNT(*) AS count FROM orders').get() as { count: number }
  db.exec('BEGIN')
  try {
    ensureExampleCustomers(db)
    if (Number(orders.count) === 0) {
      seedExampleOrders(db)
      seedHistory(db)
    } else seedExampleOrders(db)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
