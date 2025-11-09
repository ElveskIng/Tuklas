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
  ref_text?: string | null
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
const SESSION_MINUTES = 120
const TEAMS_LINK = 'https://teams.microsoft.com'

/* ---------- helpers ---------- */
const fmtAMPM = (d: Date) =>
  d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function addMinutes(d: Date, mins: number) { const x = new Date(d); x.setMinutes(x.getMinutes() + mins); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function msToClock(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}

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

/** Read chosen start from ref_text like `start:<ISO>; slot:<08:00-10:00|18:00-20:00>` */
function pickStartISO(row: any): string {
  const rt: string = row?.ref_text || ''
  const m = rt.match(/start:([0-9T:\-\.Z\+]+)/i)
  if (m) return new Date(m[1]).toISOString()
  const t = row?.approved_at || row?.created_at || new Date().toISOString()
  return new Date(t).toISOString()
}
function pickSlot(row: any): '08:00-10:00' | '18:00-20:00' {
  const rt: string = row?.ref_text || ''
  const m = rt.match(/slot:(08:00-10:00|18:00-20:00)/i)
  return (m ? (m[1] as any) : '08:00-10:00')
}

/* sample titles – short for dashboard cards */
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

  const slot = pickSlot(p)
  const base = new Date(pickStartISO(p))
  if (slot === '08:00-10:00') base.setHours(8,0,0,0); else base.setHours(18,0,0,0)

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

type ProgramWindow = {
  programId: string
  title: string
  startISO: string
  endISO: string
  started: boolean
  ended: boolean
  untilStartMs: number
  untilEndMs: number
}

/* ---------- Component ---------- */
export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null)
  const [proofs, setProofs] = useState<ProofRow[]>([])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const navigate = useNavigate()

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)
      if (!user) return
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('id,user_id,program_id,level,status,approved_at,created_at,ref_text')
        .eq('user_id', user.id)
      if (!error && data) setProofs((data as any[]).filter(p => p.status === 'approved') as ProofRow[])
    })()
  }, [])

  /* Programs + windows (based on chosen start/slot) */
  const programWindows: ProgramWindow[] = useMemo(() => {
    const byProgram: Record<string, { startISO: string; endISO: string; title: string }> = {}
    for (const p of proofs) {
      const pid = normalizeProgramId(p.program_id)
      const lvl = normalizeLevel(p.level)
      const startISO = new Date(pickStartISO(p)).toISOString()
      // last day runs 2 hours to match session, so add (days-1) then +120 mins
      const endISO = addMinutes(addDays(new Date(startISO), LEVEL_DAYS[lvl] - 1), 120).toISOString()
      const title = PROGRAM_META[pid]?.title ?? pid.toUpperCase()
      const prev = byProgram[pid]
      if (!prev || +new Date(endISO) > +new Date(prev.endISO)) byProgram[pid] = { startISO, endISO, title }
    }
    return Object.entries(byProgram).map(([programId, v]) => {
      const startMs = +new Date(v.startISO)
      const endMs = +new Date(v.endISO)
      const started = nowMs >= startMs
      const ended = nowMs > endMs
      return {
        programId,
        title: v.title,
        startISO: v.startISO,
        endISO: v.endISO,
        started,
        ended,
        untilStartMs: started ? 0 : startMs - nowMs,
        untilEndMs: ended ? 0 : endMs - nowMs,
      }
    })
  }, [proofs, nowMs])

  /* Today’s events (only once window started) */
  const todays = useMemo(() => {
    const todayKey = dateKey(new Date(nowMs))
    const activeProofs = proofs.filter(p => nowMs >= +new Date(pickStartISO(p)) && p.status === 'approved')
    const all: EventRow[] = activeProofs.flatMap(makeEventsForProof)
    return all.filter(e => dateKey(new Date(e.dateISO)) === todayKey).sort((a,b)=>a.dateISO.localeCompare(b.dateISO))
  }, [proofs, nowMs])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-3xl font-extrabold">My Dashboard</h2>
      <p className="text-slate-600 mt-2">Welcome {email ?? 'user'} — here are your programs.</p>

      {/* Program cards with countdowns */}
      <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {programWindows.length === 0 ? (
          <div className="col-span-full text-slate-600 text-sm">
            No active programs yet. Submit a payment in <span className="font-semibold">Programs</span> to unlock.
          </div>
        ) : (
          programWindows.map(p => (
            <article key={p.programId} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-lg">{p.title}</h3>
              {!p.started ? (
                <p className="text-sm text-slate-600 mt-1">
                  Starts in <span className="font-semibold text-emerald-700">{msToClock(p.untilStartMs)}</span>
                </p>
              ) : p.ended ? (
                <p className="text-sm text-rose-600 mt-1 font-medium">Expired — renew to continue.</p>
              ) : (
                <p className="text-sm text-slate-600 mt-1">
                  Promo ends in <span className="font-semibold text-emerald-700">{msToClock(p.untilEndMs)}</span>
                </p>
              )}
              <button
                className={`mt-4 w-full px-4 py-2 rounded-lg font-semibold ${p.ended ? 'border' : 'bg-emerald-600 text-white'}`}
                onClick={() => (p.ended ? navigate('/programs') : navigate(`/programs/${p.programId}`))}
              >
                {p.ended ? 'Renew' : p.started ? 'Open' : 'View schedule'}
              </button>
            </article>
          ))
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
                  <td className="p-6 text-slate-500" colSpan={4}>No sessions scheduled today.</td>
                </tr>
              ) : (
                todays.map(ev => {
                  const start = new Date(ev.dateISO)
                  const end = new Date(ev.endISO)
                  const now = new Date(nowMs)
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
