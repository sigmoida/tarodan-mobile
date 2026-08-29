/**
 * Katalog bütünlüğü — i18n göçünün bekçisi.
 *
 * Göç uzun ve mekanik: 711 dosyanın bugün 98'i çeviriyi kullanıyor. Bu kadar
 * uzun süren bir işte asıl risk kalan işin büyüklüğü değil, **ilerlemenin
 * sessizce geri gitmesi**:
 *
 *  - biri TR anahtarı ekler, EN'i unutur → uygulama İngilizce'de Türkçe basar
 *    ve hiçbir şey hata vermez (i18next fallback'e düşer);
 *  - biri `keys.ts`'i elle düzenler → tip ile katalog ayrışır.
 *
 * Bu testler o iki yolu kapatıyor. Kapsamı bilerek dar: metinlerin KENDİSİNİ
 * denetlemiyorlar (çeviri kalitesi bir testin işi değil), yalnız iki kataloğun
 * aynı iskeleti taşıdığını ve üretilen tiplerin taze olduğunu çiviliyorlar.
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');
const tr = JSON.parse(readFileSync(`${ROOT}/src/i18n/lib/catalog/tr.json`, 'utf8'));
const en = JSON.parse(readFileSync(`${ROOT}/src/i18n/lib/catalog/en.json`, 'utf8'));

function flatten(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flatten(value, path) : [path];
  });
}

const trKeys = flatten(tr);
const enKeys = flatten(en);

describe('katalog anahtar iskeleti', () => {
  it('iki katalog AYNI anahtarları taşır', () => {
    expect([...enKeys].sort()).toEqual([...trKeys].sort());
  });

  it('anahtar SIRASI da aynı — diff okunabilir kalsın', () => {
    // Sıra bozulunca her katalog değişikliği yüzlerce satırlık diff üretiyor ve
    // gerçek değişiklik gözden kayboluyor (bir kez yaşandı: alfabetik sıralama
    // denemesi 359 satırlık sahte diff çıkardı).
    expect(enKeys).toEqual(trKeys);
  });

  it('hiçbir değer boş değil', () => {
    for (const [locale, catalog] of [['tr', tr], ['en', en]] as const) {
      for (const key of flatten(catalog)) {
        const value = key.split('.').reduce((o: any, k) => o[k], catalog);
        expect(typeof value).toBe('string');
        expect(`${locale}:${key} → "${value}"`).not.toMatch(/→ ""$/);
      }
    }
  });
});

describe('ICU kesme işareti kaçışı', () => {
  /**
   * ICU'da tek tırnak, hemen ardından `{` ya da `}` gelirse ALINTI açar ve
   * argümanı yutar: `Takas durumu '{status}' kabul edilemez` ekrana
   * "Takas durumu {status} kabul edilemez" diye basıyordu — yedi anahtarda,
   * iki dilde. Ölçüldü (2026-08-29), sonra çiftlenerek düzeltildi.
   *
   * Harfin önündeki tek tırnak (`Premium'a`) ICU 4.8 davranışında zararsızdır;
   * bu test yalnız süslü parantezden önce gelen tırnağı yakalar — yani kuralı
   * gereğinden geniş uygulayıp katalogdaki her kesme işaretini kovalamaz.
   */
  it('süslü parantezden önce çiftlenmemiş tırnak yok', () => {
    const risky: string[] = [];
    for (const [locale, catalog] of [['tr', tr], ['en', en]] as const) {
      for (const key of flatten(catalog)) {
        const value = key.split('.').reduce((o: any, k) => o[k], catalog) as string;
        if (/(^|[^'])'[{}]/.test(value)) risky.push(`${locale}:${key} → ${value}`);
      }
    }
    // Düşerse: tırnağı çiftle (`''{arg}''`). Aksi halde argüman ekrana hiç
    // yerleşmez ve kullanıcı ham `{arg}` görür.
    expect(risky).toEqual([]);
  });
});

describe('üretilen tipler', () => {
  it('`keys.ts` katalogla aynı hizada — elle düzenlenmemiş', () => {
    // `node scripts/gen-keys.mjs` çıktısı dosyadakiyle birebir olmalı. Aksi
    // halde `MessageKey` var olmayan bir anahtarı kabul eder ya da gerçek bir
    // anahtarı reddeder; ikisi de derleme zamanında değil ÇALIŞMA zamanında
    // ortaya çıkar.
    const before = readFileSync(`${ROOT}/src/i18n/lib/generated/keys.ts`, 'utf8');
    execFileSync('node', ['scripts/gen-keys.mjs'], { cwd: ROOT, stdio: 'pipe' });
    const after = readFileSync(`${ROOT}/src/i18n/lib/generated/keys.ts`, 'utf8');
    expect(after).toBe(before);
  });
});

describe('çeviri tamamlanmamış anahtarlar', () => {
  /**
   * İki katalogda birebir aynı olan değerler için AÇIK muafiyet listesi.
   *
   * Önce bir sayı bütçesiydi; ilk aşımda kusuru gösterdi: sayı, "çevrilmesi
   * gereken ama çevrilmemiş" ile "iki dilde zaten aynı" arasında ayrım
   * yapamıyor, ve aşıldığında yapılacak en kolay şey sayıyı büyütmek oluyor.
   * Açık liste her muafiyeti bir KARAR hâline getiriyor.
   *
   * Bu liste bir kez gerçek bir hata yakaladı: `product.deactivateDesc` Türkçe
   * katalogda İngilizce metin taşıyordu (ve hiçbir yerde kullanılmıyordu) —
   * silindi.
   */
  const INTENTIONALLY_IDENTICAL = new Set([
    // Kendi dilinde gösterilen dil adları.
    'language.turkish',
    'language.english',
    // Özel adlar, marka ve teknik kısaltmalar.
    'product.limitedEdition',
    'product.limitedBadge',
    'product.model',
    'models.model',
    'checkout.cvv',
    'checkout.suratKargo',
    // İki haneli yıl format ipucu ("YY") — çevrilecek bir sözcük yok.
    'payment.expYearPlaceholder',
    'membership.premium',
    // Kurumsal üyelik rozeti: "Business" marka adı, iki dilde de aynı kalır.
    'home.businessBadge',
    'mobile.guestGarageTitle',
    'collection.coverImagePlaceholder',
    'order.invoiceNo',
    // "Plan:" iki dilde de aynı sözcük.
    'membership.planLabel',
    // Ölçek etiketleri ve iletişim değerleri — çevrilecek bir sözcük yok.
    'information.sizeGuide.scale18',
    'information.sizeGuide.scale24',
    'information.sizeGuide.scale43',
    'information.sizeGuide.scale64',
    'information.sizeGuide.note64',
    'information.contactInfo.emailValue',
    'information.contactInfo.phoneValue',
    // Yalnız ayraç + sürüm numarası (" · v3"); çevrilecek sözcük yok.
    'sellerDocument.versionSuffix',
    // Yalnız ayraç + interpolasyon (" · {level}"); çevrilecek sözcük yok.
    'seller.trustScoreLevelSuffix',
    // Yalnız saf interpolasyon ("{current}/{max}"); çevrilecek sözcük yok.
    'ratingModal.charCount',
    // Uluslararası kısaltma — İngilizce'de de "IBAN".
    'businessApplication.ibanLabel',
    // Koleksiyon şablonu adları: yarış serisi ve araç türü adı — ikisi de
    // Türkçe koleksiyoncu jargonunda İngilizce haliyle kullanılıyor.
    'collection.templateF1',
    'collection.templateMuscle',
    // İçerik filtresi etiketleri: platform/marka adları, çevrilmez.
    'message.violationLabelWhatsapp',
    'message.violationLabelTelegram',
  ]);

  /**
   * `admin.*` ve saf-interpolasyonlu `server.notification.*` mesajları toplu
   * muaf: birincisi mobil arayüzde hiç render edilmiyor (katalog ana repoyla
   * paylaşıldığı için burada duruyor), ikincisi yalnız `{argüman}` taşıyor.
   */
  const isBulkExempt = (key: string) =>
    key.startsWith('admin.') || /^server\.notification\..*\.message$/.test(key);

  it('çevrilmemiş kalan anahtar yok', () => {
    const pick = (catalog: any, key: string) =>
      key.split('.').reduce((o: any, k) => o[k], catalog);
    const identical = trKeys.filter(
      (key) =>
        pick(tr, key) === pick(en, key) &&
        !INTENTIONALLY_IDENTICAL.has(key) &&
        !isBulkExempt(key),
    );
    // Düşerse: anahtarı gerçekten İngilizce'ye çevir. Metin iki dilde
    // GERÇEKTEN aynıysa (özel ad, kısaltma) yukarıdaki listeye ekle — sebebiyle.
    expect(identical).toEqual([]);
  });
});
