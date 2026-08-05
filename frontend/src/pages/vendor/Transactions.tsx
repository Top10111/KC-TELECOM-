import { useEffect, useState } from 'react';
import { walletApi, ApiError } from '../../lib/api';
import { formatNaira, formatDate } from '../../lib/format';
import { Badge, Banner, Card, EmptyState, Spinner } from '../../components/ui';
import type { WalletTransaction } from '../../types';

const statusTone: Record<WalletTransaction['status'], 'green' | 'amber' | 'red'> = {
  SUCCESS: 'green',
  PENDING: 'amber',
  FAILED: 'red',
};

const typeTone: Record<WalletTransaction['type'], 'green' | 'amber' | 'slate'> = {
  FUNDING: 'green',
  DEBIT: 'slate',
  REFUND: 'amber',
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    walletApi
      .getTransactions()
      .then(setTransactions)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load transactions'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Transaction History</h1>
      {error && <Banner kind="error" message={error} />}

      <Card>
        {transactions.length === 0 ? (
          <EmptyState message="No transactions yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Balance before</th>
                  <th className="py-2 pr-4">Balance after</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 text-slate-600">{formatDate(tx.createdAt)}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={typeTone[tx.type]}>{tx.type}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{tx.description ?? '—'}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{formatNaira(tx.amount)}</td>
                    <td className="py-2 pr-4 text-slate-500">{formatNaira(tx.balanceBefore)}</td>
                    <td className="py-2 pr-4 text-slate-500">{formatNaira(tx.balanceAfter)}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={statusTone[tx.status]}>{tx.status}</Badge>
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
