import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorPinsApi, ApiError } from '../../lib/api';
import { formatNaira, formatNetwork } from '../../lib/format';
import { Banner, Button, Card, EmptyState, Input, Spinner } from '../../components/ui';
import type { VendorStockItem } from '../../types';

export default function BuyPins() {
  const navigate = useNavigate();
  const [stock, setStock] = useState<VendorStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<VendorStockItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const loadStock = () => {
    setIsLoading(true);
    vendorPinsApi
      .listStock()
      .then(setStock)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load available PIN books'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadStock();
  }, []);

  const openPurchase = (item: VendorStockItem) => {
    setSelected(item);
    setQuantity('1');
    setPurchaseError(null);
  };

  const confirmPurchase = async () => {
    if (!selected) return;
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setPurchaseError('Enter a valid quantity');
      return;
    }
    if (qty > selected.availableQuantity) {
      setPurchaseError(`Only ${selected.availableQuantity} pin(s) left in this batch`);
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      const result = await vendorPinsApi.purchase(selected.id, qty);
      // Take vendor straight to the delivered PIN codes for this purchase.
      navigate(`/vendor/purchases/${result.purchase.id}`);
    } catch (err) {
      setPurchaseError(err instanceof ApiError ? err.message : 'Purchase failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Buy Recharge PIN Books</h1>
      {error && <Banner kind="error" message={error} />}

      {stock.length === 0 ? (
        <Card>
          <EmptyState message="No PIN books are currently available for purchase." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stock.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{formatNetwork(item.network)}</span>
                <span className="text-xs text-slate-400">{item.batchLabel}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNaira(item.denomination)}</p>
              <p className="mt-1 text-sm text-slate-500">Price: {formatNaira(item.sellingPrice)} / pin</p>
              <p className="mt-1 text-xs text-slate-400">{item.availableQuantity} available</p>
              <Button className="mt-4" onClick={() => openPurchase(item)}>
                Buy
              </Button>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Buy {formatNetwork(selected.network)} {formatNaira(selected.denomination)} PINs
            </h2>
            <p className="mt-1 text-xs text-slate-500">{selected.availableQuantity} available in this batch</p>

            <div className="mt-4 space-y-3">
              {purchaseError && <Banner kind="error" message={purchaseError} />}
              <Input
                label="Quantity"
                type="number"
                min={1}
                max={selected.availableQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <p className="text-sm text-slate-600">
                Total: {formatNaira(Number(selected.sellingPrice) * (parseInt(quantity, 10) || 0))}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelected(null)} disabled={isPurchasing}>
                Cancel
              </Button>
              <Button onClick={confirmPurchase} isLoading={isPurchasing}>
                Confirm purchase
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
