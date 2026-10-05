export interface CatalogSeed {
  id: string
  name: string
  description: string
  price: number
  category: 'scoops' | 'pints' | 'quarts' | 'sundaes' | 'drinks'
  size: string
  flavorNote: string
  accent: 'coral' | 'pistachio' | 'chocolate' | 'lemon'
  isFeatured?: boolean
  isFlavorOfWeek?: boolean
}

export interface ToppingSeed {
  id: string
  name: string
  price: number
  category: 'crunchy' | 'saucy' | 'fresh'
}

// Everyday flavors follow the 2024 IDFA / Morning Consult ranking
// (vanilla, chocolate, strawberry, butter pecan, cookie dough, then cookies and cream,
// mint chip, chocolate chip, rocky road, and peanut butter cup). Gourmet flavors sit beside them.
export const catalogSeed: CatalogSeed[] = [
  { id: 'vanilla-single', name: 'Vanilla Bean', description: 'Madagascar bean in a plain, very good custard.', price: 4.75, category: 'scoops', size: 'Single scoop', flavorNote: 'The one people mean', accent: 'lemon', isFeatured: true },
  { id: 'vanilla-double', name: 'Vanilla Bean', description: 'Two scoops of the house vanilla.', price: 7.5, category: 'scoops', size: 'Double scoop', flavorNote: 'Twice the bean', accent: 'lemon' },
  { id: 'chocolate-single', name: 'Chocolate', description: 'Dutch cocoa, not too sweet, scooped thick.', price: 4.75, category: 'scoops', size: 'Single scoop', flavorNote: 'A reliable classic', accent: 'chocolate', isFeatured: true },
  { id: 'chocolate-double', name: 'Chocolate', description: 'A double of the cocoa custard.', price: 7.5, category: 'scoops', size: 'Double scoop', flavorNote: 'For the cocoa people', accent: 'chocolate' },
  { id: 'strawberry-single', name: 'Strawberry', description: 'Macerated berries folded through sweet cream.', price: 5, category: 'scoops', size: 'Single scoop', flavorNote: 'Bright and familiar', accent: 'coral', isFeatured: true },
  { id: 'strawberry-double', name: 'Strawberry', description: 'Two scoops of the berry cream.', price: 7.75, category: 'scoops', size: 'Double scoop', flavorNote: 'A pinker portion', accent: 'coral' },
  { id: 'butter-pecan-single', name: 'Butter Pecan', description: 'Brown-butter custard and toasted pecan halves.', price: 5.5, category: 'scoops', size: 'Single scoop', flavorNote: 'Now a top-five flavor', accent: 'lemon' },
  { id: 'butter-pecan-double', name: 'Butter Pecan', description: 'A double scoop with extra pecans.', price: 8.5, category: 'scoops', size: 'Double scoop', flavorNote: 'Toasty all the way down', accent: 'lemon' },
  { id: 'cookie-dough-single', name: 'Cookie Dough', description: 'Sweet cream packed with browned dough pieces.', price: 5.5, category: 'scoops', size: 'Single scoop', flavorNote: 'The other new classic', accent: 'chocolate', isFeatured: true },
  { id: 'cookie-dough-double', name: 'Cookie Dough', description: 'Two scoops, plenty of dough.', price: 8.5, category: 'scoops', size: 'Double scoop', flavorNote: 'Permission granted', accent: 'chocolate' },
  { id: 'cookies-cream-single', name: 'Cookies and Cream', description: 'Vanilla cream shattered with dark cookie wafers.', price: 5.25, category: 'scoops', size: 'Single scoop', flavorNote: 'Still a crowd favorite', accent: 'chocolate' },
  { id: 'mint-chip-single', name: 'Mint Chocolate Chip', description: 'Cool mint and thin shards of chocolate.', price: 5.25, category: 'scoops', size: 'Single scoop', flavorNote: 'Often someone’s number one', accent: 'pistachio' },
  { id: 'mint-chip-double', name: 'Mint Chocolate Chip', description: 'A double of the mint chip.', price: 8, category: 'scoops', size: 'Double scoop', flavorNote: 'Extra cool', accent: 'pistachio' },
  { id: 'choc-chip-single', name: 'Chocolate Chip', description: 'Sweet cream with puddles of chopped chocolate.', price: 4.75, category: 'scoops', size: 'Single scoop', flavorNote: 'Simple on purpose', accent: 'chocolate' },
  { id: 'rocky-road-single', name: 'Rocky Road', description: 'Chocolate, toasted marshmallow, and almonds.', price: 5.5, category: 'scoops', size: 'Single scoop', flavorNote: 'The messy classic', accent: 'chocolate' },
  { id: 'pb-cup-single', name: 'Peanut Butter Cup', description: 'Peanut butter custard and chopped chocolate cups.', price: 5.5, category: 'scoops', size: 'Single scoop', flavorNote: 'Salty, then sweet', accent: 'lemon' },
  { id: 'pb-cup-double', name: 'Peanut Butter Cup', description: 'Two scoops of the peanut butter cup.', price: 8.5, category: 'scoops', size: 'Double scoop', flavorNote: 'A fuller cup', accent: 'lemon' },
  { id: 'coffee-single', name: 'Coffee', description: 'Cold-brew custard with a little cocoa in the finish.', price: 5, category: 'scoops', size: 'Single scoop', flavorNote: 'Afternoon scoop', accent: 'chocolate' },
  { id: 'salted-caramel-single', name: 'Salted Caramel', description: 'Deep caramel ribbon and a pinch of sea salt.', price: 5.25, category: 'scoops', size: 'Single scoop', flavorNote: 'Sweet with a snap', accent: 'lemon' },
  { id: 'birthday-single', name: 'Birthday Cake', description: 'Vanilla cake batter, frosting swirl, and confetti.', price: 5.25, category: 'scoops', size: 'Single scoop', flavorNote: 'A small celebration', accent: 'coral' },
  { id: 'pistachio-single', name: 'Pistachio', description: 'Roasted pistachio paste, not the bright-green kind.', price: 5.75, category: 'scoops', size: 'Single scoop', flavorNote: 'Nutty and quiet', accent: 'pistachio' },
  { id: 'miso-single', name: 'Brown Butter Miso', description: 'Toasted brown butter balanced with white miso.', price: 6.5, category: 'scoops', size: 'Single scoop', flavorNote: 'Savory, then sweet', accent: 'lemon' },
  { id: 'olive-oil-single', name: 'Olive Oil & Sea Salt', description: 'Peppery olive oil in a milky vanilla base.', price: 6.75, category: 'scoops', size: 'Single scoop', flavorNote: 'A spoonful of the good oil', accent: 'pistachio' },
  { id: 'sesame-single', name: 'Black Sesame', description: 'Toasted black sesame, a little honey, no perfume.', price: 6.5, category: 'scoops', size: 'Single scoop', flavorNote: 'Toasty and mineral', accent: 'chocolate' },
  { id: 'lavender-single', name: 'Honey Lavender', description: 'A light hand of lavender and local honey.', price: 6.25, category: 'scoops', size: 'Single scoop', flavorNote: 'Flavor of the week', accent: 'coral', isFeatured: true, isFlavorOfWeek: true },
  { id: 'ube-single', name: 'Ube', description: 'Purple yam, coconut milk, and a vanilla finish.', price: 6.5, category: 'scoops', size: 'Single scoop', flavorNote: 'Floral and starchy', accent: 'coral' },
  { id: 'horchata-single', name: 'Horchata', description: 'Rice milk, cinnamon, and a little vanilla bean.', price: 6.25, category: 'scoops', size: 'Single scoop', flavorNote: 'Cinnamon first', accent: 'lemon' },
  { id: 'brown-bread-single', name: 'Brown Bread', description: 'Malted brown-bread crumbs in a caramel cream.', price: 6, category: 'scoops', size: 'Single scoop', flavorNote: 'Like warm toast', accent: 'chocolate' },
  { id: 'yuzu-single', name: 'Yuzu', description: 'Sharp yuzu curd rippled through a light cream.', price: 6.75, category: 'scoops', size: 'Single scoop', flavorNote: 'Tart and clean', accent: 'lemon' },
  { id: 'balsamic-single', name: 'Roasted Strawberry Balsamic', description: 'Oven strawberries and a thread of balsamic.', price: 6.5, category: 'scoops', size: 'Single scoop', flavorNote: 'Jammy, then sharp', accent: 'coral' },
  { id: 'cardamom-single', name: 'Cardamom Rose', description: 'Green cardamom with a whisper of rose.', price: 6.75, category: 'scoops', size: 'Single scoop', flavorNote: 'A special-occasion scoop', accent: 'coral' },
  { id: 'burnt-honey-single', name: 'Burnt Honey', description: 'Honey cooked until it smells like caramel.', price: 6.25, category: 'scoops', size: 'Single scoop', flavorNote: 'Darker than it looks', accent: 'lemon' },
  { id: 'corn-single', name: 'Sweet Corn & Blackberry', description: 'Fresh corn custard with a blackberry ribbon.', price: 6.75, category: 'scoops', size: 'Single scoop', flavorNote: 'Late-summer scoop', accent: 'pistachio' },
  { id: 'malt-single', name: 'Malt & Pretzel', description: 'Malted milk and shattered salted pretzels.', price: 6.25, category: 'scoops', size: 'Single scoop', flavorNote: 'Salty crunch', accent: 'chocolate' },
  { id: 'thai-tea-single', name: 'Thai Tea', description: 'Black tea, condensed milk, and orange blossom.', price: 6.5, category: 'scoops', size: 'Single scoop', flavorNote: 'Creamy and spiced', accent: 'lemon' },
  { id: 'cocoa-cherry-single', name: 'Black Cocoa Cherry', description: 'Nearly black cocoa with sour cherry.', price: 6.5, category: 'scoops', size: 'Single scoop', flavorNote: 'Deep and tart', accent: 'chocolate' },
  { id: 'pandan-single', name: 'Toasted Coconut Pandan', description: 'Pandan leaf and coconut toasted in a pan.', price: 6.75, category: 'scoops', size: 'Single scoop', flavorNote: 'Grassy and rich', accent: 'pistachio' },
  { id: 'vanilla-pint', name: 'Vanilla Bean', description: 'A pint of the house vanilla.', price: 11, category: 'pints', size: 'Pint', flavorNote: 'Take the classic home', accent: 'lemon' },
  { id: 'chocolate-pint', name: 'Chocolate', description: 'A pint of the cocoa custard.', price: 11, category: 'pints', size: 'Pint', flavorNote: 'Cocoa for later', accent: 'chocolate' },
  { id: 'strawberry-pint', name: 'Strawberry', description: 'A pint of the berry cream.', price: 12, category: 'pints', size: 'Pint', flavorNote: 'Berry, packed', accent: 'coral' },
  { id: 'butter-pecan-pint', name: 'Butter Pecan', description: 'A pint with a heavier pecan scatter.', price: 13, category: 'pints', size: 'Pint', flavorNote: 'The toaster’s favorite', accent: 'lemon' },
  { id: 'cookie-dough-pint', name: 'Cookie Dough', description: 'A pint crowded with dough.', price: 13, category: 'pints', size: 'Pint', flavorNote: 'Shares reluctantly', accent: 'chocolate' },
  { id: 'lavender-pint', name: 'Honey Lavender', description: 'A pint of this week’s scoop.', price: 14.5, category: 'pints', size: 'Pint', flavorNote: 'While it lasts', accent: 'coral' },
  { id: 'sesame-pint', name: 'Black Sesame', description: 'A pint of the toasted sesame cream.', price: 15, category: 'pints', size: 'Pint', flavorNote: 'A quieter pint', accent: 'chocolate' },
  { id: 'ube-pint', name: 'Ube', description: 'A pint of coconut-ube cream.', price: 15, category: 'pints', size: 'Pint', flavorNote: 'Purple all the way down', accent: 'coral' },
  { id: 'thai-tea-pint', name: 'Thai Tea', description: 'A pint of the tea custard.', price: 15, category: 'pints', size: 'Pint', flavorNote: 'For the next afternoon', accent: 'lemon' },
  { id: 'vanilla-quart', name: 'Vanilla Bean', description: 'A quart for a table, not a spoon.', price: 16, category: 'quarts', size: 'Quart', flavorNote: 'The sharing size', accent: 'lemon' },
  { id: 'chocolate-quart', name: 'Chocolate', description: 'A quart of the cocoa custard.', price: 16, category: 'quarts', size: 'Quart', flavorNote: 'Feeds a small crowd', accent: 'chocolate' },
  { id: 'butter-pecan-quart', name: 'Butter Pecan', description: 'A quart with pecans throughout.', price: 19, category: 'quarts', size: 'Quart', flavorNote: 'The generous tin', accent: 'lemon' },
  { id: 'maple-quart', name: 'Maple Pecan Praline', description: 'Maple cream, pecan praline, and salt.', price: 21, category: 'quarts', size: 'Quart', flavorNote: 'A weekend quart', accent: 'chocolate' },
  { id: 'banana-sundae', name: 'The Good Banana', description: 'Three scoops, banana, hot fudge, and a cherry.', price: 11, category: 'sundaes', size: 'Bowl', flavorNote: 'Classic for a reason', accent: 'lemon' },
  { id: 'fudge-sundae', name: 'Hot Fudge Classic', description: 'Vanilla and chocolate under warm fudge.', price: 9.5, category: 'sundaes', size: 'Bowl', flavorNote: 'The counter sundae', accent: 'chocolate' },
  { id: 'pecan-sundae', name: 'Butter Pecan Sundae', description: 'Butter pecan, caramel, and more pecans.', price: 12, category: 'sundaes', size: 'Bowl', flavorNote: 'Extra crunch', accent: 'lemon' },
  { id: 'yuzu-sundae', name: 'Yuzu Olive Oil', description: 'Yuzu, olive-oil vanilla, and sea salt.', price: 13, category: 'sundaes', size: 'Bowl', flavorNote: 'The gourmet bowl', accent: 'pistachio' },
  { id: 'cold-brew-float', name: 'Cold Brew Float', description: 'Velvety cold brew with a scoop on top.', price: 7, category: 'drinks', size: '12 oz', flavorNote: 'The afternoon plot twist', accent: 'chocolate' },
  { id: 'affogato', name: 'Affogato', description: 'A shot of espresso over vanilla bean.', price: 6.5, category: 'drinks', size: 'Cup', flavorNote: 'Two bites and a sip', accent: 'lemon' },
  { id: 'thai-float', name: 'Thai Tea Float', description: 'Iced Thai tea with coconut pandan ice cream.', price: 7.25, category: 'drinks', size: '12 oz', flavorNote: 'Tea, then cream', accent: 'lemon' },
  { id: 'horchata-shake', name: 'Horchata Shake', description: 'Blended horchata ice cream and cold milk.', price: 6.75, category: 'drinks', size: '12 oz', flavorNote: 'Cinnamon all the way', accent: 'pistachio' },
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
