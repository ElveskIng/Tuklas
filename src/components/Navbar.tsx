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

  // hydrate auth state
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

  // close dropdown on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const username = name || (email ? email.split('@')[0] : null)

  const goToHomeHash = (hash: '#reviews' | '#faqs' | '#about') => {
    setDrawerOpen(false)
    navigate('/' + hash)
  }

  // still used by the drawer’s Log Out
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
      <div className="bg-gradient-to-b from-white/80 to-white/40 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="h-16 flex items-center gap-3">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 grid place-items-center overflow-hidden shadow-sm">
                <img src="/tuklas-logo.png" alt="TUKLAS" className="w-7 h-7 object-contain" />
              </div>
              <div className="leading-tight">
                <div className="text-xl font-extrabold tracking-wide">TUKLAS</div>
                <div className="text-[10px] text-slate-500 brand-sub">VIRTUAL HUB</div>
              </div>
            </Link>

            {/* Right controls */}
            <div className="ml-auto flex items-center gap-3 relative" ref={menuRef}>
              {!email ? (
                <button onClick={() => navigate('/login')} className="pill pill-ghost">Login</button>
              ) : (
                <>
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="pill pill-ghost"
                    aria-expanded={menuOpen}
                    title={email ?? undefined}
                  >
                    {username}
                  </button>

                  {/* Dropdown WITHOUT logout */}
                  {menuOpen && (
                    <div className="absolute right-40 top-12 w-48 rounded-xl border border-slate-200 bg-white shadow-md p-2">
                      <button
                        onClick={() => { setMenuOpen(false); navigate('/dashboard') }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); navigate('/admin') }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm"
                      >
                        Admin
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Programs pill */}
              <button
                onClick={() => navigate('/programs')}
                className="pill text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow"
              >
                <span className="underline decoration-white/90 underline-offset-[6px]">Programs</span>
              </button>

              {/* Drawer (hamburger) */}
              <button
                className="p-2 ml-1"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                title="Menu"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0b7ea0" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div className="header-gradient-line" />
      </div>

      {/* Right drawer with Logout kept here */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[84%] max-w-sm bg-white shadow-xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/tuklas-logo.png" alt="TUKLAS" className="w-8 h-8" />
                <span className="font-bold">TUKLAS</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-6 grid gap-2">
              <button onClick={() => { setDrawerOpen(false); navigate('/') }} className="pill pill-ghost">Home</button>
              <button onClick={() => { setDrawerOpen(false); navigate('/programs') }} className="pill pill-ghost">Programs</button>
              <button onClick={() => { setDrawerOpen(false); navigate('/events') }} className="pill pill-ghost">Calendar / Events</button>
              <button onClick={() => goToHomeHash('#reviews')} className="pill pill-ghost">Reviews</button>
              <button onClick={() => goToHomeHash('#faqs')} className="pill pill-ghost">FAQs</button>
              <button onClick={() => goToHomeHash('#about')} className="pill pill-ghost">About Us</button>

              <div className="py-4" />

              {!email ? (
                <button onClick={() => { setDrawerOpen(false); navigate('/login') }} className="pill pill-ghost">
                  Login
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="pill bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
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
