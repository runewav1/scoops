export interface CatalogSeed {
  id: string
  name: string
  description: string
  price: number
  category: 'dairy' | 'plant-based' | 'sorbet'
  size: string
  flavorNote: string
  accent: 'coral' | 'pistachio' | 'chocolate' | 'lemon'
  imagePath: string
  dairyFree: boolean
  lactoseFree: boolean
  vegan: boolean
  glutenFree: boolean
  containsCoconut: boolean
  allergens: string[]
  credit: { artist: string; license: string; licenseUrl: string; source: string }
  isFeatured?: boolean
  isFlavorOfWeek?: boolean
}

export interface ToppingSeed {
  id: string
  name: string
  price: number
  category: 'crunchy' | 'saucy' | 'fresh'
}

const dairy = { dairyFree: false, lactoseFree: false, vegan: false, glutenFree: true, containsCoconut: false, allergens: ['milk'] }
const dairyWheat = { dairyFree: false, lactoseFree: false, vegan: false, glutenFree: false, containsCoconut: false, allergens: ['milk', 'wheat'] }
const coconut = { dairyFree: true, lactoseFree: true, vegan: true, glutenFree: true, containsCoconut: true, allergens: [] as string[] }
const coconutWheat = { dairyFree: true, lactoseFree: true, vegan: true, glutenFree: false, containsCoconut: true, allergens: ['wheat'] }
const coconutHazelnut = { dairyFree: true, lactoseFree: true, vegan: true, glutenFree: true, containsCoconut: true, allergens: ['hazelnut'] }
const fruit = { dairyFree: true, lactoseFree: true, vegan: true, glutenFree: true, containsCoconut: false, allergens: [] as string[] }

function photo(id: string, artist: string, license: string, licenseUrl: string, source: string) {
  return {
    imagePath: `/images/flavors/${id}.jpg`,
    credit: { artist, license, licenseUrl, source },
  }
}

export const catalogSeed: CatalogSeed[] = [
  { id: 'classic-vanilla', name: 'Classic Vanilla', description: 'Vanilla bean in a dairy custard.', price: 4.75, category: 'dairy', size: 'Scoop', flavorNote: 'Speckled with bean', accent: 'lemon', isFeatured: true, ...dairy, ...photo('classic-vanilla', 'a.pasquier from bellingham, washington', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vanilla_bean_ice_cream_(3086700978)_(cropped).jpg') },
  { id: 'rich-chocolate', name: 'Rich Chocolate', description: 'Dutch cocoa in a dairy custard.', price: 4.75, category: 'dairy', size: 'Scoop', flavorNote: 'Cocoa, not too sweet', accent: 'chocolate', ...dairy, ...photo('rich-chocolate', 'jules', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Rich_chocolate_ice_cream.jpg') },
  { id: 'strawberry-fields', name: 'Strawberry Fields', description: 'Strawberries folded through a dairy custard.', price: 5.25, category: 'dairy', size: 'Scoop', flavorNote: 'Flavor of the week', accent: 'coral', isFeatured: true, isFlavorOfWeek: true, ...dairy, ...photo('strawberry-fields', 'Lotus Head from Johannesburg, Gauteng, South Africa', 'CC BY-SA 3.0', 'http://creativecommons.org/licenses/by-sa/3.0/', 'https://commons.wikimedia.org/wiki/File:Strawberry_Ice_Cream_with_Strawberries_01.jpg') },
  { id: 'chocolate-chip', name: 'Chocolate Chip', description: 'Dairy chocolate scattered with chocolate chips.', price: 5.25, category: 'dairy', size: 'Scoop', flavorNote: 'Chips in the scoop', accent: 'chocolate', ...dairy, ...photo('chocolate-chip', 'Missvain', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Dark_chocolate_chip_ice_cream_cone_-_August_2025_-_Sarah_Stierch.jpg') },
  { id: 'chocolate-malt', name: 'Chocolate Malt', description: 'Malted cocoa custard.', price: 5.5, category: 'dairy', size: 'Scoop', flavorNote: 'Malt and cocoa', accent: 'chocolate', ...dairyWheat, ...photo('chocolate-malt', 'stu_spivack', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Chocolate_malt_ice_cream.jpg') },
  { id: 'plant-based-french-vanilla', name: 'Plant-Based French Vanilla', description: 'Vanilla bean in a coconut base.', price: 5.75, category: 'plant-based', size: 'Scoop', flavorNote: 'Coconut and vanilla', accent: 'lemon', ...coconut, ...photo('plant-based-french-vanilla', 'Veganbaking.net from USA', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vegan_French_Vanilla_Ice_Cream_(4107608758).jpg') },
  { id: 'plant-based-chocolate', name: 'Plant-Based Chocolate', description: 'Cocoa in a coconut base.', price: 5.75, category: 'plant-based', size: 'Scoop', flavorNote: 'Cocoa, coconut base', accent: 'chocolate', ...coconut, ...photo('plant-based-chocolate', 'Jennifer from Vancouver, Canada', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Raw_Chocolate_Ice_Cream_(Vegan)_(4268759981).jpg') },
  { id: 'plant-based-mint-chip', name: 'Plant-Based Mint Chip', description: 'Cool mint and chocolate chips in a coconut base.', price: 6, category: 'plant-based', size: 'Scoop', flavorNote: 'Cool mint, dark chips', accent: 'pistachio', isFeatured: true, ...coconut, ...photo('plant-based-mint-chip', 'Veganbaking.net from USA', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Raw_Ice_Cream_Company_Vegan_Mint_Chip_Icecream_(5103478661).jpg') },
  { id: 'chai-chocolate-chip', name: 'Chai Chocolate Chip', description: 'Chai spice and chocolate chips in a coconut base.', price: 6, category: 'plant-based', size: 'Scoop', flavorNote: 'Spice, then chocolate', accent: 'lemon', ...coconut, ...photo('chai-chocolate-chip', 'Veganbaking.net from USA', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vegan_Chai_Chocolate_Chip_Ice_Cream_(4106830845).jpg') },
  { id: 'coconut-rum-raisin', name: 'Coconut Rum Raisin', description: 'Raisins and rum flavoring in a coconut base.', price: 6.25, category: 'plant-based', size: 'Scoop', flavorNote: 'Raisin and rum flavor', accent: 'lemon', ...coconut, ...photo('coconut-rum-raisin', 'Veganbaking.net from USA', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vegan_Coconut_Rum_Raisin_Ice_Cream_(4991731451).jpg') },
  { id: 'double-chocolate-brownie', name: 'Double Chocolate Brownie', description: 'Cocoa and wheat brownie pieces in a coconut base.', price: 6.25, category: 'plant-based', size: 'Scoop', flavorNote: 'Brownie pieces', accent: 'chocolate', ...coconutWheat, ...photo('double-chocolate-brownie', 'Veganbaking.net from USA', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vegan_Double_Chocolate_Brownie_Chunk_Ice_Cream_(4869832969).jpg') },
  { id: 'gingersnap-cookie', name: 'Gingersnap Cookie', description: 'Gingersnap pieces in a coconut base.', price: 6.25, category: 'plant-based', size: 'Scoop', flavorNote: 'Cookie pieces', accent: 'lemon', ...coconutWheat, ...photo('gingersnap-cookie', 'Veganbaking.net from USA', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vegan_Gingersnap_Cookie_Ice_Cream_(6113894224).jpg') },
  { id: 'hazelnut-coffee', name: 'Hazelnut Coffee', description: 'Coffee and hazelnut in a coconut base.', price: 6.5, category: 'plant-based', size: 'Scoop', flavorNote: 'Coffee and hazelnut', accent: 'chocolate', ...coconutHazelnut, ...photo('hazelnut-coffee', 'Veganbaking.net from USA', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vegan_Hazelnut_Coffee_Ice_Cream_(5013027435).jpg') },
  { id: 'sweet-potato-spice', name: 'Sweet Potato Spice', description: 'Sweet potato and warm spice in a coconut base.', price: 6.25, category: 'plant-based', size: 'Scoop', flavorNote: 'Spice and sweet potato', accent: 'coral', ...coconut, ...photo('sweet-potato-spice', 'Veganbaking.net from USA', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vegan_Sweet_Potato_Ice_Cream_(4107600688).jpg') },
  { id: 'lychee-sorbet', name: 'Lychee Sorbet', description: 'Lychee, water, and sugar.', price: 5.25, category: 'sorbet', size: 'Scoop', flavorNote: 'Floral and cold', accent: 'coral', isFeatured: true, ...fruit, ...photo('lychee-sorbet', 'Janine from Mililani, Hawaii, United States', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Lychee_sorbet_black_tea_with_mint_leaf.jpg') },
  { id: 'cantaloupe-sorbet', name: 'Cantaloupe Sorbet', description: 'Cantaloupe, water, and sugar.', price: 5.25, category: 'sorbet', size: 'Scoop', flavorNote: 'Melon, very cold', accent: 'lemon', ...fruit, ...photo('cantaloupe-sorbet', 'stu_spivack', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Melon_sorbet.jpg') },
  { id: 'apricot-sorbet', name: 'Apricot Sorbet', description: 'Apricot, water, and sugar.', price: 5.25, category: 'sorbet', size: 'Scoop', flavorNote: 'Stone fruit', accent: 'coral', ...fruit, ...photo('apricot-sorbet', 'Vegan Feast Catering', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Mango_Apricot_Sorbet_(4555463757).jpg') },
  { id: 'banana-sorbet', name: 'Banana Sorbet', description: 'Ripe banana, water, and sugar.', price: 5.25, category: 'sorbet', size: 'Scoop', flavorNote: 'Ripe banana', accent: 'lemon', ...fruit, ...photo('banana-sorbet', 'Lablascovegmenu from London', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Homemade_raw_vegan_banana_ice_cream_(7440234274).jpg') },
  { id: 'pear-sorbet', name: 'Pear Sorbet', description: 'Pear, water, and sugar.', price: 5.25, category: 'sorbet', size: 'Scoop', flavorNote: 'Pale and delicate', accent: 'pistachio', ...fruit, ...photo('pear-sorbet', 'City Foodsters', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:17-_Sorbet,_Pear,_Yuzu,_Pain_D%27epices.jpg') },
  { id: 'black-plum-sorbet', name: 'Black Plum Sorbet', description: 'Black plum, water, and sugar.', price: 5.5, category: 'sorbet', size: 'Scoop', flavorNote: 'Dark fruit', accent: 'chocolate', ...fruit, ...photo('black-plum-sorbet', 'takaokun', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Kishu_Wakayama_Ume_Guava_Sorbet_IMG_0608_(4343217802).jpg') },
]

export const toppingSeed: ToppingSeed[] = [
  { id: 'sprinkles', name: 'Confetti sprinkles', price: 0.75, category: 'crunchy' },
  { id: 'brownie', name: 'Brownie bites', price: 1.25, category: 'crunchy' },
  { id: 'pretzel', name: 'Salted pretzel', price: 1, category: 'crunchy' },
  { id: 'sesame-brittle', name: 'Sesame brittle', price: 1.25, category: 'crunchy' },
  { id: 'hot-fudge', name: 'Hot fudge', price: 1, category: 'saucy' },
  { id: 'caramel', name: 'Warm caramel', price: 1, category: 'saucy' },
  { id: 'olive-oil', name: 'Olive oil drizzle', price: 1.5, category: 'saucy' },
  { id: 'cherries', name: 'Bright cherries', price: 0.75, category: 'fresh' },
  { id: 'blackberry', name: 'Blackberry spoon', price: 1.25, category: 'fresh' },
  { id: 'honeycomb', name: 'Honeycomb', price: 1.5, category: 'crunchy' },
]
