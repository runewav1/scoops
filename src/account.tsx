import { useEffect, useState, type FormEvent } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { fetchAccount, fetchCatalog, loginAccount, logoutAccount, placeAccountOrder, signupAccount, updateAccount } from './lib/api'
import { money, paymentLabels, productCode, serviceLabels, transactionWhen } from './lib/format'
import type { AccountSnapshot, Customer, LoyaltyRules, Product, Transaction } from './lib/models'
import { RouteLink, useRoute } from './router'

const emptyRules: LoyaltyRules = { pointsPerDollar: 10, rewardPoints: 100, rewardValue: 5 }
const sampleAccounts = [
  ['Chloe Bennett', '(206) 342-8631', 'Milk', '120'],
  ['Rowan Nyx', '(717) 550-1675', 'None', '63'],
  ['Marcus Sterling', '(248) 762-0356', 'None', '106'],
  ['Maya Lin', '(253) 644-2182', 'Gluten', '189'],
  ['Julian Thorne', '(212) 658-3916', 'Peanuts', '63'],
]

export function AccountPage() {
  const { path, navigate } = useRoute()
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null)
  const [status, setStatus] = useState<'checking' | 'ready'>('checking')
  useEffect(() => {
    fetchAccount().then((account) => { setSnapshot(account); setStatus('ready') }).catch(() => { setSnapshot(null); setStatus('ready') })
  }, [path])
  if (status === 'checking') return <p className="account-loading">Checking your account…</p>
  if (!snapshot) {
    return path.startsWith('/account/signup')
      ? <SignupForm onReady={(account) => { setSnapshot(account); navigate('/account') }} />
      : <LoginForm onReady={setSnapshot} />
  }
  return <AccountHome snapshot={snapshot} onChange={setSnapshot} onSignOut={() => setSnapshot(null)} />
}

function LoginForm({ onReady }: { onReady: (account: AccountSnapshot) => void }) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      onReady(await loginAccount(phoneNumber, password))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="account-auth">
      <div className="auth-card">
        <p className="eyebrow">Scoops & Smiles points</p>
        <h1>Welcome back.</h1>
        <p className="auth-copy">Sign in with the phone number on your account to see your points, your orders, and to set a scoop aside.</p>
        <form onSubmit={submit}>
          <label>Phone number<input autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required /></label>
          <label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="auth-error">{error}</p>}
          <button className="button button-dark full-width" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'} <LogIn size={16} /></button>
        </form>
        <p className="account-switch">New here? <RouteLink to="/account/signup">Create an account</RouteLink></p>
        <details className="sample-accounts">
          <summary>Sample accounts from the class sheet</summary>
          <p>Each one signs in with the password <code>scoops-demo</code>.</p>
          <ul>{sampleAccounts.map(([name, phone, allergies, points]) => <li key={phone}><strong>{name}</strong> · {phone} · {allergies} · {points} pts</li>)}</ul>
        </details>
      </div>
    </div>
  )
}

function SignupForm({ onReady }: { onReady: (account: AccountSnapshot) => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [allergies, setAllergies] = useState('None')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password !== confirm) {
      setError('Those passwords do not match.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      onReady(await signupAccount({ firstName, lastName, phoneNumber, allergies, password }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the account.')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="account-auth">
      <div className="auth-card">
        <p className="eyebrow">Join the counter</p>
        <h1>Make an account.</h1>
        <p className="auth-copy">Your name, phone, and allergies stay with the shop. Paid orders earn Scoops & Smiles Points.</p>
        <form onSubmit={submit}>
          <label>First name<input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
          <label>Last name<input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
          <label>Phone number<input autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required /></label>
          <label>Allergies<input value={allergies} onChange={(event) => setAllergies(event.target.value)} required /></label>
          <label>Password<input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
          <label>Confirm password<input autoComplete="new-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} /></label>
          {error && <p className="auth-error">{error}</p>}
          <button className="button button-dark full-width" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create account'} <LogIn size={16} /></button>
        </form>
        <p className="account-switch">Already have one? <RouteLink to="/account">Sign in</RouteLink></p>
      </div>
    </div>
  )
}

function AccountHome({ snapshot, onChange, onSignOut }: { snapshot: AccountSnapshot; onChange: (account: AccountSnapshot) => void; onSignOut: () => void }) {
  const rules = snapshot.rules ?? emptyRules
  const rewardScoops = Math.floor(snapshot.customer.points / rules.rewardPoints)
  return (
    <div className="account-layout">
      <div className="account-heading">
        <div>
          <p className="eyebrow">Account {snapshot.customer.id}</p>
          <h2>{snapshot.customer.firstName} {snapshot.customer.lastName}</h2>
        </div>
        <button className="underlined-link" onClick={async () => { await logoutAccount(); onSignOut() }}>Sign out <LogOut size={14} /></button>
      </div>
      <section className="points-card">
        <span>Scoops & Smiles Points</span>
        <strong>{snapshot.customer.points}</strong>
        <p>{rules.pointsPerDollar} points for every dollar on a paid order. {rules.rewardPoints} points takes {money.format(rules.rewardValue)} off a pickup order.{rewardScoops > 0 ? ` You can use ${rewardScoops === 1 ? 'a reward' : `${rewardScoops} rewards`} right now.` : ''}</p>
      </section>
      <div className="account-grid">
        <ProfileForm customer={snapshot.customer} onChange={onChange} />
        <PickupForm customer={snapshot.customer} rules={rules} onChange={onChange} />
      </div>
      <OrderHistory orders={snapshot.orders} />
    </div>
  )
}

function ProfileForm({ customer, onChange }: { customer: Customer; onChange: (account: AccountSnapshot) => void }) {
  const [firstName, setFirstName] = useState(customer.firstName)
  const [lastName, setLastName] = useState(customer.lastName)
  const [phoneNumber, setPhoneNumber] = useState(customer.phoneNumber)
  const [allergies, setAllergies] = useState(customer.allergies)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setFirstName(customer.firstName)
    setLastName(customer.lastName)
    setPhoneNumber(customer.phoneNumber)
    setAllergies(customer.allergies)
  }, [customer])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const account = await updateAccount({ firstName, lastName, phoneNumber, allergies, currentPassword, newPassword })
      onChange(account)
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Saved.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save')
    }
  }
  return (
    <section className="account-panel">
      <h3>Your details</h3>
      <p>The counter uses this when you pick up a scoop.</p>
      <form className="account-form" onSubmit={submit}>
        <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
        <label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
        <label>Phone number<input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required /></label>
        <label>Allergies<input value={allergies} onChange={(event) => setAllergies(event.target.value)} required /></label>
        <label>Current password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label>
        <label>New password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></label>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="form-note">{message}</p>}
        <button className="button button-dark" type="submit">Save details</button>
      </form>
    </section>
  )
}

function PickupForm({ customer, rules, onChange }: { customer: Customer; rules: LoyaltyRules; onChange: (account: AccountSnapshot) => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number }>>([{ productId: '', quantity: 1 }])
  const [redeem, setRedeem] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { fetchCatalog().then((catalog) => setProducts(catalog.products.filter((product) => product.isAvailable))).catch(() => setProducts([])) }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const result = await placeAccountOrder({ items: lines.filter((line) => line.productId), redeem })
      onChange({ customer: result.customer, orders: result.orders, rules: result.rules })
      setLines([{ productId: '', quantity: 1 }])
      setRedeem(false)
      setMessage(`${result.order.code} is in. We’ll have it at the counter.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not place the order')
    }
  }
  return (
    <section className="account-panel">
      <h3>Order for pickup</h3>
      <p>Choose what’s in the case. It’s paid online and starts as a new ticket.</p>
      <form className="account-form" onSubmit={submit}>
        {lines.map((line, index) => (
          <div className="account-line" key={index}>
            <select value={line.productId} onChange={(event) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, productId: event.target.value } : item))} required>
              <option value="">Flavor</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {money.format(product.price)}</option>)}
            </select>
            <input type="number" min={1} max={12} value={line.quantity} onChange={(event) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} />
          </div>
        ))}
        <button type="button" className="underlined-link" onClick={() => setLines([...lines, { productId: '', quantity: 1 }])}>Add another flavor</button>
        <label className="check-line"><input type="checkbox" checked={redeem} disabled={customer.points < rules.rewardPoints} onChange={(event) => setRedeem(event.target.checked)} /> Use {rules.rewardPoints} points for {money.format(rules.rewardValue)} off</label>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="form-note">{message}</p>}
        <button className="button button-dark" type="submit">Place pickup order</button>
      </form>
    </section>
  )
}

function OrderHistory({ orders }: { orders: Transaction[] }) {
  return (
    <section className="account-panel">
      <h3>Your orders</h3>
      {orders.length === 0 && <p>No orders yet. The first one earns points as soon as it’s paid.</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Order</th><th>When</th><th>Scoops</th><th>Total</th><th>Points</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.code}</td>
                <td>{transactionWhen(order.createdAt)}</td>
            <td>{order.items.map((item) => `${item.quantity} × ${item.productName} (${productCode(item.productNumber)})`).join(', ')}{order.discount > 0 && <small>{money.format(order.discount)} reward applied</small>}</td>
                <td>{money.format(order.total)}</td>
                <td>{order.pointsAwarded > 0 ? `+${order.pointsAwarded}` : '—'}{order.pointsRedeemed > 0 && <small>{order.pointsRedeemed} spent</small>}</td>
                <td><span className={`status ${order.paymentStatus}`}>{paymentLabels[order.paymentStatus]}</span><small>{serviceLabels[order.serviceStatus]}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders[0] && <p className="form-note">Orders stay on this account. Product numbers match the case.</p>}
    </section>
  )
}
