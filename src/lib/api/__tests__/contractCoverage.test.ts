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
 * dosyasında geçmiyorsa ya gerekçesiyle `KNOWN_UNDECLARED`'da durur ya da test
 * düşer.
 *
 * SINIRI: alan ADINA bakar, tipe ya da iç içe yapıya DEĞİL. `total: string`
 * yazılmışsa yakalamaz. Yakaladığı tek şey yanıtta olup tipte hiç olmayan alan.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fieldPaths, undeclaredFields } from './contractCoverage';

const ROOT = resolve(__dirname, '../../../..');
const readType = (domain: string) =>
  readFileSync(resolve(ROOT, `src/lib/api/${domain}.ts`), 'utf8');
const readFixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `fixtures/${name}.json`), 'utf8'));

/**
 * Yanıtta olup tipte OLMAYAN, ama bilinçli olarak okunmayan alanlar.
 *
 * Her satır bir KARAR: ya "mobil bu alanı hiç kullanmıyor ve kullanmamalı" ya da
 * "Plan B'de kapatılacak boşluk". İkincisi kapatıldığında satır SİLİNİR —
 * ilerleme böyle ölçülür.
 */
const KNOWN_UNDECLARED: Record<string, Set<string>> = {
  orders: new Set<string>([
    // ── BOŞLUK — Plan B'de kapatılacak (1/2): tip eksik, alan OKUNUYOR ──────
    // `src/lib/api/orders.ts` sipariş gövdesi için DEKLARE EDİLMİŞ tek bir tip
    // taşımıyor: `getAll`/`getOne`/`getGroup`/`getGroups` hepsi jenerik
    // `api.get(...)` döndürüyor. Ama bu alanlar GERÇEKTEN okunuyor —
    // `app/orders/[id]/_lib/types.ts::OrderDetail`, `app/orders/_lib/ordersStatus.ts`,
    // `app/orders/_hooks/useOrders.ts`, `app/orders/[id]/_components/*` hepsi
    // bunları kullanıyor, sadece rota-yerel bir tipte, `src/lib/api/orders.ts`'de
    // değil. Sözleşme VAR, `src/lib/api` katmanında tipi YOK. Kapanınca
    // (`orders.ts`'e gerçek bir `Order`/`OrderGroup` dönüş tipi eklenince) her
    // satır tek tek SİLİNİR.
    'detail.activeRefundRequest.createdAt',
    'detail.activeRefundRequest.refundNumber',
    'detail.activeRefundRequest.returnProvider',
    'detail.activeRefundRequest.returnTrackingNumber',
    'detail.buyer.displayName',
    'detail.cancellationType',
    'detail.cancelledAt',
    'detail.cargoCode',
    'detail.createdAt',
    'detail.deliveredAt',
    'detail.groupNumber',
    'detail.isMembership',
    'detail.items.product.condition',
    'detail.items.product.imageUrl',
    'detail.packageNumber',
    'detail.paidAt',
    'detail.product.condition',
    'detail.product.imageUrl',
    'detail.seller.displayName',
    'detail.shipment.cargoCode',
    'detail.shipment.deliveredAt',
    'detail.shipment.shippedAt',
    'detail.shippedAt',
    'detail.shippingAddress.postalCode',
    'groups.data.createdAt',
    'groups.data.groupNumber',
    'groups.data.orders.activeRefundRequest.createdAt',
    'groups.data.orders.activeRefundRequest.refundNumber',
    'groups.data.orders.activeRefundRequest.returnProvider',
    'groups.data.orders.activeRefundRequest.returnTrackingNumber',
    'groups.data.orders.buyer.displayName',
    'groups.data.orders.cancellationType',
    'groups.data.orders.cancelledAt',
    'groups.data.orders.cargoCode',
    'groups.data.orders.createdAt',
    'groups.data.orders.deliveredAt',
    'groups.data.orders.groupNumber',
    'groups.data.orders.isMembership',
    'groups.data.orders.items.product.condition',
    'groups.data.orders.items.product.imageUrl',
    'groups.data.orders.packageNumber',
    'groups.data.orders.paidAt',
    'groups.data.orders.product.condition',
    'groups.data.orders.product.imageUrl',
    'groups.data.orders.seller.displayName',
    'groups.data.orders.shipment.cargoCode',
    'groups.data.orders.shipment.deliveredAt',
    'groups.data.orders.shipment.shippedAt',
    'groups.data.orders.shippedAt',
    'groups.data.orders.shippingAddress.postalCode',
    'groups.meta.limit',
    'groups.meta.page',
    'list.data.activeRefundRequest',
    'list.data.activeRefundRequest.createdAt',
    'list.data.activeRefundRequest.refundNumber',
    'list.data.activeRefundRequest.returnProvider',
    'list.data.activeRefundRequest.returnTrackingNumber',
    'list.data.buyer.displayName',
    'list.data.cancellationType',
    'list.data.cancelledAt',
    'list.data.cargoCode',
    'list.data.createdAt',
    'list.data.deliveredAt',
    'list.data.groupNumber',
    'list.data.isMembership',
    'list.data.items.product.condition',
    'list.data.items.product.imageUrl',
    'list.data.packageNumber',
    'list.data.paidAt',
    'list.data.product.condition',
    'list.data.product.imageUrl',
    'list.data.seller.displayName',
    'list.data.shipment.cargoCode',
    'list.data.shipment.deliveredAt',
    'list.data.shipment.shippedAt',
    'list.data.shippedAt',
    'list.data.shippingAddress.postalCode',
    'list.meta.limit',
    'list.meta.page',

    // ── BOŞLUK — Plan B'de kapatılacak (2/2): `packages` hiç okunmuyor ──────
    // `GET /orders/groups` her grup için `orders` (düz liste) VE `packages`
    // (satıcı/kargo bazlı kırılım) döndürüyor. `useOrders.ts` yalnız
    // `rawGroup.orders`'ı okuyor (satır 59); `rawGroup.packages` hiçbir yerde
    // referans edilmiyor (`grep -r packages app/orders/group` boş döner). Bu,
    // çok satıcılı bir siparişte satıcı bazlı ayrı kargo takibinin mobilde HİÇ
    // gösterilmediği anlamına geliyor — tam olarak bu denetimin aradığı sınıf:
    // sunucu iç içe bir yapı kuruyor, istemci hiç okumuyor. Kapanış: grup
    // ekranına satıcı bazlı kargo bölümü eklenince bu blok silinir. `packages`
    // altındaki `orders[]` üst düzey `orders[]` ile AYNI sipariş şeklini
    // taşıyor (`cargoCode`, `createdAt`, `activeRefundRequest`, … bu yüzden
    // tekrar ediyor).
    'groups.data.packages.cargo.cargoCode',
    'groups.data.packages.cargo.deliveredAt',
    'groups.data.packages.cargo.shippedAt',
    'groups.data.packages.orders.activeRefundRequest.createdAt',
    'groups.data.packages.orders.activeRefundRequest.refundNumber',
    'groups.data.packages.orders.activeRefundRequest.returnCargoCode',
    'groups.data.packages.orders.activeRefundRequest.returnProvider',
    'groups.data.packages.orders.activeRefundRequest.returnStatus',
    'groups.data.packages.orders.activeRefundRequest.returnTrackingNumber',
    'groups.data.packages.orders.buyer.avatarUrl',
    'groups.data.packages.orders.buyer.displayName',
    'groups.data.packages.orders.buyer.isVerified',
    'groups.data.packages.orders.buyer.publicName',
    'groups.data.packages.orders.buyer.username',
    'groups.data.packages.orders.buyerConfirmedAt',
    'groups.data.packages.orders.canReactivate',
    'groups.data.packages.orders.cancelCategory',
    'groups.data.packages.orders.cancelReason',
    'groups.data.packages.orders.cancellationType',
    'groups.data.packages.orders.cancelledAt',
    'groups.data.packages.orders.cargoCode',
    'groups.data.packages.orders.checkoutGroupId',
    'groups.data.packages.orders.completedAt',
    'groups.data.packages.orders.confirmationDeadline',
    'groups.data.packages.orders.createdAt',
    'groups.data.packages.orders.deliveredAt',
    'groups.data.packages.orders.groupNumber',
    'groups.data.packages.orders.isMembership',
    'groups.data.packages.orders.items.product.condition',
    'groups.data.packages.orders.items.product.imageUrl',
    'groups.data.packages.orders.packageId',
    'groups.data.packages.orders.packageNumber',
    'groups.data.packages.orders.paidAt',
    'groups.data.packages.orders.pricing.buyerFeeDiscountAmount',
    'groups.data.packages.orders.pricing.sellerFeeDiscountAmount',
    'groups.data.packages.orders.pricing.sellerShippingAmount',
    'groups.data.packages.orders.pricing.withholdingTaxAmount',
    'groups.data.packages.orders.product.condition',
    'groups.data.packages.orders.product.imageUrl',
    'groups.data.packages.orders.seller.avatarUrl',
    'groups.data.packages.orders.seller.displayName',
    'groups.data.packages.orders.seller.isVerified',
    'groups.data.packages.orders.seller.publicName',
    'groups.data.packages.orders.seller.username',
    'groups.data.packages.orders.shipment.cargoCode',
    'groups.data.packages.orders.shipment.deliveredAt',
    'groups.data.packages.orders.shipment.shippedAt',
    'groups.data.packages.orders.shippedAt',
    'groups.data.packages.orders.shippingAddress.addressLine1',
    'groups.data.packages.orders.shippingAddress.addressLine2',
    'groups.data.packages.orders.shippingAddress.postalCode',
    'groups.data.packages.orders.updatedAt',
    'groups.data.packages.packageNumber',
    'groups.data.packages.seller.avatarUrl',
    'groups.data.packages.seller.displayName',
    'groups.data.packages.seller.isVerified',
    'groups.data.packages.seller.publicName',
    'groups.data.packages.seller.username',

    // ── Mobil bu alanları hiç kullanmıyor ve kullanmamalı ───────────────────
    // Satıcı/idari muhasebe, doldurulmamış iptal alt-kırılımı, veya ekranda
    // karşılığı olmayan profil alanları. `app/orders/**` genelinde hiçbir
    // yerde okunmuyor (grep ile doğrulandı).
    //   - `canReactivate` / `cancelCategory` / `cancelReason` / `checkoutGroupId` /
    //     `packageId` / `updatedAt` / `completedAt` / `confirmationDeadline` /
    //     `buyerConfirmedAt`: sunucu tarafı muhasebe/iş akışı alanları — ekranın
    //     kullandığı denklik `status` + `cancellationType` + zaman damgaları.
    //   - `buyer`/`seller` altındaki `avatarUrl` / `isVerified` / `publicName` /
    //     `username`: sipariş ekranları yalnız `displayName` basıyor, profil
    //     kartı yok.
    //   - `pricing.buyerFeeDiscountAmount` / `sellerFeeDiscountAmount` /
    //     `sellerShippingAmount` / `withholdingTaxAmount`: kampanya/vergi
    //     kırılımı satıcı muhasebesine ait, alıcı/satıcı sipariş ekranlarında
    //     karşılığı yok (bkz. `OrderQuotePricing` — bunlar quote'ta da hiç yok).
    //   - `shippingAddress.addressLine1` / `addressLine2`: mobil tek bir
    //     `address` satırı gösteriyor (bkz. `OrderDetail.shippingAddress.address`).
    //   - `activeRefundRequest.returnCargoCode` / `returnStatus`: iade
    //     ekranı yalnız `returnProvider` + `returnTrackingNumber` gösteriyor.
    //   - `groups.data.kind`: grup tekli/çoklu ayrımını mobil zaten
    //     `orders.length === 1` ile İSTEMCİDE türetiyor (bkz. `useOrders.ts`).
    //   - `groups.data.viewerRole`: bu ekran yalnız alıcı rolünde çalışıyor
    //     (satıcı sekmesi ayrı bir uç kullanıyor), sunucudan rol okumaya
    //     gerek yok.
    //   - `groups.data.payment.paidAt`: grup düzeyinde ödeme özeti — ekran
    //     zaten her siparişin kendi `paidAt`'ini kullanıyor.
    //   - `*.meta.totalPages`: mobil `limit`/`page` ile sayfalıyor, toplam
    //     sayfa sayısını hiç okumuyor.
    'detail.activeRefundRequest.returnCargoCode',
    'detail.activeRefundRequest.returnStatus',
    'detail.buyer.avatarUrl',
    'detail.buyer.isVerified',
    'detail.buyer.publicName',
    'detail.buyer.username',
    'detail.buyerConfirmedAt',
    'detail.canReactivate',
    'detail.cancelCategory',
    'detail.cancelReason',
    'detail.checkoutGroupId',
    'detail.completedAt',
    'detail.confirmationDeadline',
    'detail.packageId',
    'detail.pricing.buyerFeeDiscountAmount',
    'detail.pricing.sellerFeeDiscountAmount',
    'detail.pricing.sellerShippingAmount',
    'detail.pricing.withholdingTaxAmount',
    'detail.seller.avatarUrl',
    'detail.seller.isVerified',
    'detail.seller.publicName',
    'detail.seller.username',
    'detail.shippingAddress.addressLine1',
    'detail.shippingAddress.addressLine2',
    'detail.updatedAt',
    'groups.data.kind',
    'groups.data.orders.activeRefundRequest.returnCargoCode',
    'groups.data.orders.activeRefundRequest.returnStatus',
    'groups.data.orders.buyer.avatarUrl',
    'groups.data.orders.buyer.isVerified',
    'groups.data.orders.buyer.publicName',
    'groups.data.orders.buyer.username',
    'groups.data.orders.buyerConfirmedAt',
    'groups.data.orders.canReactivate',
    'groups.data.orders.cancelCategory',
    'groups.data.orders.cancelReason',
    'groups.data.orders.checkoutGroupId',
    'groups.data.orders.completedAt',
    'groups.data.orders.confirmationDeadline',
    'groups.data.orders.packageId',
    'groups.data.orders.pricing.buyerFeeDiscountAmount',
    'groups.data.orders.pricing.sellerFeeDiscountAmount',
    'groups.data.orders.pricing.sellerShippingAmount',
    'groups.data.orders.pricing.withholdingTaxAmount',
    'groups.data.orders.seller.avatarUrl',
    'groups.data.orders.seller.isVerified',
    'groups.data.orders.seller.publicName',
    'groups.data.orders.seller.username',
    'groups.data.orders.shippingAddress.addressLine1',
    'groups.data.orders.shippingAddress.addressLine2',
    'groups.data.orders.updatedAt',
    'groups.data.payment.paidAt',
    'groups.data.viewerRole',
    'groups.meta.totalPages',
    'list.data.activeRefundRequest.returnCargoCode',
    'list.data.activeRefundRequest.returnStatus',
    'list.data.buyer.avatarUrl',
    'list.data.buyer.isVerified',
    'list.data.buyer.publicName',
    'list.data.buyer.username',
    'list.data.buyerConfirmedAt',
    'list.data.canReactivate',
    'list.data.cancelCategory',
    'list.data.cancelReason',
    'list.data.checkoutGroupId',
    'list.data.completedAt',
    'list.data.confirmationDeadline',
    'list.data.packageId',
    'list.data.pricing.buyerFeeDiscountAmount',
    'list.data.pricing.sellerFeeDiscountAmount',
    'list.data.pricing.sellerShippingAmount',
    'list.data.pricing.withholdingTaxAmount',
    'list.data.seller.avatarUrl',
    'list.data.seller.isVerified',
    'list.data.seller.publicName',
    'list.data.seller.username',
    'list.data.shippingAddress.addressLine1',
    'list.data.shippingAddress.addressLine2',
    'list.data.updatedAt',
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
    const src = readType('orders');
    const missing = undeclaredFields(fixture, src, KNOWN_UNDECLARED.orders);
    // Düşerse: alanı tipe ekle (Plan B task'ı) ya da neden okunmadığını yazıp
    // KNOWN_UNDECLARED'a al. Listeyi gerekçesiz büyütme.
    expect(missing).toEqual([]);
  });
});
