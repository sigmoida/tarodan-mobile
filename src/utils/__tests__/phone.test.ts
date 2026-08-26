/**
 * `@/utils/phone` — TEK KAYNAK telefon matrisi.
 *
 * REGRESYON (ölçüldü): eski `formatPhoneNumber` on haneden fazlasını sessizce
 * KIRPIYOR, eski `normalizePhoneForPayload` da sonuca körü körüne `+90`
 * ekliyordu. Sonuç, `^\+90[0-9]{10}$`'a UYAN ama ULAŞILAMAZ numaralardı ve
 * kullanıcı hiçbir hata görmüyordu:
 *
 *   `00905321234567` → `+900905321234`
 *   `+1 415 555 0100` → `+901415555010`
 *   `05321234567890` → `+905321234567`
 *
 * Kural: ya geçerli olduğu gibi normalize edilir, ya reddedilir. Kırpma yok.
 */
import {
  DEFAULT_COUNTRY_CODE,
  formatPhoneNumber,
  formatTrPhoneField,
  isValidPhoneInput,
  normalizePhoneForPayload,
  parseE164TrPhone,
  parsePhoneForPayload,
  splitPhone,
} from '../phone';

const E164 = '+905321234567';

/** Bugün gerçek formlardan gelen geçerli yazım biçimleri — HEPSİ aynı numaraya çözülür. */
const VALID_INPUTS: string[] = [
  '0532 123 45 67',
  '+90 532 123 45 67',
  '532 123 45 67',
  '(0532) 123-45-67',
  '5321234567',
  '905321234567',
  '+905321234567',
  '05321234567',
  '+90 0532 123 45 67',
  '0532-123-45-67',
  '0532.123.45.67',
];

/** Reddedilmesi gereken girdiler — eskiden sessizce başka bir numaraya dönüyorlardı. */
const REJECTED_INPUTS: Array<[string, string]> = [
  ['00905321234567', 'uluslararası çevirme öneki — tahmin edilmez'],
  ['+1 415 555 0100', 'TR olmayan numara — eskiden +901415555010 üretiyordu'],
  ['05321234567890', 'fazla haneli — eskiden sessizce kırpılıyordu'],
  ['0432 123 45 67', 'sabit hat (5 ile başlamıyor)'],
  ['0000000000', 'sıfırlar'],
  ['532 123 45 6', 'eksik haneli'],
  ['   ', 'yalnız boşluk'],
  ['', 'boş'],
  ['abcdefghij', 'rakamsız'],
  ['+90 532 123 45 678', '11 haneli lokal'],
];

describe('parseE164TrPhone — geçerli girdiler tek E.164 hedefine çözülür', () => {
  it.each(VALID_INPUTS)('%s → +905321234567', (input) => {
    expect(parseE164TrPhone(input)).toBe(E164);
  });
});

describe('parseE164TrPhone — çözülemeyen girdi REDDEDİLİR (kırpma/tahmin yok)', () => {
  it.each(REJECTED_INPUTS)('%s → null (%s)', (input) => {
    expect(parseE164TrPhone(input)).toBeNull();
  });

  it('null/undefined güvenli', () => {
    expect(parseE164TrPhone(null)).toBeNull();
    expect(parseE164TrPhone(undefined)).toBeNull();
  });
});

/**
 * `0090…` KARARI — uygulama genelinde REDDEDİLİR.
 * Alanın yanında zaten `+90` seçili; `0090` bir ÇEVİRME öneki, alanın sözleşmesi
 * değil. Kabul etmek "kaç sıfır soyulur?" sorusunu açar ve `000532…` gibi yazım
 * hatalarını da geçerli sayardı — yani düzeltmeye çalıştığımız sessiz dönüşümün
 * yeni bir kapısı olurdu. Reddetmenin maliyeti bir tuş vuruşu; kabul etmenin
 * maliyeti ulaşılamaz bir teslimat telefonu.
 */
describe('0090 kararı — tek davranış, her yerde', () => {
  it('0090… her katmanda reddedilir', () => {
    expect(parseE164TrPhone('00905321234567')).toBeNull();
    expect(parsePhoneForPayload('00905321234567', DEFAULT_COUNTRY_CODE)).toBeNull();
    expect(isValidPhoneInput('00905321234567', DEFAULT_COUNTRY_CODE)).toBe(false);
    expect(normalizePhoneForPayload('00905321234567', DEFAULT_COUNTRY_CODE)).toBe('');
  });

  it('tek bir 0 ve tek bir 90 öneki hâlâ soyulur (geçerli alışkanlıklar bozulmaz)', () => {
    expect(parseE164TrPhone('05321234567')).toBe(E164);
    expect(parseE164TrPhone('905321234567')).toBe(E164);
    expect(parseE164TrPhone('900532 123 45 67')).toBe(E164);
  });
});

describe('formatPhoneNumber — alan formatlayıcısı KIRPMAZ', () => {
  it('on haneye sığan girdiyi gruplar, baştaki 0/90 önekini soyar', () => {
    expect(formatPhoneNumber('05321234567', '+90')).toBe('532 123 45 67');
    expect(formatPhoneNumber('+90 532 123 45 67', '+90')).toBe('532 123 45 67');
    expect(formatPhoneNumber('5321234567', '+90')).toBe('532 123 45 67');
  });

  it('fazla haneli girdiyi HAM bırakır — kullanıcı ne yazdığını görür', () => {
    expect(formatPhoneNumber('05321234567890', '+90')).toBe('05321234567890');
    expect(formatPhoneNumber('00905321234567', '+90')).toBe('00905321234567');
    expect(formatPhoneNumber('+1 415 555 0100', '+90')).toBe('+1 415 555 0100');
  });

  it('ham bırakılan girdi doğrulamadan GEÇEMEZ (gördüğün reddedilir)', () => {
    for (const [input] of REJECTED_INPUTS) {
      expect(parseE164TrPhone(formatPhoneNumber(input, '+90'))).toBeNull();
    }
  });

  it('varsayılan ülke kodu +90', () => {
    expect(formatPhoneNumber('05321234567')).toBe(formatPhoneNumber('05321234567', '+90'));
    expect(formatTrPhoneField('05321234567')).toBe('532 123 45 67');
  });
});

/**
 * Tuş-tuş yazma: alan titremesin, ara durumlar ham hâle geri dönmesin, ve on
 * haneyi aşınca kırpma yerine ham metin görünsün.
 */
describe('formatPhoneNumber — tuş-tuş yazma senaryosu', () => {
  const type = (keys: string) => {
    let field = '';
    const frames: string[] = [];
    for (const key of keys) {
      // RN TextInput kullanıcı tuşunu mevcut değerin sonuna ekleyip onChangeText'e verir.
      field = formatPhoneNumber(field + key, '+90');
      frames.push(field);
    }
    return frames;
  };

  it('"5321234567" yazarken her kare gruplanmış kalır', () => {
    expect(type('5321234567')).toEqual([
      '5',
      '53',
      '532',
      '532 1',
      '532 12',
      '532 123',
      '532 123 4',
      '532 123 45',
      '532 123 45 6',
      '532 123 45 67',
    ]);
  });

  it('"05321234567" (alışkanlık sıfırı) yazarken de gruplanmış kalır', () => {
    const frames = type('05321234567');
    expect(frames[0]).toBe(''); // baştaki 0 soyulur
    expect(frames[frames.length - 1]).toBe('532 123 45 67');
    // Hiçbir ara kare ham/bozuk bir biçime düşmez: yalnız rakam ve tek boşluk.
    frames.forEach((f) => expect(f).toMatch(/^[0-9]*(?: [0-9]+)*$/));
  });

  it('11. haneye basınca kırpmaz — ham metne düşer, geri silince gruplamaya döner', () => {
    const full = formatPhoneNumber('5321234567', '+90');
    expect(full).toBe('532 123 45 67');

    const overflow = formatPhoneNumber(full + '8', '+90');
    // Kırpma olsaydı yine "532 123 45 67" görünürdü — kullanıcı 8'i kaybettiğini fark etmezdi.
    expect(overflow).toBe('532 123 45 678');
    expect(parseE164TrPhone(overflow)).toBeNull();

    // Fazla haneyi silmek gruplanmış hâle DÖNER (alan takılı kalmaz).
    expect(formatPhoneNumber(overflow.slice(0, -1), '+90')).toBe('532 123 45 67');
  });

  it('idempotent: formatlanmış değeri tekrar formatlamak değiştirmez', () => {
    for (const input of VALID_INPUTS) {
      const once = formatPhoneNumber(input, '+90');
      expect(formatPhoneNumber(once, '+90')).toBe(once);
    }
  });
});

describe('parsePhoneForPayload / normalizePhoneForPayload — doğrular, uydurmaz', () => {
  it.each(VALID_INPUTS)('%s → +905321234567', (input) => {
    expect(parsePhoneForPayload(input, DEFAULT_COUNTRY_CODE)).toBe(E164);
    expect(normalizePhoneForPayload(input, DEFAULT_COUNTRY_CODE)).toBe(E164);
  });

  it.each(REJECTED_INPUTS)('%s → null / "" (%s)', (input) => {
    expect(parsePhoneForPayload(input, DEFAULT_COUNTRY_CODE)).toBeNull();
    expect(normalizePhoneForPayload(input, DEFAULT_COUNTRY_CODE)).toBe('');
  });

  it('ölçülen üç bozulma artık ÜRETİLMİYOR', () => {
    expect(normalizePhoneForPayload('00905321234567', '+90')).not.toBe('+900905321234');
    expect(normalizePhoneForPayload('+1 415 555 0100', '+90')).not.toBe('+901415555010');
    expect(normalizePhoneForPayload('05321234567890', '+90')).not.toBe('+905321234567');
  });

  it('undefined güvenli', () => {
    expect(normalizePhoneForPayload(undefined, '+90')).toBe('');
    expect(parsePhoneForPayload(undefined, '+90')).toBeNull();
  });
});

/**
 * TR DIŞI ülke kodları artık REDDEDİLİYOR.
 *
 * Eski davranış (ITU-T E.164'ün kendi sınırlarını uygula, plan tahmini yapma)
 * kendi içinde tutarlıydı ama sunucunun kabul etmediği değerleri geçerli
 * sayıyordu. Sunucu 2026-08-14'te her giriş noktasını `IsTrPhone()`
 * (`/^\+905\d{9}$/`) kuralına bağladı; staging'de ölçüldü (2026-08-26,
 * `POST /auth/register`):
 *
 *   `+49 30 1234567`  → "Geçerli bir Türkiye cep numarası giriniz (+905XXXXXXXXX)"
 *   `+90 212 1234567` → aynı hata (TR sabit hat da reddediliyor)
 *   `+90 532 1234567` → telefon hatası yok
 *
 * Yani eski testlerin "geçer" dediği her numara üretimde 400 alıyordu ve
 * istemci bunu kullanıcıya gönderimden önce göstermiyordu. `PhoneInput`'tan
 * ülke seçicisi kaldırıldığı için bu dala UI'dan artık ulaşılamıyor; kapı
 * kalıcı veride (eski bir adres) TR dışı numara bulunma ihtimali için duruyor.
 */
describe('TR dışı ülke kodları — REDDEDİLİR (sunucu yalnız +905… kabul ediyor)', () => {
  it.each([
    ['415 555 0100', '+1'],
    ['7911123456', '+44'],
    ['30 1234567', '+49'],
    ['50 123 4567', '+971'],
  ])('%s (%s) payload üretmez', (phone, code) => {
    expect(parsePhoneForPayload(phone, code)).toBeNull();
    expect(normalizePhoneForPayload(phone, code)).toBe('');
    expect(isValidPhoneInput(phone, code)).toBe(false);
  });

  it('zaten E.164 yazılmış yabancı numara da geçmez', () => {
    expect(parsePhoneForPayload('+14155550100', '+1')).toBeNull();
    expect(parsePhoneForPayload('+49 30 123456', '+49')).toBeNull();
  });

  // TR SABİT HAT: eski `^\+90[0-9]{10}$` sözleşmesini geçiyordu, yeni kural
  // (`+905…`) reddediyor. İstemci de reddetmeli — sunucuya gidip 400 almasın.
  it('TR sabit hat (+90 212…) reddedilir', () => {
    expect(parsePhoneForPayload('212 123 4567', '+90')).toBeNull();
    expect(isValidPhoneInput('212 123 4567', '+90')).toBe(false);
  });

  it('formatlayıcı yalnız rakam-dışı temizlik yapar, kırpmaz, gruplamaz', () => {
    // Formatlama DEĞİŞMEDİ: alan hâlâ ne yazıldığını gösteriyor, gönderimi
    // engelleyen `parsePhoneForPayload`.
    expect(formatPhoneNumber('415 555 0100', '+1')).toBe('4155550100');
    expect(formatPhoneNumber('4155550100999', '+1')).toBe('4155550100999');
  });
});

describe('splitPhone — kayıtlı numarayı ülke kodu + lokal parçaya ayırır', () => {
  it('TR numarası', () => {
    expect(splitPhone('+905321234567')).toEqual({ countryCode: '+90', phone: '532 123 45 67' });
  });

  it('TR dışı numara', () => {
    expect(splitPhone('+14155550100')).toEqual({ countryCode: '+1', phone: '4155550100' });
  });

  it('kod yoksa varsayılan +90', () => {
    expect(splitPhone('5321234567')).toEqual({ countryCode: '+90', phone: '532 123 45 67' });
  });

  it('round-trip: split → normalize aynı E.164', () => {
    const { countryCode, phone } = splitPhone(E164);
    expect(normalizePhoneForPayload(phone, countryCode)).toBe(E164);
  });
});
