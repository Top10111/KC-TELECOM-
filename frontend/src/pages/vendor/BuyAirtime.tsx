import { useEffect, useState, type FormEvent } from 'react';
import { airtimeApi, walletApi, ApiError } from '../../lib/api';
import { formatNaira, formatNetwork } from '../../lib/format';
import { Banner, Button, Card, Input, Spinner, StatCard } from '../../components/ui';
import type { AirtimePurchase, Network, Wallet } from '../../types';

const NETWORKS: { value: Network; label: string }[] = [
  { value: 'MTN', label: 'MTN' },
  { value: 'AIRTEL', label: 'Airtel' },
  { value: 'GLO', label: 'Glo' },
  { value: 'NINE_MOBILE', label: '9mobile' },
];

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function BuyAirtime() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const [network, setNetwork] = useState<Network>('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successPurchase, setSuccessPurchase] = useState<AirtimePurchase | null>(null);

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessPurchase(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 50) {
      setFormError('Minimum airtime amount is ₦50');
      return;
    }
    if (numAmount > 50000) {
      setFormError('Maximum airtime amount per transaction is ₦50,000');
      return;
    }
    if (!/^(0[7-9][0-1]\d{8}|[7-9][0-1]\d{8})$/.test(phone.trim())) {
      setFormError('Enter a valid Nigerian mobile number (e.g. 08012345678)');
      return;
    }
    if (wallet && numAmount > Number(wallet.balance)) {
      setFormError(
        `Insufficient wallet balance. Available: ${formatNaira(wallet.balance)}`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await airtimeApi.purchase({
        network,
        phone: phone.trim(),
        amount: numAmount,
      });
      setSuccessPurchase(result);
      setPhone('');
      setAmount('');
      loadWallet(); // refresh balance
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Airtime purchase failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Buy Airtime</h1>

      {walletLoading ? (
        <Spinner />
      ) : (
        <StatCard
          label="Wallet balance"
          value={wallet ? formatNaira(wallet.balance) : '—'}
        />
      )}

      {successPurchase && (
        <Banner
          kind="success"
          message={`✓ ${formatNaira(successPurchase.amount)} airtime sent to ${successPurchase.phone} (${formatNetwork(successPurchase.network)}). Ref: ${successPurchase.reference}`}
        />
      )}

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Airtime details</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {formError && <Banner kind="error" message={formError} />}

          {/* Network selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Network
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NETWORKS.map((n) => (
                <button
                  key={n.value}
                  type="button"
                  onClick={() => setNetwork(n.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    network === n.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Phone number */}
          <Input
            label="Phone number"
            type="tel"
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          {/* Amount */}
          <div>
            <Input
              label="Amount (₦)"
              type="number"
              min={50}
              max={50000}
              step="1"
              placeholder="e.g. 200"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {/* Quick-select buttons */}
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  ₦{a}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {amount && Number(amount) >= 50 && phone && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p>
                <span className="font-medium">Network:</span>{' '}
                {NETWORKS.find((n) => n.value === network)?.label}
              </p>
              <p>
                <span className="font-medium">Phone:</span> {phone}
              </p>
              <p>
                <span className="font-medium">Amount:</span> {formatNaira(amount)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Your wallet will be debited {formatNaira(amount)}.
              </p>
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
            Purchase airtime
          </Button>
        </form>
      </Card>
    </div>
  );
}
