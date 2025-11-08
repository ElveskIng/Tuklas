import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // NEW: visibility toggles
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const navigate = useNavigate()

  function isGmail(addr: string) {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(addr.trim())
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(null)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName) return setError('Please enter your name')
    if (!isGmail(trimmedEmail)) return setError('Email must be a valid @gmail.com address')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm) return setError('Passwords do not match')

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { full_name: trimmedName } }
    })
    setLoading(false)

    if (error) {
      console.error('[signup error]', error)
      setError(error.message || 'Sign up failed')
    } else {
      setSuccess('Check your Gmail inbox to confirm your account.')
      setTimeout(() => navigate('/login'), 1500)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h2 className="text-3xl font-extrabold">Create account</h2>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          className="w-full border p-3 rounded-lg"
          type="text"
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="w-full border p-3 rounded-lg"
          type="email"
          placeholder="Gmail address (you@example@gmail.com)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        {/* Password with show/hide */}
        <div className="relative">
          <input
            className="w-full border p-3 rounded-lg pr-20"
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute inset-y-0 right-2 my-1 px-2 text-sm rounded-md hover:bg-slate-100"
            aria-pressed={showPw}
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Confirm with show/hide */}
        <div className="relative">
          <input
            className="w-full border p-3 rounded-lg pr-20"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            className="absolute inset-y-0 right-2 my-1 px-2 text-sm rounded-md hover:bg-slate-100"
            aria-pressed={showConfirm}
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirm ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-700 text-sm">{success}</div>}
        <button
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-brand-600 text-white font-semibold disabled:opacity-60"
        >
          {loading ? 'Signing up…' : 'Sign up'}
        </button>
      </form>

      <p className="text-xs text-slate-500 mt-3">
        Only <b>@gmail.com</b> emails are accepted on this form.
      </p>

      <p className="text-sm text-slate-600 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-700 font-semibold underline">
          Login
        </Link>
      </p>
    </main>
  )
}
