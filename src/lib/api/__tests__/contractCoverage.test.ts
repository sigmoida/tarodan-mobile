/**
 * Sözleşme kapsaması — sunucunun döndürdüğü her alan mobilin tipinde var mı?
 *
 * Parite denetimleri iki kez üst üste aynı sınıfı kaçırdı: sunucunun İÇ İÇE ve
 * DTO'suz alanları. `pricing.summary.quantityDiscount` bir serviste kuruluyor,
 * `dto/**` diffinde hiç görünmüyor — sepette kampanya indirimi etiketsiz
 * eriyordu. `rejectionReason` de öyle: satıcı ilanının neden reddedildiğini
 * hiçbir yerde göremiyordu.
 *
 * Bu test o sınıfı kapatıyor: ÖLÇÜLMÜŞ gövdedeki her alan adı, `ORDERS_TYPE_
 * SOURCES`'ta AŞAĞIDA SAYILAN dosyaların hiçbirinde geçmiyorsa ya gerekçesiyle
 * `KNOWN_UNDECLARED`'da durur ya da test düşer.
 *
 * TİP KAYNAKLARI TEK DOSYA DEĞİL: `src/lib/api/<domain>.ts` yalnız axios
 * yüzeyi — orada `getAll`/`getOne`/`getGroup`/`getGroups` jenerik `api.get()`
 * döndürüyor, gövdenin GERÇEK tipi rota-yerel `_lib/types.ts` dosyalarında
 * yaşıyor (`OrderDetail`, `GroupOrder`, `Order`/`OrderGroup`, …). Fix round
 * 1'de bu ayrım gözden kaçtı ve guard yalnız `orders.ts`'i okuyunca 217
 * "bildirilmemiş" alan çıktı — bunların çoğu rota-yerel tipte ZATEN
 * bildirilmişti, guard yanlış yere bakıyordu.
 *
 * ⚠️ `ORDERS_TYPE_SOURCES` bu gövdeyi deklare eden dosyaların BİLİNEN
 * listesidir, KANITLANMIŞ TAM listesi değildir — testin kendisi listenin
 * eksiksiz olduğunu doğrulayamaz. Yeni bir rota-yerel tip dosyası eklenirse
 * (ya da var olan bir alan yalnız YENİ bir dosyada bildirilirse) bu listeyi
 * güncellemek İNSAN sorumluluğu; unutulursa test SESSİZ kalır, uyarmaz
 * (fix round 2'de `app/orders/_lib/ordersStatus.ts` böyle eksik kalmıştı —
 * bugün fark etmedi çünkü yaprak adları zaten `OrderDetail`/`GroupOrder`'da
 * vardı, ama tesadüfti).
 *
 * SINIRI (iki farklı şey): (1) alan ADINA bakar, tipe ya da iç içe yapıya
 * DEĞİL — `total: string` yazılmışsa yakalamaz. (2) YAPRAK ADI EŞLEŞMESİ
 * KONUM-KÖR — bir ad tip kaynaklarının HERHANGİ BİRİNDE, HERHANGİ BİR ALAKASIZ
 * yapıda geçiyorsa "bildirilmiş" sayılır. Guard'ın YAKALADIĞI TEK ŞEY:
 * kod tabanının HİÇBİR YERDE hiç görmediği bir alan adı. YAKALAYAMADIĞI:
 * bilinen bir adın YENİ bir konumda belirmesi. Somut örnek (review turu 2'de
 * bulundu, guard'ın kendisi YAKALAMADI): `list.meta.total` / `groups.meta.total`
 * sayfalama alanları `declared` sayıldı çünkü `total` adı `orders.ts`'de
 * `OrderQuotePricingSummary.total` olarak (TAMAMEN alakasız bir checkout-fiyat
 * alanı) zaten geçiyordu — guard adı gördü, konumun sayfalama meta'sı değil
 * fiyat özeti olduğunu bilemedi. Bu iki satır `KNOWN_UNDECLARED`'da bu yüzden
 * elle duruyor.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  declaredButAbsent,
  extractTypeFields,
  fieldPaths,
  undeclaredFields,
} from './contractCoverage';

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
  'app/orders/_lib/ordersStatus.ts',
];

/** `checkout` fixture'ının (`POST /orders/quote`) gövdesini deklare eden dosyalar. */
const CHECKOUT_TYPE_SOURCES = ['src/lib/api/orders.ts', 'app/checkout/_lib/types.ts'];

/** `trades` fixture'ının gövdesini deklare eden tüm dosyalar (axios yüzeyi + rota-yerel tipler). */
const TRADES_TYPE_SOURCES = [
  'src/lib/api/trades.ts',
  'app/trade/[id]/_lib/types.ts',
  'app/trade/counter/[id]/_lib/types.ts',
  'app/trade/new/_lib/types.ts',
];

/**
 * `products` fixture'ının `mine` (GET /products/my) gövdesini deklare eden dosyalar.
 *
 * `list` (GET /products) KASITLI OLARAK burada YOK — bkz. dosya sonundaki
 * "products sözleşmesi" testinin başındaki not: `app/product/[id]/_lib/types.ts`
 * ürün/satıcı şeklini index signature (`[key: string]: any`) ile taşıyor, bu da
 * `list` gövdesi için guard'ı anlamsızlaştırıyor (55 "bildirilmemiş" alan —
 * neredeyse hepsi guard'ın YAPISAL olarak ölçemediği bir tip yüzünden, gerçek
 * bulgu değil gürültü). Task-3 brief'in kararı: `products/my` (`Listing` tipi
 * EXPLICIT — tarihsel `rejectionReason` kaçırması da oradan çıkmıştı) kapsanır,
 * ürün-detay gövdesi tiplemesi sıkılaştırılana kadar kapsam DIŞI bırakılır.
 *
 * `src/components/listing/_lib/types.ts` (`EditProjection`/`EditImage`) BREF'İN
 * öngörmediği ÜÇÜNCÜ bir kaynak — `GET /products/my/:id` (düzenleme ucu) aynı
 * ürün gövdesini taşıyor ve `cardKey`/`detailKey`/`cardUrl`/`detailUrl`/
 * `sortOrder`/`description`/`modelCode`/`color`/... gibi `my-listings`'in
 * `Listing` tipinde YOK ama düzenleme akışında GERÇEKTEN kullanılan birçok
 * alanı burada bildiriyor. Eklenmeden önce 39 "bildirilmemiş" alan vardı,
 * eklenince 11'e düştü — kalanı gerçekten hiç bildirilmiyor.
 */
const PRODUCTS_TYPE_SOURCES = [
  'app/settings/my-listings/_lib/types.ts',
  'app/product/[id]/_lib/types.ts',
  'src/components/listing/_lib/types.ts',
];

/**
 * `membership` fixture'ının (`tiers`+`me`+`limits`) gövdesini deklare eden dosyalar.
 *
 * `src/hooks/useMembershipLimits.ts` BREF'İN öngörmediği bir kaynak — `GET
 * /membership/me/limits`'in TAM alan listesini (13 alan) JSDoc'ta ÖLÇÜLMÜŞ
 * olarak belgeliyor ve beşini `ServerLimitsDto`'ya (gerçek KOD, yorum değil)
 * eşliyor; kalan sekizinin neden okunmadığını da orada anlatıyor.
 *
 * ⚠️ Bu dosyanın eklenmesi kapsamayı İYİLEŞTİRMEDİ, KARIŞTIRDI: `declared` seti
 * yorumları da tarıyordu (fix — bkz. `contractCoverage.ts` `stripComments`),
 * yani JSDoc'un saydığı 13 ad — beşi `ServerLimitsDto`'da gerçekten kod olarak
 * bildirilmiş olsa da — kalan dokuzu SADECE bu cümlede geçtiği için
 * "bildirilmiş" sayılıyordu. Yorumlar atılınca bu dokuzu `KNOWN_UNDECLARED.
 * membership`'e gerekçeleriyle taşımak gerekti (aşağıda).
 */
const MEMBERSHIP_TYPE_SOURCES = [
  'app/membership/manage/_lib/types.ts',
  'app/membership/_lib/membershipTiers.ts',
  'src/lib/api/membership.ts',
  'src/hooks/useMembershipLimits.ts',
];

/** `user` fixture'ının (`me`+`addresses`) gövdesini deklare eden dosyalar. */
const USER_TYPE_SOURCES = [
  'src/types/user.ts',
  'src/stores/authStore.ts',
  'app/settings/addresses/_lib/types.ts',
];

/**
 * `messaging` fixture'ının (`GET /messages/threads`) gövdesini deklare eden dosyalar.
 *
 * Brief `app/messages/` altına bakmayı öneriyordu — orada YOK. Gerçek tip
 * `src/stores/messagesStore.ts`'te (`MessageThread`/`Message`) yaşıyor, ama
 * ondan da önemlisi `src/lib/messaging/normalize.ts`: API düz alanlar
 * (`participant1Id`/`participant1Name`/`participant1AvatarUrl`, …) döndürüyor,
 * `MessageThread` tipi İÇ İÇE `participant1`/`participant2` nesnesi bekliyor —
 * `normalizeThread` ikisi arasındaki KÖPRÜ ve ham alan adlarının GERÇEK
 * bildirim yeri. Bu dosya olmadan guard `participant1Id` gibi alanları hiç
 * göremezdi.
 */
const MESSAGING_TYPE_SOURCES = [
  'src/lib/api/messaging.ts',
  'src/stores/messagesStore.ts',
  'src/lib/messaging/normalize.ts',
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
    // `src/lib/api/orders.ts`'i değil, `ORDERS_TYPE_SOURCES`'taki dosyaları
    // (fix round 2'de dördüncüsü — `ordersStatus.ts` — eklendi) birlikte
    // okuyor. İlk tur 217 alan listelemişti; büyük çoğunluğu rota-yerel
    // tiplerde (`OrderDetail`, `GroupOrder`, `Order`/`OrderGroup`) ZATEN
    // bildirilmişti — guard yanlış yere bakıyordu, alan eksik değildi.
    // Aşağıdaki satırların NEREDEYSE TAMAMINI `app/orders/**` içinde
    // `grep`le tek tek doğruladım: hiçbiri hiçbir ekranda okunmuyor. İKİ
    // İSTİSNA VAR — `list.meta.total` / `groups.meta.total` — bunlar `grep`le
    // değil, review turu 2'nin bulduğu bir isim çakışmasıyla buraya geldi;
    // ayrıntı bu iki satırın kendi yorumunda ve dosya başı SINIRI notunda.
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
    //   - Sunucunun `groups.data.kind` alanı grup tekli/çoklu ayrımı içindir;
    //     mobil bunu zaten `orders.length === 1` ile İSTEMCİDE türetiyor
    //     (bkz. `useOrders.ts`), sunucu alanını hiç okumuyor. Satır fix
    //     round 2'de `KNOWN_UNDECLARED`'dan SİLİNDİ — `ordersStatus.ts`
    //     `ORDERS_TYPE_SOURCES`'a eklenince `OrderListEntry`'nin kendi
    //     `kind: 'order' | 'group'` etiketi (TAMAMEN ayrı, yerel bir UI
    //     alanı) guard'a "bildirilmiş" gösterdi. Alan hâlâ okunmuyor; bu
    //     yalnız dosya başı SINIRI notundaki isim-çakışması sınırının BİR
    //     BAŞKA canlı örneği — `meta.total` ile aynı sınıf, bu kez allowlist'i
    //     KISALTAN yönde.
    //   - `groups.data.viewerRole`: bu ekran yalnız alıcı rolünde çalışıyor
    //     (satıcı sekmesi ayrı bir uç kullanıyor), sunucudan rol okumaya
    //     gerek yok.
    //   - `*.meta.limit` / `page` / `totalPages`: mobil sayfalama üstverisini
    //     HİÇ okumuyor — `useOrders.ts`/`useOrderGroup.ts` sabit bir
    //     `limit`/`page` GÖNDERİYOR ama yanıttaki `meta`'ya hiç bakmıyor
    //     (`grep -rn '\.meta\b' app/orders` boş döner). Önceki turda bu
    //     "kullanılıyor" sayılmıştı — o bir yanlıştı, istek parametresiyle
    //     yanıt alanı karıştırılmıştı; burada düzeltildi.
    //   - `*.meta.total`: AYNI sayfalama üstverisi ailesi, AYNI sebeple hiç
    //     okunmuyor — ama `limit`/`page`/`totalPages`'ın aksine bu ikisi
    //     guard TARAFINDAN YAKALANMADI, review turu 2'de elle bulundu:
    //     `total` adı `orders.ts`'de `OrderQuotePricingSummary.total`
    //     (checkout fiyat özeti, sayfalamayla İLGİSİZ) olarak zaten geçtiği
    //     için guard onu "bildirilmiş" saydı. Dosya başı SINIRI notundaki
    //     isim-çakışması örneği budur.
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
    'groups.meta.total',
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
    'list.meta.total',
    'list.meta.totalPages',
  ]),
  checkout: new Set<string>([
    // ── BOŞLUK — Plan B ──────────────────────────────────────────────────
    // `pricing.summary.feeDiscountTotal` (bedel kampanyalarının TOPLAMI) tipte
    // var ve `useCheckout.ts`/`OrderSummary.tsx` onu basıyor. Ama kökte AYRICA
    // bu toplamın alıcı/satıcı KIRILIMI dönüyor (`buyerFeeDiscountTotal` +
    // `sellerFeeDiscountTotal` = `feeDiscountTotal`) — bu ikisi `orders.ts`'te
    // HİÇ bildirilmemiş (kökteki diğer tüm `pricing.*` eşdeğerleri —
    // `itemsSubtotal`, `shippingAmount`, `buyerFeeAmount`, … — zaten `OrderQuoteResponse`'ta
    // var, yalnız bu iki alan atlanmış). Bu tam olarak bu denetimin doğduğu sınıf
    // (kampanya indirimi kırılımı) olduğu için "mobil kullanmamalı" DEĞİL,
    // gerçek bir boşluk olarak işaretliyorum — bugün her iki değer de `0`
    // (aktif kampanya yok), ne zaman okunacağı Plan B'nin kararı.
    'quoteSingle.buyerFeeDiscountTotal',
    'quoteSingle.sellerFeeDiscountTotal',
    'quoteMulti.buyerFeeDiscountTotal',
    'quoteMulti.sellerFeeDiscountTotal',
  ]),
  trades: new Set<string>([
    // ── Mobil bu alanları hiç kullanmıyor ve kullanmamalı ───────────────────
    // Cash-satırı alanları (`tradeFeeAmount` vb.) `TradeCashPayment`'ta
    // (`app/trade/[id]/_lib/types.ts`, `TRADES_TYPE_SOURCES`'ta) ZATEN
    // bildirilmiş olduğu için bu listede yok — brief'in öngördüğü yanlış
    // pozitif çıkmadı, kontrol edildi.
    //
    // `page`/`pageSize`: istek parametresi olarak GÖNDERİLİYOR
    // (`app/trades.tsx`: `pageSize: '100'`) ama yanıttaki yankısı hiç
    // okunmuyor — `orders`'daki `meta.limit`/`page` ile AYNI sınıf
    // (istek parametresiyle yanıt alanının karıştırılmaması gerektiği ders).
    'list.page',
    'list.pageSize',
    // `updatedAt`: ekran durum geçişlerini kendi zaman damgalarından
    // (`acceptedAt`/`cancelledAt`/`completedAt`/`firstWarehouseArrivalAt`, …)
    // türetiyor; genel `updatedAt`'e hiç bakılmıyor.
    'list.trades.updatedAt',
    'detail.updatedAt',
    // `initiatorShipment`/`receiverShipment` (kökte, tekil KOLAYLIK nesneleri):
    // `app/trade/[id]/_lib/derive.ts` yalnız `trade.shipments[]` dizisini
    // `direction`/`senderUserId`/`recipientUserId` ile süzüyor
    // (`myToWarehouseShipment` vb.); bu iki kök alan `grep`le doğrulandı, HİÇBİR
    // ekranda okunmuyor — `shipments[]` zaten aynı bilgiyi taşıyor.
    'list.trades.initiatorShipment.confirmedAt',
    'list.trades.initiatorShipment.deliveredAt',
    'list.trades.initiatorShipment.shippedAt',
    'list.trades.initiatorShipment.shipperId',
    'list.trades.initiatorShipment.shipperName',
    'list.trades.receiverShipment.confirmedAt',
    'list.trades.receiverShipment.deliveredAt',
    'list.trades.receiverShipment.shippedAt',
    'list.trades.receiverShipment.shipperId',
    'list.trades.receiverShipment.shipperName',
    'detail.initiatorShipment.confirmedAt',
    'detail.initiatorShipment.deliveredAt',
    'detail.initiatorShipment.shippedAt',
    'detail.initiatorShipment.shipperId',
    'detail.initiatorShipment.shipperName',
    'detail.receiverShipment.confirmedAt',
    'detail.receiverShipment.deliveredAt',
    'detail.receiverShipment.shippedAt',
    'detail.receiverShipment.shipperId',
    'detail.receiverShipment.shipperName',
    // `shipments[].deliveredAt` / `shippedAt`: mobil kargo kartı yalnız
    // `status` + `trackingNumber` + `carrier` basıyor (`TradeShippingSection.tsx`,
    // `ShipmentStatusChip`), zaman damgası hiç gösterilmiyor.
    'list.trades.shipments.deliveredAt',
    'list.trades.shipments.shippedAt',
    'detail.shipments.deliveredAt',
    'detail.shipments.shippedAt',
    //
    // ── BOŞLUK — Plan B ──────────────────────────────────────────────────
    // `dispute.raisedById` / `resolution` / `resolvedAt`: mobil "itiraz aç"
    // YAZMA akışını sunuyor (`useTradeActions.ts` → `DisputeTradeModal`) ama
    // açılmış bir itirazın SONUCUNU hiçbir yerde okumuyor/göstermiyor — bir
    // takas `disputed` olduktan sonra kullanıcı çözümü öğrenemiyor. Yazma var,
    // okuma yok.
    'list.trades.dispute.raisedById',
    'list.trades.dispute.resolution',
    'list.trades.dispute.resolvedAt',
  ]),
  products: new Set<string>([
    // ── Mobil bu alanları hiç kullanmıyor ve kullanmamalı (bu EKRANDA) ──────
    // `useMyListings.ts`/`MyListingsSections.tsx`/`MyListingsModals.tsx` içinde
    // `grep`le tek tek doğrulandı. Hepsi ürünün BAŞKA ekranlarında (ürün detay,
    // arama sonucu kartı, satıcı vitrini) GERÇEKTEN okunuyor ve kendi rota-yerel
    // tiplerinde bildirilmiş — yalnız `products/my` (ilanlarım YÖNETİM ekranı)
    // bunları göstermiyor, ki zaten mantıklı: bu ekran "benim ilanım" listesi,
    // vitrin/arama kartı değil.
    //   - `discountPercent` / `isOnSale` / `originalPrice`: indirim rozeti —
    //     `SearchResultCard.tsx`/`ListingSections.tsx`'te var, yönetim
    //     listesinde satıcı zaten kendi fiyatını biliyor.
    //   - `isBoosted`: bu ekranda (`MyListingsSections.tsx`) hiç okunmuyor —
    //     `products/my` listesi öne çıkarma rozeti hiç basmıyor. `boostedUntil`
    //     (Listing tipinde ZATEN bildirilmiş) `isBoosted`'ın eşdeğeri OLDUĞU
    //     için değil, `index.tsx:84`'te `BoostModal`'a geri sayım için
    //     GEÇİRİLDİĞİ için burada bildirilmiş — `ProductCard.tsx`'teki
    //     `item.isBoosted || item.boostedUntil` bu ekranda hiç kullanılmıyor,
    //     o OR zaten ikisinin birbirinin YERİNE geçmediğinin kanıtı (biri
    //     doluyken diğeri boş olabildiği durum için var).
    //   - `productCode`: yalnız `ProductInfo.tsx` (ürün detay "teknik özellikler"
    //     bloğu) gösteriyor, yönetim listesinde yok.
    //   - `sellerId`: bu zaten KENDİ ilanım — sahibi belli, göstermeye gerek yok.
    //   - `tradeAvailable`: `isTradeEnabled` (Listing tipinde ZATEN bildirilmiş)
    //     bu ekranın kullandığı denklik; `tradeAvailable` yalnız satıcı vitrini
    //     (`SellerTabs.tsx`) ve kayıtlı arama filtresinde kullanılıyor.
    'data.discountPercent',
    'data.isBoosted',
    'data.isOnSale',
    'data.originalPrice',
    'data.productCode',
    'data.sellerId',
    'data.tradeAvailable',
    // `meta.*`: `useMyListings.ts` `response.data?.data || response.data || []`
    // ile YALNIZ `.data`'yı okuyor, `.meta`'ya hiç dokunmuyor — `orders`/`trades`
    // ile AYNI "sayfalama üstverisi hiç okunmuyor" sınıfı.
    'meta.limit',
    'meta.page',
    'meta.total',
    'meta.totalPages',
  ]),
  membership: new Set<string>([
    // ── Yorum-şeridi fix'i açığa çıkardı: `useMembershipLimits.ts`'in JSDoc'u
    // (satır ~14-19) `GET /membership/me/limits`'in 13 alanını ÖLÇÜLMÜŞ olarak
    // sayıyor ama yalnız beşi (`maxTotalListings`/`maxImages`/
    // `canCreateCollection`/`canTrade`/`isAdFree`) `ServerLimitsDto`'da GERÇEK
    // koddur. Kalan dokuz — yorumlar taranırken "bildirilmiş" görünüyordu,
    // artık görünmüyor. JSDoc'un kendi metni nedenini zaten anlatıyor:
    // ──────────────────────────────────────────────────────────────────────
    //   - `canCreateListing`: `ServerLimitsDto`'ya eşlenmiyor — mobil kendi
    //     `canCreateListing`'ini `authStore.ts`/`useListingForm.ts` içinde
    //     yerelden hesaplıyor (`grep -rn canCreateListing app src` bunu
    //     gösteriyor); sunucunun aynı adlı alanı hiç okunmuyor, isim çakışması.
    //   - `canUseFreeSlot`: `ServerLimitsDto`'da yok, kod tabanında BAŞKA hiçbir
    //     yerde de geçmiyor (`grep -rn canUseFreeSlot app src` boş) — hiç
    //     okunmuyor.
    //   - `tiers.maxFreeListings` / `me.tier.maxFreeListings` / `limits.
    //     maxFreeListings`: `ServerLimitsDto` yalnız `maxTotalListings`'i
    //     eşliyor, `maxFreeListings`'i değil. `authStore.ts`'teki aynı adlı
    //     alan (`apiUser.maxFreeListings`) FARKLI bir uçtan (`GET /users/me`)
    //     geliyor — isim çakışması, bu üç yol hiç okunmuyor.
    //   - `me.remainingFreeListings` / `limits.remainingFreeListings` /
    //     `me.remainingTotalListings` / `limits.remainingTotalListings`:
    //     JSDoc'un dediği gibi türetilmiş sayaçlar — mobil kotayı
    //     `GET /products/my/stats`'tan türetiyor (bkz. aşağıdaki
    //     `usedFreeListings`/`usedTotalListings` gerekçesi), sunucunun hazır
    //     `remaining*` alanlarını hiç okumuyor.
    'limits.canCreateListing',
    'limits.canUseFreeSlot',
    'tiers.maxFreeListings',
    'me.tier.maxFreeListings',
    'limits.maxFreeListings',
    'me.remainingFreeListings',
    'limits.remainingFreeListings',
    'me.remainingTotalListings',
    'limits.remainingTotalListings',
    // `me.userId` / `me.createdAt`: kayıt üstverisi, hiçbir ekran okumuyor.
    'me.userId',
    'me.createdAt',
    // `me.usedFreeListings` / `me.usedTotalListings`: `GET /membership/me`
    // zaten kota KULLANIMINI taşıyor ama mobil kota hesabını AYRI bir uçtan
    // (`GET /products/my/stats` → `summary.used`/`max`/`canCreate`,
    // `useMyListings.ts`) türetiyor — iki kaynak aynı bilgiyi taşıyor, mobil
    // ikincisini seçmiş. `grep -rn 'usedFreeListings\|usedTotalListings' app src`
    // boş dönüyor.
    'me.usedFreeListings',
    'me.usedTotalListings',
  ]),
  user: new Set<string>([
    // ── Fixture'ın kendi yapısı, sunucu alanı DEĞİL ─────────────────────────
    // `addresses` (kök): bu hesabın kayıtlı adresi YOK, `GET /users/me/addresses`
    // boş dizi döndü. `fieldPaths` boş diziyi ALANIN KENDİSİ olarak raporluyor
    // (bkz. dosya başı `fieldPaths` yorumu, `feeDiscounts: []` örneği) — ama
    // orada `feeDiscounts` GERÇEK bir API alan adıydı, burada `addresses` bu
    // fixture'ın KENDİ üst-seviye anahtarı (`{ me, addresses }`), sunucu
    // yanıtının kendisi çıplak bir dizi. Gerçek `Address` şekli
    // `app/settings/addresses/_lib/types.ts`'te bildirilmiş ve
    // `useAddresses.ts` onu okuyor — yalnız bu hesapta ölçülecek satır yok.
    'addresses',
    // ── `me.membership.*` / `me.stats.*` / `me.addresses`: GET /users/me AYRI
    // bir alanda AYNI bilgiyi tekrarlıyor, mobil o kopyaları değil KENDİ
    // uçlarını okuyor ──────────────────────────────────────────────────────
    //   - `me.addresses`: `GET /users/me/addresses` (ayrı uç, `useAddresses.ts`)
    //     zaten var; `mapApiUserToUser` (`authStore.ts`) `apiUser.addresses`'a
    //     hiç dokunmuyor.
    //   - `me.membership.status` / `currentPeriodStart` / `currentPeriodEnd` /
    //     `tier.maxTotalListings`: `GET /membership/me` (ayrı uç,
    //     `useMembership.ts`/`useMembershipManage.ts`) zaten bu bilgiyi taşıyor.
    //     `mapApiUserToUser` yalnız `apiUser.membership?.tier?.type`'ı (tier
    //     ADINI) okuyor — `extractMembershipTier`, bkz. aşağı — kalanına
    //     dokunmuyor.
    //   - `me.stats.averageRating` / `totalListings`: bu STATS objesi
    //     `GET /users/:id/profile` (public profil, `getPublicProfile`) yanıtının
    //     bir kopyası; `useProfileData.ts` `apiStats` değişkenini
    //     `getPublicProfile`'dan dolduruyor, `/users/me`'nin KENDİ `stats`'ına
    //     hiç bakmıyor.
    'me.addresses',
    'me.membership.currentPeriodEnd',
    'me.membership.currentPeriodStart',
    'me.membership.status',
    'me.membership.tier.maxTotalListings',
    'me.stats.averageRating',
    'me.stats.totalListings',
    // ── `me.isPremium` / `trustScore` / `trustLevel` / `showTrustScore`: OKUNUYOR
    // — ama bu 3 dosyanın HİÇBİRİNDEN değil ─────────────────────────────────
    // `app/(tabs)/_hooks/useProfileData.ts` `userApi.getProfile()`'ı (AYNI
    // `/users/me` ucu) İKİNCİ kez, HAM `any`-cast ile çağırıyor
    // (`meProfile`, satır ~58-70) ve dördünü de doğrudan okuyor — bu üç tip
    // kaynağından hiçbirinde İSİM olarak geçmiyorlar çünkü orada bir TİP değil,
    // dinamik erişim var. Guard'ın ADI aradığı yer yalnız "tip bildiren"
    // dosyalar; bu alanlar bildirilmiş bir TİPTEN değil ham sorgu kodundan
    // okunuyor — guard'ın kapsamadığı ama gerçekte OKUNAN alanlar sınıfı.
    'me.isPremium',
    'me.trustScore',
    'me.trustLevel',
    'me.showTrustScore',
    // ── Hiç okunmuyor (kayıt/moderasyon/admin üstverisi, mobilde karşılığı yok) ─
    'me.acceptsMarketingEmails',
    'me.adminCode',
    'me.bannedAt',
    'me.companyCity',
    'me.companyDistrict',
    'me.companyType',
    'me.deletedAt',
    'me.homeTourVersion',
    'me.isBanned',
    'me.lastActivityAt',
    'me.lastLoginAt',
    'me.listingTourVersion',
    'me.notificationSettings',
    'me.preferredLanguage',
    'me.storeViewCount',
    'me.usernameClaimedAt',
  ]),
  messaging: new Set<string>([
    // `page` / `pageSize` / `total`: `useThreadsQuery` (`src/hooks/messaging/
    // queries.ts`) `res.data?.threads || res.data?.data || res.data || []` ile
    // YALNIZ `.threads`'i okuyor — `orders`/`trades`/`products` ile AYNI
    // "sayfalama üstverisi hiç okunmuyor" sınıfı.
    'page',
    'pageSize',
    'total',
    // `lastMessage.senderName` / `receiverName`: `Message` tipi (`messagesStore.ts`)
    // yalnız `senderId`/`receiverId` taşıyor, gösterim adı zaten
    // `participant1`/`participant2`'den (`getOtherParticipant`) geliyor —
    // denormalize edilmiş isim ikinci kez okunmuyor.
    'threads.lastMessage.receiverName',
    'threads.lastMessage.senderName',
    //
    // `threads.lastMessageAt`: thread'in kendi "son aktivite" zaman damgası —
    // `ThreadRow.tsx` bunun yerine `thread.lastMessage.createdAt` (yoksa
    // `thread.createdAt`) kullanıyor. Staging'de ölçülen örnekte ikisi FARKLI
    // (`lastMessage.createdAt`: 06:21, `lastMessageAt`: 07:21) — hangisinin
    // "doğru" son aktivite olduğu backend'in bilgisi, ama mobil ayrı bir alanı
    // hiç okumuyor. Küçük bir hassasiyet farkı (sıralama/"az önce" metni
    // birkaç dakika kayabilir), `productTitle` kadar ciddi değil — yine de not
    // düşülüyor.
    'threads.lastMessageAt',
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

/**
 * TERS YÖN — istemcinin sunucunun hiç göndermediği bir adı ARAMASI.
 *
 * `analytics` ekranı `limits.maxListings === -1` diye karşılaştırıyordu; sunucu
 * `maxTotalListings` gönderiyor, `maxListings` HİÇ yok — premium üye premium
 * bölümü hiç görmüyordu. 2FA kurulumu `payload.qrCode` okuyordu; sunucu
 * `qrCodeImage` gönderiyor. İkisi de elle bulundu, `undeclaredFields` bu sınıfı
 * hiç yakalamıyor (o yön yalnız TERSİNİ görür: sunucunun gönderip mobilin
 * BİLDİRMEDİĞİ alan).
 *
 * SINIRI (elle yazılması istenen kısım): bu yalnız TİPTE bildirilen bir adı
 * yakalar. `payload.qrCode` gibi bir okuma `any`'YE yapılıyorsa — hiçbir tipte
 * hiç geçmiyorsa — `extractTypeFields`'a hiç girmez, bu fonksiyon onu GÖREMEZ.
 * O sınıf (untyped/`any` okuma) KAYNAK TARAMASI ister; `styles.card` / `theme.
 * colors` / `router.push` gibi gürültüyü ELEMESİ gerekir, bu FARKLI ve DAHA ZOR
 * bir araç. Bu test yalnız "tipte adı var, hiçbir ölçülen gövdede o ad yok"
 * sınıfını kapsar — başka hiçbir şeyi değil.
 *
 * `extractTypeFields`'IN KENDİ İKİ SINIRI (fix round 1, inceleme buldu, ikisi
 * de dosyanın `extractTypeFields` yorumunda AYRINTILI): (1) yalnız NESNE TİPİ
 * HARFİYEN bildirimlerini okur — bir BİRLEŞİM (union, `{ a } | { b }`) verilirse
 * sessizce ilk kolu döndürmek yerine FIRLATIR, çünkü sessiz kısmi kapsama
 * "beşinci bir tip eklemek BİLİNÇLİ bir eylem olmalı" ilkesinin karşıtı olurdu.
 * (2) yalnız DÜZ ÖZELLİKLERİ okur — derinlik sayacı `(`/`)` izlemediği için
 * `doThing(x: number): void` gibi bir METOD üyesi verilirse parametre adı
 * sahte bir "alan" olarak sızar; bu bilerek düzeltilmedi (parantez takibi
 * kapsamı genişletirdi), yalnız burada yazılı bir sınır. İkisi de BUGÜN canlı
 * DEĞİL — `PARITY_TYPES`'taki dört tipin hiçbiri birleşim değil, hiçbirinde
 * metod üyesi yok — ama biri eksik kalsaydı bu listenin dürüstlüğü eksik
 * kalırdı: bir sonraki bakımcı yalnız BULUNAN sınırları değil, TÜM sınırları
 * bilmeli.
 *
 * NEDEN DOMAIN DEĞİL, TEK TEK ADLANDIRILMIŞ TİP: ilk deneme `declaredButAbsent`'ı
 * doğrudan bütün `*_TYPE_SOURCES` dosyalarına karşı çalıştırmıştı (`undeclaredFields`'ın
 * `declared` setiyle AYNI geniş kimlik taraması). O yön için (bir alan adının
 * dosyanın HERHANGİ bir yerinde geçip geçmediği) güvenliydi; TERS yönde felaketti —
 * dosyalar axios metod adlarını, store eylemlerini, İLGİSİZ uçların tiplerini de
 * "bildiriyordu", yedi domainin YEDİSİ de 40 satır eşiğini (74-285 arası) katladı —
 * ilk `undeclaredFields` denemesinin 217 alanla yanlış dosyaya bakması ile AYNI
 * sınıf hata. Kural: `PARITY_TYPES` aşağıda yalnız GERÇEKTEN bir sunucu yanıt
 * gövdesini tanımladığını iddia eden, adı VERİLMİŞ dört tipi sayar —
 * `extractTypeFields` yalnız o tipin KENDİ blok gövdesini okur, dosyanın
 * kalanını değil. BEŞİNCİ bir tip eklemek (yeni bir `extractTypeFields` çağrısı)
 * her zaman BİLİNÇLİ, elle bir karar — guard listeye göre kendiliğinden
 * genişlemez, onu dürüst tutan şey bu.
 *
 * GERÇEK BULGULAR (elle doğrulandı, aşağıdaki geçitle de doğrulanıyor):
 * `ServerLimitsDto.maxListings` yok, ama `useMembershipLimits.ts:43`
 * (`out.maxListings = dto.maxTotalListings`) onu GERÇEK bir çıktı alanı olarak
 * atıyor — bu doğrudan `ServerLimitsDto`'nun alanı DEĞİL (bkz. aşağıdaki not,
 * `maxListings` `ServerLimitsDto`'da yok, `ServerLimitsOverride`'da). Bu
 * fonksiyonun asıl yakaladığı, `ServerLimitsDto.isAdFree`: tip bunu bildiriyor,
 * membership fixture'ının `limits` gövdesi (11 alan) arasında YOK — sunucu
 * artık göndermiyor.
 */
describe('extractTypeFields', () => {
  it('adı verilen tipin üst düzey alanlarını döndürür', () => {
    const src = 'export type X = { a: number; b?: string };';
    expect(extractTypeFields(src, 'X')).toEqual(['a', 'b']);
  });

  it('başka bir tipe REFERANS veren alanın kendi adını sayar, hedef tipin alanlarını değil', () => {
    const src = 'export type Y = { total: number }; export type X = { summary?: Y };';
    expect(extractTypeFields(src, 'X')).toEqual(['summary']);
  });

  it('satır içi iç içe nesne tipinin İÇİNDEKİ adları atlar — yalnız kendi üst düzeyi', () => {
    const src = 'export type X = { a: number; nested: { b: string } };';
    expect(extractTypeFields(src, 'X')).toEqual(['a', 'nested']);
  });

  it('yorumdaki adı bildirim saymaz (stripComments)', () => {
    const src = '// ayrıca ghostField döner\nexport type X = { a: number };';
    expect(extractTypeFields(src, 'X')).toEqual(['a']);
  });

  it('adı verilen tip dosyada yoksa boş dizi döner', () => {
    const src = 'export type X = { a: number };';
    expect(extractTypeFields(src, 'DoesNotExist')).toEqual([]);
  });

  it('BİRLEŞİM (union) tipinde SESSİZCE ilk kolu döndürmek yerine FIRLATIR', () => {
    // Fix round 1: `{ a } | { b }` verilince önceki davranış yalnız `a`'yı
    // döndürüp `b`'yi hiç işaret etmeden düşürüyordu. Beşinci bir tip
    // eklemek BİLİNÇLİ bir eylem olmalı — sessiz kısmi kapsama bunun tam
    // karşıtı, bu yüzden burada fırlatmak DOĞRU başarısızlık biçimi.
    // Not: Türkçe büyük `İ` JS'in `/i` bayrağıyla küçük `i`'ye basit bir
    // şekilde eşlenmiyor (Unicode case-folding farkı) — büyük/küçük harf
    // karışık bir regex yerine mesajdaki gerçek harfle birebir eşleşen bir
    // alt dizi arıyoruz.
    const src = 'export type X = { a: number } | { b: string };';
    expect(() => extractTypeFields(src, 'X')).toThrow('BİRLEŞİM');
  });
});

describe('declaredButAbsent', () => {
  it('gövdede olmayan bildirilmiş adı raporlar', () => {
    expect(declaredButAbsent(['maxListings'], [{ maxTotalListings: 5 }], new Set())).toEqual([
      'maxListings',
    ]);
  });

  it('EN AZ BİR gövdede geçen adı raporlamaz — tek gövdede eksik olmak normal', () => {
    expect(
      declaredButAbsent(
        ['cancelledAt', 'maxListings'],
        [{ cancelledAt: null }, { status: 'ok' }],
        new Set(['maxListings']),
      ),
    ).toEqual([]);
  });

  it('allowlist’teki adı raporlamaz', () => {
    expect(
      declaredButAbsent(['maxListings'], [{ other: 1 }], new Set(['maxListings'])),
    ).toEqual([]);
  });

  it('iç içe bir KONTEYNER adını da (yaprak olmasa da) var sayar', () => {
    // `fieldPaths` `pricing`'in kendisini hiç yaprak olarak üretmez — yalnız
    // `pricing.summary.total` gibi bir yaprak yolu. `OrderQuoteResponse.pricing`
    // gibi bir alan GERÇEKTEN dolu bir gövdede bile yalnız yapraklara bakılsaydı
    // yanlışlıkla "yok" çıkardı; bkz. `declaredButAbsent` yorumu.
    expect(
      declaredButAbsent(['pricing'], [{ pricing: { summary: { total: 1 } } }], new Set()),
    ).toEqual([]);
  });
});

/**
 * `KNOWN_ABSENT` domainlerin `*_TYPE_SOURCES`'una DEĞİL, `PARITY_TYPES`'taki
 * TEK tiplere karşı yazılıyor — bkz. yukarıdaki "NEDEN DOMAIN DEĞİL" notu.
 * Her satır bir KARAR: ya "tip bu fixture'ın ÖLÇMEDİĞİ bir durumu tanımlıyor"
 * ya da "istemci sunucunun göndermediği bir şeyi adlandırıyor" (sonraki bir
 * tur için gerçek bulgu, burada DÜZELTİLMİYOR).
 */
const KNOWN_ABSENT: Record<string, Set<string>> = {
  ServerLimitsDto: new Set<string>([
    // ── Gerçek bulgu — istemci sunucunun göndermediği bir şeyi adlandırıyor ──
    // `isAdFree`: tip bunu bildiriyor (`src/hooks/useMembershipLimits.ts:36`,
    // `mapServerLimits` de okuyup `ServerLimitsOverride.isAdFree`'ye eşliyor —
    // kod ÇALIŞIR durumda), ama membership fixture'ının `limits` gövdesi
    // (`GET /membership/me/limits`, 11 alan) arasında `isAdFree` HİÇ yok —
    // sunucu artık göndermiyor. `maxListings`'in aksine bu `ServerLimitsDto`'nun
    // KENDİ alanı, dolaylı bir isim çakışması değil — sonraki bir turda
    // backend'e sorulmalı: alan kaldırıldı mı, yoksa bu uçta hiç mi yayınlanmadı.
    'isAdFree',
  ]),
  OrderQuoteResponse: new Set<string>([]),
  OrderQuotePricingSummary: new Set<string>([]),
  OrderQuoteFeeDiscount: new Set<string>([
    // ── Tip bu fixture'ın ÖLÇMEDİĞİ bir durumu tanımlıyor ──────────────────
    // `target`/`name`/`code`/`amount`: `OrderQuoteFeeDiscount`'un KENDİ alanları
    // (bedel kampanyası indirim SATIRININ şekli), ama `feeDiscounts` her iki
    // ölçülen quote'ta da (`quoteSingle`+`quoteMulti`) `[]` döndü — aktif
    // kampanya yoktu (bkz. `fieldPaths` dosya başı yorumu: boş dizi alanın
    // KENDİSİNİ raporlar, iç şeklini değil — bu satırların `KNOWN_UNDECLARED`
    // değil `KNOWN_ABSENT`'te olma sebebi de bu: `fieldPaths` onları hiç
    // ÜRETMEDİ, `declaredButAbsent` bu yüzden "sıfır." Şeklin kendisi doğrulandı
    // (bkz. `OrderQuoteFeeDiscount` yorumu, ana repodaki `OrderSummaryAmounts`'tan
    // alındı), yalnız DOLU bir örnek staging'de bulunamadı.
    'target',
    'name',
    'code',
    'amount',
  ]),
};

/** `PARITY_TYPES`'taki dört adlandırılmış sözleşme tipi ve onları ölçen gövdeler. */
const PARITY_TYPES: Array<{
  typeName: string;
  sourceFile: string;
  bodies: () => unknown[];
}> = [
  {
    typeName: 'ServerLimitsDto',
    sourceFile: 'src/hooks/useMembershipLimits.ts',
    bodies: () => [readFixture('membership').limits],
  },
  {
    typeName: 'OrderQuoteResponse',
    sourceFile: 'src/lib/api/orders.ts',
    bodies: () => [readFixture('checkout').quoteSingle, readFixture('checkout').quoteMulti],
  },
  {
    typeName: 'OrderQuotePricingSummary',
    sourceFile: 'src/lib/api/orders.ts',
    bodies: () => [readFixture('checkout').quoteSingle, readFixture('checkout').quoteMulti],
  },
  {
    typeName: 'OrderQuoteFeeDiscount',
    sourceFile: 'src/lib/api/orders.ts',
    bodies: () => [readFixture('checkout').quoteSingle, readFixture('checkout').quoteMulti],
  },
];

describe('declaredButAbsent — adlandırılmış sözleşme tipleri', () => {
  it.each(PARITY_TYPES)(
    '$typeName: tipin kendi alanları ölçülen gövdede ya var ya listede',
    ({ typeName, sourceFile, bodies }) => {
      const src = readFileSync(resolve(ROOT, sourceFile), 'utf8');
      const declaredFields = extractTypeFields(src, typeName);
      // Sıfır alan dönerse tip bulunamamış demektir — sessizce boş geçmek
      // yerine düşürüyoruz, aksi halde `typeName` yazım hatası fark edilmez.
      expect(declaredFields.length).toBeGreaterThan(0);
      const missing = declaredButAbsent(declaredFields, bodies(), KNOWN_ABSENT[typeName]);
      expect(missing).toEqual([]);
    },
  );
});

describe('KNOWN_ABSENT — ölü satır yok', () => {
  it.each(PARITY_TYPES)('$typeName: her allowlist adı tipte gerçekten bildirilmiş', ({
    typeName,
    sourceFile,
  }) => {
    const src = readFileSync(resolve(ROOT, sourceFile), 'utf8');
    const declared = new Set(extractTypeFields(src, typeName));
    const dead = [...KNOWN_ABSENT[typeName]].filter((name) => !declared.has(name));
    expect(dead).toEqual([]);
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

describe('checkout sözleşmesi', () => {
  it('ölçülen quote gövdesindeki her alan tipte bildirilmiş ya da listede', () => {
    const fixture = readFixture('checkout');
    const src = readTypes(CHECKOUT_TYPE_SOURCES);
    const missing = undeclaredFields(fixture, src, KNOWN_UNDECLARED.checkout);
    expect(missing).toEqual([]);
  });
});

describe('trades sözleşmesi', () => {
  it('ölçülen gövdedeki her alan tipte bildirilmiş ya da listede', () => {
    const fixture = readFixture('trades');
    const src = readTypes(TRADES_TYPE_SOURCES);
    const missing = undeclaredFields(fixture, src, KNOWN_UNDECLARED.trades);
    expect(missing).toEqual([]);
  });
});

describe('products sözleşmesi', () => {
  it('ölçülen `mine` (GET /products/my) gövdesindeki her alan tipte bildirilmiş ya da listede', () => {
    // Yalnız `mine` — `list` (GET /products) KASITLI OLARAK dışarıda. Gövdesi
    // `app/product/[id]/_lib/types.ts`'teki `Product`/`ProductSeller` index
    // signature'ı yüzünden bu guard'la ÖLÇÜLEMEZ (bkz. `PRODUCTS_TYPE_SOURCES`
    // yorumu): guard yalnız isim ARAR, tipin index signature mi yoksa açık alan
    // mı olduğunu bilmez, ama `list` üzerinde denendiğinde 55 "bildirilmemiş"
    // alan çıkıyor — bunun neredeyse tamamı gerçek bulgu değil, guard'ın bu
    // şekli hiç ÖLÇEMEDİĞİNİN göstergesi (yüzlerce satırı elle sınıflandırmak
    // brief'in "yapma" dediği şey). `products/my`'nin `Listing` tipi EXPLICIT
    // olduğu için (ve tarihsel `rejectionReason` kaçırması oradan çıktığı için)
    // guard'ın değerli olduğu yarısı bu.
    const fixture = readFixture('products');
    const src = readTypes(PRODUCTS_TYPE_SOURCES);
    const missing = undeclaredFields(fixture.mine, src, KNOWN_UNDECLARED.products);
    expect(missing).toEqual([]);
  });
});

describe('membership sözleşmesi', () => {
  it('ölçülen gövdedeki (tiers+me+limits) her alan tipte bildirilmiş ya da listede', () => {
    const fixture = readFixture('membership');
    const src = readTypes(MEMBERSHIP_TYPE_SOURCES);
    const missing = undeclaredFields(fixture, src, KNOWN_UNDECLARED.membership);
    expect(missing).toEqual([]);
  });
});

describe('user sözleşmesi', () => {
  it('ölçülen gövdedeki (me+addresses) her alan tipte bildirilmiş ya da listede', () => {
    const fixture = readFixture('user');
    const src = readTypes(USER_TYPE_SOURCES);
    const missing = undeclaredFields(fixture, src, KNOWN_UNDECLARED.user);
    expect(missing).toEqual([]);
  });
});

describe('messaging sözleşmesi', () => {
  it('ölçülen thread listesi gövdesindeki her alan tipte bildirilmiş ya da listede', () => {
    const fixture = readFixture('messaging');
    const src = readTypes(MESSAGING_TYPE_SOURCES);
    const missing = undeclaredFields(fixture.threads, src, KNOWN_UNDECLARED.messaging);
    expect(missing).toEqual([]);
  });
});

/**
 * `KNOWN_UNDECLARED` bir ilerleme defteri: bir boşluk kapanınca satır SİLİNİR.
 * Silinmezse sessizce kalır ve o yoldaki bir GERİLEMEYİ (tip daraltılır, alan
 * gerçekten okunmaz hâle gelirse guard yine susar) maskeler.
 *
 * Bu test yalnız ÖLÜ bir satırı yakalar — her yol, kendi domain'inin ölçülmüş
 * gövdesinde GERÇEKTEN var mı? Listenin EKSİKSİZ olduğunu (yeni bir boşluğun
 * unutulmadığını) doğrulayamaz — bu, dosya başındaki SINIRI notundaki gibi,
 * makineyle denetlenemeyen bir şey.
 */
describe('KNOWN_UNDECLARED — ölü satır yok', () => {
  const DOMAIN_BODIES: Record<string, unknown> = {
    orders: readFixture('orders'),
    checkout: readFixture('checkout'),
    trades: readFixture('trades'),
    products: readFixture('products').mine,
    membership: readFixture('membership'),
    user: readFixture('user'),
    messaging: readFixture('messaging').threads,
  };

  it.each(Object.keys(KNOWN_UNDECLARED))('%s: her allowlist yolu fixture’da var', (domain) => {
    const paths = new Set(fieldPaths(DOMAIN_BODIES[domain]));
    const dead = [...KNOWN_UNDECLARED[domain]].filter((path) => !paths.has(path));
    expect(dead).toEqual([]);
  });
});
