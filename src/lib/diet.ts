import type { Product, ProductCategory } from './models'

export const categoryLabels: Record<ProductCategory, string> = {
  dairy: 'Dairy',
  'plant-based': 'Plant-based',
  sorbet: 'Sorbet',
}

export const dietFilters = [
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'lactose-free', label: 'Lactose-free' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'no-milk', label: 'No milk' },
  { id: 'no-wheat', label: 'No wheat' },
  { id: 'no-hazelnut', label: 'No hazelnut' },
  { id: 'no-coconut', label: 'No coconut' },
] as const

export type DietFilterId = (typeof dietFilters)[number]['id']

export function matchesDiet(product: Product, active: ReadonlySet<DietFilterId>) {
  if (active.has('dairy-free') && !product.dairyFree) return false
  if (active.has('lactose-free') && !product.lactoseFree) return false
  if (active.has('vegan') && !product.vegan) return false
  if (active.has('gluten-free') && !product.glutenFree) return false
  if (active.has('no-milk') && product.allergens.includes('milk')) return false
  if (active.has('no-wheat') && product.allergens.includes('wheat')) return false
  if (active.has('no-hazelnut') && product.allergens.includes('hazelnut')) return false
  if (active.has('no-coconut') && product.containsCoconut) return false
  return true
}

export function recipeMarks(product: Product) {
  const marks: string[] = []
  if (product.vegan) marks.push('Vegan')
  if (product.dairyFree) marks.push('Dairy-free')
  if (product.lactoseFree) marks.push('Lactose-free')
  if (product.glutenFree) marks.push('Gluten-free')
  if (product.containsCoconut) marks.push('Coconut base')
  for (const allergen of product.allergens) marks.push(`Contains ${allergen}`)
  return marks
}

export function cardMarks(product: Product) {
  const marks: string[] = []
  if (product.vegan) marks.push('Vegan')
  if (product.glutenFree) marks.push('Gluten-free')
  if (product.containsCoconut) marks.push('Coconut base')
  for (const allergen of product.allergens) marks.push(`Contains ${allergen}`)
  return marks
}
