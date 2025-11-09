// src/pages/ProgramModules.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type LevelKey = 'beginner' | 'intermediate' | 'expert'

type CurrBlock = { days: number; topics: string[] }
type Curricula = Record<string, Record<LevelKey, CurrBlock>>

// Keep this in sync with Programs page
const CURRICULA: Curricula = {
  vdaa: {
    beginner: { days: 7, topics: ['Introduction to Data Analytics','Spreadsheet Proficiency','Data Sorting, Filtering, and Graphs','Data Accuracy and Validation','Introduction to Google Sheets and Excel'] },
    intermediate: { days: 10, topics: ['Data Cleaning and Preparation','Pivot Tables and Basic Statistics','Creating Dashboards','Trend and Pattern Analysis','Visual Data Presentation'] },
    expert: { days: 14, topics: ['Advanced Data Tools (Power BI, Tableau Intro)','Automating Reports for Insights','Interpreting Data for Decision Support','Managing Large Data Sets'] },
  },
  vadmin: {
    beginner: { days: 7, topics: ['Understanding VA Administrative Roles','Email Management and Scheduling Tools','Document Organization (Google Workspace, MS Office)','Calendar Management and Task Prioritization','Online Meeting Setup (Zoom, Teams)'] },
    intermediate: { days: 10, topics: ['Workflow and Process Management','Handling Client Communication','Recordkeeping and Digital Filing Systems','Managing Deadlines and Tasks','Problem Solving and Critical Thinking'] },
    expert: { days: 14, topics: ['Project Coordination and Team Support','Business Correspondence and Report Writing','CRM Tools and Data Entry Accuracy','Process Improvement for Admin Efficiency'] },
  },
  veditorial: {
    beginner: { days: 7, topics: ['Introduction to Editorial Work','Grammar, Spelling, and Punctuation Essentials','Formatting Articles and Documents','Basic Research and Fact-Checking','Using Editing Tools (Grammarly, Hemingway)'] },
    intermediate: { days: 10, topics: ['Copyediting and Proofreading Techniques','Style Guide Application (APA, MLA, Chicago)','Collaborative Editing in Google Docs','Managing Editorial Calendars','Consistency and Tone Checks'] },
    expert: { days: 14, topics: ['Advanced Editing and Rewriting Skills','SEO Writing and Content Optimization','Managing Editorial Projects','Handling Multiple Writers'] },
  },
  vmarketing: {
    beginner: { days: 7, topics: ['Introduction to Digital Marketing','Social Media Platforms Overview','Content Scheduling Tools','Basic Canva and Design Skills','Audience Engagement Basics'] },
    intermediate: { days: 10, topics: ['Social Media Analytics','Copywriting for Marketing','Email Campaign Management','SEO Basics and Keyword Use','Branding and Consistency'] },
    expert: { days: 14, topics: ['Strategic Campaign Planning','Paid Ads Management','Marketing Reports and KPIs','Influencer and Partner Collaboration'] },
  },
}

const LEVEL_LABEL: Record<LevelKey, string> = {
  beginner: 'Beginner Level',
  intermediate: 'Intermediate Level',
  expert: 'Expert Level',
}

// Order to display levels
const ORDER: LevelKey[] = ['beginner', 'intermediate', 'expert']

/* ---------- small helpers (match Programs.tsx) ---------- */
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function msToClock(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (v:number)=>String(v).padStart(2,'0')
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}
function parseStartFromRef(refText?: string | null): string | null {
  if (!refText) return null
  const m = refText.match(/start:([0-9T:\-\.Z\+]+)/i)
  return m ? m[1] : null
}
function parseSlotFromRef(refText?: string | null): '08:00-10:00'|'18:00-20:00'|null {
  if (!refText) return null
  const m = refText.match(/slot:(08:00-10:00|18:00-20:00)/i)
  return (m ? (m[1] as any) : null)
}

export default function ProgramModules() {
  const { programId } = useParams()
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [approvedLevels, setApprovedLevels] = useState<LevelKey[]>([])

  // NEW: active window lock & live clock
  const [lock, setLock] = useState<{ hasActive: boolean; startsAt?: Date; endsAt?: Date } | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(t) }, [])

  // Verify which levels are approved for this program (for the logged-in user)
  useEffect(() => {
    let alive = true
    async function run() {
      if (!programId) { navigate('/programs', { replace: true }); return }
      const me = (await supabase.auth.getUser()).data.user?.id
      if (!me) { navigate('/login?next=/programs', { replace: true }); return }

      // We need rows to compute schedule window + approved levels
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('level, status, created_at, ref_text')
        .eq('user_id', me)
        .eq('program_id', programId)

      if (!alive) return

      if (error) {
        setApprovedLevels([])
        setLock(null)
      } else {
        // Approved levels (permanent)
        const levels = Array.from(new Set((data || []).filter((r:any)=>r.status==='approved').map((r: any) => r.level))) as LevelKey[]
        setApprovedLevels(levels)

        // Compute active/scheduled window for the program (latest end wins)
        const approvedRows = (data || []).filter((r:any)=>r.status==='approved')
        let best: { startsAt: Date; endsAt: Date } | null = null
        for (const r of approvedRows) {
          const startISO = parseStartFromRef(r.ref_text) || r.created_at
          const slot = parseSlotFromRef(r.ref_text)
          const start = new Date(startISO)
          if (slot === '08:00-10:00') start.setHours(8,0,0,0)
          if (slot === '18:00-20:00') start.setHours(18,0,0,0)
          const days = CURRICULA[programId as keyof typeof CURRICULA]?.[r.level as LevelKey]?.days ?? 7
          const end = addDays(new Date(start), days)
          if (!best || +end > +best.endsAt) best = { startsAt: start, endsAt: end }
        }
        if (best) {
          const now = new Date()
          setLock({ hasActive: now < best.endsAt, startsAt: best.startsAt, endsAt: best.endsAt })
        } else {
          setLock(null)
        }
      }
      setChecking(false)
    }
    run()
    return () => { alive = false }
  }, [navigate, programId])

  // Curriculum blocks for this program
  const blocks = useMemo(() => {
    if (!programId) return null
    return CURRICULA[programId as keyof typeof CURRICULA] || null
  }, [programId])

  if (checking) return <main className="mx-auto max-w-6xl px-4 py-10" />

  // If no approved levels, bounce back (must pay at least one level)
  if (!blocks || approvedLevels.length === 0) {
    navigate('/programs', { replace: true })
    return null
  }

  // Show all levels: unlocked (permanent) first, then locked
  const allLevels = ORDER.filter((lvl) => !!blocks[lvl])
  const unlocked = allLevels.filter((lvl) => approvedLevels.includes(lvl))
  const locked = allLevels.filter((lvl) => !approvedLevels.includes(lvl))
  const display = [...unlocked, ...locked]

  // Lock UI state
  const hasActive = !!lock?.hasActive
  const now = new Date(nowMs)
  const startsIn = lock?.startsAt && now < lock.startsAt ? msToClock(+lock.startsAt - +now) : null
  const endsIn = lock?.endsAt && now < lock.endsAt ? msToClock(+lock.endsAt - +now) : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-3xl font-extrabold">Modules</h2>
      <p className="text-slate-600 mt-1">
        {approvedLevels.length === 1
          ? `Welcome! Your ${LEVEL_LABEL[approvedLevels[0]]} payment is approved  permanent access granted.`
          : `Welcome! Your payments are approved — permanent access to ${approvedLevels.map(l => LEVEL_LABEL[l]).join(', ')}.`}
      </p>
      <p className="text-slate-500 text-sm mt-1">
        Other levels remain locked until you pay for that level.
      </p>

      {/* NEW: active/scheduled window countdown to control when user can pay again */}
      {hasActive && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          You already have an active event schedule for this program:
          {startsIn ? (
            <> starts in <span className="font-semibold">{startsIn}</span>.</>
          ) : endsIn ? (
            <> ends in <span className="font-semibold">{endsIn}</span>.</>
          ) : (
            ' active.'
          )}{' '}
          You can pay again when this window is finished.
        </div>
      )}

      <div className={`mt-6 grid gap-4 ${display.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
        {display.map((lvl) => {
          const b = blocks[lvl]
          const isUnlocked = approvedLevels.includes(lvl)

        return (
          <section
            key={lvl}
            className={`rounded-xl border p-4 bg-white ${isUnlocked ? 'border-emerald-200' : 'border-slate-200 opacity-95'}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{LEVEL_LABEL[lvl]}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{b.days} Days</span>
                {isUnlocked ? (
                  <span className="text-[11px] rounded-full border px-2 py-0.5 text-emerald-700 border-emerald-200 bg-emerald-50">
                    Permanent access
                  </span>
                ) : (
                  <span className="text-[11px] rounded-full border px-2 py-0.5 text-slate-600 border-slate-200 bg-slate-50">
                    Locked
                  </span>
                )}
              </div>
            </div>

            <ul className="mt-2 list-disc list-inside text-sm space-y-1">
              {b.topics.map((t, i) => <li key={i}>{t}</li>)}
            </ul>

            {isUnlocked ? (
              <button
                className="mt-3 w-full rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-medium"
                onClick={() => navigate(`/programs/${programId}/lessons/${lvl}`)}
              >
                Open lessons
              </button>
            ) : (
              <button
                className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium ${hasActive ? 'border text-slate-400 cursor-not-allowed' : 'border hover:bg-slate-50'}`}
                onClick={() => { if (!hasActive) navigate('/programs') }}
                title={hasActive ? 'Payment locked while a schedule is active for this program.' : 'Go to Programs to pay and unlock this level'}
                disabled={hasActive}
              >
                Unlock  Pay for this level
              </button>
            )}
          </section>
        )})}
      </div>

      <div className="mt-8">
        <button className="rounded-lg border px-4 py-2" onClick={() => navigate('/programs')}>
          Back to Programs
        </button>
      </div>
    </main>
  )
}
