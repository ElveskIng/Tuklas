// src/pages/Home.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import HeroCarousel from '../components/HeroCarousel'

type Review = {
  id: string
  display_name: string | null
  rating: number
  comment: string | null
  created_at: string
}

/* ===== small utility: animated counter ===== */
function useCountUp(final: number, duration = 1200) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      let start: number | null = null
      const step = (t: number) => {
        if (start === null) start = t
        const p = Math.min(1, (t - start) / duration)
        setVal(Math.round(final * p))
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
      obs.disconnect()
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [final, duration])
  return { ref, val }
}

export default function Home() {
  /* ===== auth for review posting ===== */
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessionEmail(s?.user?.email ?? null))
    return () => { sub?.subscription?.unsubscribe?.() }
  }, [])

  /* ===== reviews ===== */
  const [rows, setRows] = useState<Review[]>([])
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(24)
    setRows((data as Review[]) ?? [])
  }
  useEffect(() => { loadReviews() }, [])

  async function submitReview() {
    setErr(null)
    if (!sessionEmail) { setErr('Please login to post a review.'); return }
    if (!name.trim()) { setErr('Please enter your display name.'); return }
    if (!comment.trim()) { setErr('Please add a short comment.'); return }
    setSubmitting(true)
    const { error } = await supabase.from('reviews').insert({
      display_name: name.trim(),
      rating,
      comment: comment.trim(),
    })
    setSubmitting(false)
    if (error) { setErr(error.message); return }
    setComment(''); setRating(5)
    await loadReviews()
  }

  const avg = useMemo(() => {
    if (!rows.length) return 0
    return Math.round(rows.reduce((a, r) => a + (r.rating || 0), 0) / rows.length * 10) / 10
  }, [rows])

  /* ===== FAQs (clean text) ===== */
  const BASE_FAQS = [
    { q: 'What is a Virtual Assistant?', a: 'A VA provides remote admin, technical, or creative support for clients and teams.' },
    { q: 'Who can enroll?', a: 'Anyone who wants to become a VA. Beginners and upskillers are welcome.' },
    { q: 'Is the training online?', a: 'Yes. You can learn anywhere on your own schedule.' },
    { q: 'How long is the program?', a: 'It depends on the level or package. Expect a little over a week per level.' },
    { q: 'Are there prerequisites?', a: 'No strict requirements. Basic computer skills and willingness to learn are enough.' },
    { q: 'Will I get a certificate?', a: 'Yes. You receive a certificate after completing the program.' },
    { q: 'Do you help with job placement?', a: 'We share openings and connect you with leads through our network. Results still depend on your skill and effort.' },
    { q: 'Can I ask instructors during training?', a: 'Yes. Message instructors and join discussions inside the platform.' },
  ]
  const [faqQuery, setFaqQuery] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const faqs = useMemo(() => {
    const q = faqQuery.toLowerCase().trim()
    if (!q) return BASE_FAQS
    return BASE_FAQS.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q))
  }, [faqQuery])

  /* ===== About counters ===== */
  const [stats, setStats] = useState({ learners: 0, programs: 4, partners: 4 })
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('payment_proofs')
          .select('user_id, status')
          .eq('status', 'approved')
          .limit(10000)
        if (!error && data && alive) {
          const uniq = new Set<string>(data.map(d => d.user_id).filter(Boolean) as string[])
          setStats(s => ({ ...s, learners: uniq.size }))
        }
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  const c1 = useCountUp(stats.learners || 0)
  const c2 = useCountUp(stats.programs)
  const c3 = useCountUp(stats.partners)

  /* ===== Team ===== */
  const TEAM = [
    {
      name: 'Dhara Benedicto',
      role: 'COO',
      bio: 'Oversees operations and program delivery. Turns strategy into execution.',
      img: '/pro1.png',
    },
    {
      name: 'Egie Nuñez',
      role: 'HR',
      bio: 'Leads hiring, onboarding, and people operations. Keeps culture healthy and compliant.',
      img: '/pro2.png',
    },
    {
      name: 'Jasmin Cabuay',
      role: 'Head of Finance',
      bio: 'Owns budgeting, accounting, and reporting. Drives sustainable and transparent growth.',
      img: '/pro3.png',
    },
    {
      name: 'Lawrench Esclanda',
      role: 'CEO',
      bio: 'Sets vision and strategy. Guides product direction and long-term outcomes.',
      img: '/pro4.png',
    },
  ] as const

  return (
    <main className="mx-auto max-w-7xl px-6 pb-24">

      {/* ===== Hero ===== */}
      <section className="grid gap-10 md:grid-cols-2 items-center pt-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-medium">
            <span aria-hidden>✨</span> Learn modern VA skills
          </div>
          <h1 className="mt-3 text-5xl font-extrabold tracking-tight">
            TUKLAS Virtual Hub
          </h1>
          <p className="mt-3 text-slate-700 leading-relaxed">
            Explore <b>Programs</b>, track <b>Events</b>, manage your <b>Progress</b> and Your Dream VA career <b>Starts Here. </b>
          </p>
          <div className="mt-6 flex gap-3">
            <a href="/programs" className="rounded-full bg-emerald-600 px-5 py-3 text-white font-semibold shadow-md hover:shadow-lg transition">
              Browse Programs
            </a>
            <a href="/events" className="rounded-full border px-5 py-3 font-semibold hover:bg-slate-50 transition">
              View Events
            </a>
          </div>
        </div>

        <div className="h-[260px] md:h-[320px] rounded-2xl ring-1 ring-black/10 overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50">
          <HeroCarousel
            images={['/image1.png', '/image2.png', '/image3.png', '/image4.png']}
            interval={1600}
            className="h-full"
          />
        </div>
      </section>

      {/* ===== About Us ===== */}
      <section id="about" className="mt-16">
        <header className="mb-5">
          <h2 className="text-2xl font-extrabold">About Us</h2>
          <p className="text-slate-600">Your launchpad for a specialized VA career</p>
        </header>

        <p className="text-slate-700 leading-relaxed">
          Welcome to <b>Tuklas</b>. The name means discovery and that is the goal. Our tracks help you build the most in-demand VA skills so you can turn potential into income and momentum.
        </p>

        {/* Counters (now shown first) */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            refEl={c1.ref as any}
            value={c1.val.toLocaleString()}
            label="Learners served"
            tone="emerald"
            icon={<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 12a5 5 0 10-5-5a5 5 0 005 5zm-7 9a7 7 0 0114 0z"/></svg>}
          />
          <StatCard
            refEl={c2.ref as any}
            value={c2.val}
            label="Active programs"
            tone="sky"
            icon={<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h18v4H3zm0 6h18v4H3zm0 6h18v2H3z"/></svg>}
          />
          <StatCard
            refEl={c3.ref as any}
            value={c3.val}
            label="Industry partners"
            tone="fuchsia"
            icon={<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M16 11V5h-2v6H3v2h11v6h2v-6h5v-2z"/></svg>}
          />
        </div>

        {/* Vision / Mission moved BELOW the counters */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <AboutCard
            title="Vision"
            color="emerald"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l3 7h7l-5.5 4.1L18 21l-6-3.8L6 21l1.5-7.9L2 9h7z"/></svg>
            }
            body="Become CALABARZON’s premier career accelerator and accredited training institution recognized for producing specialized VAs who can command international rates."
          />
          <AboutCard
            title="Mission"
            color="sky"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M5 3h14v4H5zm0 6h14v4H5zm0 6h14v4H5z"/></svg>
            }
            body="Train and certify aspiring and working professionals in Lipa City and nearby areas in high-demand digital skills. Help them become specialized VAs with strategic value and financial autonomy."
          />
        </div>

        {/* Timeline */}
        <div className="mt-10">
          <h3 className="text-lg font-bold">Milestones</h3>
          <ol className="mt-4 relative border-s border-slate-200 pl-6">
            {[
              ['2023', 'Founded TUKLAS and launched the first Admin and Data programs'],
              ['2024', 'Added Marketing and Tutorial tracks and introduced certificates'],
              ['2025', 'Built community partners plus replay access and dashboard analytics'],
            ].map(([year, text], i) => (
              <li key={i} className="mb-6 group">
                <span className="absolute left-[-9px] top-2 h-3 w-3 rounded-full bg-emerald-500 group-hover:scale-110 transition"></span>
                <div className="text-sm text-slate-500">{year}</div>
                <div className="font-semibold">{text}</div>
              </li>
            ))}
          </ol>
        </div>

        {/* Team */}
        <div className="mt-10">
          <h3 className="text-lg font-bold">Team</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((m) => (
              <div key={m.name} className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={m.img}
                        alt={m.name}
                        loading="lazy"
                        className="h-16 w-16 rounded-full object-cover ring-1 ring-black/10"
                        onError={(e) => {
                          const el = e.currentTarget
                          el.style.display = 'none'
                          const fb = el.nextElementSibling as HTMLDivElement | null
                          if (fb) fb.style.display = 'block'
                        }}
                      />
                      <div className="hidden h-16 w-16 rounded-full bg-gradient-to-br from-emerald-200 to-sky-200 ring-1 ring-black/10" />
                    </div>
                    <div>
                      <div className="font-bold">{m.name}</div>
                      <div className="text-sm text-slate-500">{m.role}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                    {m.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQs ===== */}
      <section id="faqs" className="mt-16">
        <header className="mb-4">
          <h2 className="text-2xl font-extrabold">FAQs</h2>
          <p className="text-slate-600">Quick answers to common questions</p>
        </header>

        <input
          className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="Search FAQs. Try certificate, schedule, enroll."
          value={faqQuery}
          onChange={e => setFaqQuery(e.target.value)}
        />

        <div className="mt-4 divide-y rounded-2xl border bg-white shadow-sm">
          {faqs.map((f, i) => (
            <details
              key={i}
              open={openFaq === i}
              onClick={(e) => { e.preventDefault(); setOpenFaq(openFaq === i ? null : i) }}
              className="group"
            >
              <summary className="cursor-pointer select-none list-none px-5 py-4 font-semibold flex items-center justify-between">
                {f.q}
                <span className="text-slate-400 group-open:rotate-180 transition">&#9660;</span>
              </summary>
              <div className="px-5 pb-4 text-slate-700">{f.a}</div>
            </details>
          ))}
          {!faqs.length && <div className="p-5 text-sm text-slate-500">No results found.</div>}
        </div>
      </section>

      {/* ===== Reviews ===== */}
      <section id="reviews" className="mt-16">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">Reviews</h2>
            <p className="text-slate-600">Average rating: <b>{avg}</b> / 5</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <h3 className="font-semibold">Drop your review</h3>
          {!sessionEmail && <div className="mt-1 text-sm text-slate-600">Login to post.</div>}

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Display name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!sessionEmail}
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Rating</span>
              <div className="flex gap-1 text-amber-400">
                {[1,2,3,4,5].map(n => (
                  <button key={n}
                    onClick={() => setRating(n)}
                    className={(n <= rating ? 'text-amber-400' : 'text-amber-200') + ' text-2xl leading-none'}
                    disabled={!sessionEmail}
                    aria-label={`Rate ${n}`}
                  >★</button>
                ))}
              </div>
            </div>
          </div>

          <textarea
            className="mt-3 w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            rows={3}
            placeholder="What did you like? Any suggestions?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            disabled={!sessionEmail}
          />
          {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
          <button
            onClick={submitReview}
            disabled={!sessionEmail || submitting}
            className="mt-3 rounded-full bg-emerald-600 px-5 py-2 text-white font-semibold disabled:opacity-50 shadow hover:shadow-md transition"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {rows.map(r => (
            <article key={r.id} className="rounded-xl border p-4 bg-white shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{r.display_name || 'Anonymous'}</h4>
                <div className="text-amber-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
              <p className="mt-1 text-slate-700">{r.comment}</p>
              <div className="mt-1 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</div>
            </article>
          ))}
          {!rows.length && <div className="text-sm text-slate-500">No reviews yet. Be the first.</div>}
        </div>
      </section>
    </main>
  )
}

/* ===== presentational cards ===== */
function AboutCard({
  title, body, icon, color,
}: { title: string; body: string; icon: React.ReactNode; color: 'emerald' | 'sky' }) {
  const tone = color === 'emerald'
    ? 'from-emerald-50 ring-emerald-200 text-emerald-700'
    : 'from-sky-50 ring-sky-200 text-sky-700'
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm hover:shadow transition ring-1 ${tone.split(' ')[1]}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.split(' ')[0]} via-transparent to-white`} />
      <div className="relative z-10 flex items-center gap-2 text-sm font-semibold">
        <span className={`${tone.split(' ')[2]}`}>{icon}</span>
        <span className="text-slate-900">{title}</span>
      </div>
      <p className="relative z-10 mt-2 text-slate-700 leading-relaxed text-sm">{body}</p>
    </div>
  )
}

function StatCard({
  refEl, value, label, tone, icon,
}: { refEl: any; value: string | number; label: string; tone: 'emerald' | 'sky' | 'fuchsia'; icon: React.ReactNode }) {
  const toneMap: Record<string, { ring: string; text: string; bg: string }> = {
    emerald: { ring: 'ring-emerald-200', text: 'text-emerald-700', bg: 'from-emerald-50' },
    sky:     { ring: 'ring-sky-200',     text: 'text-sky-700',     bg: 'from-sky-50' },
    fuchsia: { ring: 'ring-fuchsia-200', text: 'text-fuchsia-700', bg: 'from-fuchsia-50' },
  }
  const t = toneMap[tone]
  return (
    <div ref={refEl} className={`rounded-2xl border bg-white p-6 text-center shadow-sm hover:shadow transition ring-1 ${t.ring} relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${t.bg} via-transparent to-white opacity-60`} />
      <div className="relative z-10 mx-auto mb-2 h-9 w-9 grid place-items-center rounded-full bg-white ring-1 ring-black/10">
        <span className={t.text}>{icon}</span>
      </div>
      <div className={`relative z-10 text-4xl font-extrabold ${t.text}`}>{value}</div>
      <div className="relative z-10 mt-1 text-sm text-slate-600">{label}</div>
    </div>
  )
}
