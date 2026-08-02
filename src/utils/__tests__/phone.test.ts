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

/** TR dışı ülke kodlarının davranışı DEĞİŞMEDİ (sıkı TR kuralı yalnız +90'da). */
describe('TR dışı ülke kodları — davranış korunur', () => {
  it('ülke kodu prefix\'lenir', () => {
    expect(normalizePhoneForPayload('415 555 0100', '+1')).toBe('+14155550100');
    expect(normalizePhoneForPayload('7911123456', '+44')).toBe('+447911123456');
  });

  it('zaten ülke kodu varsa olduğu gibi kalır', () => {
    expect(normalizePhoneForPayload('+14155550100', '+1')).toBe('+14155550100');
    expect(normalizePhoneForPayload('+49 30 123456', '+49')).toBe('+4930123456');
  });

  it('formatlayıcı yalnız rakam-dışı temizlik yapar, kırpmaz, gruplamaz', () => {
    expect(formatPhoneNumber('415 555 0100', '+1')).toBe('4155550100');
    expect(formatPhoneNumber('4155550100999', '+1')).toBe('4155550100999');
  });

  it('yerel numara planına göre RED yok — gerçek numaralar geçer', () => {
    // Eski `>= 10 hane` kuralı bu ikisini reddediyordu; ikisi de geçerli.
    expect(isValidPhoneInput('30 1234567', '+49')).toBe(true);
    expect(isValidPhoneInput('50 123 4567', '+971')).toBe(true);
    expect(isValidPhoneInput('4155550100', '+1')).toBe(true);
    expect(isValidPhoneInput('', '+1')).toBe(false);
    expect(isValidPhoneInput('   ', '+1')).toBe(false);
  });

  it('yalnız E.164 in KENDİ sınırları uygulanır (plan tahmini değil)', () => {
    // Ulusal kısım < 4 hane: en kısa bilinen plan Saint Helena (+290 XXXX).
    // Bu kapı olmadan `+1` seçip `1` yazan kullanıcının `+11`'i sunucuya gidiyordu.
    expect(isValidPhoneInput('1', '+1')).toBe(false);
    expect(isValidPhoneInput('123', '+49')).toBe(false);
    expect(isValidPhoneInput('1234', '+290')).toBe(true);
    // Ülke kodu dahil > 15 hane (E.164 §6.2.1).
    expect(isValidPhoneInput('415555010012345678', '+1')).toBe(false);
    expect(parsePhoneForPayload('1', '+1')).toBeNull();
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
