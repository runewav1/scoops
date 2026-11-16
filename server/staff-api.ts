import 'dotenv/config'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { verifyPassword } from './passwords.js'
const sessionTtlMs = 8 * 60 * 60 * 1000
const sessions = new Map<string, number>()
const attempts = new Map<string, { count: number; resetAt: number }>()

function sendJson(response: ServerResponse, status: number, body: object, headers: Record<string, string> = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers })
  response.end(JSON.stringify(body))
}

function readCookie(request: IncomingMessage, name: string) {
  return request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1)
}

export function isStaffAuthenticated(request: IncomingMessage) {
  const token = readCookie(request, 'scoops_staff_session')
  const expiresAt = token ? sessions.get(token) : undefined
  if (!token || !expiresAt) return false
  if (expiresAt < Date.now()) {
    sessions.delete(token)
    return false
  }
  return true
}

async function readJson(request: IncomingMessage) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 10_000) throw new Error('Request too large')
  }
  return body ? JSON.parse(body) as { username?: string; password?: string } : {}
}

function sameSecret(submitted: string, expected: string) {
  const submittedBytes = Buffer.from(submitted)
  const expectedBytes = Buffer.from(expected)
  return submittedBytes.length === expectedBytes.length && timingSafeEqual(submittedBytes, expectedBytes)
}

function isRateLimited(ip: string) {
  const now = Date.now()
  const record = attempts.get(ip)
  if (!record || record.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  record.count += 1
  return record.count > 5
}

export async function handleStaffApi(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (!url.pathname.startsWith('/api/staff/')) return false

  const ip = request.socket.remoteAddress ?? 'unknown'
  if (request.method === 'GET' && url.pathname === '/api/staff/session') {
    const authenticated = isStaffAuthenticated(request)
    sendJson(response, authenticated ? 200 : 401, { authenticated })
    return true
  }

  if (request.method === 'POST' && url.pathname === '/api/staff/login') {
    if (isRateLimited(ip)) {
      sendJson(response, 429, { error: 'Too many login attempts' }, { 'Retry-After': '60' })
      return true
    }
    const configuredUsername = process.env.STAFF_USERNAME?.trim()
    const configuredHash = process.env.STAFF_PASSWORD_HASH?.trim()
    if (!configuredUsername || !configuredHash) {
      sendJson(response, 503, { error: 'Staff authentication is not configured' })
      return true
    }
    const credentials = await readJson(request)
    const validUsername = typeof credentials.username === 'string' && sameSecret(credentials.username, configuredUsername)
    const validPassword = typeof credentials.password === 'string' && await verifyPassword(credentials.password, configuredHash)
    if (!validUsername || !validPassword) {
      sendJson(response, 401, { error: 'Invalid credentials' })
      return true
    }

    const token = randomBytes(32).toString('base64url')
    sessions.set(token, Date.now() + sessionTtlMs)
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    sendJson(response, 200, { authenticated: true }, { 'Set-Cookie': `scoops_staff_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}` })
    return true
  }

  if (request.method === 'POST' && url.pathname === '/api/staff/logout') {
    const token = readCookie(request, 'scoops_staff_session')
    if (token) sessions.delete(token)
    sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': 'scoops_staff_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' })
    return true
  }

  sendJson(response, 404, { error: 'Not found' })
  return true
}
