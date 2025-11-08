// src/pages/admin/AdminPaymentProofs.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type ProofRow = {
  id: string
  created_at: string
  user_id: string
  program_id: string
  level: 'beginner' | 'intermediate' | 'expert'
  amount: number
  ref_text: string | null
  image_url: string
  status: 'pending' | 'approved' | 'rejected'
  credits_awarded: number
  approved_at?: string | null
  approved_by?: string | null
}

type UserLite = { id: string; full_name: string | null; email: string | null; role?: string | null }

const LEVEL_LABEL: Record<ProofRow['level'], string> = {
  beginner: 'BEGINNER',
  intermediate: 'INTERMEDIATE',
  expert: 'EXPERT',
}

const peso = (n: number) =>
  `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmt = (x: string) => new Date(x).toLocaleString()

export default function AdminPaymentProofs() {
  const [rows, setRows] = useState<ProofRow[]>([])
  const [users, setUsers] = useState<Record<string, UserLite>>({})
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [query, setQuery] = useState('')

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setLightboxUrl(null) }
    if (lightboxUrl) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxUrl])

  // Admin gate (matches RLS in SQL you installed)
  useEffect(() => {
    let alive = true
    async function checkAndLoad() {
      setLoading(true)

      // Check current user
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email?.toLowerCase() ?? ''
      // If you used email-based RLS:
      const isEmailAdmin = email === 'adming5@gmail.com'

      // If you used role-based RLS, fetch profile
      let isRoleAdmin = false
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('id', user.id)
          .maybeSingle()
        if (prof) {
          isRoleAdmin = (prof as any).role === 'admin' || (prof as any).role === 'staff'
        }
      }

      if (!isEmailAdmin && !isRoleAdmin) {
        if (!alive) return
        setNotAuthorized(true)
        setLoading(false)
        return
      }

      // Load proofs
      const { data: proofs, error } = await supabase
        .from('payment_proofs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (!alive) return

      if (error) {
        console.error('payment_proofs select error:', error)
        setNotAuthorized(true)
        setLoading(false)
        return
      }

      setRows((proofs || []) as any)

      // Load user minis
      const ids = Array.from(new Set((proofs || []).map((r: any) => r.user_id)))
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('id', ids)
        const map: Record<string, UserLite> = {}
        for (const p of profs || []) {
          map[p.id] = { id: p.id, full_name: (p as any).full_name, email: (p as any).email, role: (p as any).role }
        }
        setUsers(map)
      }

      setLoading(false)
    }

    checkAndLoad()
    return () => { alive = false }
  }, [])

  async function reload() {
    setLoading(true)
    const { data, error } = await supabase
      .from('payment_proofs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (!error && data) setRows(data as any)
    setLoading(false)
  }

  async function approve(row: ProofRow) {
    if (!confirm(`Approve this proof and add ${row.credits_awarded} credits to user?`)) return
    const me = (await supabase.auth.getUser()).data.user?.id || null

    // Update row
    const { error: upRow } = await supabase
      .from('payment_proofs')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: me })
      .eq('id', row.id)
    if (upRow) {
      alert('Failed to approve.')
      return
    }

    // Try stored proc; fallback to direct increment
    const rpc = await supabase.rpc('increment_profile_credits', {
      p_user_id: row.user_id,
      p_delta: row.credits_awarded,
    })
    if (rpc.error) {
      const { data: prof, error: fetchErr } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', row.user_id)
        .single()
      if (!fetchErr) {
        const current = (prof as any)?.credits ?? 0
        await supabase.from('profiles').update({ credits: current + row.credits_awarded }).eq('id', row.user_id)
      }
    }

    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: 'approved', approved_by: me, approved_at: new Date().toISOString() } : r)))
  }

  async function reject(row: ProofRow) {
    const reason = prompt('Reason for rejection (optional):') || null
    const { error } = await supabase
      .from('payment_proofs')
      .update({ status: 'rejected', ref_text: reason ?? row.ref_text })
      .eq('id', row.id)
    if (error) {
      alert('Failed to reject.')
      return
    }
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: 'rejected', ref_text: reason ?? r.ref_text } : r)))
  }

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
    }),
    [rows],
  )

  const filtered = useMemo(() => {
    // status filter
    let list = rows
    if (filter !== 'all') list = list.filter((r) => r.status === filter)
    // search filter (by email, name, program, level)
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const u = users[r.user_id]
      return (
        r.program_id.toLowerCase().includes(q) ||
        LEVEL_LABEL[r.level].toLowerCase().includes(q) ||
        (u?.email || '').toLowerCase().includes(q) ||
        (u?.full_name || '').toLowerCase().includes(q)
      )
    })
  }, [rows, users, filter, query])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Payment Proofs</h1>
        <button className="px-3 py-2 rounded-lg border" onClick={reload} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-600">Loading…</p>}

      {!loading && notAuthorized && (
        <div className="mt-6 rounded-2xl border p-6 bg-white">
          <p className="text-sm text-rose-700">
            You are not authorized to view payment proofs. Ensure your account is the admin email
            <code className="ml-1">adminG5@gmail.com</code> or your <code>profiles.role</code> is <code>admin</code> / <code>staff</code>.
          </p>
        </div>
      )}

      {!loading && !notAuthorized && (
        <>
          <p className="text-slate-600 text-sm mt-1">
            Pending: {counts.pending} • Approved: {counts.approved} • Rejected: {counts.rejected}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              className="border rounded-lg px-3 py-2"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <input
              placeholder="Search by email, name, program, level…"
              className="border rounded-lg px-3 py-2 w-72"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-5 space-y-3">
            {filtered.map((r) => {
              const u = users[r.user_id]
              return (
                <div key={r.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* thumbnail -> lightbox */}
                      <img
                        src={r.image_url}
                        alt="receipt"
                        className="h-14 w-14 rounded-md object-cover border cursor-zoom-in"
                        loading="lazy"
                        onClick={() => setLightboxUrl(r.image_url)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setLightboxUrl(r.image_url)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      />
                      <div>
                        <div className="text-sm font-semibold">
                          {fmt(r.created_at)} — {peso(Number(r.amount))}
                          <span className="ml-2 text-xs rounded-full border px-2 py-0.5">{LEVEL_LABEL[r.level]}</span>
                        </div>
                        <div className="text-sm text-slate-700">
                          User:{' '}
                          <span className="text-emerald-700 font-medium">
                            {u?.full_name || '—'}
                          </span>
                          <span className="ml-2 text-slate-500">{u?.email || ''}</span>
                          {u?.role ? <span className="ml-2 text-xs text-slate-400">({u.role})</span> : null}
                        </div>
                        <div className="text-xs text-slate-500">
                          Program: {r.program_id} • Ref: {r.ref_text || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={
                          r.status === 'pending'
                            ? 'rounded-full bg-amber-50 text-amber-700 text-xs px-2 py-1 border border-amber-200'
                            : r.status === 'approved'
                            ? 'rounded-full bg-emerald-50 text-emerald-700 text-xs px-2 py-1 border border-emerald-200'
                            : 'rounded-full bg-rose-50 text-rose-700 text-xs px-2 py-1 border border-rose-200'
                        }
                      >
                        {r.status}
                      </span>

                      {r.status === 'pending' && (
                        <>
                          <button
                            className="rounded-full bg-emerald-600 text-white text-xs px-3 py-2"
                            onClick={() => approve(r)}
                          >
                            Approve (+ credits)
                          </button>
                          <button
                            className="rounded-full bg-rose-600 text-white text-xs px-3 py-2"
                            onClick={() => reject(r)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="rounded-2xl border p-6 bg-white text-sm text-slate-600">
                No payment proofs{filter !== 'all' ? ` (${filter})` : ''}.
              </div>
            )}
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/75" onClick={() => setLightboxUrl(null)} aria-label="Close image preview" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] max-w-[92vw]">
            <img src={lightboxUrl} alt="Receipt preview" className="max-h-[90vh] max-w-[92vw] rounded-xl shadow-2xl" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-3 -top-3 rounded-full bg-white px-2.5 py-1.5 text-slate-700 shadow"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
