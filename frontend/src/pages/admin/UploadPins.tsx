import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminPinStockApi, ApiError } from '../../lib/api';
import { formatNaira, formatNetwork } from '../../lib/format';
import { Banner, Button, Card, Select } from '../../components/ui';
import type { PinBatch } from '../../types';

// Mirrors backend src/admin/pin-stock/dto/upload-pins.dto.ts:
// { pins: [{ serialNumber: string, pinCode: string }] }
export default function UploadPins() {
  const [searchParams] = useSearchParams();
  const [batches, setBatches] = useState<PinBatch[]>([]);
  const [batchId, setBatchId] = useState(searchParams.get('batchId') ?? '');
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);

  useEffect(() => {
    adminPinStockApi
      .listBatches()
      .then((list) => {
        setBatches(list);
        if (!batchId && list.length > 0) setBatchId(list[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load batches'))
      .finally(() => setIsLoadingBatches(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsePins = () => {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const pins = lines.map((line) => {
      const [serialNumber, pinCode] = line.split(',').map((v) => v.trim());
      return { serialNumber, pinCode };
    });

    const invalid = pins.some((p) => !p.serialNumber || !p.pinCode);
    if (invalid) return null;
    return pins;
  };

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!batchId) {
      setError('Select a batch to upload PINs into');
      return;
    }

    const pins = parsePins();
    if (!pins || pins.length === 0) {
      setError('Enter at least one PIN as "serialNumber,pinCode" per line');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedBatch = await adminPinStockApi.uploadPins(batchId, { pins });
      setSuccess(
        `Uploaded ${pins.length} PIN(s). Batch "${updatedBatch.batchLabel}" now has ${updatedBatch.availableQuantity} available.`,
      );
      setRaw('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload PINs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Bulk Upload PIN Codes</h1>

      <Card>
        <div className="space-y-4">
          {error && <Banner kind="error" message={error} />}
          {success && <Banner kind="success" message={success} />}

          <Select
            label="Batch"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            disabled={isLoadingBatches}
          >
            {batches.length === 0 && <option value="">No batches yet — create one first</option>}
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchLabel} — {formatNetwork(b.network)} {formatNaira(b.denomination)} ({b.availableQuantity} in
                stock)
              </option>
            ))}
          </Select>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              PIN entries — one per line: <code className="text-xs text-slate-500">serialNumber,pinCode</code>
            </span>
            <textarea
              className="h-56 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder={'SN00123456,1234567890123456\nSN00123457,9876543210987654'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </label>

          <Button onClick={onSubmit} isLoading={isSubmitting} disabled={batches.length === 0}>
            Upload PINs
          </Button>
        </div>
      </Card>
    </div>
  );
}
