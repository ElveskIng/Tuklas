// src/components/Navbar.tsx
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  /* ───────────────── Auth state ───────────────── */
  useEffect(() => {
    let alive = true
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!alive) return
      setEmail(session?.user?.email ?? null)
      setName((session?.user?.user_metadata as any)?.full_name ?? null)
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!alive) return
      setEmail(s?.user?.email ?? null)
      setName((s?.user?.user_metadata as any)?.full_name ?? null)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  /* ───────── Close small menu if clicking outside ───────── */
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Build a friendly display name
  const usernameFromEmail = email ? email.split('@')[0] : null
  const displayName = (name && name.trim()) || usernameFromEmail || 'Account'
  const avatarInitial = (displayName[0] || 'U').toUpperCase()

  // Only this account sees the Admin link in the menu
  const isAdmin = (email || '').toLowerCase() === 'adming5@gmail.com'

  const goToHomeHash = (hash: '#reviews' | '#faqs' | '#about') => {
    setDrawerOpen(false)
    navigate('/' + hash)
  }

  async function handleLogout() {
    try { await supabase.auth.signOut({ scope: 'global' }) } catch {}
    try {
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('sb-auth-token')
      for (const k of Object.keys(localStorage)) {
        if (/^sb-.*-auth-token$/.test(k)) localStorage.removeItem(k)
      }
    } catch {}
    window.location.replace('/login')
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Navbar bar with lush emerald gradient */}
      <div
        className="relative backdrop-blur"
        style={{
          background:
            'linear-gradient(180deg, #0F766E 0%, #0EA5A4 55%, #0891B2 100%)',
        }}
      >
        {/* soft inner mist / highlight */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{ background: 'radial-gradient(1200px 220px at 50% -60px, #ffffff 0%, rgba(255,255,255,0) 70%)' }}
        />
        <div className="mx-auto max-w-7xl px-6 relative">
          <div className="h-16 flex items-center gap-3 text-white">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-2xl bg-white/90 grid place-items-center overflow-hidden shadow-md ring-1 ring-black/10">
                <img src="/tuklas-logo.png" alt="TUKLAS" className="w-7 h-7 object-contain" />
              </div>
              <div className="leading-tight">
                <div className="text-xl font-extrabold tracking-wide drop-shadow-[0_1px_0_rgba(0,0,0,.25)]">
                  TUKLAS
                </div>
                <div className="text-[10px] text-white/80">VIRTUAL HUB</div>
              </div>
            </Link>

            {/* Right controls */}
            <div className="ml-auto flex items-center gap-3 relative" ref={menuRef}>
              {!email ? (
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-full px-4 h-10 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium shadow-sm transition"
                >
                  Login
                </button>
              ) : (
                <>
                  {/* User / menu pill */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(v => !v)}
                      aria-expanded={menuOpen}
                      title={email ?? undefined}
                      className="flex items-center gap-2 rounded-full bg-white text-slate-800 h-10 px-4 shadow-md border border-slate-200 hover:shadow-lg transition max-w-[220px]"
                    >
                      <span className="grid place-items-center w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold">
                        {avatarInitial}
                      </span>
                      {/* show actual user name here (not "ADMIN") */}
                      <span className="font-semibold truncate max-w-[110px] sm:max-w-[160px]">
                        {displayName}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" className="text-slate-500">
                        <path fill="currentColor" d="M7 10l5 5 5-5z" />
                      </svg>
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 top-12 w-56 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl p-2">
                        <div className="px-3 py-2 text-xs text-slate-500">
                          Signed in as
                          <div className="font-medium text-slate-700 truncate">{email}</div>
                        </div>
                        <button
                          onClick={() => { setMenuOpen(false); navigate('/dashboard') }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm font-medium"
                        >
                          Dashboard
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setMenuOpen(false); navigate('/admin') }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm font-medium"
                          >
                            Admin
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Programs pill (green) */}
                  <button
                    onClick={() => navigate('/programs')}
                    className="group flex items-center gap-2 rounded-full bg-emerald-600/95 hover:bg-emerald-600 text-white h-10 px-5 shadow-md ring-1 ring-emerald-300/40 transition"
                    title="Programs"
                  >
                    <span className="w-2 h-2 rounded-full bg-white/95 shadow-[0_0_0_2px_rgba(255,255,255,0.25)]" />
                    <span className="font-semibold tracking-wide">Programs</span>
                  </button>

                  {/* Drawer (hamburger) */}
                  <button
                    className="p-2 ml-1 rounded-md hover:bg-white/10 active:bg-white/20 transition"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open menu"
                    title="Menu"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         className="text-white/90">
                      <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* slim glow line under the bar */}
        <div className="h-[3px] w-full"
             style={{ background: 'linear-gradient(90deg, #22C55E 0%, #06B6D4 50%, #A78BFA 100%)' }} />
      </div>

      {/* Right drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[88%] sm:w-[420px] bg-slate-50 shadow-2xl overflow-y-auto">
            {/* Drawer header w/ matching gradient */}
            <div
              className="relative text-white p-5"
              style={{ background: 'linear-gradient(180deg, #0F766E 0%, #0EA5A4 55%, #0891B2 100%)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 grid place-items-center bg-white rounded-xl ring-1 ring-black/10">
                    <img src="/tuklas-logo.png" alt="TUKLAS" className="w-6 h-6 object-contain" />
                  </div>
                  <div className="text-lg font-semibold">TUKLAS</div>
                </div>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu"
                        className="rounded-md hover:bg-white/10 p-2">
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Drawer body */}
            <div className="p-5 grid gap-3">
              <DrawerItem label="Home" onClick={() => { setDrawerOpen(false); navigate('/') }}>
                <HomeIcon />
              </DrawerItem>

              <DrawerItem label="Programs" onClick={() => { setDrawerOpen(false); navigate('/programs') }}>
                <ListIcon />
              </DrawerItem>

              <DrawerItem label="Calendar / Events" onClick={() => { setDrawerOpen(false); navigate('/events') }}>
                <CalendarIcon />
              </DrawerItem>

              {/* About below Calendar */}
              <DrawerItem label="About Us" onClick={() => goToHomeHash('#about')}>
                <InfoIcon />
              </DrawerItem>

              <DrawerItem label="FAQs" onClick={() => goToHomeHash('#faqs')}>
                <QuestionIcon />
              </DrawerItem>

              {/* Reviews below FAQs */}
              <DrawerItem label="Reviews" onClick={() => goToHomeHash('#reviews')}>
                <StarIcon />
              </DrawerItem>

              <div className="pt-2" />

              {!email ? (
                <button
                  onClick={() => { setDrawerOpen(false); navigate('/login') }}
                  className="h-11 rounded-xl bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700 transition"
                >
                  Login
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="h-11 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-semibold transition"
                >
                  Log Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

/* ───────────────── Drawer item helper ───────────────── */
function DrawerItem({
  label, onClick, children,
}: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-xl bg-white text-slate-800 h-12 px-4 shadow-sm ring-1 ring-slate-200 hover:bg-emerald-50/60 hover:ring-emerald-200/70 transition group"
    >
      <span className="flex items-center gap-3">
        <span className="text-emerald-600">{children}</span>
        <span className="font-medium">{label}</span>
      </span>
      <svg width="20" height="20" viewBox="0 0 24 24"
           className="text-slate-400 group-hover:text-emerald-600 transition">
        <path fill="currentColor" d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )
}

/* ───────────────── Tiny inline icons ───────────────── */
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 9h2V7h-2v2zm0 8h2v-6h-2v6zm1-14a10 10 0 1010 10A10 10 0 0012 3z"/>
    </svg>
  )
}
function QuestionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 18h2v-2h-2v2zm1-16a10 10 0 1010 10A10 10 0 0012 2zm1 14h-2v-2h2v2zm1.07-7.75l-.9.92A2.5 2.5 0 0012 12h-1v-1a3 3 0 013-3 2 2 0 10-2-2h-2a4 4 0 118 0 3.5 3.5 0 01-2.93 3.25z"/>
    </svg>
  )
}
function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3 6 6 .9-4.5 4.4 1 6.2L12 17l-5.5 2.5 1-6.2L3 8.9 9 8l3-6z"/>
    </svg>
  )
}
