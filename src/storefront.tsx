import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowUpRight, ChevronRight, Clock3, Cookie, Sparkles, Star, Store } from 'lucide-react'
import logo from '../assets/sns_logo.png'
import { fetchCatalog, fetchSettings, fetchToppings } from './lib/api'
import { money } from './lib/format'
import type { Product, ProductCategory, ShopSettings, Topping } from './lib/models'
import { RouteLink, useRoute } from './router'

const categoryLabels: Record<ProductCategory, string> = { scoops: 'Scoops', pints: 'Pints', quarts: 'Quarts', sundaes: 'Sundaes', drinks: 'Drinks' }
const shopEmail = 'hello@scoopsandsmiles.example'
const shopPhone = '(404) 555-0136'

function useCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [flavorOfWeek, setFlavorOfWeek] = useState<Product | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetchCatalog().then((catalog) => { setProducts(catalog.products); setFlavorOfWeek(catalog.flavorOfWeek) }).catch(() => setError('The menu could not be loaded.'))
  }, [])
  return { products, flavorOfWeek, error }
}

export function Storefront() {
  const { path } = useRoute()
  const catalog = useCatalog()
  const flavorId = path.startsWith('/flavors/') ? decodeURIComponent(path.slice('/flavors/'.length)) : ''
  const menuCategory = path.startsWith('/menu/') ? path.slice('/menu/'.length) as ProductCategory : ''
  let page = <HomePage products={catalog.products} />
  if (path === '/menu' || path.startsWith('/menu/')) page = <MenuPage {...catalog} category={menuCategory} />
  else if (flavorId) page = <FlavorPage {...catalog} flavorId={flavorId} />
  else if (path === '/story') page = <StoryPage />
  else if (path === '/visit') page = <VisitPage />
  else if (path === '/toppings') page = <ToppingsPage />
  else if (path !== '/') page = <MissingPage />

  return (
    <>
    <div className="site-shell">
      <header className="topbar">
        <RouteLink to="/" className="wordmark"><img className="brand-logo" src={logo} alt="Scoops & Smiles" /></RouteLink>
        <nav className="main-nav">
          <RouteLink to="/menu">The menu</RouteLink>
          <RouteLink to="/story">Our story</RouteLink>
          <RouteLink to="/visit">Come say hi</RouteLink>
          <RouteLink to="/toppings">Toppings</RouteLink>
        </nav>
      </header>
      <main>{page}</main>
      <SiteFooter />
    </div>
    <FlavorOfWeek flavor={catalog.flavorOfWeek} />
    </>
  )
}

function SocialIcon({ children, label, href }: { children: ReactNode; label: string; href: string }) {
  return <a href={href} target="_blank" rel="noreferrer" aria-label={label}>{children}</a>
}

function SiteFooter() {
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [note, setNote] = useState('')
  useEffect(() => { fetchSettings().then((result) => setSettings(result.settings)).catch(() => setSettings(null)) }, [])
  const street = settings?.address_line || '18 Honeycomb Lane'
  const city = settings?.address_city || 'Maplewood, GA 30309'
  const send = (event: FormEvent) => {
    event.preventDefault()
    const body = encodeURIComponent(note.trim())
    window.location.href = `mailto:${shopEmail}?subject=${encodeURIComponent('Note for Scoops & Smiles')}&body=${body}`
  }
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-social">
          <SocialIcon label="Instagram" href="https://www.instagram.com/scoopsandsmiles"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg></SocialIcon>
          <SocialIcon label="Facebook" href="https://www.facebook.com/scoopsandsmiles"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v7h4v-7h2.6l.4-4H13V9c0-.6.4-1 1-1z" /></svg></SocialIcon>
          <SocialIcon label="TikTok" href="https://www.tiktok.com/@scoopsandsmiles"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4c.6 2.4 2.2 4 4.6 4.4v2.4c-1.6 0-3-.5-4.2-1.4v6.4c0 3.2-2.4 5.6-5.6 5.6S3.2 18.9 3.2 15.7 5.6 10 8.8 10c.4 0 .8 0 1.2.1v2.6c-.4-.2-.8-.3-1.2-.3-1.8 0-3.2 1.5-3.2 3.3s1.4 3.3 3.2 3.3 3.2-1.5 3.2-3.3V4h2z" /></svg></SocialIcon>
        </div>
        <div className="footer-contact">
          <a href="tel:+14045550136">{shopPhone}</a>
          <a href={`mailto:${shopEmail}`}>{shopEmail}</a>
          {settings?.hours && <span>{settings.hours}</span>}
        </div>
        <address>{street}<br />{city}</address>
        <form className="email-composer" onSubmit={send}>
          <label htmlFor="shop-note">Write to the shop</label>
          <textarea id="shop-note" rows={3} required value={note} onChange={(event) => setNote(event.target.value)} placeholder="A note for the counter" />
          <button className="button button-dark" type="submit">Compose email</button>
        </form>
      </div>
      <div className="footer-end"><span>© 2026 Scoops & Smiles</span><RouteLink to="/admin" className="staff-login">Staff login</RouteLink></div>
    </footer>
  )
}

function FlavorOfWeek({ flavor }: { flavor: Product | null }) {
  if (!flavor) return null
  return (
    <RouteLink to={`/flavors/${flavor.id}`} className="flavor-week">
      <Star size={14} fill="currentColor" />
      <span>Flavor of the week</span>
      <strong>{flavor.name}</strong>
    </RouteLink>
  )
}

function HomePage({ products }: { products: Product[] }) {
  const featured = products.filter((product) => product.isFeatured).slice(0, 4)
  return (
    <>
      <section className="hero section-pad">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={16} /> Small batch, big feelings</p>
          <h1>Good days<br /><em>start here.</em></h1>
          <p className="hero-intro">Thoughtful scoops for the everyday celebrations, spontaneous detours, and “just because” moments.</p>
          <div className="hero-actions">
            <RouteLink to="/menu" className="button button-dark">Explore today's scoops <ArrowUpRight size={17} /></RouteLink>
            <RouteLink to="/story" className="play-link"><span>↗</span> Meet the makers</RouteLink>
          </div>
          <div className="hero-note"><span className="avatar-stack"><span>🍓</span><span>🍦</span><span>✨</span></span><span><strong>Neighbors welcome</strong> from noon until the case is quiet</span></div>
        </div>
        <div className="hero-art">
          <img src={logo} alt="" />
        </div>
      </section>
      <section className="ticker"><span>Made with real cream</span><b>✳</b><span>Browse in the shop</span><b>✳</b><span>Neighbors welcome</span><b>✳</b><span>Made with real cream</span></section>
      <section className="section-pad story-section">
        <div className="section-heading"><div><p className="eyebrow">Start somewhere</p><h2>A few doors<br /><em>into the shop.</em></h2></div><p>The case, the people who make it, and a reason to stop by.</p></div>
        <div className="story-grid">
          <RouteLink to="/menu" className="story-card story-card-photo"><span className="handwritten">the<br />case<br />today</span><div className="photo-placeholder">See the<br /><strong>full menu.</strong></div></RouteLink>
          <RouteLink to="/story" className="story-card story-card-note"><Cookie size={27} /><h3>A bit of joy,<br />in every bite.</h3><p>Small batches, ingredients we can pronounce, and flavors with a point of view.</p><span>Read the story <ChevronRight size={16} /></span></RouteLink>
          <RouteLink to="/visit" className="stat-card"><div><strong>12–9</strong><span>open<br />every day</span></div><div><strong>01</strong><span>neighborhood<br />counter</span></div><div><strong>→</strong><span>hours and<br />directions</span></div></RouteLink>
        </div>
        <div className="product-grid home-preview">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>
    </>
  )
}

function MenuPage({ products, error, category }: { products: Product[]; flavorOfWeek: Product | null; error: string; category: string }) {
  const active = categoryLabels[category as ProductCategory] ? category as ProductCategory : ''
  const visible = products.filter((product) => !active || product.category === active)
  return (
    <section className="menu-section section-pad interior-page">
      <div className="section-heading menu-heading"><div><p className="eyebrow">The delicious bit</p><h2>Find your <em>happy.</em></h2></div><p>Classics from the national favorites list, plus a shorter row of stranger, more particular scoops. Prices follow the size.</p></div>
      <div className="category-tabs">
        <RouteLink to="/menu" className={active ? '' : 'active'}>All</RouteLink>
        {(Object.keys(categoryLabels) as ProductCategory[]).map((item) => <RouteLink to={`/menu/${item}`} className={active === item ? 'active' : ''} key={item}>{categoryLabels[item]}</RouteLink>)}
      </div>
      {error && <p className="auth-error">{error}</p>}
      <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  )
}

function FlavorPage({ products, error, flavorId }: { products: Product[]; flavorOfWeek: Product | null; error: string; flavorId: string }) {
  const product = products.find((item) => item.id === flavorId)
  if (!product) {
    return <section className="section-pad interior-copy"><p className="eyebrow">Menu</p><h2>{products.length || error ? 'That scoop' : 'One moment'}<br /><em>{products.length || error ? 'is not in the case.' : 'while the case loads.'}</em></h2>{(products.length > 0 || error) && <RouteLink to="/menu" className="button button-dark">Back to the menu</RouteLink>}</section>
  }
  return (
    <section className="section-pad interior-copy">
      <p className="eyebrow">{product.size} · {categoryLabels[product.category]}</p>
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p className="price-line">{money.format(product.price)} <span>{product.flavorNote}</span></p>
      {product.isFlavorOfWeek && <p className="featured inline-featured"><Sparkles size={12} /> flavor of the week</p>}
      <RouteLink to={`/menu/${product.category}`} className="button button-dark">More {categoryLabels[product.category].toLowerCase()}</RouteLink>
    </section>
  )
}

function ProductCard({ product }: { product: Product }) {
  return (
    <RouteLink to={`/flavors/${product.id}`} className={`product-card accent-${product.accent}`}>
      <div className="product-art"><div className="mini-scoop" /><span className="product-flavor">{product.size}</span>{product.isFlavorOfWeek && <span className="featured"><Sparkles size={12} /> this week</span>}</div>
      <div className="product-info"><div><h3>{product.name}</h3><p>{product.description}</p></div><div className="product-bottom"><strong>{money.format(product.price)}</strong><span className="menu-only-label">{product.isAvailable ? product.flavorNote : 'sold out'}</span></div></div>
    </RouteLink>
  )
}

function StoryPage() {
  return (
    <section className="section-pad story-section interior-page">
      <div className="section-heading"><div><p className="eyebrow">A little about us</p><h2>Ice cream with<br /><em>a point of view.</em></h2></div><p>We make our ice cream in small batches. The familiar flavors stay on the board because people ask for them. The stranger ones stay because they taste like a decision.</p></div>
      <div className="story-grid">
        <div className="story-card story-card-photo"><span className="handwritten">made<br />around<br />here</span><div className="photo-placeholder">The good stuff<br /><strong>is in the details.</strong></div></div>
        <div className="story-card story-card-note"><Cookie size={27} /><h3>A bit of joy,<br />in every bite.</h3><p>From the first scoop of the day to the last pint in the freezer, the counter is for the tiny rituals that make a day feel like yours.</p><RouteLink to="/toppings">Additional toppings <ChevronRight size={16} /></RouteLink></div>
        <div className="stat-card"><div><strong>40+</strong><span>sizes and<br />flavors</span></div><div><strong>01</strong><span>very happy<br />neighborhood</span></div><div><strong>∞</strong><span>excuses for<br />ice cream</span></div></div>
      </div>
    </section>
  )
}

function VisitPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  useEffect(() => { fetchSettings().then((result) => setSettings(result.settings)).catch(() => setSettings(null)) }, [])
  return (
    <section className="visit-section section-pad interior-page">
      <div><p className="eyebrow">Come as you are</p><h2>Your table is<br /><em>waiting.</em></h2></div>
      <div className="visit-details">
        <div><Clock3 size={22} /><span><strong>{settings?.hours ?? 'Hours loading…'}</strong>Walk-up counter</span></div>
        <div><Store size={22} /><span><strong>{settings?.address_line ?? '18 Honeycomb Lane'}</strong>{settings?.address_city ?? 'Maplewood, GA 30309'}</span></div>
        <a className="button button-light" href="https://maps.google.com/?q=18+Honeycomb+Lane+Maplewood+GA" target="_blank" rel="noreferrer">Get directions <ArrowUpRight size={16} /></a>
      </div>
    </section>
  )
}

function ToppingsPage() {
  const [toppings, setToppings] = useState<Topping[]>([])
  useEffect(() => { fetchToppings().then((result) => setToppings(result.toppings)).catch(() => setToppings([])) }, [])
  return (
    <section className="section-pad interior-copy">
      <p className="eyebrow">Add to a scoop</p>
      <h2>Additional<br /><em>toppings.</em></h2>
      <p>Sprinkles, sauces, and a few fresh finishes for the scoop.</p>
      <ul className="topping-list">{toppings.map((topping) => <li key={topping.id}><strong>{topping.name}</strong><span>{topping.category}</span><b>{money.format(topping.price)}</b></li>)}</ul>
    </section>
  )
}

function MissingPage() {
  return <section className="section-pad interior-copy"><p className="eyebrow">Lost spoon</p><h2>That page<br /><em>is not on the board.</em></h2><RouteLink to="/" className="button button-dark">Back to the homepage</RouteLink></section>
}
