/**
 * İptal nedeni sözleşmesi.
 *
 * Değerler staging'de ÖLÇÜLDÜ (2026-08-26) — `POST /orders/guest/cancel` bir
 * geçersiz kodda tam enum listesini geri veriyor:
 *
 *   reasonCode must be one of the following values: delivery_delayed,
 *   wrong_product_selected, changed_mind, wrong_card, price_changed_mind,
 *   unavailable_at_address, other
 *
 * Bu test o listeyi çiviler: sunucu enum'u değişirse ve biri buradaki diziyi
 * elle güncellerse, ekranlar sessizce sunucunun tanımadığı bir kod göndermeye
 * başlamasın.
 */
import {
  ORDER_CANCELLATION_REASONS,
  BUYER_SELECTABLE_CANCELLATION_REASONS,
  DEFAULT_CANCELLATION_REASON,
  reasonLabelKey,
  cancellationReasonRequired,
} from '../orderCancellation';
import { messages } from '@/i18n/lib';

const MEASURED_ENUM = [
  'delivery_delayed',
  'wrong_product_selected',
  'changed_mind',
  'wrong_card',
  'price_changed_mind',
  'unavailable_at_address',
  'other',
];

describe('ORDER_CANCELLATION_REASONS', () => {
  it('staging’de ölçülen enum listesinin AYNISI', () => {
    expect([...ORDER_CANCELLATION_REASONS]).toEqual(MEASURED_ENUM);
  });
});

describe('BUYER_SELECTABLE_CANCELLATION_REASONS', () => {
  it("`other`'ı alıcıya SUNMAZ (manuel incelemeye düşürüyor, anında iptali bozar)", () => {
    expect(BUYER_SELECTABLE_CANCELLATION_REASONS).not.toContain('other');
  });

  it('geri kalan her enum değerini sunar — sessizce eksilen seçenek olmaz', () => {
    expect([...BUYER_SELECTABLE_CANCELLATION_REASONS]).toEqual(
      MEASURED_ENUM.filter((r) => r !== 'other'),
    );
  });

  it('varsayılan neden seçilebilir listenin İÇİNDE', () => {
    // Aksi halde form açılışta sunucunun reddedeceği bir kodla gelir.
    expect(BUYER_SELECTABLE_CANCELLATION_REASONS).toContain(DEFAULT_CANCELLATION_REASON);
  });
});

describe('reasonLabelKey', () => {
  it('her enum değeri için katalogda GERÇEK bir karşılık var (iki dilde)', () => {
    for (const reason of ORDER_CANCELLATION_REASONS) {
      const key = reasonLabelKey(reason);
      expect(key).toBe(`status.orderCancellationReason.${reason}`);
      for (const locale of ['tr', 'en'] as const) {
        const label = (messages[locale] as any).status.orderCancellationReason[reason];
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it('tanımadığı kodda null döner — çağıran ham kodu basar, satır boş kalmaz', () => {
    expect(reasonLabelKey('uydurma_kod')).toBeNull();
    expect(reasonLabelKey(null)).toBeNull();
    expect(reasonLabelKey(undefined)).toBeNull();
  });
});

describe('cancellationReasonRequired', () => {
  // Sunucu kuralı: `OrderLifecycleService.cancel` yalnız bu iki durumda
  // `server.order.cancelReasonRequired` atıyor.
  it.each(['paid', 'preparing'])('%s durumunda neden ZORUNLU', (status) => {
    expect(cancellationReasonRequired(status)).toBe(true);
  });

  it.each(['pending_payment', 'pending', 'shipped', undefined, null])(
    '%s durumunda zorunlu değil',
    (status) => {
      expect(cancellationReasonRequired(status as any)).toBe(false);
    },
  );
});
