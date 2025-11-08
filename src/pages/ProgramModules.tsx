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

export default function ProgramModules() {
  const { programId } = useParams()
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [approvedLevels, setApprovedLevels] = useState<LevelKey[]>([])

  // Verify which levels are approved for this program (for the logged-in user)
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

      if (error) {
        setApprovedLevels([])
      } else {
        const levels = Array.from(new Set((data || []).map((r: any) => r.level))) as LevelKey[]
        setApprovedLevels(levels)
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

  // If no approved levels, bounce back
  if (!blocks || approvedLevels.length === 0) {
    navigate('/programs', { replace: true })
    return null
  }

  // Only show the approved levels (e.g., just 'beginner' if that’s what was paid)
  const levelsToShow = (Object.keys(blocks) as Array<LevelKey>).filter((lvl) =>
    approvedLevels.includes(lvl),
  )

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-3xl font-extrabold">Modules</h2>
      <p className="text-slate-600 mt-1">
        {approvedLevels.length === 1
          ? `Welcome! Your ${LEVEL_LABEL[approvedLevels[0]]} payment is approved — start below.`
          : 'Welcome! Your payments are approved — start with any of the modules below.'}
      </p>

      <div className={`mt-6 grid gap-4 ${levelsToShow.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
        {levelsToShow.map((lvl) => {
          const b = blocks[lvl]
          return (
            <section key={lvl} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{LEVEL_LABEL[lvl]}</h3>
                <span className="text-xs text-slate-500">{b.days} Days</span>
              </div>
              <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                {b.topics.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
              <button
                className="mt-3 w-full rounded-lg border px-3 py-2 text-sm font-medium"
                onClick={() => navigate(`/programs/${programId}/lessons/${lvl}`)}
              >
                Open lessons
              </button>
            </section>
          )
        })}
      </div>

      <div className="mt-8">
        <button className="rounded-lg border px-4 py-2" onClick={() => navigate('/programs')}>
          Back to Programs
        </button>
      </div>
    </main>
  )
}
