export function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ''));
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
