/**
 * `registerBusinessSchema` — API `BusinessRegisterDto` ile birebir sekiz alan
 * sözleşmesi. Canlıda doğrulandı (task-3-report.md): eksik payload `400` ile
 * tam olarak bu beş zorunlu alanı şikayet ediyor: authorizedFullName,
 * companyLegalName, companyTitle, companyAddress (min 10), companyEmail.
 * `password` DTO'da hiç yok — bu adım hesap açmaz, ön başvurudur.
 *
 * `kepAddress` B13'te ZORUNLU oldu — web'le eşleşir
 * (`apps/web/.../_lib/auth.ts:186`: "KEP kurumsal tebligat adresi:
 * başvurunun yasal iletişim kanalı, bu yüzden zorunlu"). Sunucu DTO'da hâlâ
 * `kepAddress?: string` (opsiyonel) — bu bir ÜRÜN kararı, sözleşme kısıtı
 * değil.
 */
import { buildRegisterBusinessSchema } from '../_lib/schema';
import { schemaT } from '@/test-utils';

// Şema artık `t`'yi argüman alan bir FABRİKA (gerekçe:
// `@/utils/validation` başı). Testler kuralları sınıyor, çeviriyi değil.
const registerBusinessSchema = buildRegisterBusinessSchema(schemaT);

const validPayload = {
  authorizedFullName: 'Ayşe Test Yılmaz',
  companyLegalName: 'Test Otomotiv Sanayi ve Ticaret Limited Şirketi',
  companyTitle: 'Test Otomotiv Ltd. Şti.',
  companyAddress: 'Örnek Mahallesi Test Caddesi No:12 Kadıköy İstanbul',
  companyEmail: 'basvuru@testotomotiv.com',
  kepAddress: 'basvuru@hs01.kep.tr',
  phone: '0532 123 45 67',
  acceptTerms: true as const,
};

describe('registerBusinessSchema — zorunlu alan sınırları', () => {
  it('authorizedFullName: 1 karakter reddedilir, 2 karakter (alt sınır) kabul edilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, authorizedFullName: 'A' }).success).toBe(false);
    expect(registerBusinessSchema.safeParse({ ...validPayload, authorizedFullName: 'Ay' }).success).toBe(true);
  });

  it('authorizedFullName: 120 karakter (üst sınır) kabul edilir, 121 reddedilir', () => {
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, authorizedFullName: 'a'.repeat(120) }).success,
    ).toBe(true);
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, authorizedFullName: 'a'.repeat(121) }).success,
    ).toBe(false);
  });

  it('companyLegalName: 1 karakter reddedilir, 2 karakter kabul edilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, companyLegalName: 'A' }).success).toBe(false);
    expect(registerBusinessSchema.safeParse({ ...validPayload, companyLegalName: 'AB' }).success).toBe(true);
  });

  it('companyLegalName: 240 karakter (üst sınır) kabul edilir, 241 reddedilir', () => {
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, companyLegalName: 'a'.repeat(240) }).success,
    ).toBe(true);
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, companyLegalName: 'a'.repeat(241) }).success,
    ).toBe(false);
  });

  it('companyTitle: 1 karakter reddedilir, 2 karakter kabul edilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, companyTitle: 'A' }).success).toBe(false);
    expect(registerBusinessSchema.safeParse({ ...validPayload, companyTitle: 'AB' }).success).toBe(true);
  });

  it('companyTitle: 200 karakter (üst sınır) kabul edilir, 201 reddedilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, companyTitle: 'a'.repeat(200) }).success).toBe(
      true,
    );
    expect(registerBusinessSchema.safeParse({ ...validPayload, companyTitle: 'a'.repeat(201) }).success).toBe(
      false,
    );
  });

  it('companyAddress: 9 karakter (10 sınırının altı) reddedilir, 10 karakter (alt sınır) kabul edilir', () => {
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, companyAddress: 'a'.repeat(9) }).success,
    ).toBe(false);
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, companyAddress: 'a'.repeat(10) }).success,
    ).toBe(true);
  });

  it('companyAddress: 500 karakter (üst sınır) kabul edilir, 501 reddedilir', () => {
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, companyAddress: 'a'.repeat(500) }).success,
    ).toBe(true);
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, companyAddress: 'a'.repeat(501) }).success,
    ).toBe(false);
  });

  it('companyEmail: geçersiz format reddedilir, geçerli e-posta kabul edilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, companyEmail: 'gecersiz' }).success).toBe(
      false,
    );
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, companyEmail: 'a@b.com' }).success,
    ).toBe(true);
  });

  it('acceptTerms: false reddedilir, true kabul edilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, acceptTerms: false }).success).toBe(false);
    expect(registerBusinessSchema.safeParse({ ...validPayload, acceptTerms: true }).success).toBe(true);
  });
});

describe('registerBusinessSchema — telefon normalizasyonu (^\\+90[0-9]{10}$)', () => {
  it('"0532 123 45 67" → "+905321234567" normalize edilir', () => {
    const result = registerBusinessSchema.safeParse({ ...validPayload, phone: '0532 123 45 67' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe('+905321234567');
  });

  it('baştaki sıfırsız "532 123 45 67" da normalize edilir', () => {
    const result = registerBusinessSchema.safeParse({ ...validPayload, phone: '532 123 45 67' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe('+905321234567');
  });

  it('zaten "+90" ile başlayan numara ham metin GÖNDERİLMEDEN aynı sonuca normalize edilir', () => {
    const result = registerBusinessSchema.safeParse({ ...validPayload, phone: '+90 532 123 45 67' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe('+905321234567');
  });

  it('regex\'i sağlamayan (eksik haneli) numara reddedilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, phone: '0532 123 45' }).success).toBe(false);
  });

  it('boş telefon reddedilir (zorunlu alan)', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, phone: '' }).success).toBe(false);
  });
});

/**
 * REGRESYON: eski `toE164TrPhone` (formatPhoneNumber + normalizePhoneForPayload)
 * tanımadığı öneki atıp ilk on haneyi alıyordu, yani `^\+90[0-9]{10}$`'a UYAN ama
 * ULAŞILAMAZ numara üretiyordu: `00905321234567` → `+900905321234`,
 * `+1 415 555 0100` → `+901415555010`, `05321234567890` → `+905321234567`.
 * Kullanıcı hata görmüyor, başvuru yanlış telefonla kaydediliyordu.
 */
describe('registerBusinessSchema — telefon sıkı ayrıştırma (KIRPMA YOK)', () => {
  const parsePhone = (phone: string) => registerBusinessSchema.safeParse({ ...validPayload, phone });

  it.each([
    ['0532 123 45 67', '+905321234567'],
    ['+90 532 123 45 67', '+905321234567'],
    ['532 123 45 67', '+905321234567'],
    ['(0532) 123-45-67', '+905321234567'],
    ['905321234567', '+905321234567'],
    ['+90 0532 123 45 67', '+905321234567'],
  ])('%s → %s', (input, expected) => {
    const result = parsePhone(input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe(expected);
  });

  it.each([
    ['00905321234567', 'uluslararası çevirme öneki — tahmin edilmez, reddedilir'],
    ['+1 415 555 0100', 'TR olmayan numara — eskiden +901415555010 üretiyordu'],
    ['05321234567890', 'fazla haneli — eskiden sessizce kırpılıyordu'],
    ['0432 123 45 67', 'sabit hat (5 ile başlamıyor)'],
    ['0000000000', 'sıfırlar'],
    ['   ', 'yalnız boşluk'],
    ['abcdefghij', 'rakamsız'],
  ])('%s REDDEDİLİR (%s)', (input) => {
    expect(parsePhone(input).success).toBe(false);
  });

  it('reddedilen numara için mesaj TÜRKÇE ve alan telefon', () => {
    const result = parsePhone('+1 415 555 0100');
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'phone');
      expect(issue?.message).toBe('Geçerli bir telefon numarası girin');
    }
  });

  it('contactPhone da aynı sıkı ayrıştırmadan geçer', () => {
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, contactPhone: '00905321234567' }).success,
    ).toBe(false);
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, contactPhone: '+1 415 555 0100' }).success,
    ).toBe(false);
  });
});

describe('registerBusinessSchema — e-posta küçük harfe çevrilir', () => {
  it('companyEmail trim + lowercase edilir (davet e-postası eşleşmesi)', () => {
    const result = registerBusinessSchema.safeParse({
      ...validPayload,
      companyEmail: '  Basvuru@TestOtomotiv.COM ',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.companyEmail).toBe('basvuru@testotomotiv.com');
  });

  /**
   * `kepAddress` companyEmail'in AKSİNE lowercase'e çevrilmez — web'in şekli
   * birebir budur (`trim().min(1, …).email(…)`, transform YOK). Davet
   * eşleşmesi companyEmail üzerinden yapılıyor, KEP eşleşme amaçlı değil.
   */
  it('kepAddress lowercase edilmez (web ile aynı şekil, transform yok)', () => {
    const result = registerBusinessSchema.safeParse({
      ...validPayload,
      kepAddress: 'Firma@HS01.KEP.TR',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kepAddress).toBe('Firma@HS01.KEP.TR');
  });
});

describe('registerBusinessSchema — kepAddress zorunlu (B13: web ile eşleşir)', () => {
  it('kepAddress hiç gönderilmezse reddedilir', () => {
    const { kepAddress: _omit, ...rest } = validPayload;
    expect(registerBusinessSchema.safeParse(rest).success).toBe(false);
  });

  it('boş kepAddress reddedilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, kepAddress: '' }).success).toBe(false);
  });

  it('geçersiz kepAddress formatı reddedilir, geçerlisi kabul edilir', () => {
    expect(registerBusinessSchema.safeParse({ ...validPayload, kepAddress: 'gecersiz' }).success).toBe(false);
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, kepAddress: 'firma@hs01.kep.tr' }).success,
    ).toBe(true);
  });
});

describe('registerBusinessSchema — contactPhone (opsiyonel)', () => {
  it('contactPhone hiç gönderilmeden form geçerli olur', () => {
    const { contactPhone: _omit, ...rest } = validPayload as typeof validPayload & { contactPhone?: string };
    const result = registerBusinessSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contactPhone).toBeUndefined();
  });

  it('geçerli contactPhone normalize edilip kabul edilir, geçersizi reddedilir', () => {
    const result = registerBusinessSchema.safeParse({ ...validPayload, contactPhone: '0533 765 43 21' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.contactPhone).toBe('+905337654321');

    expect(registerBusinessSchema.safeParse({ ...validPayload, contactPhone: '12345' }).success).toBe(false);
  });
});

describe('registerBusinessSchema — API DTO ile birebir eşleşme', () => {
  it('geçerli tam payload (sekiz alan) başarıyla ayrıştırılır', () => {
    const full = {
      ...validPayload,
      kepAddress: 'firma@hs01.kep.tr',
      contactPhone: '0533 765 43 21',
    };
    const result = registerBusinessSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it('şema, `password` alanını asla çıktıya taşımaz — gönderilse bile striplenir', () => {
    const result = registerBusinessSchema.safeParse({ ...validPayload, password: 'ShouldNeverSend1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('password');
      expect(Object.keys(result.data).sort()).toEqual(
        ['acceptTerms', 'authorizedFullName', 'companyAddress', 'companyEmail', 'companyLegalName', 'companyTitle', 'kepAddress', 'phone'].sort(),
      );
    }
  });

  it('eski (yanlış) alanlar (companyName/taxId/city) gönderilse de çıktıya taşınmaz', () => {
    const result = registerBusinessSchema.safeParse({
      ...validPayload,
      companyName: 'Eski Alan',
      taxId: '1234567890',
      city: 'İstanbul',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('companyName');
      expect(result.data).not.toHaveProperty('taxId');
      expect(result.data).not.toHaveProperty('city');
    }
  });
});
