// src/pages/ProgramLessons.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type LevelKey = 'beginner' | 'intermediate' | 'expert'
type CurrBlock = { days: number; topics: string[] }
type Curricula = Record<string, Record<LevelKey, CurrBlock>>

// same curricula as ProgramModules (only what's needed to render lessons)
const CURRICULA: Curricula = {
  vdaa: {
    beginner: {
      days: 7,
      topics: [
        'Introduction to Data Analytics',
        'Spreadsheet Proficiency',
        'Data Sorting, Filtering, and Graphs',
        'Data Accuracy and Validation',
        'Introduction to Google Sheets and Excel',
      ],
    },
    intermediate: {
      days: 10,
      topics: [
        'Data Cleaning and Preparation',
        'Pivot Tables and Basic Statistics',
        'Creating Dashboards',
        'Trend and Pattern Analysis',
        'Visual Data Presentation',
      ],
    },
    expert: {
      days: 14,
      topics: [
        'Advanced Data Tools (Power BI, Tableau Intro)',
        'Automating Reports for Insights',
        'Interpreting Data for Decision Support',
        'Managing Large Data Sets',
      ],
    },
  },
  vadmin: {
    beginner: {
      days: 7,
      topics: [
        'Understanding VA Administrative Roles',
        'Email Management and Scheduling Tools',
        'Document Organization (Google Workspace, MS Office)',
        'Calendar Management and Task Prioritization',
        'Online Meeting Setup (Zoom, Teams)',
      ],
    },
    intermediate: {
      days: 10,
      topics: [
        'Workflow and Process Management',
        'Handling Client Communication',
        'Recordkeeping and Digital Filing Systems',
        'Managing Deadlines and Tasks',
        'Problem Solving and Critical Thinking',
      ],
    },
    expert: {
      days: 14,
      topics: [
        'Project Coordination and Team Support',
        'Business Correspondence and Report Writing',
        'CRM Tools and Data Entry Accuracy',
        'Process Improvement for Admin Efficiency',
      ],
    },
  },
  veditorial: {
    beginner: {
      days: 7,
      topics: [
        'Introduction to Editorial Work',
        'Grammar, Spelling, and Punctuation Essentials',
        'Formatting Articles and Documents',
        'Basic Research and Fact-Checking',
        'Using Editing Tools (Grammarly, Hemingway)',
      ],
    },
    intermediate: {
      days: 10,
      topics: [
        'Copyediting and Proofreading Techniques',
        'Style Guide Application (APA, MLA, Chicago)',
        'Collaborative Editing in Google Docs',
        'Managing Editorial Calendars',
        'Consistency and Tone Checks',
      ],
    },
    expert: {
      days: 14,
      topics: [
        'Advanced Editing and Rewriting Skills',
        'SEO Writing and Content Optimization',
        'Managing Editorial Projects',
        'Handling Multiple Writers',
      ],
    },
  },
  vmarketing: {
    beginner: {
      days: 7,
      topics: [
        'Introduction to Digital Marketing',
        'Social Media Platforms Overview',
        'Content Scheduling Tools',
        'Basic Canva and Design Skills',
        'Audience Engagement Basics',
      ],
    },
    intermediate: {
      days: 10,
      topics: [
        'Social Media Analytics',
        'Copywriting for Marketing',
        'Email Campaign Management',
        'SEO Basics and Keyword Use',
        'Branding and Consistency',
      ],
    },
    expert: {
      days: 14,
      topics: [
        'Strategic Campaign Planning',
        'Paid Ads Management',
        'Marketing Reports and KPIs',
        'Influencer and Partner Collaboration',
      ],
    },
  },
}

const LEVEL_LABEL: Record<LevelKey, string> = {
  beginner: 'Beginner Level',
  intermediate: 'Intermediate Level',
  expert: 'Expert Level',
}

export default function ProgramLessons() {
  const { programId, level } = useParams()
  const navigate = useNavigate()
  const lvl = (level as LevelKey) || 'beginner'

  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [idx, setIdx] = useState(0)

  // verify this level is approved
  useEffect(() => {
    let alive = true
    async function run() {
      if (!programId) { navigate('/programs', { replace: true }); return }
      const me = (await supabase.auth.getUser()).data.user?.id
      if (!me) { navigate('/login?next=/programs', { replace: true }); return }

      const { data, error } = await supabase
        .from('payment_proofs')
        .select('level')
        .eq('user_id', me)
        .eq('program_id', programId)
        .eq('status', 'approved')

      if (!alive) return
      if (error) setAllowed(false)
      else {
        const ok = new Set((data || []).map((r: any) => r.level))
        setAllowed(ok.has(lvl))
      }
      setChecking(false)
    }
    run()
    return () => { alive = false }
  }, [navigate, programId, lvl])

  const lessons = useMemo(() => {
    if (!programId) return null
    const blocks = CURRICULA[programId as keyof typeof CURRICULA]
    const block = blocks?.[lvl]
    if (!block) return null
    const [a, b] = block.topics.slice(0, 2)
    return [
      {
        id: 'lesson-1',
        title: a,
        points: [
          `Overview of "${a}"`,
          'Why it matters',
          'Quick best practices',
        ],
      },
      {
        id: 'lesson-2',
        title: b,
        points: [
          `Core ideas in "${b}"`,
          'Hands-on tips',
          'Common pitfalls',
        ],
      },
    ]
  }, [programId, lvl])

  if (checking) return <main className="mx-auto max-w-6xl px-4 py-10" />
  if (!allowed || !lessons) {
    navigate('/programs', { replace: true })
    return null
  }

  const current = lessons[idx]
  const canPrev = idx > 0
  const canNext = idx < lessons.length - 1

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold">Lessons</h2>
          <p className="text-slate-600 mt-1">
            {programId?.toUpperCase()} • {LEVEL_LABEL[lvl]} — {idx + 1} / {lessons.length}
          </p>
        </div>
        <button className="rounded-lg border px-4 py-2" onClick={() => navigate(`/programs/${programId}`)}>
          Back to Modules
        </button>
      </div>

      <section className="mt-6 rounded-xl border bg-white p-5">
        <h3 className="text-xl font-bold">{current.title}</h3>
        <ul className="mt-3 list-disc list-inside text-sm text-slate-700 space-y-1">
          {current.points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>

        <div className="mt-6 flex items-center justify-between">
          <button className="rounded-lg border px-4 py-2 disabled:opacity-50" disabled={!canPrev} onClick={() => setIdx(i => i - 1)}>
            ← Previous
          </button>
          <button className="rounded-lg border px-4 py-2 disabled:opacity-50" disabled={!canNext} onClick={() => setIdx(i => i + 1)}>
            Next →
          </button>
        </div>
      </section>
    </main>
  )
}
