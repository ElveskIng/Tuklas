// src/pages/Programs.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

/* ───────── Types & constants ───────── */
type Program = { id: string; title: string; overview: string; outcomes: string[] }
type LevelKey = 'beginner' | 'intermediate' | 'expert'
type CurriculumBlock = { days: number; topics: string[] }
type Curricula = Record<string, Record<LevelKey, CurriculumBlock>>

type ProofRow = {
  id: string
  created_at: string
  program_id: string
  user_id: string
  level: LevelKey
  amount: number
  image_url: string
  status: 'pending' | 'approved' | 'rejected'
  ref_text: string | null
}

const STORAGE_BUCKET = 'payment_proofs'

const TUKLAS_PROGRAMS: Program[] = [
  {
    id: 'vdaa',
    title: 'Virtual Data Analysis Assistant Training Program',
    overview:
      'Hands-on training for virtual assistants who analyze data, build dashboards, and present business insights.',
    outcomes: [
      'Spreadsheet & SQL fundamentals',
      'Cleaning & visualization best practices',
      'KPI dashboards and simple forecasts',
    ],
  },
  {
    id: 'vadmin',
    title: 'Virtual Administrative Assistant Training Program',
    overview:
      'Operational excellence for modern remote admins—calendar mastery, documentation, and process automation.',
    outcomes: ['Email, calendar, and file systems', 'SOP writing & documentation', 'Automation with forms and spreadsheets'],
  },
  {
    id: 'veditorial',
    title: 'Virtual Editorial Assistant Training Program',
    overview:
      'Editing workflow from research to publish. Learn briefs, style guides, CMS use, and basic graphics.',
    outcomes: ['Content research & outlines', 'Editing with style guides', 'CMS publishing & basic graphics'],
  },
  {
    id: 'vmarketing',
    title: 'Virtual Marketing Assistant Training Program',
    overview:
      'Campaign support for social, email, and ads. Build calendars, drafts, and reports that convert.',
    outcomes: ['Social calendar & asset prep', 'Email drafts & simple automations', 'Campaign tracking & weekly reports'],
  },
]

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

const LEVELS: LevelKey[] = ['beginner', 'intermediate', 'expert']
const LEVEL_LABEL: Record<LevelKey, string> = { beginner: 'BEGINNER', intermediate: 'INTERMEDIATE', expert: 'EXPERT' }
const PRICE_TEXT: Record<LevelKey, string> = { beginner: '₱3,000', intermediate: '₱7,000', expert: '₱12,000' }
const PRICE_NUM: Record<LevelKey, number> = { beginner: 3000, intermediate: 7000, expert: 12000 }
const CREDITS: Record<LevelKey, number> = { beginner: 1, intermediate: 3, expert: 5 }

function peso(n: number) { return `₱${Number(n).toLocaleString()}` }
function fmt(x: string) { return new Date(x).toLocaleString() }

/* Helpers for access window & countdown */
function daysFor(programId: string, lvl: LevelKey): number {
  return CURRICULA[programId]?.[lvl]?.days ?? 7
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
function msToClock(ms: number): { d: number; h: number; m: number; s: number } {
  const sec = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return { d, h, m, s }
}
function clockStr(ms: number): string {
  const { d, h, m, s } = msToClock(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}

/* ───────── Component ───────── */
export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [agree, setAgree] = useState(false)

  const [search, setSearch] = useState('')

  const [qrOpen, setQrOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)

  const [selectedLevel, setSelectedLevel] = useState<LevelKey | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>([null, null, null])
  const [proofPreviews, setProofPreviews] = useState<(string | null)[]>([null, null, null])
  const [proofErrors, setProofErrors] = useState<string[]>(['', '', ''])
  const [submitting, setSubmitting] = useState(false)

  const [myProofs, setMyProofs] = useState<ProofRow[]>([])

  /* ticking “now” for live countdown */
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const navigate = useNavigate()

  /* login + enrolled guard + refresh proofs ONLY when session changes */
  const loadMine = useCallback(async () => {
    const me = (await supabase.auth.getUser()).data.user?.id
    if (!me) { setMyProofs([]); return }

    const { data, error } = await supabase
      .from('payment_proofs')
      .select('id, created_at, program_id, user_id, level, amount, image_url, status, ref_text')
      .eq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) setMyProofs(data as any)
    else if (error) { setMyProofs([]); console.error('loadMine error:', error) }
  }, [])

  useEffect(() => {
    async function guard() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login?next=/programs', { replace: true }); return }
      const key = `tuklas_enrolled:${session.user.id}`
      if (localStorage.getItem(key) !== '1') { navigate('/enroll', { replace: true }); return }
    }
    guard()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) {
        navigate('/login?next=/programs', { replace: true })
        return
      }
      // IMPORTANT: do NOT clear myProofs here—just reload
      loadMine()
    })

    return () => { sub.subscription.unsubscribe() }
  }, [navigate, loadMine])

  // Refresh proofs when returning to the tab (no flicker)
  useEffect(() => {
    const refresh = () => { loadMine() }
    window.addEventListener('focus', refresh)
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [loadMine])

  useEffect(() => setPrograms(TUKLAS_PROGRAMS), [])
  useEffect(() => { loadMine() }, [loadMine])

  /* Compute access per program from approved proofs (latest expiry wins) */
  const accessByProgram = useMemo(() => {
    const map: Record<string, { unlocked: boolean; expiresAt: Date; remainingMs: number; level: LevelKey } | undefined> = {}
    const now = nowMs
    const approved = myProofs.filter(p => p.status === 'approved')
    for (const p of approved) {
      const start = new Date(p.created_at)
      const expiresAt = addDays(start, daysFor(p.program_id, p.level))
      const remainingMs = +expiresAt - now
      const entry = map[p.program_id]
      if (!entry || +expiresAt > +entry.expiresAt) {
        map[p.program_id] = { unlocked: remainingMs > 0, expiresAt, remainingMs, level: p.level }
      }
    }
    return map
  }, [myProofs, nowMs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return programs
    return programs.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.overview.toLowerCase().includes(q) ||
        p.outcomes.some((o) => o.toLowerCase().includes(q)),
    )
  }, [programs, search])

  function resetForm() { setName(''); setEmail(''); setAgree(false) }

  function handleSubmitUnlock(id: string) {
    if (!name.trim() || !email.trim() || !agree) return
    setSelectedId(id)
    setSelectedLevel(null)
    setSelectedFiles([null, null, null])
    setProofPreviews([null, null, null])
    setProofErrors(['', '', ''])
    setQrOpen(true)
    setOpenId(null)
    resetForm()
  }

  function onPickProof(slotIndex: number, file?: File) {
    if (slotIndex < 0 || slotIndex > 2) return
    setProofErrors((prev) => { const next = [...prev]; next[slotIndex] = ''; return next })
    setSelectedFiles((prev) => { const n = [...prev]; n[slotIndex] = file ?? null; return n })
    setProofPreviews((prev) => {
      const next = [...prev]
      if (next[slotIndex]) URL.revokeObjectURL(next[slotIndex] as string)
      if (!file) { next[slotIndex] = null; return next }
      const okType = /image\/(png|jpe?g)$/i.test(file.type)
      const okSize = file.size <= 5 * 1024 * 1024
      if (!okType || !okSize) {
        setProofErrors((prev) => {
          const n = [...prev]
          n[slotIndex] = !okType ? 'Please upload JPG or PNG only.' : 'Maximum size is 5MB.'
          return n
        })
        next[slotIndex] = null
        setSelectedFiles((prev) => { const n = [...prev]; n[slotIndex] = null; return n })
        return next
      }
      next[slotIndex] = URL.createObjectURL(file)
      return next
    })
    setSelectedLevel(LEVELS[slotIndex])
  }

  const canSubmit = useMemo(() => {
    if (!selectedId || !selectedLevel) return false
    const idx = LEVELS.indexOf(selectedLevel)
    return !!selectedFiles[idx]
  }, [selectedId, selectedLevel, selectedFiles])

  async function submitForReview() {
    if (!selectedId || !selectedLevel) return
    const idx = LEVELS.indexOf(selectedLevel)
    const file = selectedFiles[idx]
    if (!file) return

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const path = `${user.id}/${selectedId}-${selectedLevel}-${Date.now()}-${file.name}`
      const up = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false })
      if (up.error) {
        const m = up.error.message?.toLowerCase() || ''
        if (m.includes('bucket')) alert('Storage bucket "payment_proofs" not found (create a PUBLIC bucket with that name).')
        else alert('Upload failed: ' + up.error.message)
        return
      }
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
      const image_url = pub?.publicUrl || ''

      const { error: insErr } = await supabase.from('payment_proofs').insert([{
        user_id: user.id,
        program_id: selectedId,
        level: selectedLevel,
        amount: PRICE_NUM[selectedLevel],
        image_url,
        status: 'pending',
        ref_text: null,
        credits_awarded: CREDITS[selectedLevel],
      }])

      if (insErr) { alert('Failed to submit: ' + insErr.message); return }

      await loadMine()
      setQrOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedId) || null,
    [programs, selectedId],
  )

  // Close modal on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setQrOpen(false) }
    if (qrOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [qrOpen])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-3xl font-extrabold">Programs</h2>
      <p className="text-slate-600 mt-2">Pick a program to start.</p>

      {/* Your payments */}
      {myProofs.length > 0 && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Your payments</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {myProofs.map((r) => (
              <div key={r.id} className="rounded-xl border p-3 bg-white flex items-center gap-3">
                <img src={r.image_url} alt="receipt" className="h-12 w-12 rounded-md object-cover border" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {r.program_id.toUpperCase()} • {LEVEL_LABEL[r.level]}
                  </div>
                  <div className="text-xs text-slate-500">
                    {fmt(r.created_at)} — {peso(r.amount)}
                  </div>
                </div>
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
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <div className="mt-5">
        <input
          className="w-full md:w-96 rounded-xl border px-4 py-3"
          placeholder="Search programs (e.g., data, admin, editorial, marketing)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Program cards */}
      <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-2 gap-6">
        {filtered.map((p) => {
          const access = accessByProgram[p.id]
          const unlocked = !!access?.unlocked
          const remainingMs = access?.remainingMs ?? 0
          const expiresAt = access?.expiresAt

          return (
            <article key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-lg">{p.title}</h3>
                {unlocked && expiresAt && (
                  <span className="text-[11px] rounded-full border px-2 py-1 text-emerald-700 border-emerald-200 bg-emerald-50">
                    Expires in {clockStr(remainingMs)}
                  </span>
                )}
                {!unlocked && access && (
                  <span className="text-[11px] rounded-full border px-2 py-1 text-rose-700 border-rose-200 bg-rose-50">
                    Expired
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 mt-1">{p.overview}</p>
              <ul className="mt-3 list-disc list-inside text-sm text-slate-700">
                {p.outcomes.map((o, i) => <li key={i}>{o}</li>)}
              </ul>

              {unlocked ? (
                <button
                  className="mt-4 w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                  onClick={() => navigate(`/programs/${p.id}`)}
                >
                  Start modules
                </button>
              ) : (
                <div className="mt-4 grid gap-2">
                  {access && (
                    <div className="text-xs text-rose-600">
                      Access ended — please pay again to continue.
                    </div>
                  )}
                  <button
                    className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                    onClick={() => { setOpenId(p.id); setSelectedId(p.id) }}
                  >
                    {access ? 'Renew access' : 'Next'}
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {/* Step 1: Quick application */}
      {openId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenId(null)} />
          <div className="absolute right-0 left-0 top-1/2 -translate-y-1/2 mx-auto w-[92%] max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold">Quick application</h3>
            <p className="text-slate-600 mt-1 text-sm">Fill this short form to unlock the modules.</p>

            <div className="mt-4 grid gap-3">
              <input className="rounded-lg border p-3" placeholder="Full name"
                     value={name} onChange={(e) => setName(e.target.value)} />
              <input className="rounded-lg border p-3" placeholder="Email (use @gmail.com is fine)" type="email"
                     value={email} onChange={(e) => setEmail(e.target.value)} />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4"
                       checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                I agree to receive onboarding emails for this program.
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border" onClick={() => setOpenId(null)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"
                disabled={!name.trim() || !email.trim() || !agree}
                onClick={() => handleSubmitUnlock(openId!)}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Payment modal */}
      {qrOpen && selectedProgram && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setQrOpen(false)} />
          <div className="relative w-[94%] max-w-4xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5 border-b bg-white rounded-t-2xl">
              <div>
                <h3 className="text-lg md:text-xl font-bold">{selectedProgram.title}</h3>
                <p className="text-xs md:text-sm text-slate-600 mt-1">
                  Scan a GCASH QR, upload your receipt, then submit for admin approval.
                </p>
              </div>
              <button onClick={() => setQrOpen(false)} className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100" aria-label="Close">✕</button>
            </div>

            {/* Body */}
            <div className="px-5 pb-24 pt-4 max-h-[90vh] overflow-y-auto">
              <div className="grid gap-3 md:grid-cols-3">
                {LEVELS.map((lvl, i) => (
                  <section key={lvl} className={`rounded-xl border ${selectedLevel === lvl ? 'border-emerald-400' : 'border-slate-200'} overflow-hidden bg-white`}>
                    <header className="flex items-center justify-between bg-slate-50 px-3 py-1.5">
                      <span className="text-[11px] font-semibold tracking-wide text-slate-700">
                        {LEVEL_LABEL[lvl]}
                      </span>
                      <span className="text-[11px] text-slate-500">Scan & upload</span>
                    </header>

                    <div className="px-3 pt-3 text-center">
                      <img
                        src="/gcash-qr.png"
                        alt={`GCASH QR for ${LEVEL_LABEL[lvl]}`}
                        className="mx-auto h-36 md:h-40 w-auto object-contain rounded-md cursor-zoom-in border"
                        onClick={() => setZoomSrc('/gcash-qr.png')}
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        GCASH QR for <span className="font-semibold">{LEVEL_LABEL[lvl]}</span>
                      </p>
                    </div>

                    <div className="px-3 pb-3 pt-2">
                      <p className="text-[13px] font-medium">Upload proof (required)</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] cursor-pointer hover:bg-slate-50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14m7-7H5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Choose file
                          <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onPickProof(i, e.target.files?.[0])} />
                        </label>

                        {proofPreviews[i] ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]">
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                            Selected
                            <button className="ml-1.5 rounded-md border px-1.5 py-0.5 text-[11px]" onClick={() => onPickProof(i, undefined)}>
                              Remove
                            </button>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">JPG/PNG, up to 5MB</span>
                        )}
                      </div>

                      {proofPreviews[i] && (
                        <div className="mt-2">
                          <img src={proofPreviews[i] as string} alt="Proof preview" className="h-12 w-12 rounded-md object-cover border" />
                        </div>
                      )}
                      {proofErrors[i] && <p className="mt-1.5 text-[11px] text-red-600">{proofErrors[i]}</p>}
                    </div>

                    <div className="px-3 pb-3">
                      <label className="flex items-center gap-2 text-[13px] cursor-pointer" onClick={() => setSelectedLevel(lvl)}>
                        <input
                          type="radio"
                          name="level"
                          className="h-4 w-4"
                          checked={selectedLevel === lvl}
                          onChange={() => setSelectedLevel(lvl)}
                        />
                        Select {LEVEL_LABEL[lvl]} — <span className="font-semibold ml-1">{PRICE_TEXT[lvl]}</span>
                      </label>
                    </div>
                  </section>
                ))}
              </div>

              {/* Prices */}
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <h4 className="text-sm font-semibold">Prices</h4>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <div className="rounded-lg bg-white border border-emerald-200 p-3">
                    <div className="text-xs font-medium text-emerald-700">BEGINNER</div>
                    <div className="text-xl font-bold">{PRICE_TEXT.beginner}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-emerald-200 p-3">
                    <div className="text-xs font-medium text-emerald-700">INTERMEDIATE</div>
                    <div className="text-xl font-bold">{PRICE_TEXT.intermediate}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-emerald-200 p-3">
                    <div className="text-xs font-medium text-emerald-700">EXPERT</div>
                    <div className="text-xl font-bold">{PRICE_TEXT.expert}</div>
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div className="mt-5">
                <h4 className="text-sm font-semibold">Program modules</h4>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  {(Object.keys(CURRICULA[selectedProgram.id]) as Array<LevelKey>).map((lvl) => {
                    const block = CURRICULA[selectedProgram.id][lvl]
                    const title = lvl === 'beginner' ? 'Beginner Level' : lvl === 'intermediate' ? 'Intermediate Level' : 'Expert Level'
                    return (
                      <div key={lvl} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-semibold">{title}</span>
                          <span className="text-xs text-slate-500">{block.days} Days</span>
                        </div>
                        <ul className="mt-1.5 list-disc list-inside text-[13px] text-slate-700 space-y-0.5">
                          {block.topics.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white rounded-b-2xl flex justify-end gap-2">
              <button className="px-3.5 py-2 rounded-lg border" onClick={() => setQrOpen(false)}>Close</button>
              <button
                className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"
                onClick={submitForReview}
                disabled={submitting || !canSubmit}
              >
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {zoomSrc && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setZoomSrc(null)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img
              src={zoomSrc}
              alt="QR zoom"
              className="max-h-[80vh] max-w-[92vw] rounded-xl shadow-2xl"
              onClick={() => setZoomSrc(null)}
            />
          </div>
        </div>
      )}
    </main>
  )
}
