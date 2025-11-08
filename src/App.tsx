// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

import Navbar from './components/Navbar'
import Home from './pages/Home'
import Programs from './pages/Programs'
import Events from './pages/Events'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Enroll from './pages/Enroll'

// NEW: modules page per program
import ProgramModules from './pages/ProgramModules'
// ✅ ONLY ADD: lessons page
import ProgramLessons from './pages/ProgramLessons'

import AdminLayout from './pages/Admin'
import AdminGate from './components/AdminGate'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminPaymentProofs from './pages/admin/AdminPaymentProofs'

import SuspensionGate from './components/SuspensionGate'
import Suspended from './pages/Suspended'

import './index.css'

/** Smoothly scroll to #hash targets after route changes */
function HashScroller() {
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) return
    const tick = setTimeout(() => {
      const raw = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
      const id = decodeURIComponent(raw)
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => clearTimeout(tick)
  }, [location.pathname, location.hash])
  return null
}

/** Minimal auth gate used for member-only pages */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        if (!supabase) {
          if (!cancelled) {
            setAuthed(false)
            setChecking(false)
          }
          return
        }
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('[RequireAuth] getSession error:', error)
        }
        if (!cancelled) {
          setAuthed(!!data?.session)
          setChecking(false)
        }
      } catch (e) {
        console.error('[RequireAuth] Unexpected error:', e)
        if (!cancelled) {
          setAuthed(false)
          setChecking(false)
        }
      }
    }

    run()

    const { data: { subscription } = { subscription: undefined } } =
      supabase?.auth.onAuthStateChange?.(() => run()) || { data: { subscription: undefined } }

    return () => {
      cancelled = true
      try {
        subscription?.unsubscribe?.()
      } catch (e) {
        // ignore
      }
    }
  }, [])

  if (checking) return <div style={{ height: '40vh' }} />

  if (!authed) {
    const next = encodeURIComponent(location.pathname + location.search + location.hash)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <HashScroller />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/programs" element={<Programs />} />
        {/* NEW: modules page (must exist to avoid 404 like /programs/vdaa) */}
        <Route
          path="/programs/:programId"
          element={
            <RequireAuth>
              <SuspensionGate>
                <ProgramModules />
              </SuspensionGate>
            </RequireAuth>
          }
        />
        {/* ✅ ONLY ADD: lessons route */}
        <Route
          path="/programs/:programId/lessons/:level"
          element={
            <RequireAuth>
              <SuspensionGate>
                <ProgramLessons />
              </SuspensionGate>
            </RequireAuth>
          }
        />
        <Route path="/events" element={<Events />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Suspension landing page */}
        <Route path="/suspended" element={<Suspended />} />

        {/* Member-only pages */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <SuspensionGate>
                <Dashboard />
              </SuspensionGate>
            </RequireAuth>
          }
        />
        <Route
          path="/enroll"
          element={
            <RequireAuth>
              <SuspensionGate>
                <Enroll />
              </SuspensionGate>
            </RequireAuth>
          }
        />

        {/* Admin (gated) */}
        <Route
          path="/admin/*"
          element={
            <AdminGate>
              <AdminLayout />
            </AdminGate>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="payment-proofs" element={<AdminPaymentProofs />} />
          <Route path="payments" element={<AdminPaymentProofs />} />
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <main className="mx-auto max-w-6xl px-4 py-16">
              <h1 className="text-3xl font-bold">404</h1>
              <p className="text-slate-600 mt-2">Page not found.</p>
              <a
                className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white"
                href="/programs"
              >
                Go to Programs
              </a>
            </main>
          }
        />
      </Routes>

      <footer className="mt-16 border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">
          © {new Date().getFullYear()} TUKLAS Virtual Hub.
        </div>
      </footer>
    </BrowserRouter>
  )
}
