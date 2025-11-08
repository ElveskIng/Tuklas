// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [programs] = useState(4)   // static for now
  const [applicants, setApplicants] = useState<number | null>(null)
  const [payments, setPayments] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        // Replace with real counts when your tables are ready:
        // const { count: a } = await supabase.from('applications').select('*', { head: true, count: 'exact' })
        // const { count: p } = await supabase.from('payment_proofs').select('*', { head: true, count: 'exact' })
        if (!alive) return
        setApplicants(0)
        setPayments(0)
      } catch {
        if (!alive) return
        setApplicants(0); setPayments(0)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card title="Programs">{programs}</Card>
      <Card title="Applicants">{applicants ?? '—'}</Card>
      <Card title="Payments">{payments ?? '—'}</Card>
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
