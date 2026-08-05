import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi, walletApi } from '../../lib/api';
import { formatNaira } from '../../lib/format';
import { Banner, Card, Spinner, StatCard } from '../../components/ui';
import type { VendorSummary, Wallet } from '../../types';

export default function VendorDashboard() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([walletApi.getWallet(), reportsApi.vendorSummary()])
      .then(([w, s]) => {
        setWallet(w);
        setSummary(s);
      })
      .catch((err) => setError(err.message ?? 'Failed to load dashboard'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
      {error && <Banner kind="error" message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Wallet balance" value={wallet ? formatNaira(wallet.balance) : '—'} />
        <StatCard label="PINs purchased" value={summary ? String(summary.totalPinsBought) : '—'} />
        <StatCard label="Total spent" value={summary ? formatNaira(summary.totalSpent) : '—'} />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/vendor/wallet" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
            Fund wallet
          </Link>
          <Link to="/vendor/buy-pins" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
            Buy recharge PINs
          </Link>
          <Link to="/vendor/purchases" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
            View my PINs
          </Link>
        </div>
      </Card>
    </div>
  );
}
