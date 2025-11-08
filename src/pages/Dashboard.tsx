// src/pages/Dashboard.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type LevelKey = 'beginner' | 'intermediate' | 'expert'

type ProofRow = {
  id: string
  user_id: string
  program_id: string
  level: LevelKey
  status: 'pending' | 'approved' | 'rejected'
  approved_at?: string | null
  created_at: string
}

type EventRow = {
  id: string
  program_id: string
  title: string
  dateISO: string
  endISO: string
  display: string
  joinUrl: string
}

/* ---------- Program meta ---------- */
const PROGRAM_META: Record<string, { title: string }> = {
  vdaa: { title: 'Virtual Data Analysis Assistant Training Program' },
  vadmin: { title: 'Virtual Administrative Assistant Training Program' },
  veditorial: { title: 'Virtual Editorial Assistant Training Program' },
  vmarketing: { title: 'Virtual Marketing Assistant Training Program' },
}

const LEVEL_DAYS: Record<LevelKey, number> = { beginner: 7, intermediate: 10, expert: 14 }
const SESSION_MINUTES = 90
const TEAMS_LINK = 'https://teams.microsoft.com'

/* ---------- tiny helpers ---------- */
const fmtAMPM = (d: Date) =>
  d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function addMinutes(d: Date, mins: number) { const x = new Date(d); x.setMinutes(x.getMinutes() + mins); return x }

function normalizeProgramId(raw: any): string {
  const v = String(raw ?? '').toLowerCase()
  if (['vdaa','vadmin','veditorial','vmarketing'].includes(v)) return v
  if (v.includes('data')) return 'vdaa'
  if (v.includes('admin')) return 'vadmin'
  if (v.includes('editor')) return 'veditorial'
  if (v.includes('market')) return 'vmarketing'
  return 'vdaa'
}
function normalizeLevel(raw: any): LevelKey {
  const v = String(raw ?? '').toLowerCase()
  if (v.startsWith('beg')) return 'beginner'
  if (v.startsWith('int')) return 'intermediate'
  if (v.startsWith('exp')) return 'expert'
  return 'beginner'
}
function pickStartISO(row: any): string {
  const t = row?.approved_at || row?.created_at || new Date().toISOString()
  return new Date(t).toISOString()
}

/* sample titles – short for dashboard */
const TITLES: Record<string, Record<LevelKey, string[]>> = {
  vdaa: {
    beginner: ['QA & Recap • Day','Charts & Filters • Day','Sheets Jumpstart • Day','Data Accuracy • Day','Analytics Intro • Day','Spreadsheets Sprint • Day','Mini Dashboard • Day'],
    intermediate: ['Cleaning • Day','Pivots • Day','Stats • Day','Dashboard • Day','Patterns • Day','Storytelling • Day','Clinic • Day','Case • Day','Review • Day','Midterm • Day'],
    expert: new Array(14).fill(0).map(()=>'Masterclass • Day'),
  },
  vadmin: { beginner: new Array(7).fill('Admin • Day'), intermediate: new Array(10).fill('Ops • Day'), expert: new Array(14).fill('Leadership • Day') },
  veditorial: { beginner: new Array(7).fill('Editorial • Day'), intermediate: new Array(10).fill('Copyedit • Day'), expert: new Array(14).fill('Advanced Edit • Day') },
  vmarketing: { beginner: new Array(7).fill('Marketing • Day'), intermediate: new Array(10).fill('Analytics • Day'), expert: new Array(14).fill('Strategy • Day') },
}

function makeEventsForProof(p: ProofRow): EventRow[] {
  const program_id = normalizeProgramId(p.program_id)
  const level = normalizeLevel(p.level)
  const days = LEVEL_DAYS[level]
  const base = new Date(pickStartISO(p))
  base.setHours(10, 0, 0, 0) // daily 10:00 AM local

  const titles = TITLES[program_id]?.[level] ?? ['Training • Day']
  const rows: EventRow[] = []
  for (let i = 0; i < days; i++) {
    const start = new Date(base); start.setDate(base.getDate() + i)
    const end = addMinutes(start, SESSION_MINUTES)
    rows.push({
      id: `${p.id}-${i}`,
      program_id,
      title: `${titles[i % titles.length]} ${i + 1}`,
      dateISO: start.toISOString(),
      endISO: end.toISOString(),
      display: fmtAMPM(start),
      joinUrl: TEAMS_LINK,
    })
  }
  return rows
}

/* ---------- Component ---------- */
export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null)
  const [proofs, setProofs] = useState<ProofRow[]>([])
  const [now, setNow] = useState(() => new Date())
  const navigate = useNavigate()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)
      if (!user) return
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('id,user_id,program_id,level,status,approved_at,created_at')
        .eq('user_id', user.id)
      if (!error && data) setProofs((data as any[]).filter(p => p.status === 'approved') as ProofRow[])
    })()
  }, [])

  /* Programs the user currently has access to (unexpired) */
  const programs = useMemo(() => {
    const acc = new Map<string, { title: string, expiresAt: Date, remainingMs: number }>()
    const nowMs = +now
    for (const p of proofs) {
      const pid = normalizeProgramId(p.program_id)
      const lvl = normalizeLevel(p.level)
      const start = new Date(pickStartISO(p))
      const expiresAt = new Date(start); expiresAt.setDate(expiresAt.getDate() + LEVEL_DAYS[lvl])
      const remainingMs = +expiresAt - nowMs
      // pick latest expiry per program
      const prev = acc.get(pid)
      if (!prev || +expiresAt > +prev.expiresAt) {
        acc.set(pid, { title: PROGRAM_META[pid]?.title ?? pid.toUpperCase(), expiresAt, remainingMs })
      }
    }
    return Array.from(acc, ([id, v]) => ({ id, ...v }))
  }, [proofs, now])

  /* Today’s events */
  const todays = useMemo(() => {
    const all: EventRow[] = proofs.flatMap(makeEventsForProof)
    const kToday = dateKey(now)
    return all
      .filter(e => dateKey(new Date(e.dateISO)) === kToday)
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  }, [proofs, now])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-3xl font-extrabold">My Dashboard</h2>
      <p className="text-slate-600 mt-2">Welcome {email ?? 'user'} — here are your programs.</p>

      {/* Programs */}
      <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {programs.length === 0 ? (
          <div className="col-span-full text-slate-600 text-sm">
            No active programs yet. Submit a payment in <span className="font-semibold">Programs</span> to unlock.
          </div>
        ) : (
          programs.map(p => {
            const expired = p.remainingMs <= 0
            const daysLeft = Math.max(0, Math.ceil(p.remainingMs / 86400000))
            return (
              <article key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-lg">{p.title}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {expired ? (
                    <span className="text-rose-600 font-medium">Expired — renew to continue.</span>
                  ) : (
                    <>Access active • <span className="font-semibold">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span> left</>
                  )}
                </p>
                <button
                  className={`mt-4 w-full px-4 py-2 rounded-lg font-semibold ${expired ? 'border' : 'bg-emerald-600 text-white'}`}
                  onClick={() => expired ? navigate('/programs') : navigate(`/programs/${p.id}`)}
                >
                  {expired ? 'Renew' : 'Open'}
                </button>
              </article>
            )
          })
        )}
      </div>

      {/* Today’s sessions */}
      <section className="mt-10">
        <h3 className="text-xl font-bold">Today’s sessions</h3>
        <div className="mt-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3">Date & Time</th>
                <th className="p-3">Program</th>
                <th className="p-3">Title</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {todays.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-500" colSpan={4}>
                    No sessions scheduled today.
                  </td>
                </tr>
              ) : (
                todays.map(ev => {
                  const start = new Date(ev.dateISO)
                  const end = new Date(ev.endISO)
                  const canJoin = now >= start && now <= end
                  return (
                    <tr key={ev.id} className="border-t">
                      <td className="p-3 whitespace-nowrap">{fmtAMPM(start)}</td>
                      <td className="p-3">{PROGRAM_META[ev.program_id]?.title ?? ev.program_id.toUpperCase()}</td>
                      <td className="p-3">{ev.title}</td>
                      <td className="p-3">
                        {canJoin ? (
                          <a
                            href={ev.joinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-white font-semibold"
                          >
                            Join in Teams
                          </a>
                        ) : (
                          <span className="text-slate-400">{now < start ? 'Not started yet' : 'Ended'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
