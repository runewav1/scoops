import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

export const SAMPLE_ACCOUNT_PASSWORD = 'scoops-demo'

export function hashPasswordSync(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [salt, hash] = encodedHash.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  if (!expected.length || expected.length * 2 !== hash.length) return false
  const actual = Buffer.from(await scrypt(password, salt, expected.length) as Buffer)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
