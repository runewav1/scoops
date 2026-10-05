import { StaffGate } from './admin'
import { Router, useRoute } from './router'
import { Storefront } from './storefront'

function Routes() {
  const { path } = useRoute()
  return path.startsWith('/admin') ? <StaffGate /> : <Storefront />
}

export default function App() {
  return <Router><Routes /></Router>
}
