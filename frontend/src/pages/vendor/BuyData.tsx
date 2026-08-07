import { useEffect, useState, type FormEvent } from 'react';
import { dataApi, walletApi, ApiError } from '../../lib/api';
import { formatNaira } from '../../lib/format';
import { Banner, Button, Card, Input, Spinner, StatCard } from '../../components/ui';
import type { DataSubscription, Network, Wallet } from '../../types';

const NETWORKS: { value: Network; label: string }[] = [
  { value: 'MTN', label: 'MTN' },
  { value: 'AIRTEL', label: 'Airtel' },
  { value: 'GLO', label: 'Glo' },
  { value: 'NINE_MOBILE', label: '9mobile' },
];

const PLANS: Record<string, Array<{ key: string; label: string; amount: number }>> = {
  MTN: [
    { key: 'mtn-100', label: 'MTN 100MB', amount: 100 },
    { key: 'mtn-500', label: 'MTN 500MB', amount: 400 },
    { key: 'mtn-1gb', label: 'MTN 1GB', amount: 800 },
  ],
  AIRTEL: [
    { key: 'airtel-100', label: 'Airtel 100MB', amount: 100 },
    { key: 'airtel-500', label: 'Airtel 500MB', amount: 400 },
  ],
  GLO: [
    { key: 'glo-100', label: 'Glo 100MB', amount: 90 },
    { key: 'glo-500', label: 'Glo 500MB', amount: 350 },
  ],
  NINE_MOBILE: [
    { key: '9mobile-100', label: '9mobile 100MB', amount: 110 },
  ],
};

export default function BuyData() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const [network, setNetwork] = useState<Network>('MTN');
  const [plan, setPlan] = useState(PLANS['MTN'][0].key);
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successPurchase, setSuccessPurchase] = useState<DataSubscription | null>(null);

  const loadWallet = () => {
    setWalletLoading(true);
    walletApi
      .getWallet()
      .then(setWallet)
      .catch(() => {})
      .finally(() => setWalletLoading(false));
  };

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    setPlan(PLANS[network][0].key);
  }, [network]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessPurchase(null);

    const numAmount = PLANS[network].find((p) => p.key === plan)?.amount ?? 0;
    if (!numAmount || numAmount < 50) {
      setFormError('Invalid data plan amount');
      return;
    }
    if (!/^(0[7-9][0-1]\d{8}|[7-9][0-1]\d{8})$/.test(phone.trim())) {
      setFormError('Enter a valid Nigerian mobile number (e.g. 08012345678)');
      return;
    }
    if (wallet && numAmount > Number(wallet.balance)) {
      setFormError(`Insufficient wallet balance. Available: ${formatNaira(wallet.balance)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dataApi.purchase({ network, phone: phone.trim(), plan, amount: numAmount });
      setSuccessPurchase(result);
      setPhone('');
      loadWallet();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Data purchase failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Buy Data</h1>

      {walletLoading ? (
        <Spinner />
      ) : (
        <StatCard
          label="Wallet balance"
          value={wallet ? formatNaira(wallet.balance) : '—'}
        />
      )}

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          {formError && <Banner type="error">{formError}</Banner>}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm text-slate-600">Network</div>
              <select value={network} onChange={(e) => setNetwork(e.target.value as Network)} className="mt-1 block w-full">
                {NETWORKS.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm text-slate-600">Plan</div>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-1 block w-full">
                {PLANS[network].map((p) => (
                  <option key={p.key} value={p.key}>{p.label} — ₦{p.amount}</option>
                ))}
              </select>
            </label>
          </div>

          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Purchasing…' : 'Buy Data'}</Button>
          </div>
        </form>
      </Card>

      {successPurchase && (
        <Banner type="success">Data purchase {successPurchase.status} — reference: {successPurchase.reference}</Banner>
      )}
    </div>
  );
}
