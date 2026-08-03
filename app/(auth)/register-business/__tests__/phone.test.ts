/**
 * Kurumsal kayıt formunun telefon matrisi — route-local `_lib/phone.ts` emekli
 * edildi, ayrıştırıcı artık paylaşılan `@/utils/phone`'da (TEK KAYNAK, §5).
 * Bu suite yerinde kalıyor: formun sözleşmesi bu matris ve paylaşılan util
 * değişince burada da kırmızı görülsün.
 *
 * REGRESYON: eski paylaşılan `formatPhoneNumber` on haneden fazlasını KIRPIYORDU;
 * kırpma "format olarak geçerli ama ulaşılamaz" numara üretiyordu.
 */
import { formatTrPhoneField, parseE164TrPhone } from '@/utils/phone';

describe('parseE164TrPhone — kırpma yok', () => {
  it.each([
    ['0532 123 45 67', '+905321234567'],
    ['+90 532 123 45 67', '+905321234567'],
    ['532 123 45 67', '+905321234567'],
    ['(0532) 123-45-67', '+905321234567'],
    ['905321234567', '+905321234567'],
    ['+90 0532 123 45 67', '+905321234567'],
  ])('%s → %s', (input, expected) => {
    expect(parseE164TrPhone(input)).toBe(expected);
  });

  it.each([
    ['00905321234567'],
    ['05321234567890'],
    ['+1 415 555 0100'],
    ['0432 123 45 67'],
    ['0000000000'],
    ['   '],
    [''],
  ])('%s → null', (input) => {
    expect(parseE164TrPhone(input)).toBeNull();
  });
});

describe('formatTrPhoneField — gördüğün gönderilendir', () => {
  it('on haneye sığan girdiyi gruplar ve baştaki 0/90 önekini soyar', () => {
    expect(formatTrPhoneField('05321234567')).toBe('532 123 45 67');
    expect(formatTrPhoneField('+90 532 123 45 67')).toBe('532 123 45 67');
    expect(formatTrPhoneField('5321')).toBe('532 1');
  });

  it('fazla haneli girdiyi KIRPMAZ — ham metni bırakır ki şema reddedebilsin', () => {
    expect(formatTrPhoneField('05321234567890')).toBe('05321234567890');
    expect(formatTrPhoneField('+1 415 555 0100')).toBe('+1 415 555 0100');
    expect(parseE164TrPhone(formatTrPhoneField('05321234567890'))).toBeNull();
  });
});
