import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminPinStockApi, ApiError } from '../../lib/api';
import { Banner, Button, Card, Input, Select } from '../../components/ui';
import type { Network } from '../../types';

// Mirrors backend src/admin/pin-stock/dto/create-batch.dto.ts and the
// service check: sellingPrice must be strictly greater than costPrice.
const NETWORKS: Network[] = ['MTN', 'GLO', 'AIRTEL', 'NINE_MOBILE'];

export default function CreateBatch() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    batchLabel: '',
    network: 'MTN' as Network,
    denomination: '',
    costPrice: '',
    sellingPrice: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const denomination = Number(form.denomination);
    const costPrice = Number(form.costPrice);
    const sellingPrice = Number(form.sellingPrice);

    if (!form.batchLabel.trim()) {
      setError('Batch label is required');
      return;
    }
    if (!denomination || denomination <= 0) {
      setError('Denomination must be a positive number');
      return;
    }
    if (!costPrice || costPrice <= 0 || !sellingPrice || sellingPrice <= 0) {
      setError('Cost price and selling price must be positive numbers');
      return;
    }
    if (sellingPrice <= costPrice) {
      setError('Selling price must be greater than cost price to yield a profit');
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = await adminPinStockApi.createBatch({
        batchLabel: form.batchLabel.trim(),
        network: form.network,
        denomination,
        costPrice,
        sellingPrice,
      });
      // Batches start empty — go straight to uploading PINs into it.
      navigate(`/admin/upload-pins?batchId=${batch.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Create PIN Batch / Book</h1>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Banner kind="error" message={error} />}
          <Input
            label="Batch label"
            required
            placeholder="e.g. MTN-500-JUL-2026"
            value={form.batchLabel}
            onChange={(e) => setForm((f) => ({ ...f, batchLabel: e.target.value }))}
          />
          <Select
            label="Network"
            value={form.network}
            onChange={(e) => setForm((f) => ({ ...f, network: e.target.value as Network }))}
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {n === 'NINE_MOBILE' ? '9mobile' : n}
              </option>
            ))}
          </Select>
          <Input
            label="Denomination (₦)"
            type="number"
            min={1}
            step="0.01"
            required
            value={form.denomination}
            onChange={(e) => setForm((f) => ({ ...f, denomination: e.target.value }))}
          />
          <Input
            label="Cost price per PIN (₦)"
            type="number"
            min={1}
            step="0.01"
            required
            value={form.costPrice}
            onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
          />
          <Input
            label="Selling price per PIN (₦)"
            type="number"
            min={1}
            step="0.01"
            required
            value={form.sellingPrice}
            onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Create batch
          </Button>
        </form>
      </Card>
    </div>
  );
}
