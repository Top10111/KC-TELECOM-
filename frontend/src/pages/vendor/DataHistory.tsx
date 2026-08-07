import { useEffect, useState } from 'react';
import { dataApi } from '../../lib/api';
import { Spinner } from '../../components/ui';
import type { DataSubscription } from '../../types';

export default function DataHistory() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DataSubscription[]>([]);

  useEffect(() => {
    setLoading(true);
    dataApi
      .history()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Data purchases</h1>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-lg border bg-white p-3">
            <div className="flex justify-between">
              <div>
                <div className="text-sm font-medium">{it.network} — {it.plan}</div>
                <div className="text-xs text-slate-500">{it.phone}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">₦{it.amount}</div>
                <div className="text-xs text-slate-500">{it.status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
