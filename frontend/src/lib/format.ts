/** Backend Decimal fields arrive as strings (e.g. "1500.00") — always coerce before formatting. */
export function formatNaira(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatNetwork(network: string): string {
  return network === 'NINE_MOBILE' ? '9mobile' : network;
}
