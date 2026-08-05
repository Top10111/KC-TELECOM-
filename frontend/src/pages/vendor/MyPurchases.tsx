import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vendorPinsApi, ApiError } from '../../lib/api';
import { formatNaira, formatDate, formatNetwork } from '../../lib/format';
import { Banner, Card, EmptyState, Spinner } from '../../components/ui';
import type { PinPurchase } from '../../types';

export default function MyPurchases() {
  const [purchases, setPurchases] = useState<PinPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    vendorPinsApi
      .myPurchases()
      .then(setPurchases)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load purchases'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">My Purchased PINs</h1>
      {error && <Banner kind="error" message={error} />}

      <Card>
        {purchases.length === 0 ? (
          <EmptyState message="You haven't purchased any PINs yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Network</th>
                  <th className="py-2 pr-4">Denomination</th>
                  <th className="py-2 pr-4">Quantity</th>
                  <th className="py-2 pr-4">Total paid</th>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 text-slate-600">{formatDate(p.createdAt)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNetwork(p.network)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNaira(p.denomination)}</td>
                    <td className="py-2 pr-4 text-slate-600">{p.quantity}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{formatNaira(p.totalAmount)}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-400">{p.reference}</td>
                    <td className="py-2 pr-4">
                      <Link to={`/vendor/purchases/${p.id}`} className="font-medium text-brand-600 hover:underline">
                        View PINs
                      </Link>
                    </td>
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
