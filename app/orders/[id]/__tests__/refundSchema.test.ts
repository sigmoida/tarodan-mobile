/**
 * İade talebi şeması (Parite A-1.4) — sunucunun kanıt kuralıyla aynı karar.
 *
 * Sunucu `changed_mind` dışındaki her nedende kanıt fotoğrafı istiyor
 * (`refund-creation.service.ts` → `policy.requiresEvidence`); mobil hepsini
 * "isteğe bağlı" sunuyordu ve kusur nedenli talep `evidenceRequired` 400'ü ile
 * modalın arkasındaki snackbar'a düşüyordu. Açıklama kuralı web modalıyla aynı.
 *
 * Faz yok: modal yalnız kargo sonrası + iade penceresi içinde açılır (kapı
 * `detail.test.tsx` J78.4 / J79.4'te çivili); kargo öncesi ve pencere sonrası
 * fazların kuralları erişilemez olduğu için burada test edilmez.
 */
import i18n from '@/i18n/config';
import { refundRequirements, validateRefundRequest } from '../_lib/schema';

const t = i18n.getFixedT('tr');
const LONG = 'Kutunun bir köşesi ezik, model aracın aynası kırık geldi.';

describe('refundRequirements', () => {
  it('changed_mind kanıt ve açıklama istemez', () => {
    expect(refundRequirements('changed_mind')).toEqual({ evidenceRequired: false, descriptionRequired: false });
  });

  it.each(['damaged', 'wrong_item', 'defective', 'buyer_damaged', 'other', 'delivery_delayed'])(
    '%s: kanıt ve açıklama zorunlu',
    (reason) => {
      expect(refundRequirements(reason)).toEqual({ evidenceRequired: true, descriptionRequired: true });
    },
  );
});

describe('validateRefundRequest', () => {
  it('changed_mind: açıklama ve fotoğraf olmadan geçerli', () => {
    expect(validateRefundRequest({ reason: 'changed_mind', description: '', evidenceCount: 0 }, t)).toEqual({});
  });

  it('kusur nedeni: fotoğrafsız ve kısa açıklamayla iki hata', () => {
    const errors = validateRefundRequest({ reason: 'damaged', description: 'kırık', evidenceCount: 0 }, t);
    expect(errors.evidence).toBe('Bu sebep için en az bir kanıt fotoğrafı gereklidir');
    expect(errors.description).toBe('Açıklama en az 20 karakter olmalıdır');
  });

  it('kusur nedeni: fotoğraf + yeterli açıklamayla geçerli', () => {
    expect(validateRefundRequest({ reason: 'damaged', description: LONG, evidenceCount: 1 }, t)).toEqual({});
  });

  it('açıklama boşlukla doldurulamaz (trim)', () => {
    const errors = validateRefundRequest({ reason: 'wrong_item', description: ' '.repeat(30), evidenceCount: 2 }, t);
    expect(errors.description).toBeDefined();
    expect(errors.evidence).toBeUndefined();
  });
});
