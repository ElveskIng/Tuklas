import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import HeroCarousel from '../components/HeroCarousel'

/* ================= Types ================= */
type Review = {
  id: string
  display_name: string | null
  rating: number
  comment: string | null
  created_at: string
}

/* ================= Utils ================= */
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

/* ================= Page ================= */
export default function Home() {
  /* ---- auth (for posting reviews) ---- */
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessionEmail(s?.user?.email ?? null))
    return () => { sub?.subscription?.unsubscribe?.() }
  }, [])

  /* ---- reviews ---- */
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

  /* ---- FAQs ---- */
  const BASE_FAQS = [
    { q: 'How do I enroll in a program?', a: 'Open Programs → choose a track → click Enroll. You can switch tracks anytime before Day 2.' },
    { q: 'Do I get a certificate?', a: 'Yes. Complete at least 80% of modules and the final task to receive a digital certificate.' },
    { q: 'Are sessions recorded?', a: 'Yes, replays are available in your Dashboard within 24 hours.' },
    { q: 'Can I pay later?', a: 'For paid programs, we support phased payments via GCash or bank transfer.' },
    { q: 'How do I contact support?', a: 'Email support@tuklas.example or use the Help widget on the bottom-right of the page.' },
  ]
  const [faqQuery, setFaqQuery] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const faqs = useMemo(() => {
    const q = faqQuery.toLowerCase().trim()
    if (!q) return BASE_FAQS
    return BASE_FAQS.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q))
  }, [faqQuery])

  /* ---- About counters ---- */
  const c1 = useCountUp(1250)
  const c2 = useCountUp(38)
  const c3 = useCountUp(14)

  /* ---- Team data (with public images) ---- */
  const TEAM = [
    {
      name: 'Dhara Benedicto',
      role: 'COO',
      bio: 'Oversees daily operations and program delivery turns strategy into execution.',
      img: '/pro1.png',
    },
    {
      name: 'Egie Nuñez',
      role: 'HR',
      bio: 'Leads hiring, onboarding, and people operations keeps culture healthy and compliant.',
      img: '/pro2.png',
    },
    {
      name: 'Jasmin Cabuay',
      role: 'Head of Finance',
      bio: 'Owns budgeting, accounting, and reporting ensures sustainable, transparent growth.',
      img: '/pro3.png',
    },
    {
      name: 'Lawrench Esclanda',
      role: 'CEO',
      bio: 'Sets vision and strategy drives product direction and long term business outcomes.',
      img: '/pro4.png',
    },
  ] as const

  return (
    <main className="mx-auto max-w-7xl px-6 pb-24">
      {/* ===== Hero ===== */}
      <section className="grid gap-8 md:grid-cols-2 items-center pt-10">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight">
            TUKLAS  Virtual Hub
          </h1>
          <p className="mt-3 text-slate-700">
            Explore <b>Programs</b>, track <b>Events</b>, and manage your progress in the <b>Dashboard</b>.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="/programs" className="rounded-full bg-emerald-600 px-5 py-3 text-white font-semibold">Browse Programs</a>
            <a href="/events" className="rounded-full border px-5 py-3 font-semibold">View Events</a>
          </div>
        </div>

        {/* RIGHT: live carousel */}
        <div className="h-[260px] md:h-[320px]">
          <HeroCarousel
            images={['/image1.png', '/image2.png', '/image3.png', '/image4.png']}
            interval={1500}
            className="h-full"
          />
        </div>
      </section>

      {/* ===== About Us (FIRST) ===== */}
      <section id="about" className="mt-14">
        <h2 className="text-2xl font-extrabold">About Us</h2>

        {/* Counters */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div ref={c1.ref as any} className="rounded-2xl border bg-white p-6 text-center shadow-sm">
            <div className="text-4xl font-extrabold text-emerald-600">{c1.val.toLocaleString()}</div>
            <div className="mt-1 text-sm text-slate-600">Learners served</div>
          </div>
          <div ref={c2.ref as any} className="rounded-2xl border bg-white p-6 text-center shadow-sm">
            <div className="text-4xl font-extrabold text-sky-600">{c2.val}</div>
            <div className="mt-1 text-sm text-slate-600">Active programs</div>
          </div>
          <div ref={c3.ref as any} className="rounded-2xl border bg-white p-6 text-center shadow-sm">
            <div className="text-4xl font-extrabold text-fuchsia-600">{c3.val}</div>
            <div className="mt-1 text-sm text-slate-600">Industry partners</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-8">
          <h3 className="text-lg font-bold">Milestones</h3>
          <ol className="mt-3 relative border-s border-slate-200 pl-6">
            {[
              ['2023', 'Founded TUKLAS; launched first admin & data programs'],
              ['2024', 'Added Marketing & Tutorial tracks; introduced Certificates'],
              ['2025', 'Community partners + replay access & Dashboard analytics'],
            ].map(([year, text], i) => (
              <li key={i} className="mb-6">
                <span className="absolute left-[-9px] top-2 h-3 w-3 rounded-full bg-emerald-500"></span>
                <div className="text-sm text-slate-500">{year}</div>
                <div className="font-semibold">{text}</div>
              </li>
            ))}
          </ol>
        </div>

        {/* Team — equal-height, aligned bios */}
        <div className="mt-8">
          <h3 className="text-lg font-bold">Team</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {TEAM.map((m) => (
              <div key={m.name} className="rounded-2xl border bg-white p-4 shadow-sm h-full flex flex-col">
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
                    <div
                      className="hidden h-16 w-16 rounded-full bg-gradient-to-br from-emerald-200 to-sky-200 ring-1 ring-black/10"
                      aria-hidden
                    />
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
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQs (SECOND) ===== */}
      <section id="faqs" className="mt-16">
        <h2 className="text-2xl font-extrabold">FAQs</h2>
        <input
          className="mt-4 w-full rounded-xl border px-4 py-3"
          placeholder="Search FAQs (try: certificate, replay, enroll…)"
          value={faqQuery}
          onChange={e => setFaqQuery(e.target.value)}
        />
        <div className="mt-4 divide-y rounded-2xl border bg-white">
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
          {!faqs.length && <div className="p-5 text-sm text-slate-500">No results.</div>}
        </div>
      </section>

      {/* ===== Reviews (THIRD / LAST) ===== */}
      <section id="reviews" className="mt-16">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">Reviews</h2>
            <p className="text-slate-600">Average rating: <b>{avg}</b> / 5</p>
          </div>
        </div>

        {/* Add review */}
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h3 className="font-semibold">Drop your review</h3>
          {!sessionEmail && <div className="mt-1 text-sm text-slate-600">Login to post.</div>}

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border p-3"
              placeholder="Display name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!sessionEmail}
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Rating:</span>
              <div className="flex gap-1 text-amber-400">
                {[1,2,3,4,5].map(n => (
                  <button key={n}
                    onClick={() => setRating(n)}
                    className={(n <= rating ? 'text-amber-400' : 'text-amber-200') + ' text-2xl leading-none'}
                    disabled={!sessionEmail}
                  >★</button>
                ))}
              </div>
            </div>
          </div>

          <textarea
            className="mt-3 w-full rounded-lg border p-3"
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
            className="mt-3 rounded-full bg-emerald-600 px-5 py-2 text-white font-semibold disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>

        {/* Review list */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {rows.map(r => (
            <article key={r.id} className="rounded-xl border p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{r.display_name || 'Anonymous'}</h4>
                <div className="text-amber-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              </div>
              <p className="mt-1 text-slate-700">{r.comment}</p>
              <div className="mt-1 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</div>
            </article>
          ))}
          {!rows.length && <div className="text-sm text-slate-500">No reviews yet — be the first!</div>}
        </div>
      </section>
    </main>
  )
}
