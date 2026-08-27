/**
 * Sözleşme kapsaması — sunucunun döndürdüğü her alan mobilin tipinde var mı?
 *
 * Parite denetimleri iki kez üst üste aynı sınıfı kaçırdı: sunucunun İÇ İÇE ve
 * DTO'suz alanları. `pricing.summary.quantityDiscount` bir serviste kuruluyor,
 * `dto/**` diffinde hiç görünmüyor — sepette kampanya indirimi etiketsiz
 * eriyordu. `rejectionReason` de öyle: satıcı ilanının neden reddedildiğini
 * hiçbir yerde göremiyordu.
 *
 * Bu test o sınıfı kapatıyor: ÖLÇÜLMÜŞ gövdedeki her alan adı, ilgili tip
 * KAYNAKLARINDA geçmiyorsa ya gerekçesiyle `KNOWN_UNDECLARED`'da durur ya da
 * test düşer.
 *
 * TİP KAYNAKLARI TEK DOSYA DEĞİL: `src/lib/api/<domain>.ts` yalnız axios
 * yüzeyi — orada `getAll`/`getOne`/`getGroup`/`getGroups` jenerik `api.get()`
 * döndürüyor, gövdenin GERÇEK tipi rota-yerel `_lib/types.ts` dosyalarında
 * yaşıyor (`OrderDetail`, `GroupOrder`, …). Fix round 1'de bu ayrım
 * gözden kaçtı ve guard yalnız `orders.ts`'i okuyunca 217 "bildirilmemiş"
 * alan çıktı — bunların çoğu rota-yerel tipte ZATEN bildirilmişti, guard
 * yanlış yere bakıyordu. `readTypes` bu yüzden bir dosya değil, gövdeyi
 * deklare eden dosyaların LİSTESİNİ okuyup birleştiriyor.
 *
 * SINIRI: alan ADINA bakar, tipe ya da iç içe yapıya DEĞİL. `total: string`
 * yazılmışsa yakalamaz. Yakaladığı tek şey yanıtta olup hiçbir tip
 * kaynağında hiç olmayan alan.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fieldPaths, undeclaredFields } from './contractCoverage';

const ROOT = resolve(__dirname, '../../../..');
/** Bir gövdeyi deklare eden BİRDEN FAZLA dosyayı okuyup tek kaynak metnine birleştirir. */
const readTypes = (paths: string[]) =>
  paths.map((p) => readFileSync(resolve(ROOT, p), 'utf8')).join('\n');
const readFixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8'));

/** `orders` fixture'ının gövdesini deklare eden tüm dosyalar (axios yüzeyi + rota-yerel tipler). */
const ORDERS_TYPE_SOURCES = [
  'src/lib/api/orders.ts',
  'app/orders/[id]/_lib/types.ts',
  'app/orders/group/[id]/_lib/types.ts',
];

/**
 * Yanıtta olup tipte OLMAYAN, ama bilinçli olarak okunmayan alanlar.
 *
 * Her satır bir KARAR: ya "mobil bu alanı hiç kullanmıyor ve kullanmamalı" ya da
 * "Plan B'de kapatılacak boşluk". İkincisi kapatıldığında satır SİLİNİR —
 * ilerleme böyle ölçülür.
 */
const KNOWN_UNDECLARED: Record<string, Set<string>> = {
  orders: new Set<string>([
    // ── Mobil bu alanları hiç kullanmıyor ve kullanmamalı ───────────────────
    // Fix round 1 (bkz. dosya başı doc yorumu): guard artık yalnız
    // `src/lib/api/orders.ts`'i değil, `ORDERS_TYPE_SOURCES`'taki ÜÇ dosyayı
    // birlikte okuyor. Önceki tur 217 alan listelemişti; bunların 126'sı
    // rota-yerel tiplerde (`OrderDetail`, `GroupOrder`) ZATEN bildirilmişti —
    // guard yanlış yere bakıyordu, alan eksik değildi. Geriye kalan 91'i
    // `app/orders/**` içinde `grep`le tek tek doğruladım: hiçbiri hiçbir
    // ekranda okunmuyor.
    //   - `canReactivate` / `cancelCategory` / `cancelReason` / `checkoutGroupId` /
    //     `packageId` / `updatedAt`: sunucu tarafı muhasebe/iş akışı alanları —
    //     ekranın kullandığı denklik `status` + `cancellationType` + zaman
    //     damgaları.
    //   - `buyer`/`seller` altındaki `isVerified` / `publicName` / `username`:
    //     sipariş ekranları yalnız `displayName` basıyor, profil kartı yok
    //     (`avatarUrl` de aynı sebepten okunmuyordu, artık `OrderDetail`/
    //     `GroupOrder`'da bildirilmiş durumda).
    //   - `pricing.buyerFeeDiscountAmount` / `sellerFeeDiscountAmount` /
    //     `sellerShippingAmount` / `withholdingTaxAmount`: kampanya/vergi
    //     kırılımı satıcı muhasebesine ait, alıcı/satıcı sipariş ekranlarında
    //     karşılığı yok (bkz. `OrderQuotePricing` — bunlar quote'ta da hiç
    //     yok).
    //   - `shippingAddress.addressLine1` / `addressLine2`: mobil tek bir
    //     `address` satırı gösteriyor (bkz. `OrderDetail.shippingAddress.address`).
    //   - `activeRefundRequest.returnCargoCode` / `returnStatus`: iade
    //     ekranı yalnız `returnProvider` + `returnTrackingNumber` gösteriyor.
    //   - `groups.data.kind`: grup tekli/çoklu ayrımını mobil zaten
    //     `orders.length === 1` ile İSTEMCİDE türetiyor (bkz. `useOrders.ts`).
    //     (`app/orders/index.tsx`'teki `kind: 'order' | 'group'` AYRI bir
    //     yerel UI etiketi — sunucunun `kind` alanıyla karışmasın.)
    //   - `groups.data.viewerRole`: bu ekran yalnız alıcı rolünde çalışıyor
    //     (satıcı sekmesi ayrı bir uç kullanıyor), sunucudan rol okumaya
    //     gerek yok.
    //   - `*.meta.limit` / `page` / `totalPages`: mobil sayfalama üstverisini
    //     HİÇ okumuyor — `useOrders.ts`/`useOrderGroup.ts` sabit bir
    //     `limit`/`page` GÖNDERİYOR ama yanıttaki `meta`'ya hiç bakmıyor
    //     (`grep -rn '\.meta\b' app/orders` boş döner). Önceki turda bu
    //     "kullanılıyor" sayılmıştı — o bir yanlıştı, istek parametresiyle
    //     yanıt alanı karıştırılmıştı; burada düzeltildi.
    //
    // `packages` NOTU (satıcı bazlı kargo kırılımı): önceki turda "58 alan
    // hiç okunmuyor" diye ayrı bir blok vardı (`groups.data.packages.*`).
    // O bulgu hâlâ DOĞRU — `useOrders.ts` yalnız `rawGroup.orders`'ı okuyor,
    // `rawGroup.packages`'a `app/orders/group` içinde hiç dokunulmuyor — ama
    // bu guard'ın ADI-tek-taraflı eşleştirmesi onu artık AYRI bir bulgu
    // olarak GÖSTEREMİYOR: `packages.orders[]` üst düzey `orders[]` ile AYNI
    // sipariş şeklini taşıyor, üst düzey `orders[]` `GroupOrder`'da bildirilmiş
    // olduğu için aynı yaprak adları (`cargoCode`, `createdAt`, …) `packages`
    // altında da "bildirilmiş" sayılıyor — konumu değil, adı kontrol ediyoruz
    // (bkz. dosya başı SINIRI notu). Yani: `packages` hâlâ okunmuyor, ama bu
    // test artık bunu YAKALAMIYOR; bu satırlarda görünen `packages.*` alanları
    // yalnızca HER YERDE ölü olan (`canReactivate`, `checkoutGroupId`, …) sınıf
    // yüzünden burada — `packages`'a özgü değiller. Çok-satıcılı kargo
    // kırılımının mobilde hiç gösterilmediği gerçek ürün boşluğu, task-1-report
    // içinde ayrı not olarak duruyor; bir sonraki plan bunu README'nin
    // "Sınırı — abartma" bölümündeki tanınan sınırla ele almalı.
    'detail.activeRefundRequest.returnCargoCode',
    'detail.activeRefundRequest.returnStatus',
    'detail.buyer.isVerified',
    'detail.buyer.publicName',
    'detail.buyer.username',
    'detail.canReactivate',
    'detail.cancelCategory',
    'detail.cancelReason',
    'detail.checkoutGroupId',
    'detail.packageId',
    'detail.pricing.buyerFeeDiscountAmount',
    'detail.pricing.sellerFeeDiscountAmount',
    'detail.pricing.sellerShippingAmount',
    'detail.pricing.withholdingTaxAmount',
    'detail.seller.isVerified',
    'detail.seller.publicName',
    'detail.seller.username',
    'detail.shippingAddress.addressLine1',
    'detail.shippingAddress.addressLine2',
    'detail.updatedAt',
    'groups.data.kind',
    'groups.data.orders.activeRefundRequest.returnCargoCode',
    'groups.data.orders.activeRefundRequest.returnStatus',
    'groups.data.orders.buyer.isVerified',
    'groups.data.orders.buyer.publicName',
    'groups.data.orders.buyer.username',
    'groups.data.orders.canReactivate',
    'groups.data.orders.cancelCategory',
    'groups.data.orders.cancelReason',
    'groups.data.orders.checkoutGroupId',
    'groups.data.orders.packageId',
    'groups.data.orders.pricing.buyerFeeDiscountAmount',
    'groups.data.orders.pricing.sellerFeeDiscountAmount',
    'groups.data.orders.pricing.sellerShippingAmount',
    'groups.data.orders.pricing.withholdingTaxAmount',
    'groups.data.orders.seller.isVerified',
    'groups.data.orders.seller.publicName',
    'groups.data.orders.seller.username',
    'groups.data.orders.shippingAddress.addressLine1',
    'groups.data.orders.shippingAddress.addressLine2',
    'groups.data.orders.updatedAt',
    'groups.data.packages.orders.activeRefundRequest.returnCargoCode',
    'groups.data.packages.orders.activeRefundRequest.returnStatus',
    'groups.data.packages.orders.buyer.isVerified',
    'groups.data.packages.orders.buyer.publicName',
    'groups.data.packages.orders.buyer.username',
    'groups.data.packages.orders.canReactivate',
    'groups.data.packages.orders.cancelCategory',
    'groups.data.packages.orders.cancelReason',
    'groups.data.packages.orders.checkoutGroupId',
    'groups.data.packages.orders.packageId',
    'groups.data.packages.orders.pricing.buyerFeeDiscountAmount',
    'groups.data.packages.orders.pricing.sellerFeeDiscountAmount',
    'groups.data.packages.orders.pricing.sellerShippingAmount',
    'groups.data.packages.orders.pricing.withholdingTaxAmount',
    'groups.data.packages.orders.seller.isVerified',
    'groups.data.packages.orders.seller.publicName',
    'groups.data.packages.orders.seller.username',
    'groups.data.packages.orders.shippingAddress.addressLine1',
    'groups.data.packages.orders.shippingAddress.addressLine2',
    'groups.data.packages.orders.updatedAt',
    'groups.data.packages.seller.isVerified',
    'groups.data.packages.seller.publicName',
    'groups.data.packages.seller.username',
    'groups.data.viewerRole',
    'groups.meta.limit',
    'groups.meta.page',
    'groups.meta.totalPages',
    'list.data.activeRefundRequest.returnCargoCode',
    'list.data.activeRefundRequest.returnStatus',
    'list.data.buyer.isVerified',
    'list.data.buyer.publicName',
    'list.data.buyer.username',
    'list.data.canReactivate',
    'list.data.cancelCategory',
    'list.data.cancelReason',
    'list.data.checkoutGroupId',
    'list.data.packageId',
    'list.data.pricing.buyerFeeDiscountAmount',
    'list.data.pricing.sellerFeeDiscountAmount',
    'list.data.pricing.sellerShippingAmount',
    'list.data.pricing.withholdingTaxAmount',
    'list.data.seller.isVerified',
    'list.data.seller.publicName',
    'list.data.seller.username',
    'list.data.shippingAddress.addressLine1',
    'list.data.shippingAddress.addressLine2',
    'list.data.updatedAt',
    'list.meta.limit',
    'list.meta.page',
    'list.meta.totalPages',
  ]),
};

describe('fieldPaths', () => {
  it('iç içe alanları nokta yoluyla düzler', () => {
    expect(fieldPaths({ a: { b: 1 } })).toContain('a.b');
  });

  it('dizi indislerini atlar — 0. ve 1. eleman aynı yolu üretir', () => {
    expect(fieldPaths({ items: [{ id: 1 }, { id: 2 }] })).toEqual(['items.id']);
  });

  it('null taşıyan alanı da alan sayar (varlık ≠ değer)', () => {
    // Sunucu `rejectionReason: null` döndürüyordu; alan VARDI, mobilde yoktu.
    expect(fieldPaths({ rejectionReason: null })).toEqual(['rejectionReason']);
  });

  it('boş dizide alanın KENDİSİNİ raporlar, iç şeklini değil', () => {
    // `feeDiscounts` her ölçümde `[]` döndü. Alan VAR ve mobil onu bildirmeli;
    // bildirilmesi gereken tek şey bu — iç satırın şekli ölçülemedi, oradan tip
    // çıkarmak uydurmak olurdu.
    expect(fieldPaths({ feeDiscounts: [] })).toEqual(['feeDiscounts']);
  });
});

describe('undeclaredFields', () => {
  it('tipte geçen alanı bildirilmiş sayar', () => {
    const src = 'export type X = { total: number };';
    expect(undeclaredFields({ total: 1 }, src, new Set())).toEqual([]);
  });

  it('tipte geçmeyen alanı bildirilmemiş sayar', () => {
    const src = 'export type X = { total: number };';
    expect(undeclaredFields({ quantityDiscount: 5 }, src, new Set())).toEqual([
      'quantityDiscount',
    ]);
  });

  it('allowlist’teki alanı raporlamaz', () => {
    const src = 'export type X = { total: number };';
    const allow = new Set(['quantityDiscount']);
    expect(undeclaredFields({ quantityDiscount: 5 }, src, allow)).toEqual([]);
  });

  it('yaprak adına bakar — `a.b` için `b` tipte geçiyorsa yeter', () => {
    // Tip dosyaları iç içe tipleri ayrı `type` olarak tanımlıyor; tam yolu
    // aramak her iç içe tipte yanlış pozitif üretirdi.
    const src = 'export type Inner = { b: number };';
    expect(undeclaredFields({ a: { b: 1 } }, src, new Set())).toEqual([]);
  });
});

describe('orders sözleşmesi', () => {
  it('ölçülen gövdedeki her alan tipte bildirilmiş ya da listede', () => {
    const fixture = readFixture('orders');
    const src = readTypes(ORDERS_TYPE_SOURCES);
    const missing = undeclaredFields(fixture, src, KNOWN_UNDECLARED.orders);
    // Düşerse: alanı tipe ekle (Plan B task'ı) ya da neden okunmadığını yazıp
    // KNOWN_UNDECLARED'a al. Listeyi gerekçesiz büyütme.
    expect(missing).toEqual([]);
  });
});
