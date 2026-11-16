export const worksheetProductIds: Record<string, number> = {
  'plant-based-mint-chip': 1,
  'double-chocolate-brownie': 2,
  'strawberry-fields': 3,
  'chocolate-chip': 4,
  'banana-sorbet': 5,
}

export function assignProductIds(slugs: string[]) {
  const assigned = new Map<string, number>()
  for (const slug of slugs) {
    const fixed = worksheetProductIds[slug]
    if (fixed) assigned.set(slug, fixed)
  }
  let next = 6
  for (const slug of slugs) {
    if (assigned.has(slug)) continue
    while ([...assigned.values()].includes(next)) next += 1
    assigned.set(slug, next)
    next += 1
  }
  return assigned
}
