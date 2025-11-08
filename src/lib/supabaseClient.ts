// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

/** Read env (typed) */
const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Runtime guard (nice error if .env is missing)
if (!url || !anon) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your env.\n' +
    'Example:\nVITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=xxxxx'
  )
}

/** Single browser client with persistent auth + auto refresh */
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Guard for SSR / non-window contexts
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

/** Small helper if you ever need to wait for session hydration */
export async function waitForSession(ms = 1500): Promise<string | null> {
  // try immediately
  let { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.email) return session.user.email

  // wait a bit (3 ticks)
  for (let i = 0; i < 3; i++) {
    await new Promise(r => setTimeout(r, ms / 3))
    const { data: { session: s2 } } = await supabase.auth.getSession()
    if (s2?.user?.email) return s2.user.email
  }
  return null
}
