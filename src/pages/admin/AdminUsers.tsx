// src/pages/admin/AdminUsers.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

/* ======================= Types ======================= */
type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  created_at: string | null
  suspended_until: string | null
  /** derived */
  enrolled?: boolean
}
type EnrollForm = {
  id: string
  user_id: string | null
  program_id: string | null
  program_title: string | null
  level: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | null
  full_name: string | null
  email: string | null
  payload: Record<string, any> | null
  submitted_at: string | null
  resolved_email: string | null
  resolved_submitted_at: string | null
}

/* ======================= UI helpers ======================= */
function Pill({
  children,
  color = 'slate',
}: {
  children: any
  color?: 'slate' | 'emerald' | 'red' | 'amber' | 'sky'
}) {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${map[color]}`}>
      {children}
    </span>
  )
}
function prettyDate(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso || '—' }
}
function Spec({ k, v }: { k: string; v: any }) {
  return (
    <div className="grid grid-cols-12 gap-3 py-2">
      <div className="col-span-4 md:col-span-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {k}
      </div>
      <div className="col-span-8 md:col-span-9 text-[14px] text-slate-800">
        {v == null || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : String(v)}
      </div>
    </div>
  )
}

/* ======================= Details Modal ======================= */
function DetailsModal({ user, onClose }: { user: ProfileRow | null; onClose: () => void }) {
  const [app, setApp] = useState<EnrollForm | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [matchedVia, setMatchedVia] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    async function fetchLatest() {
      if (!user) return
      setLoading(true); setErr(null); setMatchedVia('')

      const emailLc = (user.email || '').toLowerCase()

      try {
        // Prefer normalized view
        const vq = await supabase
          .from('enroll_forms_resolved')
          .select('id,user_id,program_id,program_title,level,full_name,email,payload,submitted_at,resolved_email,resolved_submitted_at')
          .or([`user_id.eq.${user.id}`, emailLc ? `resolved_email.eq.${emailLc}` : 'resolved_email.is.null'].join(','))
          .order('resolved_submitted_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false })
          .limit(5)

        if (vq.error) throw vq.error
        let rows: EnrollForm[] = (vq.data ?? []) as any

        // Fallback to base table if nothing in view
        if (!rows.length) {
          const base = await supabase
            .from('enroll_forms')
            .select('id,user_id,program_id,program_title,level,full_name,email,payload,submitted_at')
            .or([`user_id.eq.${user.id}`, emailLc ? `email.eq.${emailLc}` : 'email.is.null'].join(','))
            .order('submitted_at', { ascending: false, nullsFirst: false })
            .limit(10)
          if (base.error) throw base.error
          const baseRows = (base.data ?? []) as any[]
          rows = baseRows.map(normalizeFromBase)
          if (rows.length) {
            setMatchedVia(rows[0].user_id === user.id ? 'user_id (base)' : 'email/payload.email (base)')
          }
        } else {
          setMatchedVia(rows[0].user_id === user.id ? 'user_id' : 'email/payload.email')
        }

        rows.sort((a, b) => {
          const ta = a.resolved_submitted_at ? Date.parse(a.resolved_submitted_at) : 0
          const tb = b.resolved_submitted_at ? Date.parse(b.resolved_submitted_at) : 0
          if (tb !== ta) return tb - ta
          return String(b.id).localeCompare(String(a.id))
        })

        if (!cancelled) setApp(rows[0] || null)
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Failed to load enrollment.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchLatest()
    return () => { cancelled = true }
  }, [user])

  if (!user) return null

  const hasApp = !!app
  const payload = (app?.payload ?? {}) as Record<string, any>
  const addressPretty =
    payload.address ||
    [payload.street, payload.city, payload.province, payload.zipcode, payload.country].filter(Boolean).join(', ') ||
    undefined

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[96%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold">User details</h3>
          <button className="text-slate-600 hover:text-slate-900" onClick={onClose}>✕</button>
        </div>

        <div className="p-6 grid gap-6">
          {/* Profile card */}
          <div className="rounded-xl border">
            <div className="px-4 py-3 border-b text-[11px] font-semibold uppercase tracking-wide text-slate-500">Profile</div>
            <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {user.full_name || '—'}</div>
              <div><span className="font-medium">Email:</span> {user.email || '—'}</div>
              <div><span className="font-medium">Role:</span> {user.role || 'user'}</div>
              <div><span className="font-medium">Created:</span> {prettyDate(user.created_at)}</div>
              <div className="md:col-span-2">
                <span className="font-medium">Status:</span>{' '}
                {user.suspended_until ? (
                  <Pill color="red">Suspended until {prettyDate(user.suspended_until)}</Pill>
                ) : hasApp ? (
                  <Pill color="emerald">Enrolled</Pill>
                ) : (
                  <Pill color="slate">Not enrolled</Pill>
                )}
              </div>
            </div>
          </div>

          {/* Latest Application */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Latest Enroll Application</div>
              {matchedVia && <div className="text-[11px] text-slate-500">Matched via <span className="font-medium">{matchedVia}</span></div>}
            </div>

            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-600">Loading…</div>
            ) : err ? (
              <div className="px-4 py-6 text-sm text-red-600">Error: {err}</div>
            ) : !app ? (
              <div className="px-4 py-6 text-sm text-slate-600">No application found.</div>
            ) : (
              <>
                {/* Chips */}
                <div className="px-4 pt-4 flex flex-wrap gap-2">
                  <Pill color="sky">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Program: <span className="ml-1 font-semibold">{app.program_title || app.program_id || '—'}</span>
                  </Pill>
                  <Pill>Submitted: <span className="ml-1 font-semibold">{prettyDate(app.resolved_submitted_at || app.submitted_at)}</span></Pill>
                  <Pill>Level: <span className="ml-1 font-semibold">{app.level || '—'}</span></Pill>
                </div>

                {/* Two-column specs */}
                <div className="px-4 pb-4 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="divide-y divide-slate-100">
                    <Spec k="Full name" v={payload.full_name || app.full_name} />
                    <Spec k="Email" v={payload.email || app.email} />
                    <Spec k="Phone" v={payload.phone} />
                    <Spec k="Birth date" v={payload.birthdate} />
                    <Spec k="Gender" v={payload.gender} />
                    <Spec k="Address" v={addressPretty} />
                  </div>
                  <div className="divide-y divide-slate-100">
                    <Spec k="Street" v={payload.street} />
                    <Spec k="City" v={payload.city} />
                    <Spec k="Province" v={payload.province} />
                    <Spec k="ZIP code" v={payload.zipcode} />
                    <Spec k="Country" v={payload.country} />
                    <Spec k="How did you hear about us?" v={payload.referral} />
                  </div>
                </div>

                {/* Goals + Emergency */}
                <div className="px-4 pb-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Goals</div>
                    <div className="mt-1 text-slate-800 whitespace-pre-wrap">{payload.goals || '—'}</div>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Emergency name</div>
                      <div className="mt-1 text-slate-800">{payload.emergency_name || '—'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Emergency phone</div>
                      <div className="mt-1 text-slate-800">{payload.emergency_phone || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Collapsed raw JSON */}
                <details className="m-4 rounded-lg border bg-white p-3 text-xs text-slate-700">
                  <summary className="cursor-pointer text-slate-600">Show raw JSON</summary>
                  <pre className="mt-2 overflow-x-auto">
                    {JSON.stringify(app.payload ?? { full_name: app.full_name, email: app.email }, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function normalizeFromBase(row: any): EnrollForm {
  const payload = (row?.payload ?? {}) as Record<string, any>
  const resolved_email =
    (row?.email ? String(row.email).toLowerCase() : null) ??
    (payload?.email ? String(payload.email).toLowerCase() : null)
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    program_id: row.program_id ?? null,
    program_title: row.program_title ?? null,
    level: row.level ?? null,
    full_name: row.full_name ?? null,
    email: row.email ?? null,
    payload,
    submitted_at: row.submitted_at ?? null,
    resolved_email,
    resolved_submitted_at: row.submitted_at ?? null,
  }
}

/* ======================= Page ======================= */
export default function AdminUsers() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<ProfileRow | null>(null)

  // pagination
  const pageSize = 10
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = s
      ? rows.filter((r) =>
          (r.full_name || '').toLowerCase().includes(s) ||
          (r.email || '').toLowerCase().includes(s) ||
          (r.role || '').toLowerCase().includes(s)
        )
      : rows
    return base
  }, [q, rows])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  useEffect(() => { setPage(1) }, [q, rows])

  async function load() {
    setLoading(true)
    try {
      // 1) profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at, suspended_until')
        .order('created_at', { ascending: false })
      if (error) throw error

      // 2) dedupe (newest first)
      const seen = new Set<string>()
      const deduped: ProfileRow[] = []
      for (const r of ((data as ProfileRow[]) || [])) {
        const key = ((r.email || r.id) ?? '').toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push({ ...r, enrolled: false })
      }

      // 3) prefetch enrollment flags (by user_id + by email)
      const ids = deduped.map(r => r.id)
      const emailsLc = deduped.map(r => (r.email || '').toLowerCase()).filter(Boolean) as string[]

      // By user_id
      const enrolledById = new Set<string>()
      if (ids.length) {
        const q1 = await supabase
          .from('enroll_forms_resolved')
          .select('user_id')
          .in('user_id', ids)
          .limit(1000)
        if (q1.error) console.warn('[enroll flag by id]', q1.error.message)
        else (q1.data || []).forEach((r: any) => r.user_id && enrolledById.add(r.user_id))
      }
      // By resolved_email
      const enrolledByEmail = new Set<string>()
      if (emailsLc.length) {
        const q2 = await supabase
          .from('enroll_forms_resolved')
          .select('resolved_email')
          .in('resolved_email', emailsLc)
          .limit(1000)
        if (q2.error) console.warn('[enroll flag by email]', q2.error.message)
        else (q2.data || []).forEach((r: any) => r.resolved_email && enrolledByEmail.add(String(r.resolved_email).toLowerCase()))
      }

      // 4) attach flags
      const withFlags = deduped.map(r => {
        const enrolled = enrolledById.has(r.id) || (!!r.email && enrolledByEmail.has(r.email.toLowerCase()))
        return { ...r, enrolled }
      })

      setRows(withFlags)
    } catch (e) {
      console.error(e)
      alert('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function suspendUser(user: ProfileRow) {
    const v = window.prompt(`Suspend ${user.full_name || user.email} for how many days?`, '7')
    if (!v) return
    const days = Number(v)
    if (!Number.isFinite(days) || days <= 0) return alert('Enter a positive number of days.')
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('profiles').update({ suspended_until: until }).eq('id', user.id)
    if (error) { console.error(error); return alert('Failed to suspend.') }
    await load()
  }
  async function unsuspendUser(user: ProfileRow) {
    const ok = window.confirm(`Unsuspend ${user.full_name || user.email}?`)
    if (!ok) return
    const { error } = await supabase.from('profiles').update({ suspended_until: null }).eq('id', user.id)
    if (error) { console.error(error); return alert('Failed to unsuspend.') }
    await load()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-extrabold">TUKLAS Admin</h1>
      <p className="text-slate-600 mt-1">Restricted to AdminG5@gmail.com only.</p>

      <div className="mt-6 flex items-center gap-3">
        <input
          className="w-full max-w-sm rounded-xl border px-3 py-2"
          placeholder="Search name / email / role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="rounded-full border px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Latest Enroll</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {loading ? 'Loading…' : '— No users found —'}
                </td>
              </tr>
            )}
            {pageRows.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">{u.full_name || '—'}</td>
                <td className="px-4 py-3">{u.email || '—'}</td>
                <td className="px-4 py-3">{u.role || 'user'}</td>
                <td className="px-4 py-3">
                  {u.suspended_until ? (
                    <Pill color="red">Suspended</Pill>
                  ) : u.enrolled ? (
                    <Pill color="emerald">Enrolled</Pill>
                  ) : (
                    <Pill color="slate">Not enrolled</Pill>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="rounded-lg border px-3 py-1 hover:bg-slate-50"
                    onClick={() => setSelected(u)}
                  >
                    Details
                  </button>
                </td>
                <td className="px-4 py-3">
                  {!u.suspended_until ? (
                    <button
                      className="rounded-lg border px-3 py-1 hover:bg-amber-50 border-amber-200 text-amber-700"
                      onClick={() => suspendUser(u)}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      className="rounded-lg border px-3 py-1 hover:bg-emerald-50 border-emerald-200 text-emerald-700"
                      onClick={() => unsuspendUser(u)}
                    >
                      Unsuspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <div>
          Rows{' '}
          <span className="font-semibold">
            {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
          </span>{' '}
          of <span className="font-semibold">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="px-2">
            Page <span className="font-semibold">{page}</span> / {totalPages}
          </span>
          <button
            className="rounded-lg border px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      <DetailsModal user={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
