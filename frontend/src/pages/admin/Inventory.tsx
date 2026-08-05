import { useEffect, useState } from 'react';
import { adminPinStockApi, ApiError } from '../../lib/api';
import { formatNaira, formatDate, formatNetwork } from '../../lib/format';
import { Banner, Card, EmptyState, Spinner, StatCard } from '../../components/ui';
import type { InventorySummary, PinBatch } from '../../types';

export default function Inventory() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [batches, setBatches] = useState<PinBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminPinStockApi.getInventory(), adminPinStockApi.listBatches()])
      .then(([inv, list]) => {
        setSummary(inv);
        setBatches(list);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load inventory'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">PIN Inventory</h1>
      {error && <Banner kind="error" message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Batches" value={summary ? String(summary.totalBatches) : '—'} />
        <StatCard label="Available PINs" value={summary ? String(summary.availableCount) : '—'} />
        <StatCard label="Sold PINs" value={summary ? String(summary.soldCount) : '—'} />
        <StatCard
          label="Potential profit remaining"
          value={summary ? formatNaira(summary.potentialProfitRemaining) : '—'}
        />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">All batches</h2>
        {batches.length === 0 ? (
          <EmptyState message="No PIN batches created yet." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">Network</th>
                  <th className="py-2 pr-4">Denomination</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-4">Selling price</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Available</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-900">{b.batchLabel}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNetwork(b.network)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNaira(b.denomination)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNaira(b.costPrice)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNaira(b.sellingPrice)}</td>
                    <td className="py-2 pr-4 text-slate-600">{b.totalQuantity}</td>
                    <td className="py-2 pr-4 text-slate-600">{b.availableQuantity}</td>
                    <td className="py-2 pr-4 text-slate-500">{formatDate(b.createdAt)}</td>
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
