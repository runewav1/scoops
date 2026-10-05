import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface RouteValue {
  path: string
  navigate: (path: string) => void
}

const RouteContext = createContext<RouteValue>({ path: '/', navigate: () => {} })

export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  const navigate = (next: string) => {
    if (next !== window.location.pathname) window.history.pushState({}, '', next)
    setPath(next)
    window.scrollTo({ top: 0 })
  }
  return <RouteContext.Provider value={{ path, navigate }}>{children}</RouteContext.Provider>
}

export function useRoute() {
  return useContext(RouteContext)
}

export function RouteLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const { path, navigate } = useRoute()
  const current = path === to || (to !== '/' && to !== '/admin' && path.startsWith(`${to}/`))
  return <a href={to} className={className} aria-current={current ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate(to) }}>{children}</a>
}
