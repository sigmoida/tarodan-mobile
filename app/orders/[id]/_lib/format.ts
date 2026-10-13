export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Fiyat biçimi web ile aynı tek biçimleyici ("1.234,50 TL").
export { formatPrice } from '@/utils/format';
