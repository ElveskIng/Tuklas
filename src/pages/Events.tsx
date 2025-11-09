// src/pages/Events.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type LevelKey = 'beginner' | 'intermediate' | 'expert'

type EventRow = {
  id: string
  dateISO: string
  endISO: string
  display: string
  title: string
  location: string
  joinUrl?: string
}

const LEVEL_DAYS: Record<LevelKey, number> = { beginner: 7, intermediate: 10, expert: 14 }
const SESSION_MINUTES = 120 // 2-hour blocks for both time slots

const TEAMS_LINK_BY_PROGRAM: Record<string, string> = {
  vdaa: 'https://teams.microsoft.com',
  vadmin: 'https://teams.microsoft.com',
  veditorial: 'https://teams.microsoft.com',
  vmarketing: 'https://teams.microsoft.com',
}
const GENERIC_TEAMS_LINK = 'https://teams.microsoft.com'

const TITLE_POOL: Record<string, Record<LevelKey, string[]>> = {
  vdaa: {
    beginner: ['Intro to Analytics • Day','Spreadsheets Sprint • Day','Charts & Filters • Day','Data Accuracy Lab • Day','Sheets & Excel Jumpstart • Day','Mini Dashboard Practice • Day','QA & Recap • Day'],
    intermediate: ['Data Cleaning Lab • Day','Pivot Tables Power • Day','Stats Basics • Day','Dashboard Build • Day','Trends & Patterns • Day','Viz Storytelling • Day','Review & Q&A • Day','Practice Clinic • Day','Case Study • Day','Midterm Build • Day'],
    expert: ['Power BI / Tableau Intro • Day','Automation for Insights • Day','Decision Support • Day','Large Dataset Skills • Day','Advanced Modeling • Day','Performance Tuning • Day','Dashboard Polish • Day','Final Lab • Day','Capstone Review • Day','Exec Storytelling • Day','Data Ops Tips • Day','Masterclass • Day','Case Defense • Day','Wrap-up & Cert • Day'],
  },
  vadmin: {
    beginner: ['Admin Roles 101 • Day','Email Mastery • Day','Docs & Files • Day','Calendars & Tasks • Day','Meetings Setup • Day','Toolbox Time • Day','Recap • Day'],
    intermediate: ['Workflow Design • Day','Client Comms • Day','Records Mgmt • Day','Deadlines Control • Day','Problem Solving • Day','Process QA • Day','Ops Clinic • Day','Docs Review • Day','Playbook Build • Day','Retro • Day'],
    expert: ['Project Coordination • Day','Reports Writing • Day','CRM & Data • Day','Process Improvement • Day','Stakeholder Sync • Day','Automation • Day','Admin Systematize • Day','Ops Scaling • Day','Leadership Support • Day','Final Review • Day','Handoff • Day','Capstone • Day','Mastery • Day','Graduation • Day'],
  },
  veditorial: {
    beginner: ['Editorial Basics • Day','Grammar Essentials • Day','Formatting • Day','Fact-Checking • Day','Editing Tools • Day','Style Drill • Day','Wrap-Up • Day'],
    intermediate: ['Copyedit Lab • Day','Style Guides • Day','Collab Docs • Day','Editorial Calendar • Day','Consistency Checks • Day','Peer Review • Day','Workflow Clinic • Day','Rewrite Skills • Day','Quality Gate • Day','Retro • Day'],
    expert: ['Advanced Editing • Day','SEO Writing • Day','Project Mgmt • Day','Multi-Writer Handling • Day','Editorial Strategy • Day','Analytics for Editors • Day','Voice & Tone • Day','Longform Clinic • Day','Publication Day • Day','Postmortem • Day','Toolkit • Day','Coaching • Day','Capstone • Day','Comm Debrief • Day'],
  },
  vmarketing: {
    beginner: ['Digital Marketing Intro • Day','Platforms Tour • Day','Scheduling Tools • Day','Canva Basics • Day','Engagement 101 • Day','Copy Starter • Day','Wrap-Up • Day'],
    intermediate: ['Analytics Basics • Day','Copywriting • Day','Email Campaigns • Day','SEO Basics • Day','Brand Consistency • Day','Content Ops • Day','Performance Review • Day','A/B Ideas • Day','Reporting • Day','Retro • Day'],
    expert: ['Campaign Strategy • Day','Paid Ads • Day','KPI Deep Dive • Day','Influencer Collab • Day','Funnel Optimization • Day','Attribution • Day','Advanced Reporting • Day','Growth Loops • Day','Creative Review • Day','Ops Scaling • Day','Quarter Plan • Day','Pitch Prep • Day','Capstone • Day','Summit • Day'],
  },
}

/* ---------- helpers ---------- */
function formatLocal(dt: Date) {
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  const h24 = dt.getHours()
  const mi = String(dt.getMinutes()).padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  const hh12 = String(h12).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh12}:${mi} ${ampm}`
}
function seedToInt(seed: string){ let h = 2166136261>>>0; for(const ch of seed){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619) } return h>>>0 }
function makeRng(seedStr: string){ let x = seedToInt(seedStr)||123456789; return ()=>{ x^=x<<13; x^=x>>>17; x^=x<<5; return (x>>>0)/4294967296 } }
function shuffleDeterministic<T>(arr:T[], seed:string){ const a=arr.slice(); const rnd=makeRng(seed);
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }

function normalizeProgramId(row:any): string {
  const raw = (row?.program_id ?? row?.program ?? row?.program_slug ?? row?.program_title ?? '').toString().toLowerCase()
  if (['vdaa','vadmin','veditorial','vmarketing'].includes(raw)) return raw
  if (raw.includes('data')) return 'vdaa'
  if (raw.includes('admin')) return 'vadmin'
  if (raw.includes('editor')) return 'veditorial'
  if (raw.includes('market')) return 'vmarketing'
  return 'vdaa'
}
function normalizeLevel(row:any): LevelKey {
  const raw = (row?.level ?? row?.level_choice ?? '').toString().toLowerCase()
  if (raw.startsWith('beg')) return 'beginner'
  if (raw.startsWith('int')) return 'intermediate'
  if (raw.startsWith('exp')) return 'expert'
  return 'beginner'
}
function isApproved(row:any): boolean {
  const flag = row?.is_approved === true || row?.approved === true || row?.paid === true
  const status = String(row?.status ?? row?.approval_status ?? '').toLowerCase()
  const stamped = !!row?.approved_at || !!row?.reviewed_at || !!row?.verified_at
  return flag || stamped || ['approved','approve','accepted','ok','paid','verified'].includes(status)
}

/** Read chosen start from ref_text like `start:<ISO>; slot:<08:00-10:00>` */
function pickStartISO(row:any): string {
  const rt: string = row?.ref_text || ''
  const m = rt.match(/start:([0-9T:\-\.Z\+]+)/i)
  if (m) return new Date(m[1]).toISOString()
  const t = row?.approved_at || row?.reviewed_at || row?.verified_at || row?.created_at || new Date().toISOString()
  return new Date(t).toISOString()
}
function pickSlot(row:any): '08:00-10:00'|'18:00-20:00' {
  const rt: string = row?.ref_text || ''
  const m = rt.match(/slot:(08:00-10:00|18:00-20:00)/i)
  return (m ? (m[1] as any) : '08:00-10:00')
}
function addMinutes(d: Date, mins: number) { const x = new Date(d); x.setMinutes(x.getMinutes()+mins); return x }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate()+days); return x }

/** Simple live clock formatting */
function msToClock(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n:number)=>String(n).padStart(2,'0')
  return d>0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}

function buildConsecutiveDaysWithRandomTitles(paymentId:string,startISO:string,slot:string,days:number,programId:string,level:LevelKey): EventRow[] {
  const base = new Date(startISO)
  if (slot === '08:00-10:00') base.setHours(8,0,0,0); else base.setHours(18,0,0,0)

  const poolAll = TITLE_POOL[programId]?.[level] || ['Training Session • Day']
  const titles = shuffleDeterministic(poolAll, `${paymentId}-${startISO}-${programId}-${level}`)
  const rows: EventRow[] = []
  for (let i=0;i<days;i++){
    const start = new Date(base); start.setDate(base.getDate()+i)
    const end = addMinutes(start, SESSION_MINUTES)
    rows.push({
      id: `${paymentId}-${i}`,
      dateISO: start.toISOString(),
      endISO: end.toISOString(),
      display: formatLocal(start),
      title: `${titles[i % titles.length]} ${i+1}`,
      location: 'Microsoft Teams',
      joinUrl: TEAMS_LINK_BY_PROGRAM[programId] || GENERIC_TEAMS_LINK,
    })
  }
  return rows
}

/* ---------- DB fetch (payment_proofs by user_id) ---------- */
async function fetchApprovedPayments(userId: string) {
  const { data, error } = await supabase.from('payment_proofs').select('*').eq('user_id', userId)
  if (error) return { approved: [] as any[] }
  return { approved: (data ?? []).filter(isApproved) }
}

type WindowInfo = {
  id: string
  programId: string
  level: LevelKey
  slot: '08:00-10:00'|'18:00-20:00'
  startISO: string
  endISO: string
}

/* ---------------------------- Component ---------------------------- */
export default function Events() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<EventRow[]>([])
  const [windows, setWindows] = useState<WindowInfo[]>([])
  const [nowMs, setNowMs] = useState(() => Date.now())

  // live tick for countdowns
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const me = (await supabase.auth.getUser()).data.user?.id
      if (!me) { setRows([]); setWindows([]); setLoading(false); return }

      const { approved } = await fetchApprovedPayments(me)
      if (!alive) return
      if (!approved.length) { setRows([]); setWindows([]); setLoading(false); return }

      // Build per-payment window (start/end)
      const w: WindowInfo[] = approved.map((r:any) => {
        const programId = normalizeProgramId(r)
        const level = normalizeLevel(r)
        const startISO = pickStartISO(r)
        const slot = pickSlot(r)
        const days = LEVEL_DAYS[level]
        // end at the end of last session block
        const endDate = addMinutes(addDays(new Date(startISO), days-1), slot === '08:00-10:00' ? 120 : 120)
        return {
          id: r.id ?? String(Math.random()),
          programId,
          level,
          slot,
          startISO: new Date(startISO).toISOString(),
          endISO: endDate.toISOString(),
        }
      })

      // Build events ONLY for windows that already started
      const built: EventRow[] = []
      for (const win of w) {
        if (Date.now() >= +new Date(win.startISO)) {
          built.push(
            ...buildConsecutiveDaysWithRandomTitles(
              win.id, win.startISO, win.slot, LEVEL_DAYS[win.level], win.programId, win.level
            )
          )
        }
      }
      built.sort((a,b)=>a.dateISO.localeCompare(b.dateISO))

      setWindows(w)
      setRows(built)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const hasEvents = useMemo(() => rows.length > 0, [rows])
  const now = new Date(nowMs)

  // Derived panels
  const statuses = useMemo(() => {
    return windows.map(win => {
      const startMs = +new Date(win.startISO)
      const endMs = +new Date(win.endISO)
      const started = nowMs >= startMs
      const ended = nowMs > endMs
      const levelLabel = win.level === 'beginner' ? 'Beginner' : win.level === 'intermediate' ? 'Intermediate' : 'Expert'
      return {
        id: win.id,
        levelLabel,
        programId: win.programId.toUpperCase(),
        startDisplay: formatLocal(new Date(win.startISO)),
        slot: win.slot,
        started,
        ended,
        untilStart: started ? 0 : (startMs - nowMs),
        untilEnd: ended ? 0 : (endMs - nowMs),
      }
    })
  }, [windows, nowMs])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-3xl font-extrabold">Calendar / Events</h2>
      <div className="mt-2 text-sm text-slate-600">
        {loading
          ? 'Loading your training sessions…'
          : 'Your sessions are generated from your approved payments and scheduled start.'}
      </div>

      {/* Status panel: starts/ends countdowns */}
      {statuses.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {statuses.map(s => (
            <div key={s.id} className="rounded-xl border p-3 bg-white">
              <div className="text-sm font-semibold">
                {s.programId} • {s.levelLabel}
              </div>
              {!s.started ? (
                <div className="text-sm mt-1">
                  <span className="text-slate-600">Starts on</span>{' '}
                  <span className="font-medium">{s.startDisplay} ({s.slot})</span>
                  <div className="mt-1 text-emerald-700 text-xs font-semibold">
                    Starts in {msToClock(s.untilStart)}
                  </div>
                </div>
              ) : s.ended ? (
                <div className="text-sm mt-1 text-rose-600 font-semibold">
                  Promo ended — please pay again to join a new batch.
                </div>
              ) : (
                <div className="text-sm mt-1">
                  <span className="text-slate-600">Promo ends in</span>{' '}
                  <span className="text-emerald-700 font-semibold">{msToClock(s.untilEnd)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="p-3">Date & Time</th>
              <th className="p-3">Title</th>
              <th className="p-3">Location</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(!hasEvents && !loading) ? (
              <tr>
                <td className="p-6 text-slate-500" colSpan={4}>
                  {statuses.some(s => !s.started && !s.ended)
                    ? 'Your events will appear automatically once your chosen start date/time arrives.'
                    : 'No scheduled events.'}
                </td>
              </tr>
            ) : (
              rows.map((e) => {
                const ended = new Date(e.endISO) < now
                return (
                  <tr key={e.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">{e.display}</td>
                    <td className="p-3">{e.title}</td>
                    <td className="p-3">{e.location}</td>
                    <td className="p-3">
                      {ended ? (
                        <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1.5 text-slate-600 font-semibold">
                          Ended
                        </span>
                      ) : (
                        <a
                          href={e.joinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-white font-semibold"
                        >
                          Join in Teams
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
