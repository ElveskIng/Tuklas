import { supabase } from '../lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function Suspended() {
  const [until, setUntil] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess?.session?.user?.id
      if (!uid) return
      const { data } = await supabase
        .from('profiles')
        .select('suspended_until')
        .eq('id', uid)
        .single()
      if (mounted) setUntil(data?.suspended_until ?? null)
    }
    load()
    return () => { mounted = false }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const untilPretty = until ? new Date(until).toLocaleString() : '—'

  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold">Account Suspended</h1>
        <p className="mt-3 text-slate-700">
          Your account has been suspended and you cannot access the site right now.
        </p>
        <p className="mt-1 text-slate-700">Suspended until: <b>{untilPretty}</b></p>

        <div className="mt-6 grid gap-3">
          <button
            className="rounded-lg border px-4 py-2 hover:bg-slate-50"
            onClick={() => (window.location.href = '/')}
          >
            Back to Home
          </button>
          <button
            className="rounded-lg border px-4 py-2 hover:bg-slate-50"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          If you believe this is a mistake, please contact support or an admin.
        </p>
      </div>
    </main>
  )
}
