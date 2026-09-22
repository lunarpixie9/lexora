import { BookOpen, ClipboardList, HelpCircle, Home, LogOut, Menu, Sparkles, TrendingUp, Users, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { homeFor, useAuth } from '../lib/auth'
import type { Role } from '../lib/types'
import { Spinner } from './ui'

const NAV: Record<Role, { to: string; label: string; icon: ReactNode }[]> = {
  teacher: [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { to: '/teacher/children', label: 'Children', icon: <Users className="h-4 w-4" /> },
    { to: '/teacher/screening/new', label: 'New screening', icon: <ClipboardList className="h-4 w-4" /> },
    { to: '/how-it-works', label: 'How it works', icon: <HelpCircle className="h-4 w-4" /> },
  ],
  parent: [
    { to: '/parent/dashboard', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
    { to: '/how-it-works', label: 'How it works', icon: <HelpCircle className="h-4 w-4" /> },
  ],
  child: [
    { to: '/child/home', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { to: '/child/practice', label: 'Practice', icon: <Sparkles className="h-5 w-5" /> },
    { to: '/child/progress', label: 'My progress', icon: <TrendingUp className="h-5 w-5" /> },
  ],
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-900 text-sun-500">
        <BookOpen className="h-5 w-5" aria-hidden />
      </span>
      <span className={`font-display text-xl font-bold ${light ? 'text-white' : 'text-navy-900'}`}>Lexora</span>
    </Link>
  )
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner label="Checking your session…" />
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user) return <Navigate to="/login" replace />
  const nav = NAV[user.role]
  const isChild = user.role === 'child'

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-cream-200 bg-cream-50 p-5 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${isActive ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-cream-200'}`}>
              {n.icon}{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white p-4 shadow-card">
          <p className="truncate text-sm font-bold">{user.full_name}</p>
          <p className="truncate text-xs capitalize text-navy-500">{user.role}</p>
          <button onClick={logout} className="btn-ghost mt-3 w-full justify-start px-2 py-1.5 text-xs"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <div className="flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-cream-200 bg-cream-50/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <button aria-label="Menu" className="btn-ghost p-2" onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </header>
        {open && (
          <nav className="border-b border-cream-200 bg-cream-50 p-3 md:hidden">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${isActive ? 'bg-navy-900 text-white' : 'text-navy-700'}`}>
                {n.icon}{n.label}
              </NavLink>
            ))}
            <button onClick={logout} className="btn-ghost mt-1 w-full justify-start"><LogOut className="h-4 w-4" />Sign out</button>
          </nav>
        )}
        <main id="main" tabIndex={-1} className={`mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10 ${isChild ? 'pb-24' : ''}`}>
          <Outlet />
        </main>
        {isChild && (
          <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-cream-200 bg-white/95 py-2 backdrop-blur md:hidden">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-bold ${isActive ? 'text-teal-700' : 'text-navy-500'}`}>
                {n.icon}{n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
