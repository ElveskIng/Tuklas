import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

type Profile = {
  id: string
  role: string | null
  suspended_until: string | null
}

export default function SuspensionGate({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const { data: sess } = await supabase.auth.getSession()
        if (!sess?.session) { setChecking(false); return } // not logged in → let regular guards handle

        // read own profile
        const uid = sess.session.user.id
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, suspended_until')
          .eq('id', uid)
          .single()

        if (error) throw error
        const p = data as Profile | null
        const isAdmin = (p?.role || '').toLowerCase() === 'admin'
        const suspended = !!p?.suspended_until && Date.parse(p.suspended_until) > Date.now()

        if (!cancelled) {
          if (!isAdmin && suspended) {
            // send to holding page (no signOut so admin can unsuspend then reload)
            nav('/suspended', { replace: true })
          }
          setChecking(false)
        }
      } catch {
        setChecking(false)
      }
    }
    run()

    // also react to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => run())
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [nav])

  if (checking) return null
  return <>{children}</>
}
