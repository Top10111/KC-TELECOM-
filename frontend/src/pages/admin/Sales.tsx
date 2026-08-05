import { useEffect, useState } from 'react';
import { reportsApi, ApiError } from '../../lib/api';
import { formatNaira, formatDate, formatNetwork } from '../../lib/format';
import { Banner, Card, EmptyState, Spinner } from '../../components/ui';
import type { SalesLedgerEntry } from '../../types';

export default function Sales() {
  const [sales, setSales] = useState<SalesLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportsApi
      .salesLedger()
      .then(setSales)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load sales'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Sales</h1>
      <p className="text-sm text-slate-500">Most recent 100 completed PIN sales.</p>
      {error && <Banner kind="error" message={error} />}

      <Card>
        {sales.length === 0 ? (
          <EmptyState message="No sales recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Vendor</th>
                  <th className="py-2 pr-4">Batch</th>
                  <th className="py-2 pr-4">Network</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Profit</th>
                  <th className="py-2 pr-4">Reference</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 text-slate-600">{formatDate(s.createdAt)}</td>
                    <td className="py-2 pr-4 text-slate-700">
                      {s.vendor.businessName || s.vendor.fullName}
                      <div className="text-xs text-slate-400">{s.vendor.email}</div>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{s.batch.batchLabel}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNetwork(s.network)}</td>
                    <td className="py-2 pr-4 text-slate-600">{s.quantity}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{formatNaira(s.totalAmount)}</td>
                    <td className="py-2 pr-4 text-green-700">{formatNaira(s.totalProfit)}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-400">{s.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
