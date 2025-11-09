// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminDashboard() {
  const [programs] = useState(4) // static for now
  const [totalUsers, setTotalUsers] = useState<number | null>(null)
  const [approvedPayments, setApprovedPayments] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Count total users (expects you have a `profiles` table synced with auth)
        const usersQ = supabase
          .from('profiles')
          .select('*', { head: true, count: 'exact' })

        // Count approved payments
        const approvedQ = supabase
          .from('payment_proofs')
          .select('*', { head: true, count: 'exact' })
          .eq('status', 'approved')

        const [{ count: usersCount, error: usersErr }, { count: approvedCount, error: payErr }] =
          await Promise.all([usersQ, approvedQ])

        if (!alive) return

        setTotalUsers(usersErr ? 0 : (usersCount ?? 0))
        setApprovedPayments(payErr ? 0 : (approvedCount ?? 0))
      } catch {
        if (!alive) return
        setTotalUsers(0)
        setApprovedPayments(0)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card title="Programs">{programs}</Card>
      <Card title="Total Users">{loading ? '—' : totalUsers}</Card>
      <Card title="Payments (Approved)">{loading ? '—' : approvedPayments}</Card>
    </section>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5 bg-white">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold">{children}</div>
    </div>
  )
}
