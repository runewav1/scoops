export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '')
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
}

export function cleanName(value: string, label: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!/^[\p{L}][\p{L}'’. -]{0,39}$/u.test(trimmed)) throw new Error(`${label} should be letters, up to 40 characters`)
  return trimmed
}

export function cleanAllergies(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return 'None'
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ,.'’/+-]{0,79}$/u.test(trimmed)) throw new Error('Allergies should be a short note, like Milk or None')
  return trimmed
}

export function cleanPassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 72) throw new Error('Use a password of 8 to 72 characters')
  return value
}
