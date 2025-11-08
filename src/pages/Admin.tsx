// src/pages/Admin.tsx
import { NavLink, Outlet } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">TUKLAS Admin</h1>
      <p className="text-slate-600 mt-1 text-sm">Restricted to AdminG5@gmail.com only.</p>

      <div className="mt-5 flex gap-2">
        <Tab to="/admin" end>Dashboard</Tab>
        <Tab to="/admin/users">Users</Tab>
        <Tab to="/admin/payment-proofs">Payment Proofs</Tab>
      </div>

      <div className="mt-6">
        <Outlet />
      </div>
    </main>
  )
}

function Tab({ to, children, end = false }: { to: string; children: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        'px-4 py-2 rounded-xl border ' +
        (isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-800 border-slate-200')
      }
    >
      {children}
    </NavLink>
  )
}
