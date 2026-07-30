/**
 * PayTR direct-form saf katmanı. Kart verisi yalnız PayTR'ye gider; bu modül
 * sunucudan gelen imzalı alanları doğrular ve auto-submit HTML üretir.
 */
import {
  PAYTR_ACTION,
  assertSafePaytrForm,
  cardFieldsForNewCard,
  cardFieldsForSavedCard,
  buildPaytrFormHtml,
  type DirectFormResponse,
} from '../paytrDirectForm';

const ok = (over: Partial<DirectFormResponse> = {}): DirectFormResponse => ({
  paymentId: 'pay-1',
  action: PAYTR_ACTION,
  method: 'POST',
  fields: [
    { name: 'merchant_id', value: '12345' },
    { name: 'payment_amount', value: '462.81' },
    { name: 'non_3d', value: '0' },
  ],
  ...over,
});

describe('assertSafePaytrForm', () => {
  it('geçerli yanıtta hata fırlatmaz', () => {
    expect(() => assertSafePaytrForm(ok())).not.toThrow();
  });

  it('action farklı host ise reddeder', () => {
    expect(() => assertSafePaytrForm(ok({ action: 'https://evil.example/odeme' })))
      .toThrow(expect.objectContaining({ code: 'PAYTR_BAD_ACTION' }));
  });

  it('action http ise reddeder', () => {
    expect(() => assertSafePaytrForm(ok({ action: 'http://www.paytr.com/odeme' })))
      .toThrow(expect.objectContaining({ code: 'PAYTR_BAD_ACTION' }));
  });

  it('action path farklı ise reddeder', () => {
    expect(() => assertSafePaytrForm(ok({ action: 'https://www.paytr.com/baska' })))
      .toThrow(expect.objectContaining({ code: 'PAYTR_BAD_ACTION' }));
  });

  it('sondaki eğik çizgiyi tolere eder', () => {
    expect(() => assertSafePaytrForm(ok({ action: PAYTR_ACTION + '/' }))).not.toThrow();
  });

  it('sunucudan ham kart alanı gelirse reddeder', () => {
    const withCard = ok({
      fields: [...ok().fields, { name: 'card_number', value: '4111111111111111' }],
    });
    expect(() => assertSafePaytrForm(withCard))
      .toThrow(expect.objectContaining({ code: 'PAYTR_RAW_CARD_FIELD' }));
  });

  it('ham kart alanı kontrolü büyük/küçük harf duyarsızdır', () => {
    const withCard = ok({ fields: [{ name: 'CVV', value: '123' }] });
    expect(() => assertSafePaytrForm(withCard))
      .toThrow(expect.objectContaining({ code: 'PAYTR_RAW_CARD_FIELD' }));
  });

  it('fields boşsa reddeder', () => {
    expect(() => assertSafePaytrForm(ok({ fields: [] })))
      .toThrow(expect.objectContaining({ code: 'PAYTR_NO_FIELDS' }));
  });
});

describe('cardFieldsForNewCard', () => {
  it('PayTR alan adlarıyla kart alanlarını üretir', () => {
    const fields = cardFieldsForNewCard({
      holder: ' Ahmet Yılmaz ',
      number: '4111 1111 1111 1111',
      expMonth: '07',
      expYear: '2028',
      cvc: '123',
    });
    expect(fields).toEqual([
      { name: 'cc_owner', value: 'Ahmet Yılmaz' },
      { name: 'card_number', value: '4111111111111111' },
      { name: 'expiry_month', value: '07' },
      { name: 'expiry_year', value: '28' },
      { name: 'cvv', value: '123' },
    ]);
  });

  it('iki haneli yılı olduğu gibi bırakır', () => {
    const fields = cardFieldsForNewCard({
      holder: 'A B', number: '4111111111111111', expMonth: '1', expYear: '28', cvc: '123',
    });
    expect(fields).toContainEqual({ name: 'expiry_month', value: '01' });
    expect(fields).toContainEqual({ name: 'expiry_year', value: '28' });
  });
});

describe('cardFieldsForSavedCard', () => {
  it('cvv verildiyse tek alan üretir', () => {
    expect(cardFieldsForSavedCard('123')).toEqual([{ name: 'cvv', value: '123' }]);
  });

  it('cvv gerekmiyorsa boş dizi döner', () => {
    expect(cardFieldsForSavedCard()).toEqual([]);
    expect(cardFieldsForSavedCard('')).toEqual([]);
  });
});

describe('buildPaytrFormHtml', () => {
  const html = buildPaytrFormHtml(PAYTR_ACTION, [
    { name: 'merchant_id', value: '12345' },
    { name: 'user_name', value: 'Ali "Veli" <b>' },
  ]);

  it('action ve POST metoduyla form üretir', () => {
    expect(html).toContain(`action="${PAYTR_ACTION}"`);
    expect(html).toContain('method="POST"');
  });

  it('her alan için hidden input üretir', () => {
    expect(html).toContain('name="merchant_id"');
    expect(html).toContain('value="12345"');
  });

  it('alan değerlerini HTML-escape eder', () => {
    expect(html).toContain('value="Ali &quot;Veli&quot; &lt;b&gt;"');
    expect(html).not.toContain('<b>');
  });

  it('formu otomatik gönderir', () => {
    expect(html).toMatch(/\.submit\(\)/);
  });
});
