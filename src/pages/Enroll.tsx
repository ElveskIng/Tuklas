// src/pages/Enroll.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient' // ✅ correct path

/* ----------------------- Constants ----------------------- */
const PROGRAMS: string[] = [
  'Virtual Data Analysis Assistant Training Program',
  'Virtual Administrative Assistant Training Program',
  'Virtual Editorial Assistant Training Program',
  'Virtual Marketing Assistant Training Program',
]
const GENDER_OPTIONS: string[] = ['Female','Male','Nonbinary','Prefer not to say']
const COUNTRY_DEFAULT = 'Philippines'
const REFERRAL_CHOICES: string[] = [
  'Facebook','TikTok','Instagram','YouTube','Google Search','Friend / Family','School','Workplace','Other',
]

type FieldErr = Record<string, string | undefined>

/* ----------------------- Component ----------------------- */
export default function Enroll() {
  const nav = useNavigate()

  // Require login
  const [authChecked, setAuthChecked] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { nav('/login?next=/enroll', { replace: true }); return }
      if (!cancelled) { setUid(data.session.user.id); setAuthChecked(true) }
    }
    check()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) nav('/login?next=/enroll', { replace: true })
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [nav])

  // Personal
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState('')

  // Contact
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Address
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState(COUNTRY_DEFAULT)

  // Program
  const [program, setProgram] = useState<string>(PROGRAMS[0])
  const [goals, setGoals] = useState('')
  const [referral, setReferral] = useState('')

  // Emergency
  const [iceName, setIceName] = useState('')
  const [icePhone, setIcePhone] = useState('')

  // Preferences
  const [newsletter, setNewsletter] = useState(true)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreeData, setAgreeData] = useState(false)

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [serverMsg, setServerMsg] = useState<{ ok?: string; err?: string }>({})

  /* ----------------------- Validation ----------------------- */
  const errs: FieldErr = useMemo(() => {
    const e: FieldErr = {}
    if (!firstName.trim()) e.firstName = 'Required.'
    if (!lastName.trim()) e.lastName = 'Required.'
    if (!email.trim()) e.email = 'Required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Invalid email.'
    if (!phone.trim()) e.phone = 'Required.'
    else if (!/^\d{11}$/.test(phone)) e.phone = 'Enter 11-digit mobile number.'
    if (!city.trim()) e.city = 'Required.'
    if (!province.trim()) e.province = 'Required.'
    if (!zip.trim()) e.zip = 'Required.'
    if (!program) e.program = 'Pick a program.'
    if (!goals.trim()) e.goals = 'Share your goals to tailor your journey.'
    if (!iceName.trim()) e.iceName = 'Required.'
    if (!icePhone.trim()) e.icePhone = 'Required.'
    else if (!/^\d{11}$/.test(icePhone)) e.icePhone = 'Enter 11-digit mobile number.'
    if (!agreeTerms) e.agreeTerms = 'You must accept the Terms of Service.'
    if (!agreeData) e.agreeData = 'Consent to data processing is required.'
    return e
  }, [firstName,lastName,email,phone,city,province,zip,program,goals,iceName,icePhone,agreeTerms,agreeData])

  const canSubmit = Object.keys(errs).every((k) => !errs[k]) && !loading
  const show = (k: keyof FieldErr) => (touched[k] ? errs[k] : undefined)

  /* ----------------------- Submit ----------------------- */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({
      firstName: true, lastName: true, email: true, phone: true, city: true,
      province: true, zip: true, program: true, goals: true,
      iceName: true, icePhone: true, agreeTerms: true, agreeData: true,
    })
    setServerMsg({})
    if (!canSubmit) return
    if (!uid) { setServerMsg({ err: 'Not authenticated.' }); return }

    setLoading(true)
    try {
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim()
      const emailLc = email.trim().toLowerCase()
      const addressLine = [
        street && street.trim(),
        city && city.trim(),
        province && province.trim(),
        zip && zip.trim(),
        country && country.trim(),
      ].filter(Boolean).join(', ')

      // ✅ Write into enroll_forms (the Admin modal reads here)
      const { error } = await supabase.from('enroll_forms').insert({
        user_id: uid,
        program_id: null,
        program_title: program,
        level: null,
        full_name,
        email: emailLc,
        payload: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name,
          email: emailLc,
          phone: phone.trim(),
          gender: gender || null,
          birthdate: birthdate || null,
          street: street || null,
          city: city.trim(),
          province: province.trim(),
          zipcode: zip.trim(),
          country: country.trim(),
          address: addressLine,
          program,
          goals: goals.trim(),
          referral: referral || null,
          emergency_name: iceName.trim(),
          emergency_phone: icePhone.trim(),
          newsletter,
          agree_terms: agreeTerms,
          agree_data: agreeData,
        },
        submitted_at: new Date().toISOString(),
      })
      if (error) throw error

      localStorage.setItem(`tuklas_enrolled:${uid}`, '1')
      setServerMsg({ ok: 'Enrollment complete! Redirecting to Programs…' })
      setTimeout(() => nav('/programs'), 900)
    } catch (err: any) {
      console.error(err)
      setServerMsg({ err: err?.message || 'Something went wrong. Please try again.' })
    } finally { setLoading(false) }
  }

  /* ----------------------- UI ----------------------- */
  if (!authChecked) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-24 text-center text-slate-600">
        <div className="inline-flex items-center gap-2">
          <Spinner /> Checking your session…
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Secure enrollment
        </div>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Enroll</h1>
        <p className="mt-2 text-slate-600">Tell us a bit about you so we can personalize your learning path.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
        <form onSubmit={onSubmit} className="grid gap-7 p-6 md:p-10">
          {/* Personal */}
          <Section title="Personal details" subtitle="Basic information for your certificate.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="firstName" label="First name *" value={firstName}
                onChange={setFirstName} onBlur={() => setTouched((t) => ({ ...t, firstName: true }))} error={show('firstName')} />
              <Field id="lastName" label="Last name *" value={lastName}
                onChange={setLastName} onBlur={() => setTouched((t) => ({ ...t, lastName: true }))} error={show('lastName')} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="birthdate" label="Birthdate" type="date" value={birthdate} onChange={setBirthdate} />
              <FieldSelect id="gender" label="Gender" value={gender} onChange={setGender} options={GENDER_OPTIONS} />
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact" subtitle="How we’ll reach you for updates.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="email" label="Email *" type="email" value={email}
                onChange={setEmail} onBlur={() => setTouched((t) => ({ ...t, email: true }))} error={show('email')} />
              <FieldDigits id="phone" label="Mobile number *" value={phone}
                onChange={setPhone} max={11}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))} 
                error={show('phone')}
                placeholder="11-digit mobile number (e.g., 09XXXXXXXXX)" />
            </div>
          </Section>

          {/* Address */}
          <Section title="Address" subtitle="For certificates and localization.">
            <Field id="street" label="Street" value={street} onChange={setStreet} />
            <div className="grid gap-5 md:grid-cols-4">
              <Field id="city" label="City / Municipality *" value={city}
                onChange={setCity} onBlur={() => setTouched((t) => ({ ...t, city: true }))} error={show('city')} />
              <Field id="province" label="Province *" value={province}
                onChange={setProvince} onBlur={() => setTouched((t) => ({ ...t, province: true }))} error={show('province')} />
              <Field id="zip" label="ZIP *" value={zip}
                onChange={setZip} onBlur={() => setTouched((t) => ({ ...t, zip: true }))} error={show('zip')} />
              <Field id="country" label="Country" value={country} onChange={setCountry} />
            </div>
          </Section>

          {/* Program */}
          <Section title="Program & background" subtitle="Help us fit the training to your goals.">
            <FieldSelect id="program" label="Program *" value={program} onChange={setProgram}
              options={PROGRAMS} onBlur={() => setTouched((t) => ({ ...t, program: true }))} error={show('program')} />
            <FieldTextarea id="goals" label="Learning goals *" value={goals}
              onChange={setGoals} onBlur={() => setTouched((t) => ({ ...t, goals: true }))} error={show('goals')}
              placeholder="Tell us what you want to achieve in 2-3 lines." />
            <FieldSelect id="referral" label="How did you hear about us?" value={referral}
              onChange={setReferral} options={REFERRAL_CHOICES} />
          </Section>

          {/* Emergency */}
          <Section title="Emergency contact" subtitle="In case we need to reach someone for you.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="iceName" label="Contact person *" value={iceName}
                onChange={setIceName} onBlur={() => setTouched((t) => ({ ...t, iceName: true }))} error={show('iceName')} />
              <FieldDigits id="icePhone" label="Contact number *" value={icePhone}
                onChange={setIcePhone} max={11}
                onBlur={() => setTouched((t) => ({ ...t, icePhone: true }))} 
                error={show('icePhone')}
                placeholder="11-digit mobile number" />
            </div>
          </Section>

          {/* Consent */}
          <Section title="Consent & preferences" subtitle="Your privacy matters to us.">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300"
                checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
              <span className="text-sm text-slate-700">Subscribe to product updates, tips, and events.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300"
                checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                onBlur={() => setTouched((t) => ({ ...t, agreeTerms: true }))} />
              <span className="text-sm text-slate-700">
                I agree to the <a className="font-semibold text-emerald-700 hover:underline" href="#">Terms of Service</a>.
                {show('agreeTerms') && <div className="text-xs text-red-600">{errs.agreeTerms}</div>}
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300"
                checked={agreeData} onChange={(e) => setAgreeData(e.target.checked)}
                onBlur={() => setTouched((t) => ({ ...t, agreeData: true }))} />
              <span className="text-sm text-slate-700">
                I consent to the processing of my personal data in accordance with the Privacy Policy.
                {show('agreeData') && <div className="text-xs text-red-600">{errs.agreeData}</div>}
              </span>
            </label>
          </Section>

          {/* Server state */}
          {serverMsg.err && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverMsg.err}</div>}
          {serverMsg.ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{serverMsg.ok}</div>}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">We keep your info private and secure. You can request deletion anytime.</p>
            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
              disabled={!canSubmit}
            >
              {loading ? <span className="inline-flex items-center gap-2"><Spinner /> Submitting…</span> : 'Submit enrollment'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

/* ----------------------- Subcomponents ----------------------- */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}
function Field(props: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  onBlur?: () => void; type?: 'text' | 'email' | 'date' | 'tel';
  placeholder?: string; error?: string;
}) {
  const { id, label, value, onChange, onBlur, type = 'text', placeholder, error } = props
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`mt-1 w-full rounded-xl border bg-white p-3 outline-none transition focus:ring-2 focus:ring-emerald-200 ${
          error ? 'border-red-300' : 'border-slate-300'
        }`}
      />
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  )
}
function FieldDigits(props: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  onBlur?: () => void; placeholder?: string; error?: string; max?: number;
}) {
  const { id, label, value, onChange, onBlur, placeholder, error, max = 11 } = props
  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, max)
    onChange(digits)
  }
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <input
        id={id}
        inputMode="numeric"
        pattern="\d*"
        type="tel"
        value={value}
        onChange={handle}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-xl border bg-white p-3 outline-none transition focus:ring-2 focus:ring-emerald-200 ${
          error ? 'border-red-300' : 'border-slate-300'
        }`}
      />
      <div className="mt-1 text-[11px] text-slate-500">{value.length}/{max} digits</div>
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  )
}
function FieldTextarea(props: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  onBlur?: () => void; placeholder?: string; error?: string;
}) {
  const { id, label, value, onChange, onBlur, placeholder, error } = props
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <textarea
        id={id}
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`mt-1 w-full rounded-xl border bg-white p-3 outline-none transition focus:ring-2 focus:ring-emerald-200 ${
          error ? 'border-red-300' : 'border-slate-300'
        }`}
      />
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  )
}
function FieldSelect(props: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  options: string[]; onBlur?: () => void; error?: string;
}) {
  const { id, label, value, onChange, options, onBlur, error } = props
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`mt-1 w-full rounded-xl border bg-white p-3 outline-none transition focus:ring-2 focus:ring-emerald-200 ${
          error ? 'border-red-300' : 'border-slate-300'
        }`}
      >
        <option value="" disabled hidden>Choose…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  )
}
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
