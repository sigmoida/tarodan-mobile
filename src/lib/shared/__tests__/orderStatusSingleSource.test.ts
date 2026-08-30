/**
 * Sipariş durum haritası — TEK kaynak.
 *
 * Aynı `status → etiket + varyant` haritası ÜÇ ayrı dosyada birebir
 * kopyalanmıştı: sipariş listesi, sipariş detayı ve sipariş grubu. Üçü bugün
 * aynı ama bir tanesine yeni bir durum eklendiğinde diğer ikisi sessizce
 * eksik kalır — kullanıcı aynı siparişi listede "İade Sürecinde", detayda ham
 * `refund_requested` olarak görür (CLAUDE.md §5).
 *
 * i18n turunda üçünü birden çevirmek yerine tek kaynağa çekildi; çeviri de
 * orada bir kez yapılıyor.
 */
import * as fs from 'fs';
import * as path from 'path';

import { uiOrderStatusMeta } from '../orderStatus';

const ROOT = path.resolve(__dirname, '../../../..');

const ROUTE_STATUS_FILES = [
  'app/orders/_lib/ordersStatus.ts',
  'app/orders/[id]/_lib/status.ts',
  'app/orders/group/[id]/_lib/status.ts',
];

describe('uiOrderStatusMeta', () => {
  it('covers every status the routes render', () => {
    [
      'pending',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'awaiting_confirmation',
      'completed',
      'cancelled',
      'refunded',
      'refund_requested',
      'mixed',
    ].forEach((status) => {
      expect(uiOrderStatusMeta[status]).toBeDefined();
    });
  });

  it('carries a catalogue key rather than a fixed label', () => {
    Object.values(uiOrderStatusMeta).forEach((meta) => {
      expect(meta.labelKey).toMatch(/^order\./);
      expect(meta.variant).toBeTruthy();
    });
  });
});

describe('no route redefines the status map', () => {
  it.each(ROUTE_STATUS_FILES)('%s re-exports instead of copying', (file) => {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');

    // Kendi sözlüğünü kurmuş olsaydı burada literal etiketler olurdu.
    expect(source).not.toContain("label: 'Ödeme bekliyor'");
    expect(source).not.toContain("label: 'Teslim Edildi'");
  });
});
