/**
 * Adres telefonu — boş ile çözülemeyen aynı şey değil.
 *
 * İki katman farklı konuşuyordu: `validateInlineAddress` boş telefona
 * "… için telefon numarası gerekli" derken, `useCheckout`'un ödeme öncesi
 * telefon çözümlemesi aynı boş alana "Geçerli bir telefon numarası girin
 * (5XX XXX XX XX)" diyordu — alanı hiç doldurmamış kullanıcıya biçim hatası
 * göstermek yanlış yönlendiriyor. Mesaj üretimi tek yerden gelmeli.
 */
import { addressPhoneError } from '../_lib/validation';
import { PHONE_INVALID_MESSAGE } from '@/utils/phone';

describe('addressPhoneError', () => {
  it('asks for the number when the field is empty', () => {
    expect(addressPhoneError('', '+90', 'Fatura')).toBe(
      'Fatura adresi için telefon numarası gerekli',
    );
  });

  it('treats whitespace as empty', () => {
    expect(addressPhoneError('   ', '+90', 'Teslimat')).toBe(
      'Teslimat adresi için telefon numarası gerekli',
    );
  });

  it('explains the format when the number cannot be resolved', () => {
    expect(addressPhoneError('0532', '+90', 'Fatura')).toBe(
      `Fatura adresi — ${PHONE_INVALID_MESSAGE}`,
    );
  });

  it('returns null for a resolvable number', () => {
    expect(addressPhoneError('0532 123 45 67', '+90', 'Teslimat')).toBeNull();
  });
});
