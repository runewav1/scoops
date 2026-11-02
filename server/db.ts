import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, join } from 'node:path'
import { catalogSeed, toppingSeed } from './catalog-seed.js'

export type PaymentStatus = 'paid_online' | 'in_person' | 'unpaid'
export type ServiceStatus = 'new' | 'preparing' | 'ready' | 'completed'

export interface TransactionItemInput {
  productId: string
  quantity: number
}

export interface NewTransactionInput {
  firstInitial: string
  lastName: string
  paymentStatus: PaymentStatus
  serviceStatus: ServiceStatus
  items: TransactionItemInput[]
  createdAt?: string
}

const dbPath = join(process.cwd(), 'data', 'scoops.sqlite')
let database: DatabaseSync | null = null

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function localStamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function seedGhostTransactions(db: DatabaseSync) {
  const names = [
    ['M', 'Alvarez'], ['T', 'Brooks'], ['C', 'Nguyen'], ['A', 'Okonkwo'], ['L', 'Patel'],
    ['J', 'Moreau'], ['S', 'Ibrahim'], ['R', 'Cohen'], ['P', 'Duarte'], ['K', 'Sato'],
    ['E', 'Walsh'], ['N', 'Berg'], ['H', 'Singh'], ['D', 'Keller'], ['F', 'Rossi'],
    ['B', 'Cho'], ['G', 'Haddad'], ['V', 'Novak'], ['Y', 'Bennett'], ['O', 'Silva'],
  ]
  const payments: PaymentStatus[] = ['paid_online', 'in_person', 'in_person', 'unpaid']
  const weighted = catalogSeed.flatMap((product) => product.price < 6 ? [product, product, product] : [product])
  const random = mulberry32(20261005)
  const pick = () => weighted[Math.floor(random() * weighted.length)]
  const insertTransaction = db.prepare(`INSERT INTO transactions (first_initial, last_name, payment_status, service_status, created_at) VALUES (?, ?, ?, ?, ?)`)
  const insertItem = db.prepare(`INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)`)

  db.exec('BEGIN')
  try {
    for (let daysAgo = 13; daysAgo >= 0; daysAgo -= 1) {
      const count = 6 + Math.floor(random() * 5)
      for (let index = 0; index < count; index += 1) {
        const when = new Date()
        when.setDate(when.getDate() - daysAgo)
        when.setHours(12 + Math.floor(random() * 8), Math.floor(random() * 60), Math.floor(random() * 60), 0)
        const [initial, lastName] = names[Math.floor(random() * names.length)]
        const roll = random()
        const first = pick()
        let lines = [{ product: first, quantity: 1 }]
        if (roll < 0.22) lines = [{ product: first, quantity: 1 }]
        else if (roll < 0.4) lines = [{ product: first, quantity: 2 }]
        else if (roll < 0.5) lines = [{ product: first, quantity: 3 }]
        else if (roll < 0.72) {
          let second = pick()
          while (second.id === first.id) second = pick()
          lines = [{ product: first, quantity: 1 }, { product: second, quantity: 1 }]
        } else if (roll < 0.86) {
          let second = pick()
          while (second.id === first.id) second = pick()
          lines = [{ product: first, quantity: 2 }, { product: second, quantity: 1 }]
        } else {
          let second = pick()
          while (second.id === first.id) second = pick()
          let third = pick()
          while (third.id === first.id || third.id === second.id) third = pick()
          lines = [{ product: first, quantity: 1 }, { product: second, quantity: 1 }, { product: third, quantity: 1 }]
        }
        const serviceStatus: ServiceStatus = daysAgo > 0 ? 'completed' : (['new', 'preparing', 'ready', 'completed'] as const)[Math.floor(random() * 4)]
        const result = insertTransaction.run(initial, lastName, payments[Math.floor(random() * payments.length)], serviceStatus, localStamp(when))
        const transactionId = Number(result.lastInsertRowid)
        for (const line of lines) insertItem.run(transactionId, line.product.id, line.product.name, line.quantity, line.product.price)
      }
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const CATALOG_VERSION = 'lineup-20-menu'

function ensureProductColumns(db: DatabaseSync) {
  const names = new Set((db.prepare('PRAGMA table_info(products)').all() as Array<{ name: string }>).map((column) => column.name))
  const columns: Array<[string, string]> = [
    ['image_path', "TEXT NOT NULL DEFAULT ''"],
    ['dairy_free', 'INTEGER NOT NULL DEFAULT 0'],
    ['lactose_free', 'INTEGER NOT NULL DEFAULT 0'],
    ['vegan', 'INTEGER NOT NULL DEFAULT 0'],
    ['gluten_free', 'INTEGER NOT NULL DEFAULT 0'],
    ['contains_coconut', 'INTEGER NOT NULL DEFAULT 0'],
    ['allergens', "TEXT NOT NULL DEFAULT '[]'"],
    ['credit_artist', "TEXT NOT NULL DEFAULT ''"],
    ['credit_license', "TEXT NOT NULL DEFAULT ''"],
    ['credit_license_url', "TEXT NOT NULL DEFAULT ''"],
    ['credit_source', "TEXT NOT NULL DEFAULT ''"],
  ]
  for (const [name, definition] of columns) {
    if (!names.has(name)) db.exec(`ALTER TABLE products ADD COLUMN ${name} ${definition}`)
  }
}

function seedShopDefaults(db: DatabaseSync) {
  const toppingCount = db.prepare('SELECT COUNT(*) AS count FROM toppings').get() as { count: number }
  if (toppingCount.count === 0) {
    const insertTopping = db.prepare('INSERT INTO toppings (id, name, price, category) VALUES (?, ?, ?, ?)')
    for (const topping of toppingSeed) insertTopping.run(topping.id, topping.name, topping.price, topping.category)
  }
  const insertSetting = db.prepare('INSERT INTO shop_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING')
  insertSetting.run('hours', 'Open every day, 12–9pm. Scoops until sold out.')
  insertSetting.run('address_line', '18 Honeycomb Lane')
  insertSetting.run('address_city', 'Maplewood, GA 30309')
}

function writeCatalogVersion(db: DatabaseSync) {
  db.prepare(`INSERT INTO shop_settings (key, value) VALUES ('catalog_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(CATALOG_VERSION)
}

function syncCatalog(db: DatabaseSync) {
  const current = db.prepare(`SELECT value FROM shop_settings WHERE key = 'catalog_version'`).get() as { value: string } | undefined
  if (current?.value === CATALOG_VERSION) return
  const existingIds = new Set((db.prepare('SELECT id FROM products').all() as Array<{ id: string }>).map((row) => row.id))
  const sameMenu = existingIds.size === catalogSeed.length && catalogSeed.every((product) => existingIds.has(product.id))
  if (sameMenu) {
    const updatePhoto = db.prepare('UPDATE products SET description = ?, image_path = ?, credit_artist = ?, credit_license = ?, credit_license_url = ?, credit_source = ? WHERE id = ?')
    db.exec('BEGIN')
    try {
      for (const product of catalogSeed) updatePhoto.run(product.description, product.imagePath, product.credit.artist, product.credit.license, product.credit.licenseUrl, product.credit.source, product.id)
      writeCatalogVersion(db)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    return
  }
  const insertProduct = db.prepare(`INSERT INTO products (
    id, name, description, price, category, size, flavor_note, accent, is_featured, is_flavor_of_week, is_available,
    image_path, dairy_free, lactose_free, vegan, gluten_free, contains_coconut, allergens,
    credit_artist, credit_license, credit_license_url, credit_source
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM transaction_items')
    db.exec('DELETE FROM transactions')
    db.exec('DELETE FROM products')
    for (const product of catalogSeed) {
      insertProduct.run(
        product.id, product.name, product.description, product.price, product.category, product.size, product.flavorNote, product.accent,
        product.isFeatured ? 1 : 0, product.isFlavorOfWeek ? 1 : 0, product.imagePath,
        product.dairyFree ? 1 : 0, product.lactoseFree ? 1 : 0, product.vegan ? 1 : 0, product.glutenFree ? 1 : 0, product.containsCoconut ? 1 : 0,
        JSON.stringify(product.allergens), product.credit.artist, product.credit.license, product.credit.licenseUrl, product.credit.source,
      )
    }
    writeCatalogVersion(db)
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      size TEXT NOT NULL,
      flavor_note TEXT NOT NULL,
      accent TEXT NOT NULL,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_flavor_of_week INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1,
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
    );
    CREATE TABLE IF NOT EXISTS toppings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY,
      first_initial TEXT NOT NULL,
      last_name TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      service_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id),
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shop_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  ensureProductColumns(db)
  seedShopDefaults(db)
  syncCatalog(db)
  database = db
  return db
}

function ensureGhostTransactions() {
  const db = getDb()
  const transactionCount = db.prepare('SELECT COUNT(*) AS count FROM transactions').get() as { count: number }
  if (transactionCount.count === 0) seedGhostTransactions(db)
}

interface TransactionRow {
  id: number
  first_initial: string
  last_name: string
  payment_status: PaymentStatus
  service_status: ServiceStatus
  created_at: string
  total: number
  items_json: string
}

function mapTransaction(row: TransactionRow) {
  const items = (JSON.parse(row.items_json) as Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>).map((item) => ({
    ...item,
    lineTotal: Number((item.quantity * item.unitPrice).toFixed(2)),
  }))
  return {
    id: row.id,
    code: `#${1000 + row.id}`,
    firstInitial: row.first_initial,
    lastName: row.last_name,
    paymentStatus: row.payment_status,
    serviceStatus: row.service_status,
    createdAt: row.created_at,
    total: Number(row.total.toFixed(2)),
    items,
  }
}

const transactionSql = `
  SELECT t.id, t.first_initial, t.last_name, t.payment_status, t.service_status, t.created_at,
    json_group_array(json_object('productId', i.product_id, 'productName', i.product_name, 'quantity', i.quantity, 'unitPrice', i.unit_price)) AS items_json,
    SUM(i.quantity * i.unit_price) AS total
  FROM transactions t
  JOIN transaction_items i ON i.transaction_id = t.id
`

export function listProducts() {
  return getDb().prepare('SELECT * FROM products ORDER BY category, name, price').all()
}

export function listToppings() {
  return getDb().prepare('SELECT * FROM toppings ORDER BY category, name').all()
}

export function listSettings() {
  const settings = Object.fromEntries((getDb().prepare('SELECT key, value FROM shop_settings').all() as Array<{ key: string; value: string }>).map((row) => [row.key, row.value]))
  delete settings.catalog_version
  return settings
}

export function listTransactions() {
  ensureGhostTransactions()
  return (getDb().prepare(`${transactionSql} GROUP BY t.id ORDER BY t.created_at DESC, t.id DESC`).all() as unknown as TransactionRow[]).map(mapTransaction)
}

export function dayTotal(day: string) {
  ensureGhostTransactions()
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(i.quantity * i.unit_price), 0) AS total, COUNT(DISTINCT t.id) AS count
    FROM transactions t JOIN transaction_items i ON i.transaction_id = t.id
    WHERE substr(t.created_at, 1, 10) = ?
  `).get(day) as { total: number; count: number }
  return { total: Number(row.total), count: Number(row.count) }
}

export function rangeTotal(start: string, end: string) {
  ensureGhostTransactions()
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(i.quantity * i.unit_price), 0) AS total
    FROM transactions t JOIN transaction_items i ON i.transaction_id = t.id
    WHERE t.created_at >= ? AND t.created_at < ?
  `).get(start, end) as { total: number }
  return Number(row.total)
}

export function topFlavors(start: string) {
  ensureGhostTransactions()
  return getDb().prepare(`
    SELECT i.product_name AS name, SUM(i.quantity) AS quantity, SUM(i.quantity * i.unit_price) AS revenue
    FROM transaction_items i JOIN transactions t ON t.id = i.transaction_id
    WHERE t.created_at >= ?
    GROUP BY i.product_name
    ORDER BY quantity DESC, revenue DESC
    LIMIT 5
  `).all(start) as Array<{ name: string; quantity: number; revenue: number }>
}

export function createTransaction(input: NewTransactionInput) {
  ensureGhostTransactions()
  const db = getDb()
  const products = db.prepare('SELECT id, name, price, is_available FROM products').all() as Array<{ id: string; name: string; price: number; is_available: number }>
  const lines = input.items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId)
    if (!product || !product.is_available) throw new Error('Choose an available catalog item')
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 12) throw new Error('Quantity must be between 1 and 12')
    return { ...item, name: product.name, price: product.price }
  })
  if (!lines.length) throw new Error('Add at least one flavor')
  const createdAt = input.createdAt ?? localStamp(new Date())
  const insertTransaction = db.prepare('INSERT INTO transactions (first_initial, last_name, payment_status, service_status, created_at) VALUES (?, ?, ?, ?, ?)')
  const insertItem = db.prepare('INSERT INTO transaction_items (transaction_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)')
  db.exec('BEGIN')
  try {
    const result = insertTransaction.run(input.firstInitial.toUpperCase(), input.lastName.trim(), input.paymentStatus, input.serviceStatus, createdAt)
    const transactionId = Number(result.lastInsertRowid)
    for (const line of lines) insertItem.run(transactionId, line.productId, line.name, line.quantity, line.price)
    db.exec('COMMIT')
    return listTransactions().find((transaction) => transaction.id === transactionId)
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function updateTransaction(id: number, changes: { paymentStatus?: PaymentStatus; serviceStatus?: ServiceStatus }) {
  const current = getDb().prepare('SELECT id FROM transactions WHERE id = ?').get(id)
  if (!current) return null
  if (changes.paymentStatus) getDb().prepare('UPDATE transactions SET payment_status = ? WHERE id = ?').run(changes.paymentStatus, id)
  if (changes.serviceStatus) getDb().prepare('UPDATE transactions SET service_status = ? WHERE id = ?').run(changes.serviceStatus, id)
  return listTransactions().find((transaction) => transaction.id === id) ?? null
}

export function updateProduct(id: string, changes: { isFlavorOfWeek?: boolean; isAvailable?: boolean }) {
  const db = getDb()
  const current = db.prepare('SELECT id FROM products WHERE id = ?').get(id)
  if (!current) return null
  if (changes.isFlavorOfWeek) {
    db.exec('BEGIN')
    try {
      db.prepare('UPDATE products SET is_flavor_of_week = 0').run()
      db.prepare('UPDATE products SET is_flavor_of_week = 1 WHERE id = ?').run(id)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
  if (typeof changes.isAvailable === 'boolean') db.prepare('UPDATE products SET is_available = ? WHERE id = ?').run(changes.isAvailable ? 1 : 0, id)
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
}

export function updateSettings(settings: Record<string, string>) {
  const statement = getDb().prepare('INSERT INTO shop_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  for (const [key, value] of Object.entries(settings)) {
    if (['hours', 'address_line', 'address_city'].includes(key)) statement.run(key, value.trim())
  }
  return listSettings()
}
