import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join } from 'node:path'
import { catalogSeed, toppingSeed } from './catalog-seed.js'
import { cleanAllergies, cleanName, normalizePhone } from './fields.js'
import { POINTS_REWARD_COST, POINTS_REWARD_VALUE, pointsEarned } from './loyalty.js'
import { assignProductIds } from './product-ids.js'
import { ensureReferenceData, migrateLegacyTransactions } from './seed.js'

export type PaymentStatus = 'paid_online' | 'in_person' | 'unpaid'
export type ServiceStatus = 'new' | 'preparing' | 'ready' | 'completed'

export interface TransactionItemInput {
  productId: string
  quantity: number
}

export interface NewTransactionInput {
  firstName: string
  lastName: string
  phoneNumber: string
  allergies: string
  paymentStatus: PaymentStatus
  serviceStatus: ServiceStatus
  items: TransactionItemInput[]
}

export interface CustomerRecord {
  id: number
  firstName: string
  lastName: string
  allergies: string
  phoneNumber: string
  points: number
  passwordHash: string | null
  orderCount: number
}

const dbPath = join(process.cwd(), 'data', 'scoops.sqlite')
let database: DatabaseSync | null = null
const CATALOG_VERSION = 'lineup-20-menu'
const DAILY_ORDER_CAP = 12

const productTableSql = `
  CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    size TEXT NOT NULL,
    flavor_note TEXT NOT NULL,
    accent TEXT NOT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_flavor_of_week INTEGER NOT NULL DEFAULT 0,
    in_stock INTEGER NOT NULL DEFAULT 1,
    image_path TEXT NOT NULL DEFAULT '',
    dairy_free INTEGER NOT NULL DEFAULT 0,
    lactose_free INTEGER NOT NULL DEFAULT 0,
    vegan INTEGER NOT NULL DEFAULT 0,
    gluten_free INTEGER NOT NULL DEFAULT 0,
    contains_coconut INTEGER NOT NULL DEFAULT 0,
    allergens TEXT NOT NULL DEFAULT '[]',
    credit_artist TEXT NOT NULL DEFAULT '',
    credit_license TEXT NOT NULL DEFAULT '',
    credit_license_url TEXT NOT NULL DEFAULT '',
    credit_source TEXT NOT NULL DEFAULT ''
  )
`

interface StoredProduct {
  id?: string
  slug?: string
  name: string
  description: string
  price: number
  category: string
  size: string
  flavor_note: string
  accent: string
  is_featured?: number
  is_flavor_of_week?: number
  is_available?: number
  in_stock?: number
  image_path?: string
  dairy_free?: number
  lactose_free?: number
  vegan?: number
  gluten_free?: number
  contains_coconut?: number
  allergens?: string
  credit_artist?: string
  credit_license?: string
  credit_license_url?: string
  credit_source?: string
}

function tableExists(db: DatabaseSync, name: string) {
  return Boolean(db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name))
}

function columnNames(db: DatabaseSync, table: string) {
  return new Set((db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((column) => column.name))
}

function requiredProductId(numbers: Map<string, number>, slug: string) {
  const productId = numbers.get(slug)
  if (productId == null) throw new Error(`Missing product id for ${slug}`)
  return productId
}

function localParts(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    orderDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    orderTime: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  }
}

function reshapeProducts(db: DatabaseSync) {
  if (!tableExists(db, 'products')) {
    db.exec(productTableSql)
    return
  }
  const columns = columnNames(db, 'products')
  if (columns.has('product_id') && columns.has('slug') && columns.has('in_stock')) return
  const rows = db.prepare('SELECT * FROM products').all() as unknown as StoredProduct[]
  db.exec('DROP TABLE IF EXISTS products_next')
  db.exec(`CREATE TABLE products_next ${productTableSql.slice(productTableSql.indexOf('('))}`)
  const slugs = rows.map((row) => String(row.slug ?? row.id))
  const numbers = assignProductIds(slugs)
  const insert = db.prepare(`INSERT INTO products_next (
    product_id, slug, name, description, price, category, size, flavor_note, accent, is_featured, is_flavor_of_week, in_stock,
    image_path, dairy_free, lactose_free, vegan, gluten_free, contains_coconut, allergens,
    credit_artist, credit_license, credit_license_url, credit_source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  for (const row of rows) {
    const slug = String(row.slug ?? row.id)
    insert.run(
      requiredProductId(numbers, slug), slug, row.name, row.description, row.price, row.category, row.size, row.flavor_note, row.accent,
      row.is_featured ?? 0, row.is_flavor_of_week ?? 0, slug === 'chocolate-chip' ? 0 : Number(row.in_stock ?? row.is_available ?? 1),
      row.image_path ?? '', row.dairy_free ?? 0, row.lactose_free ?? 0, row.vegan ?? 0, row.gluten_free ?? 0, row.contains_coconut ?? 0, row.allergens ?? '[]',
      row.credit_artist ?? '', row.credit_license ?? '', row.credit_license_url ?? '', row.credit_source ?? '',
    )
  }
  db.exec('DROP TABLE products')
  db.exec('ALTER TABLE products_next RENAME TO products')
}

function seedShopDefaults(db: DatabaseSync) {
  const toppingCount = db.prepare('SELECT COUNT(*) AS count FROM toppings').get() as { count: number }
  if (Number(toppingCount.count) === 0) {
    const insertTopping = db.prepare('INSERT INTO toppings (id, name, price, category) VALUES (?, ?, ?, ?)')
    for (const topping of toppingSeed) insertTopping.run(topping.id, topping.name, topping.price, topping.category)
  }
  const insertSetting = db.prepare('INSERT INTO shop_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING')
  insertSetting.run('hours', 'Open every day, 12–9pm. Scoops until sold out.')
  insertSetting.run('address_line', '18 Honeycomb Lane')
  insertSetting.run('address_city', 'Maplewood, GA 30309')
}

function syncCatalog(db: DatabaseSync) {
  const current = db.prepare(`SELECT value FROM shop_settings WHERE key = 'catalog_version'`).get() as { value: string } | undefined
  if (current?.value === CATALOG_VERSION) return
  const existingIds = new Set((db.prepare('SELECT slug FROM products').all() as Array<{ slug: string }>).map((row) => row.slug))
  const sameMenu = existingIds.size === catalogSeed.length && catalogSeed.every((product) => existingIds.has(product.id))
  if (sameMenu) {
    const updatePhoto = db.prepare('UPDATE products SET description = ?, image_path = ?, credit_artist = ?, credit_license = ?, credit_license_url = ?, credit_source = ? WHERE slug = ?')
    db.exec('BEGIN')
    try {
      for (const product of catalogSeed) updatePhoto.run(product.description, product.imagePath, product.credit.artist, product.credit.license, product.credit.licenseUrl, product.credit.source, product.id)
      db.prepare(`INSERT INTO shop_settings (key, value) VALUES ('catalog_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(CATALOG_VERSION)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    return
  }
  const numbers = assignProductIds(catalogSeed.map((product) => product.id))
  const insertProduct = db.prepare(`INSERT INTO products (
    product_id, slug, name, description, price, category, size, flavor_note, accent, is_featured, is_flavor_of_week, in_stock,
    image_path, dairy_free, lactose_free, vegan, gluten_free, contains_coconut, allergens,
    credit_artist, credit_license, credit_license_url, credit_source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM order_details')
    db.exec('DELETE FROM orders')
    db.exec('DELETE FROM products')
    for (const product of catalogSeed) {
      insertProduct.run(
        requiredProductId(numbers, product.id), product.id, product.name, product.description, product.price, product.category, product.size, product.flavorNote, product.accent,
        product.isFeatured ? 1 : 0, product.isFlavorOfWeek ? 1 : 0, product.inStock === false ? 0 : 1, product.imagePath,
        product.dairyFree ? 1 : 0, product.lactoseFree ? 1 : 0, product.vegan ? 1 : 0, product.glutenFree ? 1 : 0, product.containsCoconut ? 1 : 0,
        JSON.stringify(product.allergens), product.credit.artist, product.credit.license, product.credit.licenseUrl, product.credit.source,
      )
    }
    db.prepare(`INSERT INTO shop_settings (key, value) VALUES ('catalog_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(CATALOG_VERSION)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function getDb() {
  if (database) return database
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = OFF')
  reshapeProducts(db)
  db.exec(`
    CREATE TABLE IF NOT EXISTS toppings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS customers (
      customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      allergies TEXT NOT NULL,
      phone_number TEXT NOT NULL UNIQUE,
      points INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS customer_logins (
      customer_id INTEGER PRIMARY KEY REFERENCES customers(customer_id),
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      order_id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
      order_date TEXT NOT NULL,
      order_time TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      service_status TEXT NOT NULL,
      points_awarded INTEGER NOT NULL DEFAULT 0,
      points_redeemed INTEGER NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS order_details (
      order_detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(order_id),
      product_id INTEGER NOT NULL REFERENCES products(product_id),
      quantity INTEGER NOT NULL,
      order_price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shop_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS order_details_order ON order_details(order_id);
    CREATE INDEX IF NOT EXISTS order_details_product ON order_details(product_id);
  `)
  seedShopDefaults(db)
  syncCatalog(db)
  migrateLegacyTransactions(db)
  ensureReferenceData(db)
  db.exec('PRAGMA foreign_keys = ON')
  database = db
  return db
}

interface CustomerRow {
  customer_id: number
  first_name: string
  last_name: string
  allergies: string
  phone_number: string
  points: number
  password_hash: string | null
  order_count: number
}

function mapCustomer(row: CustomerRow): CustomerRecord {
  return {
    id: row.customer_id,
    firstName: row.first_name,
    lastName: row.last_name,
    allergies: row.allergies,
    phoneNumber: row.phone_number,
    points: row.points,
    passwordHash: row.password_hash,
    orderCount: Number(row.order_count ?? 0),
  }
}

const customerSql = `
  SELECT c.customer_id, c.first_name, c.last_name, c.allergies, c.phone_number, c.points,
    l.password_hash, COUNT(o.order_id) AS order_count
  FROM customers c
  LEFT JOIN customer_logins l ON l.customer_id = c.customer_id
  LEFT JOIN orders o ON o.customer_id = c.customer_id
`

export function listCustomers() {
  return (getDb().prepare(`${customerSql} GROUP BY c.customer_id ORDER BY c.customer_id`).all() as unknown as CustomerRow[]).map(mapCustomer)
}

export function getCustomer(id: number) {
  const row = getDb().prepare(`${customerSql} WHERE c.customer_id = ? GROUP BY c.customer_id`).get(id) as CustomerRow | undefined
  return row ? mapCustomer(row) : null
}

export function getCustomerByPhone(phoneNumber: string) {
  const phone = normalizePhone(phoneNumber)
  if (!phone) return null
  const row = getDb().prepare(`${customerSql} WHERE c.phone_number = ? GROUP BY c.customer_id`).get(phone) as CustomerRow | undefined
  return row ? mapCustomer(row) : null
}

export function registerCustomer(input: { firstName: string; lastName: string; phoneNumber: string; allergies: string; passwordHash: string }) {
  const phone = normalizePhone(input.phoneNumber)
  if (!phone) throw new Error('Use a 10-digit phone number')
  const firstName = cleanName(input.firstName, 'First name')
  const lastName = cleanName(input.lastName, 'Last name')
  const allergies = cleanAllergies(input.allergies)
  const db = getDb()
  if (db.prepare('SELECT customer_id FROM customers WHERE phone_number = ?').get(phone)) throw new Error('That phone number already has an account. Sign in instead.')
  db.exec('BEGIN')
  let customerId = 0
  try {
    const result = db.prepare('INSERT INTO customers (first_name, last_name, allergies, phone_number, points) VALUES (?, ?, ?, ?, 0)').run(firstName, lastName, allergies, phone)
    customerId = Number(result.lastInsertRowid)
    db.prepare('INSERT INTO customer_logins (customer_id, password_hash) VALUES (?, ?)').run(customerId, input.passwordHash)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  const customer = getCustomer(customerId)
  if (!customer) throw new Error('Could not create the account')
  return customer
}

export function updateCustomer(id: number, input: { firstName: string; lastName: string; phoneNumber: string; allergies: string; passwordHash?: string }) {
  const phone = normalizePhone(input.phoneNumber)
  if (!phone) throw new Error('Use a 10-digit phone number')
  const firstName = cleanName(input.firstName, 'First name')
  const lastName = cleanName(input.lastName, 'Last name')
  const allergies = cleanAllergies(input.allergies)
  const db = getDb()
  const current = db.prepare('SELECT customer_id FROM customers WHERE customer_id = ?').get(id)
  if (!current) return null
  const taken = db.prepare('SELECT customer_id FROM customers WHERE phone_number = ? AND customer_id != ?').get(phone, id)
  if (taken) throw new Error('That phone number is already on an account.')
  db.exec('BEGIN')
  try {
    db.prepare('UPDATE customers SET first_name = ?, last_name = ?, allergies = ?, phone_number = ? WHERE customer_id = ?').run(firstName, lastName, allergies, phone, id)
    if (input.passwordHash) db.prepare('UPDATE customer_logins SET password_hash = ? WHERE customer_id = ?').run(input.passwordHash, id)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return getCustomer(id)
}

interface OrderRow {
  id: number
  customer_id: number
  first_name: string
  last_name: string
  allergies: string
  phone_number: string
  points: number
  payment_status: PaymentStatus
  service_status: ServiceStatus
  order_date: string
  order_time: string
  points_awarded: number
  points_redeemed: number
  discount: number
  subtotal: number
  items_json: string
}

function mapOrder(row: OrderRow) {
  const items = (JSON.parse(row.items_json) as Array<{ detailId: number; productId: string; productNumber: number; productName: string; quantity: number; orderPrice: number }>)
    .sort((a, b) => a.detailId - b.detailId)
    .map((item) => ({
      detailId: item.detailId,
      productId: item.productId,
      productNumber: item.productNumber,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.quantity ? Number((item.orderPrice / item.quantity).toFixed(2)) : item.orderPrice,
      lineTotal: Number(item.orderPrice.toFixed(2)),
    }))
  const discount = Number(row.discount.toFixed(2))
  return {
    id: row.id,
    code: `#${row.id}`,
    customerId: row.customer_id,
    firstName: row.first_name,
    lastName: row.last_name,
    allergies: row.allergies,
    phoneNumber: row.phone_number,
    customerPoints: row.points,
    paymentStatus: row.payment_status,
    serviceStatus: row.service_status,
    orderDate: row.order_date,
    orderTime: row.order_time,
    createdAt: `${row.order_date}T${row.order_time}`,
    pointsAwarded: row.points_awarded,
    pointsRedeemed: row.points_redeemed,
    discount,
    total: Number((row.subtotal - discount).toFixed(2)),
    items,
  }
}

const orderSql = `
  SELECT o.order_id AS id, c.customer_id, c.first_name, c.last_name, c.allergies, c.phone_number, c.points,
    o.payment_status, o.service_status, o.order_date, o.order_time, o.points_awarded, o.points_redeemed, o.discount,
    SUM(d.order_price) AS subtotal,
    json_group_array(json_object(
      'detailId', d.order_detail_id,
      'productId', p.slug,
      'productNumber', p.product_id,
      'productName', p.name,
      'quantity', d.quantity,
      'orderPrice', d.order_price
    )) AS items_json
  FROM orders o
  JOIN customers c ON c.customer_id = o.customer_id
  JOIN order_details d ON d.order_id = o.order_id
  JOIN products p ON p.product_id = d.product_id
`

export function listTransactions() {
  return (getDb().prepare(`${orderSql} GROUP BY o.order_id ORDER BY o.order_date DESC, o.order_time DESC, o.order_id DESC`).all() as unknown as OrderRow[]).map(mapOrder)
}

export function listCustomerOrders(customerId: number) {
  return (getDb().prepare(`${orderSql} WHERE o.customer_id = ? GROUP BY o.order_id ORDER BY o.order_date DESC, o.order_time DESC, o.order_id DESC`).all(customerId) as unknown as OrderRow[]).map(mapOrder)
}

export function listProducts() {
  return getDb().prepare('SELECT * FROM products ORDER BY category, name, price').all()
}

export function listToppings() {
  return getDb().prepare('SELECT * FROM toppings ORDER BY category, name').all()
}

export function listSettings() {
  const settings = Object.fromEntries((getDb().prepare('SELECT key, value FROM shop_settings').all() as Array<{ key: string; value: string }>).map((row) => [row.key, row.value]))
  delete settings.catalog_version
  delete settings.legacy_orders_migrated
  return settings
}

export function dayTotal(day: string) {
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(order_total), 0) AS total, COUNT(*) AS count FROM (
      SELECT o.order_id, SUM(d.order_price) - o.discount AS order_total
      FROM orders o JOIN order_details d ON d.order_id = o.order_id
      WHERE o.order_date = ?
      GROUP BY o.order_id
    ) AS daily
  `).get(day) as { total: number; count: number }
  return { total: Number(row.total), count: Number(row.count) }
}

export function rangeTotal(start: string, end: string) {
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(order_total), 0) AS total FROM (
      SELECT o.order_id, SUM(d.order_price) - o.discount AS order_total
      FROM orders o JOIN order_details d ON d.order_id = o.order_id
      WHERE o.order_date || 'T' || o.order_time >= ? AND o.order_date || 'T' || o.order_time < ?
      GROUP BY o.order_id
    ) AS ranged
  `).get(start, end) as { total: number }
  return Number(row.total)
}

export function topFlavors(start: string) {
  return getDb().prepare(`
    SELECT p.name AS name, SUM(d.quantity) AS quantity, SUM(d.order_price) AS revenue
    FROM order_details d
    JOIN orders o ON o.order_id = d.order_id
    JOIN products p ON p.product_id = d.product_id
    WHERE o.order_date || 'T' || o.order_time >= ?
    GROUP BY p.name
    ORDER BY quantity DESC, revenue DESC
    LIMIT 5
  `).all(start) as Array<{ name: string; quantity: number; revenue: number }>
}

function buildLines(db: DatabaseSync, items: TransactionItemInput[]) {
  if (items.length < 1 || items.length > 6) throw new Error('Add between 1 and 6 flavors')
  const products = db.prepare('SELECT product_id, slug, price, in_stock FROM products').all() as Array<{ product_id: number; slug: string; price: number; in_stock: number }>
  return items.map((item) => {
    const product = products.find((entry) => entry.slug === item.productId)
    if (!product || !product.in_stock) throw new Error('Choose an available flavor')
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 12) throw new Error('Quantity must be between 1 and 12')
    return { productId: product.product_id, quantity: item.quantity, orderPrice: Number((product.price * item.quantity).toFixed(2)) }
  })
}

function insertOrder(db: DatabaseSync, input: { customerId: number; paymentStatus: PaymentStatus; serviceStatus: ServiceStatus; items: TransactionItemInput[]; redeem: boolean; when?: { orderDate: string; orderTime: string } }) {
  const lines = buildLines(db, input.items)
  const subtotal = Number(lines.reduce((sum, line) => sum + line.orderPrice, 0).toFixed(2))
  const { orderDate, orderTime } = input.when ?? localParts()
  const todayCount = db.prepare('SELECT COUNT(*) AS count FROM orders WHERE customer_id = ? AND order_date = ?').get(input.customerId, orderDate) as { count: number }
  if (Number(todayCount.count) >= DAILY_ORDER_CAP) throw new Error('That account already has 12 orders today')
  let discount = 0
  let redeemed = 0
  if (input.redeem) {
    if (subtotal < POINTS_REWARD_VALUE) throw new Error(`A reward takes $${POINTS_REWARD_VALUE} off, so the scoops need to total at least that`)
    const spent = db.prepare('UPDATE customers SET points = points - ? WHERE customer_id = ? AND points >= ?').run(POINTS_REWARD_COST, input.customerId, POINTS_REWARD_COST)
    if (Number(spent.changes) !== 1) throw new Error(`A reward costs ${POINTS_REWARD_COST} points`)
    discount = POINTS_REWARD_VALUE
    redeemed = POINTS_REWARD_COST
  }
  const paidAmount = Number((subtotal - discount).toFixed(2))
  const awarded = input.paymentStatus === 'unpaid' ? 0 : pointsEarned(paidAmount)
  const result = db.prepare(`INSERT INTO orders (customer_id, order_date, order_time, payment_status, service_status, points_awarded, points_redeemed, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(input.customerId, orderDate, orderTime, input.paymentStatus, input.serviceStatus, awarded, redeemed, discount)
  const orderId = Number(result.lastInsertRowid)
  const insertDetail = db.prepare('INSERT INTO order_details (order_id, product_id, quantity, order_price) VALUES (?, ?, ?, ?)')
  for (const line of lines) insertDetail.run(orderId, line.productId, line.quantity, line.orderPrice)
  if (awarded) db.prepare('UPDATE customers SET points = points + ? WHERE customer_id = ?').run(awarded, input.customerId)
  return orderId
}

export function createTransaction(input: NewTransactionInput) {
  const phone = normalizePhone(input.phoneNumber)
  if (!phone) throw new Error('Use a 10-digit phone number')
  const db = getDb()
  db.exec('BEGIN')
  let orderId = 0
  try {
    const existing = db.prepare('SELECT customer_id FROM customers WHERE phone_number = ?').get(phone) as { customer_id: number } | undefined
    let customerId = existing?.customer_id
    if (!customerId) {
      const created = db.prepare('INSERT INTO customers (first_name, last_name, allergies, phone_number, points) VALUES (?, ?, ?, ?, 0)').run(cleanName(input.firstName, 'First name'), cleanName(input.lastName, 'Last name'), cleanAllergies(input.allergies), phone)
      customerId = Number(created.lastInsertRowid)
    }
    orderId = insertOrder(db, { customerId, paymentStatus: input.paymentStatus, serviceStatus: input.serviceStatus, items: input.items, redeem: false })
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  const order = listTransactions().find((entry) => entry.id === orderId)
  if (!order) throw new Error('Could not save the order')
  return order
}

export function createCustomerOrder(customerId: number, items: TransactionItemInput[], redeem: boolean) {
  const db = getDb()
  if (!db.prepare('SELECT customer_id FROM customers WHERE customer_id = ?').get(customerId)) throw new Error('Account not found')
  db.exec('BEGIN')
  let orderId = 0
  try {
    orderId = insertOrder(db, { customerId, paymentStatus: 'paid_online', serviceStatus: 'new', items, redeem })
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  const order = listCustomerOrders(customerId).find((entry) => entry.id === orderId)
  if (!order) throw new Error('Could not save the order')
  return order
}

export function updateTransaction(id: number, changes: { paymentStatus?: PaymentStatus; serviceStatus?: ServiceStatus }) {
  const db = getDb()
  const current = db.prepare('SELECT order_id, customer_id, payment_status, points_awarded, discount FROM orders WHERE order_id = ?').get(id) as { order_id: number; customer_id: number; payment_status: PaymentStatus; points_awarded: number; discount: number } | undefined
  if (!current) return null
  db.exec('BEGIN')
  try {
    if (changes.paymentStatus && changes.paymentStatus !== current.payment_status) {
      const subtotalRow = db.prepare('SELECT COALESCE(SUM(order_price), 0) AS total FROM order_details WHERE order_id = ?').get(id) as { total: number }
      const paidAmount = Math.max(0, Number((Number(subtotalRow.total) - current.discount).toFixed(2)))
      const wasPaid = current.payment_status !== 'unpaid'
      const willPay = changes.paymentStatus !== 'unpaid'
      if (wasPaid && !willPay) {
        db.prepare('UPDATE customers SET points = MAX(0, points - ?) WHERE customer_id = ?').run(current.points_awarded, current.customer_id)
        db.prepare('UPDATE orders SET points_awarded = 0, payment_status = ? WHERE order_id = ?').run(changes.paymentStatus, id)
      } else if (!wasPaid && willPay) {
        const awarded = pointsEarned(paidAmount)
        db.prepare('UPDATE customers SET points = points + ? WHERE customer_id = ?').run(awarded, current.customer_id)
        db.prepare('UPDATE orders SET points_awarded = ?, payment_status = ? WHERE order_id = ?').run(awarded, changes.paymentStatus, id)
      } else {
        db.prepare('UPDATE orders SET payment_status = ? WHERE order_id = ?').run(changes.paymentStatus, id)
      }
    }
    if (changes.serviceStatus) db.prepare('UPDATE orders SET service_status = ? WHERE order_id = ?').run(changes.serviceStatus, id)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return listTransactions().find((order) => order.id === id) ?? null
}

export function updateProduct(slug: string, changes: { isFlavorOfWeek?: boolean; isAvailable?: boolean }) {
  const db = getDb()
  const current = db.prepare('SELECT product_id FROM products WHERE slug = ?').get(slug)
  if (!current) return null
  if (changes.isFlavorOfWeek) {
    db.exec('BEGIN')
    try {
      db.prepare('UPDATE products SET is_flavor_of_week = 0').run()
      db.prepare('UPDATE products SET is_flavor_of_week = 1 WHERE slug = ?').run(slug)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
  if (typeof changes.isAvailable === 'boolean') db.prepare('UPDATE products SET in_stock = ? WHERE slug = ?').run(changes.isAvailable ? 1 : 0, slug)
  return db.prepare('SELECT * FROM products WHERE slug = ?').get(slug)
}

export function updateSettings(settings: Record<string, string>) {
  const statement = getDb().prepare('INSERT INTO shop_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  for (const [key, value] of Object.entries(settings)) {
    if (['hours', 'address_line', 'address_city'].includes(key)) statement.run(key, value.trim())
  }
  return listSettings()
}
