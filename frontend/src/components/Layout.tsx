import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const vendorNav = [
  { to: '/vendor', label: 'Overview', end: true },
  { to: '/vendor/wallet', label: 'Wallet' },
  { to: '/vendor/buy-pins', label: 'Buy PIN Books' },
  { to: '/vendor/buy-airtime', label: 'Buy Airtime' },
  { to: '/vendor/purchases', label: 'My Purchases' },
  { to: '/vendor/transactions', label: 'Transactions' },
];

const adminNav = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/create-batch', label: 'Create PIN Batch' },
  { to: '/admin/upload-pins', label: 'Upload PINs' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/vendors', label: 'Vendors' },
  { to: '/admin/sales', label: 'Sales' },
  { to: '/admin/reports', label: 'Revenue & Profit' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const nav = user?.role === 'ADMIN' ? adminNav : vendorNav;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <span className="text-lg font-bold text-brand-600">KC TELECOM</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="sm:hidden text-lg font-bold text-brand-600">KC TELECOM</div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.role === 'ADMIN' ? 'Administrator' : 'Vendor'}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
