import { useEffect, useState, type FormEvent } from 'react';
import { walletApi, ApiError } from '../../lib/api';
import { formatNaira, formatDate } from '../../lib/format';
import { Banner, Button, Card, EmptyState, Input, Spinner, StatCard, Badge } from '../../components/ui';
import type { Wallet as WalletType, WalletTransaction } from '../../types';

const statusTone: Record<WalletTransaction['status'], 'green' | 'amber' | 'red'> = {
  SUCCESS: 'green',
  PENDING: 'amber',
  FAILED: 'red',
};

export default function Wallet() {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [w, tx] = await Promise.all([walletApi.getWallet(), walletApi.getTransactions()]);
      setWallet(w);
      setTransactions(tx);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load wallet');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onFund = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setFormError('Enter a valid amount greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const tx = await walletApi.fund(numericAmount, description || undefined);
      setSuccessMsg(
        `Funding request submitted (ref: ${tx.reference}). It is PENDING until an admin confirms it — your balance will update once confirmed.`,
      );
      setAmount('');
      setDescription('');
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to submit funding request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Wallet</h1>
      {error && <Banner kind="error" message={error} />}

      <StatCard label="Current balance" value={wallet ? formatNaira(wallet.balance) : '—'} />

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Fund wallet</h2>
        <p className="mt-1 text-xs text-slate-500">
          Funding requests are created as PENDING and must be confirmed by an admin before your balance updates.
        </p>
        <form onSubmit={onFund} className="mt-4 grid gap-4 sm:grid-cols-2">
          {formError && (
            <div className="sm:col-span-2">
              <Banner kind="error" message={formError} />
            </div>
          )}
          {successMsg && (
            <div className="sm:col-span-2">
              <Banner kind="success" message={successMsg} />
            </div>
          )}
          <Input
            label="Amount (₦)"
            type="number"
            min={1}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Bank transfer funding"
          />
          <div className="sm:col-span-2">
            <Button type="submit" isLoading={isSubmitting}>
              Submit funding request
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Recent transactions</h2>
        {transactions.length === 0 ? (
          <EmptyState message="No wallet transactions yet." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Balance after</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Reference</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 text-slate-600">{formatDate(tx.createdAt)}</td>
                    <td className="py-2 pr-4 text-slate-600">{tx.type}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{formatNaira(tx.amount)}</td>
                    <td className="py-2 pr-4 text-slate-600">{formatNaira(tx.balanceAfter)}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={statusTone[tx.status]}>{tx.status}</Badge>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-400">{tx.reference}</td>
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
