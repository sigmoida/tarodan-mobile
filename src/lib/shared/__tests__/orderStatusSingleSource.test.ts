/**
 * Sipariş durum haritası — TEK kaynak.
 *
 * Aynı `status → etiket + varyant` haritası ÜÇ ayrı dosyada birebir
 * kopyalanmıştı: sipariş listesi, sipariş detayı ve sipariş grubu. Üçü bugün
 * aynı ama bir tanesine yeni bir durum eklendiğinde diğer ikisi sessizce
 * eksik kalır — kullanıcı aynı siparişi listede "İade Sürecinde", detayda ham
 * `refund_requested` olarak görür (CLAUDE.md › Principles).
 *
 * i18n turunda üçünü birden çevirmek yerine tek kaynağa çekildi; çeviri de
 * orada bir kez yapılıyor.
 */
import * as fs from 'fs';
import * as path from 'path';

import { uiOrderStatusMeta } from '../orderStatus';
import { orderStatusConfig } from '../status-configs';

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
      expect(meta.labelKey).toMatch(/^(status\.order|order)\./);
      expect(meta.variant).toBeTruthy();
    });
  });

  it('web orderStatusConfig ile aynı renk + etiket anahtarı (arayüz adları web adlarına eşlenir)', () => {
    const uiToWeb: Record<string, string> = {
      pending: 'pending_payment',
      paid: 'paid',
      processing: 'preparing',
      shipped: 'shipped',
      delivered: 'delivered',
      awaiting_confirmation: 'awaiting_buyer_confirmation',
      completed: 'completed',
      cancelled: 'cancelled',
      refunded: 'refunded',
      refund_requested: 'refund_requested',
    };
    for (const [ui, web] of Object.entries(uiToWeb)) {
      expect(uiOrderStatusMeta[ui]).toEqual(orderStatusConfig[web]);
    }
    // Ham web adları da çözülür.
    for (const web of Object.keys(orderStatusConfig)) {
      expect(uiOrderStatusMeta[web]).toEqual(orderStatusConfig[web]);
    }
  });

  it('web varyant sözlüğüyle sınırlı: default | success | warning | danger | outline', () => {
    const allowed = ['default', 'success', 'warning', 'danger', 'outline'];
    Object.values(uiOrderStatusMeta).forEach((meta) => {
      expect(allowed).toContain(meta.variant);
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
