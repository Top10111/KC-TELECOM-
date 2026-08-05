import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminPinStockApi, reportsApi, ApiError } from '../../lib/api';
import { formatNaira } from '../../lib/format';
import { Banner, Card, Spinner, StatCard } from '../../components/ui';
import type { InventorySummary, ProfitSummary } from '../../types';

export default function AdminDashboard() {
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [profit, setProfit] = useState<ProfitSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminPinStockApi.getInventory(), reportsApi.profitSummary()])
      .then(([inv, p]) => {
        setInventory(inv);
        setProfit(p);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load dashboard'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard Overview</h1>
      {error && <Banner kind="error" message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={profit ? formatNaira(profit.totalRevenue) : '—'} />
        <StatCard label="Total profit" value={profit ? formatNaira(profit.totalProfit) : '—'} />
        <StatCard label="PINs sold" value={profit ? String(profit.totalPinsSold) : '—'} />
        <StatCard label="PINs available" value={inventory ? String(inventory.availableCount) : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total batches" value={inventory ? String(inventory.totalBatches) : '—'} />
        <StatCard
          label="Potential profit remaining"
          value={inventory ? formatNaira(inventory.potentialProfitRemaining) : '—'}
          hint="If all remaining stock sells at current prices"
        />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link to="/admin/create-batch" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
            Create PIN batch
          </Link>
          <Link to="/admin/upload-pins" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
            Upload PINs
          </Link>
          <Link to="/admin/inventory" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
            View inventory
          </Link>
          <Link to="/admin/sales" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
            View sales
          </Link>
        </div>
      </Card>

      {profit && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Revenue by network</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Network</th>
                  <th className="py-2 pr-4">PINs sold</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2 pr-4">Profit</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(profit.byNetwork).map(([network, stats]) => (
                  <tr key={network} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-900">{network}</td>
                    <td className="py-2 pr-4 text-slate-600">{stats.pinsSold}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNaira(stats.revenue)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNaira(stats.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
