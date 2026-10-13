/**
 * A-3 inceleme #9 · Mobilde hiç çizilmeyen anahtarlar geri gelmesin: ölü
 * katalog anahtarı web metniyle sessizce ayrışır, ölü query key yanlış
 * anahtarın invalidate edilmesine yol açar.
 */
import tr from '@/i18n/lib/catalog/tr.json';
import en from '@/i18n/lib/catalog/en.json';
import { qk } from '@/lib/query';

const REMOVED = [
  'invoiceSentToEmailWithNumber',
  'refundPhaseCoolingOff',
  'refundPhasePastCoolingOff',
  'refundShippedInfo',
] as const;

it.each([
  ['tr', tr],
  ['en', en],
])('%s kataloğunda kullanılmayan order anahtarları yok', (_lang, catalog) => {
  const order = (catalog as { order: Record<string, unknown> }).order;
  for (const key of REMOVED) expect(order).not.toHaveProperty(key);
  // e-Arşiv listesinin hata satırı anahtarı var
  expect(order).toHaveProperty('invoiceListLoadFailed');
});

it('tekil e-Arşiv query key kaldırıldı; tek anahtar liste', () => {
  expect(qk.orders).not.toHaveProperty('elogoInvoice');
  expect(qk.orders.elogoInvoices('o1')).toEqual(['elogo-invoices', 'o1']);
});
