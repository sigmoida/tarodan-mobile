import {
  asLabel,
  formatOrderStatus,
  formatPrice,
  formatPriceNumber,
  formatRelativeDate,
  formatServerPrice,
  serverAmount,
  PRICE_PLACEHOLDER,
} from '../format';
import i18n from '@/i18n/config';

/**
 * serverAmount / formatServerPrice — "gösterilen her tutar bir sunucu alanının
 * aynısıdır" kısıtının BEKÇİSİ (bulgu N2).
 *
 * Eski kapı ekran hook'larındaydı ve alan değil NESNE seviyesindeydi:
 * `const total = summary != null ? Number(summary.total) : null`. Sunucu bir gün
 * `total: null` döndürseydi `Number(null)` = **0** → `total == null` false →
 * "Onayla ve Öde (0,00 TL)" yazan ETKİN bir ödeme butonu. `total: undefined`
 * olsaydı `Number(undefined)` = **NaN** → `formatServerPrice` null kontrolünden
 * geçer, `formatPrice(NaN)` yine **"0,00 TL"** basardı. Kapı artık alan
 * seviyesinde ve `Number.isFinite` tabanlı.
 */
describe('serverAmount', () => {
  it('sayı olmayan girdiler için null döner (Number(null)=0 tuzağı)', () => {
    expect(serverAmount(null)).toBeNull();
    expect(serverAmount(undefined)).toBeNull();
    expect(serverAmount(NaN)).toBeNull();
    expect(serverAmount(Infinity)).toBeNull();
    expect(serverAmount(-Infinity)).toBeNull();
    expect(serverAmount('')).toBeNull();
    expect(serverAmount('   ')).toBeNull();
    expect(serverAmount('abc')).toBeNull();
    expect(serverAmount({})).toBeNull();
    expect(serverAmount([])).toBeNull();
    expect(serverAmount(true)).toBeNull();
  });

  it('sonlu sayıları aynen geçirir (0 ve negatif dahil)', () => {
    expect(serverAmount(0)).toBe(0);
    expect(serverAmount(754.32)).toBe(754.32);
    expect(serverAmount(-25.5)).toBe(-25.5);
  });

  it('-0 işaretsiz 0 a normalize edilir ("-0,00 TL" basılmaz)', () => {
    expect(Object.is(serverAmount(-0), 0)).toBe(true);
  });

  it('boş olmayan sayısal string i tolere eder (decimal-as-string şekli)', () => {
    expect(serverAmount('619.92')).toBe(619.92);
    expect(serverAmount('0')).toBe(0);
  });
});

describe('formatServerPrice', () => {
  it('sunucu alanı yoksa/sayı değilse yer tutucu basar — asla "0,00 TL"', () => {
    // İmza `number | string | null | undefined` — yanlışlıkla bir nesne geçmek
    // derleme hatası olsun diye dar tutuldu. Buradaki cast bunu BİLEREK deliyor:
    // sunucu bir gün beklenmedik bir şekil dönerse çalışma anında da yer tutucuya
    // düşüldüğünü kanıtlıyoruz, tipin verdiği güvenceye ek olarak.
    const untypedServerValues = [null, undefined, NaN, Infinity, -Infinity, '', '  ', 'abc', {}];
    for (const bad of untypedServerValues) {
      expect(formatServerPrice(bad as number)).toBe(PRICE_PLACEHOLDER);
      expect(formatServerPrice(bad as number)).not.toBe('0,00 TL');
    }
  });

  it('gerçek 0, yer tutucu DEĞİL "0,00 TL" basar (ücretsiz kargo gerçek bir tutar)', () => {
    expect(formatServerPrice(0)).toBe('0,00 TL');
    expect(formatServerPrice(-0)).toBe('0,00 TL');
  });

  it('sonlu tutarı formatPrice ile aynı basar', () => {
    expect(formatServerPrice(754.32)).toBe(formatPrice(754.32));
    expect(formatServerPrice(754.32)).toBe('754,32 TL');
    expect(formatServerPrice(-25.5)).toBe('-25,50 TL');
  });

  // formatPrice HÂLÂ "0,00 TL" döndürüyor — sunucu-yetkili gösterimlerde neden
  // ondan geçilemeyeceğinin kanıtı (bu iki satır ayrışırsa kapı kalkmış demektir).
  it('formatPrice ile ayrışma noktası: null/NaN', () => {
    expect(formatPrice(null)).toBe('0,00 TL');
    expect(formatPrice(NaN)).toBe('0,00 TL');
    expect(formatServerPrice(null)).toBe(PRICE_PLACEHOLDER);
    expect(formatServerPrice(NaN)).toBe(PRICE_PLACEHOLDER);
  });
});

/**
 * asLabel — product/[id] kategori crash fix'inin (BULGU #3) regresyon koruması.
 * Backend'den brand/scale/category string veya obje gelebilir; <Text> içine konan
 * değer asla obje olmamalı yoksa "Objects are not valid as a React child" crash'i.
 */
describe('asLabel', () => {
  it('passes through a plain string', () => {
    expect(asLabel('AutoArt')).toBe('AutoArt');
  });

  it('extracts .name from a category object', () => {
    expect(asLabel({ id: 1, name: 'Diecast', slug: 'diecast' })).toBe('Diecast');
  });

  it('falls back to title then slug when name is absent', () => {
    expect(asLabel({ title: 'Koleksiyon' })).toBe('Koleksiyon');
    expect(asLabel({ slug: 'modeller' })).toBe('modeller');
  });

  it('stringifies a number', () => {
    expect(asLabel(143)).toBe('143');
  });

  it('returns the fallback for null/undefined', () => {
    expect(asLabel(null)).toBe('');
    expect(asLabel(undefined, 'Kategori yok')).toBe('Kategori yok');
  });

  // Asıl crash senaryosu: name'in kendisi non-string (lokalize/iç içe obje).
  // Eski inline `category.name` kodu bunu doğrudan <Text>'e basıp çökerdi.
  it('does NOT return a nested object when .name is itself an object', () => {
    const localized = { name: { tr: 'Araçlar', en: 'Vehicles' } };
    const result = asLabel(localized);
    expect(typeof result).toBe('string');
    expect(result).toBe('');
  });

  // Genel güvence: dönen değer her zaman string — <Text>'e konabilir, crash imkânsız.
  it('always returns a string for any input shape', () => {
    const inputs: unknown[] = [
      'x', 0, null, undefined, {}, { name: 5 }, { name: { x: 1 } }, [], { slug: null },
    ];
    for (const v of inputs) {
      expect(typeof asLabel(v)).toBe('string');
    }
  });
});

/**
 * formatOrderStatus — satış detay banner'ı (sales/[id]) bu fonksiyonu kullanır.
 * BULGU #24 listede salesStatusConfig ile çözüldü; detay ekranında
 * awaiting_buyer_confirmation map'te eksikti → ham/İngilizce title-case fallback
 * görünüyordu. Bu testler tüm OrderStatus enum değerlerinin Türkçeleştiğini garanti eder.
 */
describe('formatOrderStatus', () => {
  // Backend prisma OrderStatus enum'unun TAM listesi (10 değer).
  const ALL_STATUSES = [
    'pending_payment', 'paid', 'preparing', 'shipped', 'delivered',
    'awaiting_buyer_confirmation', 'completed', 'cancelled',
    'refund_requested', 'refunded',
  ];

  it('her enum değerini Türkçe etikete çevirir (alt çizgi/ham enum sızdırmaz)', () => {
    for (const status of ALL_STATUSES) {
      const label = formatOrderStatus(status);
      expect(label).not.toContain('_');
      expect(label).not.toBe(status);
    }
  });

  // #24 regresyonu: eski map'te eksik olan durum artık Türkçe görünmeli.
  it('awaiting_buyer_confirmation → Türkçe (ham/İngilizce title-case değil)', () => {
    expect(formatOrderStatus('awaiting_buyer_confirmation')).toBe('Alıcı Onayı Bekleniyor');
    expect(formatOrderStatus('awaiting_buyer_confirmation', 'en')).toBe('Awaiting Buyer Confirmation');
  });

  it('null/undefined için güvenli fallback döner', () => {
    expect(formatOrderStatus(null)).toBe('Bilinmiyor');
    expect(formatOrderStatus(undefined, 'en')).toBe('Unknown');
  });
});

/**
 * Bilinen kusur (2026-08-29 tespit): formatPrice/formatPriceNumber `'tr-TR'`i
 * SABİT kullanıyordu — İngilizce kullanıcı bile binlik/ondalık ayracı Türkçe
 * görüyordu. PARA BİRİMİ hep TL kalır (bu bir TL pazaryeri); yalnız SAYI
 * biçimi aktif dile göre değişir. `formatRelativeDate`'in `locale` varsayılanı
 * da aynı sınıf kusur taşıyordu (sabit `'tr'`) — artık aktif dile düşer.
 */
describe('locale-duyarlı biçimlendirme (aktif dile göre, TL sabit kalır)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('tr');
  });

  it('formatPrice: en aktifken en-US binlik/ondalık ayracı kullanır, TL eki değişmez', async () => {
    expect(formatPrice(1234.5)).toBe('1.234,50 TL');
    await i18n.changeLanguage('en');
    expect(formatPrice(1234.5)).toBe('1,234.50 TL');
  });

  it('formatPriceNumber aynı locale kuralını TL eki olmadan izler', async () => {
    await i18n.changeLanguage('en');
    expect(formatPriceNumber(1234.5)).toBe('1,234.50');
  });

  it('formatRelativeDate: locale verilmezse aktif dile düşer (7+ gün önce → tam tarih)', async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trOut = formatRelativeDate(old); // ör. "30 Temmuz 2026" (tam ay adı)
    await i18n.changeLanguage('en');
    const enOut = formatRelativeDate(old); // ör. "Jul 30, 2026" (kısaltılmış ay adı)
    expect(enOut).not.toBe(trOut);
    expect(enOut).toMatch(/^[A-Za-z]{3} \d{1,2}, \d{4}$/);
  });
});
