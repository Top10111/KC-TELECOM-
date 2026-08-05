import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { vendorPinsApi, ApiError } from '../../lib/api';
import { Banner, Button, Card, EmptyState, Spinner } from '../../components/ui';
import type { PurchasedPin } from '../../types';

function downloadCsv(pins: PurchasedPin[], purchaseId: string) {
  const header = 'Serial Number,PIN Code,Denomination\n';
  const rows = pins.map((p) => `${p.serialNumber},${p.pinCode},${p.denomination}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kc-telecom-pins-${purchaseId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function PurchasedPins() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const [pins, setPins] = useState<PurchasedPin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!purchaseId) return;
    vendorPinsApi
      .myPurchasedPins(purchaseId)
      .then(setPins)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load PIN codes'))
      .finally(() => setIsLoading(false));
  }, [purchaseId]);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Link to="/vendor/purchases" className="text-sm text-brand-600 hover:underline">
            ← Back to my purchases
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">PIN Codes</h1>
        </div>
        {pins.length > 0 && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="secondary" onClick={() => downloadCsv(pins, purchaseId ?? 'purchase')}>
              Download CSV
            </Button>
          </div>
        )}
      </div>

      {error && <Banner kind="error" message={error} />}

      <Card>
        {pins.length === 0 ? (
          <EmptyState message="No PIN codes found for this purchase." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Serial Number</th>
                  <th className="py-2 pr-4">PIN Code</th>
                  <th className="py-2 pr-4">Denomination</th>
                </tr>
              </thead>
              <tbody>
                {pins.map((pin, idx) => (
                  <tr key={pin.serialNumber} className="border-b border-slate-100 font-mono last:border-0">
                    <td className="py-2 pr-4 text-slate-400">{idx + 1}</td>
                    <td className="py-2 pr-4 text-slate-700">{pin.serialNumber}</td>
                    <td className="py-2 pr-4 font-semibold text-slate-900">{pin.pinCode}</td>
                    <td className="py-2 pr-4 text-slate-600">{pin.denomination}</td>
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
