import { useEffect, useState } from 'react';
import { reportsApi, ApiError } from '../../lib/api';
import { formatNaira, formatNetwork } from '../../lib/format';
import { Banner, Card, Spinner, StatCard } from '../../components/ui';
import type { ProfitSummary } from '../../types';

export default function Reports() {
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsApi
      .profitSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load report'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Revenue & Profit</h1>
      {error && <Banner kind="error" message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total PINs sold" value={summary ? String(summary.totalPinsSold) : '—'} />
        <StatCard label="Total revenue" value={summary ? formatNaira(summary.totalRevenue) : '—'} />
        <StatCard label="Total profit" value={summary ? formatNaira(summary.totalProfit) : '—'} />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Breakdown by network</h2>
        {summary && Object.keys(summary.byNetwork).length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Network</th>
                  <th className="py-2 pr-4">PINs sold</th>
                  <th className="py-2 pr-4">Revenue</th>
                  <th className="py-2 pr-4">Profit</th>
                  <th className="py-2 pr-4">Margin</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byNetwork).map(([network, stats]) => (
                  <tr key={network} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-900">{formatNetwork(network)}</td>
                    <td className="py-2 pr-4 text-slate-600">{stats.pinsSold}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNaira(stats.revenue)}</td>
                    <td className="py-2 pr-4 text-green-700">{formatNaira(stats.profit)}</td>
                    <td className="py-2 pr-4 text-slate-600">
                      {stats.revenue > 0 ? `${((stats.profit / stats.revenue) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No sales data yet.</p>
        )}
      </Card>
    </div>
  );
}
