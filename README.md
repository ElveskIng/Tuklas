# TUKLAS Virtual Hub — React + Tailwind + Supabase
Login & Sign up with Supabase, pill/glass navbar, Programs, Events, Dashboard.

## Setup
```bash
npm i
cp .env.local.example .env.local
# fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
- Enable Email/Password in Supabase → Authentication → Providers.
- Add `http://localhost:5173` to Redirect URLs if needed.
