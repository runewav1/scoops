import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes } from 'node:crypto'
import {
  createCustomerOrder, getCustomer, getCustomerByPhone, listCustomerOrders, listCustomers, registerCustomer, updateCustomer,
  type CustomerRecord,
} from './db.js'
import { cleanPassword } from './fields.js'
import { POINTS_PER_DOLLAR, POINTS_REWARD_COST, POINTS_REWARD_VALUE } from './loyalty.js'
import { hashPasswordSync, verifyPassword } from './passwords.js'
import { isStaffAuthenticated } from './staff-api.js'

const dummyPasswordHash = `${'ab'.repeat(16)}:${'cd'.repeat(64)}`

const sessionTtlMs = 8 * 60 * 60 * 1000
const sessions = new Map<string, { customerId: number; expiresAt: number }>()
const attempts = new Map<string, { count: number; resetAt: number }>()

function sendJson(response: ServerResponse, status: number, body: object, headers: Record<string, string> = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers })
  response.end(JSON.stringify(body))
}

function readCookie(request: IncomingMessage, name: string) {
  return request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1)
}

export function customerIdFromRequest(request: IncomingMessage) {
  const token = readCookie(request, 'scoops_account_session')
  const session = token ? sessions.get(token) : undefined
  if (!token || !session) return null
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }
  return session.customerId
}

function sessionCookie(token: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `scoops_account_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}

function startSession(customerId: number) {
  const token = randomBytes(32).toString('base64url')
  sessions.set(token, { customerId, expiresAt: Date.now() + sessionTtlMs })
  return sessionCookie(token, 8 * 60 * 60)
}

function isRateLimited(key: string, limit: number) {
  const now = Date.now()
  const record = attempts.get(key)
  if (!record || record.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60_000 })
    return false
  }
  record.count += 1
  return record.count > limit
}

async function readJson(request: IncomingMessage) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 20_000) throw new Error('Request too large')
  }
  return body ? JSON.parse(body) as Record<string, unknown> : {}
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function publicCustomer(customer: CustomerRecord) {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    allergies: customer.allergies,
    phoneNumber: customer.phoneNumber,
    points: customer.points,
    orderCount: customer.orderCount,
    canSignIn: Boolean(customer.passwordHash),
  }
}

function loyaltyRules() {
  return { pointsPerDollar: POINTS_PER_DOLLAR, rewardPoints: POINTS_REWARD_COST, rewardValue: POINTS_REWARD_VALUE }
}

function accountPayload(customer: CustomerRecord) {
  return { customer: publicCustomer(customer), orders: listCustomerOrders(customer.id), rules: loyaltyRules() }
}

function orderItems(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as { productId?: unknown; quantity?: unknown }
    return typeof record.productId === 'string' ? [{ productId: record.productId, quantity: Number(record.quantity) }] : []
  })
}

export async function handleCustomerApi(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const { pathname } = url
  if (!pathname.startsWith('/api/account') && !pathname.startsWith('/api/customers')) return false
  const ip = request.socket.remoteAddress ?? 'unknown'

  if (request.method === 'GET' && pathname === '/api/customers') {
    if (!isStaffAuthenticated(request)) {
      sendJson(response, 401, { error: 'Staff sign-in required' })
      return true
    }
    sendJson(response, 200, { customers: listCustomers().map(publicCustomer) })
    return true
  }

  if (request.method === 'GET' && pathname === '/api/customers/lookup') {
    if (!isStaffAuthenticated(request)) {
      sendJson(response, 401, { error: 'Staff sign-in required' })
      return true
    }
    const customer = getCustomerByPhone(url.searchParams.get('phone') ?? '')
    sendJson(response, 200, { customer: customer ? publicCustomer(customer) : null })
    return true
  }

  if (request.method === 'GET' && pathname === '/api/account') {
    const customerId = customerIdFromRequest(request)
    const customer = customerId ? getCustomer(customerId) : null
    if (!customer) {
      sendJson(response, 401, { error: 'Sign in required' })
      return true
    }
    sendJson(response, 200, accountPayload(customer))
    return true
  }

  if (request.method === 'POST' && pathname === '/api/account/signup') {
    if (isRateLimited(`signup:${ip}`, 10)) {
      sendJson(response, 429, { error: 'Too many signups from this network. Try again in a few minutes.' }, { 'Retry-After': '600' })
      return true
    }
    const body = await readJson(request)
    try {
      const customer = registerCustomer({
        firstName: text(body.firstName),
        lastName: text(body.lastName),
        phoneNumber: text(body.phoneNumber),
        allergies: text(body.allergies),
        passwordHash: hashPasswordSync(cleanPassword(body.password)),
      })
      sendJson(response, 201, accountPayload(customer), { 'Set-Cookie': startSession(customer.id) })
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Could not create the account' })
    }
    return true
  }

  if (request.method === 'POST' && pathname === '/api/account/login') {
    const body = await readJson(request)
    const phone = text(body.phoneNumber)
    if (isRateLimited(`login:${ip}:${phone}`, 20)) {
      sendJson(response, 429, { error: 'Too many sign-in attempts. Try again in a few minutes.' }, { 'Retry-After': '600' })
      return true
    }
    const password = typeof body.password === 'string' ? body.password : ''
    const customer = getCustomerByPhone(phone)
    const matches = await verifyPassword(password, customer?.passwordHash || dummyPasswordHash)
    if (!customer?.passwordHash || !matches) {
      sendJson(response, 401, { error: 'Those details did not match an account.' })
      return true
    }
    sendJson(response, 200, accountPayload(customer), { 'Set-Cookie': startSession(customer.id) })
    return true
  }

  if (request.method === 'POST' && pathname === '/api/account/logout') {
    const token = readCookie(request, 'scoops_account_session')
    if (token) sessions.delete(token)
    sendJson(response, 200, { customer: null }, { 'Set-Cookie': sessionCookie('', 0) })
    return true
  }

  const customerId = customerIdFromRequest(request)
  if (!customerId || !getCustomer(customerId)) {
    sendJson(response, 401, { error: 'Sign in required' })
    return true
  }

  if (request.method === 'PATCH' && pathname === '/api/account') {
    const body = await readJson(request)
    const current = getCustomer(customerId)
    if (!current?.passwordHash) {
      sendJson(response, 401, { error: 'Sign in required' })
      return true
    }
    let passwordHash: string | undefined
    if (typeof body.newPassword === 'string' && body.newPassword.length > 0) {
      const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
      if (!await verifyPassword(currentPassword, current.passwordHash)) {
        sendJson(response, 400, { error: 'The current password did not match.' })
        return true
      }
      try {
        passwordHash = hashPasswordSync(cleanPassword(body.newPassword))
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : 'Could not update the password' })
        return true
      }
    }
    try {
      const customer = updateCustomer(customerId, {
        firstName: text(body.firstName),
        lastName: text(body.lastName),
        phoneNumber: text(body.phoneNumber),
        allergies: text(body.allergies),
        passwordHash,
      })
      sendJson(response, customer ? 200 : 404, customer ? accountPayload(customer) : { error: 'Account not found' })
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Could not update the account' })
    }
    return true
  }

  if (request.method === 'POST' && pathname === '/api/account/orders') {
    if (isRateLimited(`order:${customerId}`, 30)) {
      sendJson(response, 429, { error: 'Too many orders just now. Try again in a few minutes.' }, { 'Retry-After': '600' })
      return true
    }
    const body = await readJson(request)
    try {
      const order = createCustomerOrder(customerId, orderItems(body.items), body.redeem === true)
      const customer = getCustomer(customerId)
      sendJson(response, 201, { order, customer: customer ? publicCustomer(customer) : null, orders: listCustomerOrders(customerId), rules: loyaltyRules() })
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : 'Could not save the order' })
    }
    return true
  }

  sendJson(response, 404, { error: 'Not found' })
  return true
}
