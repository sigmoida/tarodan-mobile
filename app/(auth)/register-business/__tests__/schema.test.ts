/**
 * `registerBusinessSchema` — API `BusinessRegisterDto` ile birebir sekiz alan
 * sözleşmesi. Canlıda doğrulandı (task-3-report.md): eksik payload `400` ile
 * tam olarak bu beş zorunlu alanı şikayet ediyor: authorizedFullName,
 * companyLegalName, companyTitle, companyAddress (min 10), companyEmail.
 * `password` DTO'da hiç yok — bu adım hesap açmaz, ön başvurudur.
 */
import { registerBusinessSchema } from '../_lib/schema';

const validPayload = {
  authorizedFullName: 'Ayşe Test Yılmaz',
  companyLegalName: 'Test Otomotiv Sanayi ve Ticaret Limited Şirketi',
  companyTitle: 'Test Otomotiv Ltd. Şti.',
  companyAddress: 'Örnek Mahallesi Test Caddesi No:12 Kadıköy İstanbul',
  companyEmail: 'basvuru@testotomotiv.com',
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

describe('registerBusinessSchema — opsiyonel alanlar (kepAddress / contactPhone)', () => {
  it('kepAddress ve contactPhone hiç gönderilmeden form geçerli olur (API canlı: 201)', () => {
    const { ...rest } = validPayload;
    const result = registerBusinessSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kepAddress).toBeUndefined();
      expect(result.data.contactPhone).toBeUndefined();
    }
  });

  it('geçerli kepAddress kabul edilir, geçersiz e-posta reddedilir', () => {
    expect(
      registerBusinessSchema.safeParse({ ...validPayload, kepAddress: 'firma@hs01.kep.tr' }).success,
    ).toBe(true);
    expect(registerBusinessSchema.safeParse({ ...validPayload, kepAddress: 'gecersiz' }).success).toBe(false);
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
        ['acceptTerms', 'authorizedFullName', 'companyAddress', 'companyEmail', 'companyLegalName', 'companyTitle', 'phone'].sort(),
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
