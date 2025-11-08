// src/components/AdminGate.tsx
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isAdminEmail } from '../lib/admin'

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'deny'>('loading')

  useEffect(() => {
    let alive = true

    async function currentEmail() {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.user?.email ?? null
    }

    async function run() {
      // quick check
      let email = await currentEmail()

      // wait a little for hydration (cap at ~2s)
      const until = Date.now() + 2000
      while (!email && Date.now() < until) {
        await new Promise(r => setTimeout(r, 200))
        email = await currentEmail()
      }
      if (!alive) return

      if (!email) { setStatus('deny'); return }
      setStatus(isAdminEmail(email) ? 'ok' : 'deny')
    }

    run()
    const { data: sub } = supabase.auth.onAuthStateChange(() => run())
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-[40vh] grid place-items-center text-slate-600">
        Checking admin access…
      </div>
    )
  }

  if (status === 'deny') return <Navigate to="/login" replace />
  return <>{children}</>
}
