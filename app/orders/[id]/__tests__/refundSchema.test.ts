/**
 * İade talebi şeması (Parite A-1.4) — sunucunun kanıt kuralıyla aynı karar.
 *
 * Sunucu `changed_mind` dışındaki her nedende kanıt fotoğrafı istiyor
 * (`refund-creation.service.ts` → `policy.requiresEvidence`); mobil hepsini
 * "isteğe bağlı" sunuyordu ve kusur nedenli talep `evidenceRequired` 400'ü ile
 * modalın arkasındaki snackbar'a düşüyordu. Açıklama kuralı web modalıyla aynı.
 */
import i18n from '@/i18n/config';
import { refundRequirements, validateRefundRequest, type RefundPhase } from '../_lib/schema';
import { refundPhaseOf } from '../_lib/derive';
import type { OrderDetail } from '../_lib/types';

const t = i18n.getFixedT('tr');
const LONG = 'Kutunun bir köşesi ezik, model aracın aynası kırık geldi.';

describe('refundRequirements', () => {
  it.each<RefundPhase>(['preparing', 'in_cooling_off', 'past_cooling_off'])(
    '%s: changed_mind kanıt istemez, kusur nedeni ister (faz fark etmez)',
    (phase) => {
      expect(refundRequirements('changed_mind', phase).evidenceRequired).toBe(false);
      for (const reason of ['damaged', 'wrong_item', 'defective', 'buyer_damaged', 'other', 'delivery_delayed']) {
        expect(refundRequirements(reason, phase).evidenceRequired).toBe(true);
      }
    },
  );

  it('açıklama: kanıt isteyen nedende ya da cayma süresi geçmişse zorunlu', () => {
    expect(refundRequirements('changed_mind', 'in_cooling_off').descriptionRequired).toBe(false);
    expect(refundRequirements('damaged', 'in_cooling_off').descriptionRequired).toBe(true);
    expect(refundRequirements('changed_mind', 'past_cooling_off').descriptionRequired).toBe(true);
  });

  it('neden yalnız dispute (cayma süresi geçmiş) talepte zorunlu etiketlenir', () => {
    expect(refundRequirements('changed_mind', 'in_cooling_off').reasonRequired).toBe(false);
    expect(refundRequirements('changed_mind', 'past_cooling_off').reasonRequired).toBe(true);
  });
});

describe('validateRefundRequest', () => {
  it('changed_mind: açıklama ve fotoğraf olmadan geçerli', () => {
    expect(
      validateRefundRequest({ reason: 'changed_mind', description: '', evidenceCount: 0 }, 'in_cooling_off', t),
    ).toEqual({});
  });

  it('kusur nedeni: fotoğrafsız ve kısa açıklamayla iki hata', () => {
    const errors = validateRefundRequest(
      { reason: 'damaged', description: 'kırık', evidenceCount: 0 },
      'in_cooling_off',
      t,
    );
    expect(errors.evidence).toBe('Bu sebep için en az bir kanıt fotoğrafı gereklidir');
    expect(errors.description).toBe('Açıklama en az 20 karakter olmalıdır');
  });

  it('kusur nedeni: fotoğraf + yeterli açıklamayla geçerli', () => {
    expect(
      validateRefundRequest({ reason: 'damaged', description: LONG, evidenceCount: 1 }, 'in_cooling_off', t),
    ).toEqual({});
  });

  it('açıklama boşlukla doldurulamaz (trim)', () => {
    const errors = validateRefundRequest(
      { reason: 'wrong_item', description: ' '.repeat(30), evidenceCount: 2 },
      'in_cooling_off',
      t,
    );
    expect(errors.description).toBeDefined();
    expect(errors.evidence).toBeUndefined();
  });
});

describe('refundPhaseOf', () => {
  const base = { id: 'o1', orderNumber: 'ORD-1' } as OrderDetail;

  it('hazırlanan ve kargosu yola çıkmamış sipariş → preparing', () => {
    expect(refundPhaseOf({ ...base, status: 'processing', shipment: null })).toBe('preparing');
    expect(refundPhaseOf({ ...base, status: 'processing', shipment: { status: 'pending' } })).toBe('preparing');
  });

  it('kargoya verilmiş / teslim edilmiş ve süre içinde → in_cooling_off', () => {
    expect(refundPhaseOf({ ...base, status: 'processing', shipment: { status: 'in_transit' } })).toBe(
      'in_cooling_off',
    );
    expect(
      refundPhaseOf({ ...base, status: 'delivered', deliveredAt: new Date().toISOString() }),
    ).toBe('in_cooling_off');
  });

  it('teslimden bu yana cayma süresi geçmiş → past_cooling_off', () => {
    const old = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    expect(refundPhaseOf({ ...base, status: 'delivered', deliveredAt: old })).toBe('past_cooling_off');
  });
});
