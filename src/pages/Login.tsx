import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // NEW: visibility toggle
  const [showPw, setShowPw] = useState(false)

  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/dashboard'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    })
    setLoading(false)
    if (error) { setError('Invalid email or password.'); return }
    if (data?.user) navigate(next, { replace: true })
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h2 className="text-3xl font-extrabold">Login</h2>
      <p className="text-slate-600 mt-2">Welcome back!</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          className="w-full border p-3 rounded-lg"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        {/* Password with show/hide */}
        <div className="relative">
          <input
            className="w-full border p-3 rounded-lg pr-20"
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            autoComplete="current-password"
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

        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-brand-600 text-white font-semibold disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>
      <p className="text-sm text-slate-600 mt-4">
        No account? <Link to="/signup" className="text-brand-700 font-semibold underline">Sign up</Link>
      </p>
    </main>
  )
}
