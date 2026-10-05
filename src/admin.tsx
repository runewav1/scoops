import { useEffect, useState, type FormEvent } from 'react'
import { ArrowUpRight, Bell, ChevronRight, CircleHelp, ClipboardList, Coffee, IceCreamBowl, LayoutDashboard, LockKeyhole, LogIn, Menu, Package, Plus, Search, Settings2, Sparkles, Store } from 'lucide-react'
import { createTransaction, fetchCatalog, fetchReport, fetchSettings, fetchToppings, fetchTransactions, updateProduct, updateSettings, updateTransaction } from './lib/api'
import { customerLabel, itemSummary, money, paymentLabels, serviceLabels, transactionWhen } from './lib/format'
import type { PaymentStatus, Product, SalesReport, ServiceStatus, ShopSettings, Topping, Transaction } from './lib/models'
import { RouteLink, useRoute } from './router'

const paymentOptions: PaymentStatus[] = ['paid_online', 'in_person', 'unpaid']
const serviceOptions: ServiceStatus[] = ['new', 'preparing', 'ready', 'completed']

export function StaffGate() {
  const [status, setStatus] = useState<'checking' | 'signed-out' | 'signed-in'>('checking')
  useEffect(() => {
    fetch('/api/staff/session', { credentials: 'include' }).then((response) => setStatus(response.ok ? 'signed-in' : 'signed-out')).catch(() => setStatus('signed-out'))
  }, [])
  if (status === 'checking') return <div className="auth-loading">Checking staff access…</div>
  return status === 'signed-in' ? <AdminShell onSignOut={() => setStatus('signed-out')} /> : <StaffLogin onSignedIn={() => setStatus('signed-in')} />
}

function StaffLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/staff/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      if (response.status === 401) throw new Error('Those credentials did not work.')
      if (response.status === 429) throw new Error('Too many attempts. Try again in a minute.')
      if (!response.ok) throw new Error('Staff login is unavailable. Restart pnpm dev and try again.')
      onSignedIn()
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Unable to sign in.'
      setError(message === 'Failed to fetch' ? 'Staff login is unavailable. Restart pnpm dev and try again.' : message)
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <RouteLink to="/" className="auth-back">← Homepage</RouteLink>
        <div className="auth-logo"><span className="logo-mark"><IceCreamBowl size={24} /></span></div>
        <h1>Welcome back.</h1>
        <p className="auth-copy">Sign in to see today's sales, record a transaction, and keep the case current.</p>
        <form onSubmit={submit}>
          <label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="auth-error">{error}</p>}
          <button className="button button-dark full-width" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'} <LogIn size={16} /></button>
        </form>
      </div>
    </div>
  )
}

function AdminShell({ onSignOut }: { onSignOut: () => void }) {
  const { path } = useRoute()
  const [report, setReport] = useState<SalesReport | null>(null)
  const reload = () => { fetchReport().then(setReport).catch(() => setReport(null)) }
  useEffect(() => { reload() }, [path])
  const page = path.startsWith('/admin/transactions') ? <TransactionsPage onChange={reload} />
    : path.startsWith('/admin/catalog') ? <CatalogPage />
    : path.startsWith('/admin/ingredients') ? <IngredientsAdminPage />
    : path.startsWith('/admin/settings') ? <SettingsPage />
    : path.startsWith('/admin/help') ? <HelpPage />
    : <OverviewPage report={report} />
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <RouteLink to="/" className="admin-brand"><span className="logo-mark"><IceCreamBowl size={20} /></span><span>Scoops <i>&</i> Smiles</span><small>back office</small></RouteLink>
        <div className="admin-nav-label">Workspace</div>
        <RouteLink to="/admin" className={`admin-link${path === '/admin' ? ' active' : ''}`}><LayoutDashboard size={17} /> Overview</RouteLink>
        <RouteLink to="/admin/transactions" className={`admin-link${path.startsWith('/admin/transactions') ? ' active' : ''}`}><ClipboardList size={17} /> Transactions {report && <b className="nav-count">{report.transactionCount}</b>}</RouteLink>
        <RouteLink to="/admin/catalog" className={`admin-link${path.startsWith('/admin/catalog') ? ' active' : ''}`}><Package size={17} /> Catalog</RouteLink>
        <RouteLink to="/admin/ingredients" className={`admin-link${path.startsWith('/admin/ingredients') ? ' active' : ''}`}><Coffee size={17} /> Ingredients</RouteLink>
        <div className="admin-nav-label settings-label">Manage</div>
        <RouteLink to="/admin/settings" className={`admin-link${path.startsWith('/admin/settings') ? ' active' : ''}`}><Settings2 size={17} /> Store settings</RouteLink>
        <RouteLink to="/admin/help" className={`admin-link${path.startsWith('/admin/help') ? ' active' : ''}`}><CircleHelp size={17} /> Help center</RouteLink>
        <RouteLink to="/" className="switch-store"><Store size={16} /> Homepage <ArrowUpRight size={14} /></RouteLink>
        <button className="switch-store sign-out-button" onClick={async () => { await fetch('/api/staff/logout', { method: 'POST', credentials: 'include' }); onSignOut() }}>Sign out <LockKeyhole size={14} /></button>
        <div className="user-profile"><span className="user-avatar">S</span><span><strong>staff</strong><small>signed in</small></span><ChevronRight size={15} /></div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <div className="mobile-menu"><Menu size={21} /></div>
          <div><p className="eyebrow">{todayLabel}</p><h1>Good morning, staff</h1></div>
          <div className="admin-actions">
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="icon-button notification" aria-label="Notices"><Bell size={18} /><i /></button>
            <RouteLink to="/" className="admin-help"><Store size={16} /> Homepage</RouteLink>
          </div>
        </header>
        <main className="admin-main">{page}</main>
      </div>
    </div>
  )
}

function OverviewPage({ report }: { report: SalesReport | null }) {
  const stats = report ?? { todayTotal: 0, transactionCount: 0, averageTicket: 0, changePercent: 0, week: [], recent: [], topFlavors: [] }
  return (
    <>
      <div className="admin-page-intro"><div><h2>Today at a glance</h2><p>Totals come from recorded transactions.</p></div><RouteLink to="/admin/transactions" className="button button-dark"><Plus size={17} /> New transaction</RouteLink></div>
      <section className="metrics-grid">
        <MetricCard label="Today’s sales" value={money.format(stats.todayTotal)} change={`${stats.changePercent > 0 ? '+' : ''}${stats.changePercent}%`} note="vs. this weekday last week" />
        <MetricCard label="Transactions today" value={String(stats.transactionCount)} change={money.format(report?.weekTotal ?? 0)} note="across the last 7 days" />
        <MetricCard label="Average ticket" value={money.format(stats.averageTicket)} change={money.format(report?.priorWeekTotal ?? 0)} note="prior 7 days" />
      </section>
      <div className="admin-grid">
        <section className="panel sales-panel">
          <div className="panel-heading"><div><h3>Sales overview</h3><p>Each point is that day’s transaction total.</p></div><span className="period-select">Last 7 days</span></div>
          <SalesChart days={stats.week} />
        </section>
        <section className="panel orders-panel">
          <div className="panel-heading"><div><h3>Latest transactions</h3><p>Newest tickets from the database.</p></div><RouteLink to="/admin/transactions" className="underlined-link">View all <ArrowUpRight size={14} /></RouteLink></div>
          <div className="order-list">{stats.recent.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</div>
          {report && <FlavorBars flavors={report.topFlavors} />}
        </section>
      </div>
    </>
  )
}

function SalesChart({ days }: { days: SalesReport['week'] }) {
  const max = Math.max(...days.map((day) => day.total), 1)
  const width = 600
  const height = 170
  const points = days.map((day, index) => {
    const x = days.length <= 1 ? 0 : (index / (days.length - 1)) * width
    const y = height - (day.total / max) * (height - 10)
    return `${x},${y}`
  })
  const line = points.length ? `M${points.join(' L')}` : ''
  const fill = line ? `${line} L${width},${height} L0,${height} Z` : ''
  return (
    <div className="chart">
      <div className="chart-y"><span>{money.format(max)}</span><span>{money.format(max / 2)}</span><span>$0</span></div>
      <div className="chart-area">
        <div className="chart-gridlines"><i /><i /><i /></div>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="chart-svg">
          <path d={fill} className="chart-fill" />
          <path d={line} className="chart-line" />
        </svg>
        <div className="chart-x">{days.map((day) => <span key={day.date}>{day.label}<br />{money.format(day.total)}</span>)}</div>
      </div>
    </div>
  )
}

function FlavorBars({ flavors }: { flavors: SalesReport['topFlavors'] }) {
  const max = Math.max(...flavors.map((flavor) => flavor.quantity), 1)
  return (
    <div className="flavor-bars">
      <h3>Top flavors this week</h3>
      {flavors.map((flavor) => <div key={flavor.name}><span>{flavor.name}</span><i style={{ width: `${(flavor.quantity / max) * 100}%` }} /><b>{flavor.quantity}</b></div>)}
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <div className="order-row">
      <span className={`order-icon ${transaction.serviceStatus}`}>{transaction.serviceStatus === 'new' ? <Sparkles size={15} /> : <IceCreamBowl size={15} />}</span>
      <span className="order-details"><strong>{transaction.code} · {customerLabel(transaction)}</strong><small>{itemSummary(transaction.items)}</small></span>
      <span className={`status ${transaction.paymentStatus}`}>{paymentLabels[transaction.paymentStatus]}</span>
      <span className="order-time">{transactionWhen(transaction.createdAt)}</span>
    </div>
  )
}

function TransactionsPage({ onChange }: { onChange: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const load = () => fetchTransactions().then((result) => setTransactions(result.transactions)).catch((reason: Error) => setError(reason.message))
  useEffect(() => { load(); fetchCatalog().then((catalog) => setProducts(catalog.products.filter((product) => product.isAvailable))).catch(() => setProducts([])) }, [])
  const saveStatus = async (transaction: Transaction, changes: { paymentStatus?: PaymentStatus; serviceStatus?: ServiceStatus }) => {
    await updateTransaction(transaction.id, changes)
    await load()
    onChange()
  }
  return (
    <>
      <div className="admin-page-intro"><div><h2>Transactions</h2><p>Names are a first initial and a last name. A ticket can hold one flavor, several of one flavor, or a mix.</p></div></div>
      {error && <p className="auth-error">{error}</p>}
      <TransactionForm products={products} onCreated={async () => { await load(); onChange() }} />
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>When</th><th>Name</th><th>Items</th><th>Total</th><th>Payment</th><th>Counter</th></tr></thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transactionWhen(transaction.createdAt)}<small>{transaction.code}</small></td>
                <td>{customerLabel(transaction)}</td>
                <td>{itemSummary(transaction.items)}</td>
                <td>{money.format(transaction.total)}</td>
                <td><select value={transaction.paymentStatus} onChange={(event) => saveStatus(transaction, { paymentStatus: event.target.value as PaymentStatus })}>{paymentOptions.map((status) => <option value={status} key={status}>{paymentLabels[status]}</option>)}</select></td>
                <td><select value={transaction.serviceStatus} onChange={(event) => saveStatus(transaction, { serviceStatus: event.target.value as ServiceStatus })}>{serviceOptions.map((status) => <option value={status} key={status}>{serviceLabels[status]}</option>)}</select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TransactionForm({ products, onCreated }: { products: Product[]; onCreated: () => Promise<void> }) {
  const [firstInitial, setFirstInitial] = useState('')
  const [lastName, setLastName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('in_person')
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('new')
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number }>>([{ productId: '', quantity: 1 }])
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await createTransaction({ firstInitial, lastName, paymentStatus, serviceStatus, items: lines.filter((line) => line.productId) })
      setFirstInitial('')
      setLastName('')
      setLines([{ productId: products[0]?.id ?? '', quantity: 1 }])
      await onCreated()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save')
    }
  }
  return (
    <form className="transaction-form" onSubmit={submit}>
      <label>Initial<input maxLength={1} value={firstInitial} onChange={(event) => setFirstInitial(event.target.value)} required /></label>
      <label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
      <label>Payment<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}>{paymentOptions.map((status) => <option key={status} value={status}>{paymentLabels[status]}</option>)}</select></label>
      <label>Counter<select value={serviceStatus} onChange={(event) => setServiceStatus(event.target.value as ServiceStatus)}>{serviceOptions.map((status) => <option key={status} value={status}>{serviceLabels[status]}</option>)}</select></label>
      <div className="line-editor">
        {lines.map((line, index) => (
          <div key={index}>
            <select value={line.productId} onChange={(event) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, productId: event.target.value } : item))} required>
              <option value="">Flavor and size</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.size} · {money.format(product.price)}</option>)}
            </select>
            <input type="number" min={1} max={12} value={line.quantity} onChange={(event) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} />
          </div>
        ))}
        <button type="button" className="underlined-link" onClick={() => setLines([...lines, { productId: '', quantity: 1 }])}>Add another flavor</button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <button className="button button-dark" type="submit">Save transaction</button>
    </form>
  )
}

function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const load = () => fetchCatalog().then((catalog) => setProducts(catalog.products))
  useEffect(() => { load().catch(() => setProducts([])) }, [])
  return (
    <>
      <div className="admin-page-intro"><div><h2>Catalog</h2><p>Flavor of the week is the label on the homepage hero. Choosing a new one replaces the current pick.</p></div></div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Item</th><th>Size</th><th>Price</th><th>Case</th><th></th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}{product.isFlavorOfWeek && <small>flavor of the week</small>}</td>
                <td>{product.size}</td>
                <td>{money.format(product.price)}</td>
                <td><button className="underlined-link" onClick={() => updateProduct(product.id, { isAvailable: !product.isAvailable }).then(load)}>{product.isAvailable ? 'Available' : 'Sold out'}</button></td>
                <td>{!product.isFlavorOfWeek && <button className="underlined-link" onClick={() => updateProduct(product.id, { isFlavorOfWeek: true }).then(load)}>Set flavor of the week</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function IngredientsAdminPage() {
  const [toppings, setToppings] = useState<Topping[]>([])
  useEffect(() => { fetchToppings().then((result) => setToppings(result.toppings)).catch(() => setToppings([])) }, [])
  return (
    <>
      <div className="admin-page-intro"><div><h2>Ingredients</h2><p>Finishes currently offered beside the scoops.</p></div></div>
      <ul className="ingredient-list">{toppings.map((topping) => <li key={topping.id}><strong>{topping.name}</strong><span>{topping.category}</span><b>{money.format(topping.price)}</b></li>)}</ul>
    </>
  )
}

function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings>({ hours: '', address_line: '', address_city: '' })
  const [saved, setSaved] = useState('')
  useEffect(() => { fetchSettings().then((result) => setSettings(result.settings)).catch(() => undefined) }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await updateSettings(settings)
    setSettings(result.settings)
    setSaved('Saved for the visit page.')
  }
  return (
    <>
      <div className="admin-page-intro"><div><h2>Store settings</h2><p>Hours and the address shown on the visit page.</p></div></div>
      <form className="settings-form" onSubmit={submit}>
        <label>Hours<textarea value={settings.hours} onChange={(event) => setSettings({ ...settings, hours: event.target.value })} /></label>
        <label>Street<input value={settings.address_line} onChange={(event) => setSettings({ ...settings, address_line: event.target.value })} /></label>
        <label>City<input value={settings.address_city} onChange={(event) => setSettings({ ...settings, address_city: event.target.value })} /></label>
        <button className="button button-dark" type="submit">Save settings</button>
        {saved && <p>{saved}</p>}
      </form>
    </>
  )
}

function HelpPage() {
  return (
    <section className="interior-copy">
      <h2>Help center</h2>
      <p>Transactions are counter tickets, recorded after someone is at the shop. Use a first initial and last name, then add one or more flavors. Quantity covers “two of the same,” and extra rows cover a mix.</p>
      <p>Payment can be paid online, in person, or not paid yet. The counter status tracks whether the scoop is new, being made, ready, or completed.</p>
      <p>The homepage flavor label reads whichever catalog item is marked flavor of the week.</p>
    </section>
  )
}

function MetricCard({ label, value, change, note }: { label: string; value: string; change: string; note: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon">↗</span></div><strong>{value}</strong><span className="metric-change">{change} <small>{note}</small></span></div>
}
