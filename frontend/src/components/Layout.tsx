import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { homeFor, useAuth } from '../lib/auth'
import type { Role } from '../lib/types'
import { Spinner } from './ui'

/**
 * Shell: a sticky white header with the wordmark on the left and uppercase nav
 * on the right, a paper-coloured page, and a slate footer. Nav labels carry the
 * small emoji marks from the design language.
 */
const NAV: Record<Role, { to: string; label: string; match?: string }[]> = {
  teacher: [
    { to: '/teacher/dashboard', label: 'Dashboard 📊' },
    { to: '/teacher/children', label: 'Children 🧒' },
    { to: '/teacher/screening/new', label: 'New screening 📝', match: '/teacher/screening' },
    { to: '/how-it-works', label: 'How it works ✨' },
  ],
  parent: [
    { to: '/parent/dashboard', label: 'Dashboard 📊' },
    { to: '/how-it-works', label: 'How it works ✨' },
  ],
  child: [
    { to: '/child/home', label: 'Home 🏠' },
    { to: '/child/practice', label: 'Practice ✏️' },
    { to: '/child/progress', label: 'My progress ⭐' },
  ],
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-slate-900 font-display text-[15px] font-semibold italic text-[#F0E4CE]" aria-hidden>
        L
      </span>
      <span className={`font-display text-xl font-bold tracking-[-0.01em] ${light ? 'text-white' : 'text-ink-900'}`}>Lexora</span>
    </Link>
  )
}

/** Shared top bar. On public pages it shows a sign-in pill instead of the app nav. */
export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-white px-5 shadow-[0_1px_0_rgb(74_65_57_/_0.08)] md:px-7">
      <div className="mx-auto flex h-[70px] max-w-[1240px] items-center justify-between gap-6">{children}</div>
    </header>
  )
}

export function PublicHeader() {
  const { user } = useAuth()
  return (
    <TopBar>
      <Logo />
      <nav className="flex items-center gap-1">
        <Link to="/how-it-works" className="btn-ghost hidden sm:inline-flex">How it works ✨</Link>
        {user
          ? <Link to={homeFor(user.role)} className="btn-primary btn-sm">Open dashboard</Link>
          : <Link to="/login" className="btn-primary btn-sm">Sign in</Link>}
      </nav>
    </TopBar>
  )
}

const FOOT_LINK = 'text-left text-[13px] font-medium text-[#C9CED4] transition hover:text-white'

export function SiteFooter() {
  const { user } = useAuth()
  const learnTo = user ? '/evidence' : '/how-it-works/evidence'
  return (
    <footer className="mt-auto bg-slate-900 px-7 pb-8 pt-14">
      <div className="mx-auto grid max-w-[1140px] gap-9 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl italic text-white">learn with <strong className="font-bold not-italic">Lexora</strong></p>
          <p className="mt-3.5 max-w-[280px] text-[13px] leading-[1.7] text-[#A8AEB6]">
            A screening aid that helps teachers and parents notice early signs of reading difficulty — and turns what
            it notices into practice.
          </p>
        </div>
        <div>
          <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sun-500">Learn</p>
          <div className="flex flex-col items-start gap-2.5">
            <Link to="/how-it-works" className={FOOT_LINK}>How it works</Link>
            <Link to={learnTo} className={FOOT_LINK}>The evidence behind it</Link>
          </div>
        </div>
        <div>
          <p className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sun-500">Roles</p>
          <div className="flex flex-col items-start gap-2.5">
            {user
              ? <Link to={homeFor(user.role)} className={FOOT_LINK}>Your dashboard</Link>
              : <>
                  <Link to="/login" className={FOOT_LINK}>Teacher sign in</Link>
                  <Link to="/login" className={FOOT_LINK}>Parent sign in</Link>
                  <Link to="/login" className={FOOT_LINK}>Child sign in</Link>
                </>}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-9 max-w-[1140px] border-t border-white/10 pt-6">
        <p className="text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} Lexora · a screening aid, not a clinical diagnosis · BCA Semester 5 NLP project ·
          runs locally, no paid services required
        </p>
      </div>
    </footer>
  )
}

/** Public page frame: header, content, footer. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
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

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative whitespace-nowrap px-2.5 pb-3 pt-2.5 text-xs font-bold uppercase tracking-[0.1em] transition ${
    isActive ? 'text-terra-500' : 'text-ink-600 hover:text-terra-500'
  }`

/** `children` renders a single page inside the shell; omit it for a routed <Outlet>. */
export function AppShell({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace />
  const nav = NAV[user.role]
  const isChild = user.role === 'child'
  const isActive = (n: { to: string; match?: string }) =>
    loc.pathname === n.to || (n.match ? loc.pathname.startsWith(n.match) : false)

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      <TopBar>
        <Logo />
        <nav className="hidden items-center gap-0.5 md:flex">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={() => navClass({ isActive: isActive(n) })}>
              {n.label}
              {isActive(n) && <span className="absolute inset-x-2.5 bottom-1 h-0.5 rounded-sm bg-terra-500" aria-hidden />}
            </NavLink>
          ))}
          <button onClick={logout} className="btn-quiet btn-sm ml-2">Sign out</button>
        </nav>
        <button aria-label="Menu" aria-expanded={open} className="btn-quiet btn-sm md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </TopBar>

      {open && (
        <nav className="border-b border-cream-300 bg-white p-3 md:hidden">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}
              className={`block rounded-xl px-3 py-3 text-xs font-bold uppercase tracking-[0.1em] ${isActive(n) ? 'bg-cream-200 text-terra-500' : 'text-ink-600'}`}>
              {n.label}
            </NavLink>
          ))}
          <button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-xs font-bold uppercase tracking-[0.1em] text-ink-600">
            <LogOut className="h-4 w-4" />Sign out
          </button>
        </nav>
      )}

      <main id="main" tabIndex={-1} className={`mx-auto w-full max-w-[1140px] flex-1 px-5 py-9 md:px-7 md:py-11 ${isChild ? 'pb-24 md:pb-11' : ''}`}>
        {children ?? <Outlet />}
      </main>

      {isChild && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-cream-300 bg-white/95 py-2 backdrop-blur md:hidden">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${isActive(n) ? 'text-terra-500' : 'text-ink-500'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}

      <SiteFooter />
    </div>
  )
}
