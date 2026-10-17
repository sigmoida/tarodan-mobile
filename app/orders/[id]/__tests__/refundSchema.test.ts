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
import {
  buildRefundBody,
  refundFormDefaults,
  refundRequestSchema,
  refundRequirements,
  type RefundFormValues,
} from '../_lib/schema';

const t = i18n.getFixedT('tr');
const LONG = 'Kutunun bir köşesi ezik, model aracın aynası kırık geldi.';
const PHOTO = { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' };

/** Şemayı çalıştırır; alan → ilk mesaj. Geçerliyse `{}`. */
function errorsOf(overrides: Partial<RefundFormValues>): Record<string, string> {
  const parsed = refundRequestSchema(t).safeParse({ ...refundFormDefaults(), ...overrides });
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

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

describe('refundRequestSchema', () => {
  it('varsayılan (changed_mind): açıklama ve fotoğraf olmadan geçerli', () => {
    expect(errorsOf({})).toEqual({});
  });

  it('neden boşsa reason hatası', () => {
    expect(errorsOf({ reason: '' }).reason).toBe(t('validation.required'));
  });

  it('kusur nedeni: fotoğrafsız ve kısa açıklamayla iki hata', () => {
    const errors = errorsOf({ reason: 'damaged', description: 'kırık' });
    expect(errors.evidence).toBe('Bu sebep için en az bir kanıt fotoğrafı gereklidir');
    expect(errors.description).toBe('Açıklama en az 20 karakter olmalıdır');
  });

  it('kusur nedeni: fotoğraf + yeterli açıklamayla geçerli', () => {
    expect(errorsOf({ reason: 'damaged', description: LONG, evidence: [PHOTO] })).toEqual({});
  });

  it('açıklama boşlukla doldurulamaz (trim)', () => {
    const errors = errorsOf({ reason: 'wrong_item', description: ' '.repeat(30), evidence: [PHOTO, PHOTO] });
    expect(errors.description).toBeDefined();
    expect(errors.evidence).toBeUndefined();
  });
});

describe('buildRefundBody', () => {
  it('yalnız neden: boş açıklama/kanıt ve tam adet gövdeye girmez', () => {
    expect(buildRefundBody(refundFormDefaults(), 1, [])).toEqual({ reason: 'changed_mind' });
    expect(buildRefundBody({ ...refundFormDefaults(), quantity: 3 }, 3, [])).toEqual({ reason: 'changed_mind' });
  });

  it('kısmi adet, kırpılmış açıklama ve kanıt URL\'leri', () => {
    expect(
      buildRefundBody({ reason: 'damaged', description: `  ${LONG}  `, evidence: [PHOTO], quantity: 2 }, 3, ['https://cdn/x.jpg']),
    ).toEqual({ reason: 'damaged', description: LONG, refundQuantity: 2, evidencePhotoUrls: ['https://cdn/x.jpg'] });
  });
});
