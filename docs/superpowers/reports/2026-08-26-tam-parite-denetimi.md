# Tam parite denetimi — bulgular

**Tarih:** 2026-08-27
**Referans:** `tarodan-app` `origin/development` @ `9414935f1`
**Ölçüm kaynağı:** `https://staging.tarodan.com.tr/api`, hesap `ahmet@demo.com`
**Yöntem:** `docs/superpowers/specs/2026-08-26-tam-parite-denetimi-design.md`
**Mobil dal:** `feat/parite-denetimi`

---

## Kapsam ve elenenler

### Faz 1 — sözleşme taraması (Task 1-3)

| Alan | Uçlar | Fixture |
|---|---|---|
| orders | `GET /orders`, `GET /orders/:id`, `GET /orders/groups` | `orders.json` |
| checkout | `POST /orders/quote` (qty 1 + qty 3) | `checkout.json` |
| trades | `GET /trades`, `GET /trades/:id` | `trades.json` |
| products | `GET /products`, `GET /products/my` | `products.json` |
| membership | `GET /membership/tiers`, `/me`, `/me/limits` | `membership.json` |
| user | `GET /users/me`, `/users/me/addresses` | `user.json` |
| messaging | `GET /messages/threads` | `messaging.json` |

**13 uç, 7 fixture.** Bekçi: `src/lib/api/__tests__/contractCoverage.test.ts`.

### Faz 2 — süzülmüş commit taraması

Aralık: `d7df71e80..94f372e1b3da79ebd1f8be40446e22890a564597`, yollar
`apps/web packages/ui packages/shared packages/types packages/i18n`,
`*(admin)` kapsamlı commit'ler hariç.

| | Adet |
|---|---|
| Aday `feat`/`fix` commit | **147** |
| Okunmadan elendi (RN karşılığı yok — desen süzgeci) | **7** |
| Yürünen | **140** |

**Okunmadan elenen 7 commit** (desen: CSP, çerez onayı, footer/dropdown/grid,
responsive/viewport, Sentry etiketleme):

```
6f89890b9 fix(web): size the account dropdown to the space actually below it
4f43d6481 feat(web): bring the payment page under a Content Security Policy
d5805c630 feat(web): restructure the footer and share the social links component
c505c17b5 feat(web): rebuild cookie consent on a single source of truth
c7640818e fix(api,web,admin): separate staging from production in Sentry
f067d72fe feat(api,web,admin): tag Sentry events with request id and deploy release
f6c0cd005 fix(web): give the messages view a fixed height with inner scrolling
```

### Yürünen 140'ın dağılımı

Kova sınırları yargı kararıdır; sha listeleri bu yüzden açık yazılıyor —
sonraki bir tur "kapsanmadı" ile "kapsandı ve elendi"yi ayırt edebilsin.

**(a) Yürüdü → mobilde ZATEN VAR (≈52 commit).** Örnekleri:
`535773831` (sepette satır seçimi → `app/cart` `deselectedIds` + checkbox),
`6bc2eb305`/`d04be1c04`/`7256b129c` (`pricingHash` + `shippingTariffVersion` +
409 → `app/checkout/_hooks/useCheckout.ts`, `src/lib/api/orders.ts`),
`8b06b36ef`/`267ae74d6` (kupon + misafir kuponu → `useCoupon.ts`,
`POST /discounts/validate-guest`), `87044973f` (tek para biçimlendirici →
`src/utils/format.ts`, web ile birebir aynı: `minimumFractionDigits: 2`),
`d577aa521` (`GET /messages/unread-count` → `src/hooks/messaging/queries.ts`),
`ab302de7b`/`0571c1220` (takas iki taraflı ödeme panelleri; sıfır tutarlı
hizmet/kargo satırları KOŞULSUZ, nakit farkı koşullu →
`TradePaymentsCard.tsx:72-88`), `d353245e9`/`b660df60f`/`8d04b27b3`
(teslimat no + taşıyıcı kodu ayrımı → `src/lib/shipping/tracking.ts`
`deriveShipmentView`), `feb50a925`/`1a86965d8`/`b7741dd99`/`2f0644cfc`
(grup-şemsiye sipariş ekranları → `app/orders/group/[id]`),
`9f9f44e3d`/`da00d5af4`/`79819c0ca`/`7bfa31f29`/`d15b0a857`/`20cff9963`
(ilan formu: gerçek kayıt + paket kademesi + net kazanç önizlemesi →
`src/components/listing/_lib/editMapper.ts`, `ListingSections.tsx:613-664`),
`ae773e5b2`/`908cfeb1d` (kurumsal onay kapıları → `BusinessMembershipGuard.tsx`,
`app/business-pending.tsx`), `279ea5ff1` (kurumsal belge yükleme →
`app/settings/business-application`), `fa8bb500b`/`d92bca0b1` (paket bazlı boost →
`src/components/product/BoostModal.tsx`), `941da037b` (e-posta değiştirme →
`src/lib/api/auth.ts:122-125`), `982914cc5` (kullanıcı adı →
`app/settings/username`), `b45db84e4` (iade talebi akışları →
`app/refund-requests`), `ed13aa47d`/`5eb33f4e8` (tek sipariş özeti; mobil özeti
ölçümle DENKLEŞİYOR — aşağıda "temiz çıkan alanlar").

**(b) Yürüdü → web'e özgü, RN karşılığı yok (≈44 commit).** İki alt küme:

- *Web yerleşimi / web UI ilkeli:* `d6f51d923`, `13e8c14f5`, `898e16cbb`,
  `7e06fef83`, `75de2b8d9`, `6d289968e`, `bbda81275`, `a836eef31`, `7521d2baf`,
  `d12cfe803`, `3442aed90`, `ef1124831`, `e1db74777`, `d1968872a`, `78e18e0d9`,
  `5e7ff7896`, `714fa4348`, `2a27a06dc`, `e3aae22ad`, `8856a6b00`, `6a48a3346`,
  `c8946aa45`, `bb99f9c22`, `e4adc1b70` (WebP kutu görselleri), `8dacc81fd`,
  `a3ddf0753`, `c10f85323`, `fd52345dd` + `a07b57eb3` + `3b21b2acc` +
  `db7663dc6` + `fe24f640e` (tarayıcı sürükle-bırak yükleme kuyruğu ve
  RHF/focus-refetch koruması — mobil yükleyicisi `expo-image-picker` tabanlı,
  aynı yarış yok).
- *Next.js / altyapı / SEO / ops:* `ddd782758`, `8cae8060a`, `42e1d44d3`,
  `9579a8cda`, `6abec7252`, `e1cada54b`, `ada369e9d`, `9ec2133b7`, `88e7f2fc3`,
  `e6d35ecea`, `6a13d89e1`, `af7ebabee`, `76d861053` (AASA dosyasını web servis
  ediyor — mobil zaten `src/lib/deeplinks/paths.json` kaynağı), `2e9570446`,
  `3e0006609` (BFF çerez yarışı; mobilde token store'da).

**(c) Yürüdü → tümüyle sunucu tarafında, istemciye şeffaf (≈36 commit).**
Davranış API içinde değişiyor, mobil aynı ucu çağırdığı için ücretsiz alıyor:
`8f9ae671d`, `f9eae3980`, `8c09ac99c`, `d63204968`, `bc73db263`, `0f60734de`,
`ab0197926`, `c8ee7ad99`, `6576ad052`, `664ef5d77`, `71f4d0402`, `54ae2ab38`,
`673f4f8dc`, `3cb59b886`, `db234bafb`, `58088b140`, `3453df916`, `df58a1f28`,
`7fba9eddc`, `728496075`, `7801b290b`, `14adf18e3`, `ba84bcdcb`, `b071af4a4`,
`63797d88a`, `6aacaf5ed`, `a8e63ea9c`, `edbc2f18a`, `ec3bf1647`, `f2971d41d`,
`0b434b481`, `81dfe48b3`, `c66e33a8d`, `8e171caf7`, `61b5fd5b2`, `93898cf63`.

**(d) Yürüdü → BULGU (8 commit).** `e6b48165a`, `6b25e0148`, `daaee6495`,
`b8614b770`, `c99732c13`, `4260ac858`, `f721a5c8d`, `b06bcac9f`, `c443d07f8`.

### Temiz çıkan alanlar (yürüdü, boşluk çıkmadı — sessizlik "kapsanmadı" okunmasın)

- **Bildirim link çözümü** (`cc4ebedc5`, `9296d70dd`). `src/utils/notificationRoute.ts`
  `safePathFromLink` (satır 112-127) protokol-göreli `//host`'u, `http:`/`javascript:`/
  özel şemayı ve host allowlist dışını reddediyor; ardından `toMobileRoute` yalnız
  BİLİNEN rotalara eşliyor, yani web'in "var olmayan yola git" deliği mobilde
  yapısal olarak yok. Web'den bir adım daha kapalı.
- **`data.audience`** (`ec3bf1647`). `notificationRoute.ts:171-172` alıcı/satıcı
  ayrımını okuyor, varsayılan uydurmuyor.
- **Sipariş ödeme özeti aritmetiği** (`5eb33f4e8`). Ölçümle denkleşiyor:
  449,10 + 50,00 + 40,42 + 18,08 = 557,60 = `totalAmount`. Web'in "satırlar alt
  toplamla uyuşmuyordu" hatası mobilde yok.
- **Takas ödeme kartı sıfır satırları** (`ab302de7b`). Yapısal satırlar sıfırda da
  çiziliyor, nakit farkı koşullu — web'le birebir.
- **Para biçimlendirme** (`87044973f`). `src/utils/format.ts` ile
  `apps/web/src/lib/format.ts` aynı davranış; ondalık kaybı yok.

---

## Bulgular

Öncelik: **P0** para/veri kaybı · **P1** görünen yanlış/eksik bilgi ·
**P2** sessiz yalan (bugün görünmez, sonra kırılır) · **P3** eksik yetenek ·
**backend** devredildi.

| # | Bulgu | Ölçüm | Kullanıcı etkisi | Öncelik | Sahip |
|---|---|---|---|---|---|
| B1 | Takas takip linki iç referansla kuruluyor (`trackingNumber`, `cargoCode` değil) | ölçüldü (Task 2): `cargoCode = "12516210181141"`, `trackingNumber = "TKS-…-WH-INI"` | Takas kargosunu takip et → Sürat sayfası kodu tanımıyor; kullanıcı kargosunu izleyemiyor | **P0** | mobil |
| B2 | Satışlar listesinde ALICI'nın ödediği toplam satıcıya gösteriliyor | ölçüldü: `totalAmount = 557,60`, `pricing.subtotal = 449,10` | Satıcı, ürün bedeli sandığı yerde alıcının kargo+alıcı hizmet bedeli+KDV dahil ödediği tutarı görüyor (hem yanlış hem alıcıya ait bilgi) | **P1** | mobil |
| B3 | `suspended` ilan durumu hiç tanınmıyor | ölçüldü: `/products/my` içinde 1 adet `status: "suspended"` (`724cf9c4…`) | Askıya alınmış ilan rozetinde çevrilmemiş ham `suspended` yazıyor, filtre çipi yok, menü hâlâ "Düzenle" öneriyor — satıcı ilanının askıda olduğunu ekrandan anlayamıyor | **P1** | mobil |
| B4 | Hukuki künye uydurma; destek/info e-postaları var olmayan alan adında | ana repo `PLATFORM_ENTITY` ile karşılaştırıldı (staging'de ölçülemez — statik içerik) | Mesafeli satış sözleşmesi ve KVKK metni yanlış tüzel kişi, yanlış adres, yanlış tebligat kanalı gösteriyor; yazılan destek e-postası geri döner | **P1** | mobil |
| B5 | Analitikte premium tespiti `limits.maxListings === -1` ile yapılıyor | ölçüldü: `/membership/me/limits` → `maxTotalListings: 200`, `tierType: "premium"`, `maxListings` alanı YOK | Premium üye analitik ekranında premium bölümü hiç görmüyor, yerine "yükselt" kutusunu görüyor — parasını ödediği özellik gizli | **P1** | mobil |
| B6 | Checkout kökündeki `buyerFeeDiscountTotal` / `sellerFeeDiscountTotal` bildirilmemiş | ölçüldü (Task 2, bu turda yeniden): quote kökünde ikisi de var, değer `0` | Bugün görünür etki yok (aktif kampanya yok); kampanya açıldığında alıcı/satıcı kırılımı okunamaz | **P2** | mobil |
| B7 | Anlaşmazlık akışı yaz-only: `dispute.raisedById` / `resolution` / `resolvedAt` hiç okunmuyor | ölçüldü (Task 2) | Kullanıcı itiraz açabiliyor ama sonucu hiçbir ekranda göremiyor; yalnız statik "inceliyoruz" metni | **P1** | mobil |
| B8 | `me.birthDate` `mapApiUserToUser`'da haritalanmıyor | ölçüldü (Task 3): `/users/me` alanı döndürüyor | Profili düzenle ekranında doğum tarihi HER ZAMAN boş açılıyor; kaydedilmiş değer sessizce kayboluyor | **P1** | mobil |
| B9 | `normalizeThread` `productTitle`/`productImage`'ı `thread.product`'a eşlemiyor | ölçüldü (Task 3): iki thread de alanları DOLU | Mesajlar sekmesi ürün üzerinden başlamış her sohbette "Genel mesaj" yazıyor; ürün adı/görseli hiç görünmüyor | **P1** | mobil |
| B10 | Çok satıcılı grup yanıtındaki `packages.*` (satıcı bazlı kargo kırılımı) hiç okunmuyor | ölçüldü (Task 1): `groups.data.packages[]` dolu | Çok satıcılı bir sepette her satıcının ayrı kargosu/takibi mobilde hiç gösterilmiyor | **P1** | mobil |
| B11 | 2FA kurulumunda QR kodu yok, yalnız secret metni | ÖLÇÜLMEDİ (aşağıya bakın) — ana repo `security.dto.ts:19` `qrCodeImage` bildiriyor | Kullanıcı Authenticator'a 32 karakterlik secret'ı elle yazmak zorunda; webde QR taranıyor | **P3** | mobil |
| B12 | Checkout hizmet bedeli satırında oran yok | ölçüldü: `pricing.buyerFeeRate = 9` | Alıcı hangi oranla ücretlendirildiğini görmüyor (yanlış bir oran GÖSTERİLMİYOR — eksik, yanlış değil) | **P3** | mobil |
| B13 | Kurumsal kayıtta KEP adresi opsiyonel | ana repo: web zorunlu (`RegisterBusinessForm.tsx:124` `*`), API DTO opsiyonel | Kurumsal hesap yasal tebligat kanalı olmadan başvuru gönderebiliyor; eksik başvuru elle takip gerektiriyor | **P3** | mobil |
| B14 | `/products/my` `relatedOrder` / `relatedTrade` döndürmüyor | ölçüldü: satılan ve rezerve ilanlarda ikisi de YOK, anahtar listesinde de yok | Web, satılan/rezerve ilandan siparişe/takasa geçiş sunuyor; mobil sunamaz — alan gelmiyor | **backend** | backend |

---

## Ölçülen ham gövdeler

### B2 — satış kartındaki tutar

```
$ curl -s "$API/orders?type=sales&limit=1" -H "Authorization: Bearer $T" | jq '.data[0] | {...}'
{
  "orderNumber": "ORD-M9ED69QWAT",
  "totalAmount": 557.6,
  "amount": 557.6,
  "items[0].price": 557.6,
  "pricing.subtotal": 449.1,
  "pricing.sellerNetAmount": 325.32
}
```

Tam kırılım (aynı sipariş):

```json
{"subtotal":449.1,"shippingAmount":50,"buyerFeeAmount":40.42,"sellerFeeAmount":49.41,
 "commissionAmount":89.83,"taxAmount":0,"withholdingTaxAmount":4.49,
 "sellerShippingAmount":50,"buyerServiceTaxAmount":18.08,"sellerServiceTaxAmount":19.88,
 "serviceVatRate":20,"buyerFeeDiscountAmount":0,"sellerFeeDiscountAmount":0,
 "totalAmount":557.6,"sellerNetAmount":325.32}
```

Mobil: `app/sales/_components/SaleCard.tsx:43` → `formatPrice(sale.totalAmount)`.
`app/sales/_lib/types.ts` `Sale` tipinde `pricing` alanı HİÇ YOK. Satış DETAYI
(`app/sales/[id]/_components/SaleDetailBody.tsx:29,34`) doğru kaynağı okuyor
(`p?.subtotal`, `p?.sellerNetAmount`) — hata yalnız LİSTE kartında.
`items[].price` yedek DEĞİLDİR: ölçümde o da `557.6`, yani alıcı toplamı.

### B3 — askıya alınmış ilan

```
$ curl -s "$API/products/my?limit=30" -H "Authorization: Bearer $T" \
  | jq -c '[.data[] | {status}] | group_by(.status) | map({status:.[0].status,n:length})'
[{"status":"active","n":1},{"status":"inactive","n":2},{"status":"rejected","n":1},
 {"status":"reserved","n":1},{"status":"sold","n":1},{"status":"suspended","n":1}]

$ ... | jq -c '[.data[]|select(.status=="suspended")][0]'
{"id":"724cf9c4-6a40-4e1d-b29d-5a72d1e812b6","title":"AUTOart Mercedes 300",
 "status":"suspended","rejectionReason":null}
```

Mobil: `app/settings/my-listings/_lib/types.ts` `getStatusColor` (satır 35-46) ve
`statusTextKey` (satır 55-66) `suspended` dalını taşımıyor → `statusTextKey`
`null` döner, `MyListingsSections.tsx:140` ham `listing.status` basar.
`FILTER_CHIPS` (`MyListingsSections.tsx:62-77`) sekiz durumu sayıyor, `suspended`
yok. `MyListingsModals.tsx:30` `status !== 'sold' && !== 'deleted'` koşuluyla
askıdaki ilana "Düzenle" sunuyor.

**Not:** sunucunun `GET /products/my/stats` `counts` nesnesi de `suspended`
saymıyor (`{"pending":0,"active":1,"reserved":1,"sold":1,"rejected":1,
"inactive":2,"deleted":4,"total":5,"all":7,"activeListings":2}`). Bir çip
eklenirse sayacı bu uçtan gelmeyecek — ya listeden sayılmalı ya backend'e
eklenmeli. Bu ikinci yarı **backend bekliyor**.

### B4 — hukuki künye

Ana repo tek kaynağı (`apps/web/src/lib/legal/platform-entity.ts`,
`origin/development`):

```
legalName:       Serhatlar Oyuncak Temizlik Gıda Maddeleri İnşaat Sanayi ve
                 Ticaret Limited Şirketi
taxRegistration: 7620277268 – Torbalı / İZMİR
address:         Yenişehir Mah. 1145/2 No:3 Torbalı / İZMİR
phone:           0 232 433 41 42
email:           destek@tarodan.com.tr
kep:             serhatlaroyuncak@hs03.kep.tr
website:         www.tarodan.com.tr
```

Mobilde (`app/distance-sales.tsx:31-35`):

```
Unvan:   Tarodan Teknoloji A.Ş.        ← böyle bir tüzel kişi yok
Adres:   İstanbul, Türkiye             ← gerçek adres Torbalı / İZMİR
E-posta: info@tarodan.com              ← kutu yok (daaee6495 bunu düzeltti)
Telefon: 0850 XXX XX XX                ← yer tutucu, sözleşme metninde
```

`app/privacy.tsx:126` aynı adresi tekrarlıyor; KEP hiç yok.
`src/constants/legalFacts.ts:33-41` yedi posta kutusu tanımlıyor
(`destek@`, `info@`, `legal@`, `privacy@`, `seller-support@`, `security@`,
`ip@` — hepsi `tarodan.com`). Ana repoda `origin/development` genelinde
yalnız **iki** gerçek kutu geçiyor: `destek@tarodan.com.tr` (15 yer) ve
`legal@tarodan.com.tr` (6 yer). Yani mobilin beş kutusunun karşılığı yok ve
ikisinin alan adı yanlış. Dosyanın kendi başlığındaki "Genel destek e-postası
web ile birebir aynı: destek@tarodan.com" yorumu 2026-07-31'de bayatladı.

Staging'den ölçülmedi çünkü bu içerik istemcide sabit — ölçülecek bir uç yok.
Doğrulama kaynağı ana repo `origin/development`.

### B5 — premium tespiti

```
$ curl -s "$API/membership/me/limits" -H "Authorization: Bearer $T" | jq -c .
{"canCreateListing":true,"canUseFreeSlot":true,"canTrade":true,
 "canCreateCollection":true,"maxImages":10,"maxFreeListings":50,
 "maxTotalListings":200,"remainingFreeListings":48,"remainingTotalListings":198,
 "tierName":"Premium Üyelik","tierType":"premium"}
```

`maxListings` diye bir alan YOK; `maxTotalListings = 200`.
`src/hooks/useMembershipLimits.ts:44` bunu `out.maxListings = dto.maxTotalListings`
ile store'a yazıyor; hook `app/_layout.tsx:76`'da kökte çağrılıyor, yani
oturum açmış her kullanıcıda bindirme UYGULANIYOR. Sonuç:
`app/settings/analytics/_hooks/useAnalytics.ts:19`
`isPremium = limits?.maxListings === -1` → `200 === -1` → **her zaman `false`**.
`AnalyticsContent.tsx:113` premium bölümünü hiç çizmiyor, `:156` yükseltme
kutusunu premium üyeye de gösteriyor.

Doğru kaynak aynı yanıtta duruyor: `tierType`. `GET /users/me/analytics` ölçümde
**200** döndü (premium hesap) — yani veri geliyor, yalnız ekran onu premium
saymıyor.

`limits.maxListings` başka iki yerde de okunuyor
(`useMyListings.ts:231`, `authStore.ts:541-549`) ama oralarda anlam
"kota sayısı"; 200 doğru değer, hata yok. Yanlış olan yalnız `-1`'i
"premium" sanan analitik satırı.

### B12 — hizmet bedeli oranı

```
$ curl -s -X POST "$API/orders/quote" ... | jq -c '.pricing | {buyerFeeRate}'
{"buyerFeeRate":9}
```

Mobil `app/checkout/_components/OrderSummary.tsx:94` oransız
`footer.platformServiceFee` etiketini basıyor. Web `platformServiceFeeWithRate`
ile oranı yazıyor. Mobil YANLIŞ bir oran göstermiyor — hiç göstermiyor.

### B14 — `relatedOrder` / `relatedTrade` yok

```
$ curl -s "$API/products/my?limit=30" ... | jq -c '[.data[]|select(.status=="sold" or .status=="reserved")][0] | keys'
["attributes","availableQuantity","boostedUntil","bundleSize","category","color",
 "condition","createdAt","description","discountPercent","editionNumber",
 "editionTotal","id","images","isBoosted","isBoxed","isLimited","isOnSale",
 "isPreorder","isSet","isTradeEnabled","likeCount","modelCode","oldPrice",
 "originalPrice","price","productCode","quantity","rating","rejectionReason",
 "releaseDate","saleEndDate","salePrice","saleStartDate","sellerId","status",
 "title","tradeAvailable","updatedAt","viewCount","year"]
```

Ne `relatedOrder` ne `relatedTrade` var. Web `6b25e0148` ile bu iki alanı
okuyup satılan/rezerve ilandan siparişe/takasa geçiş sunuyor; mobil bunu
YAPAMAZ. **Backend bekliyor** — istemci tarafında iş açılmamalı.

---

## Doğrulanamayanlar

Ölçüm kapısı ihlal edilmesin diye burada AÇIKÇA yazılıyor. Aşağıdakiler
staging'den ölçülmedi; şekilleri ana repodan okundu.

1. **`qrCodeImage` (B11).** `POST /auth/2fa/enable` (ya da `/security/2fa/setup`)
   ÇAĞRILMADI: uç bir mutasyon ve paylaşılan `ahmet@demo.com` demo hesabında
   iki-adımlı doğrulamayı açardı — sonraki turların giriş yapmasını kırar.
   Alanın varlığı ana repoda doğrulandı
   (`apps/api/src/modules/security/dto/security.dto.ts:19` `qrCodeImage: string`,
   `security.service.ts:76,111` `QRCode.toDataURL(...)`,
   `two-factor-qr.spec.ts:42` `/^data:image\/png;base64,/`). Alan adının ve
   biçiminin CANLI ortamda birebir bu olduğu **ölçülmedi** — Plan B'de bu uç
   ayrı bir hesapla ölçülmeden tip yazılmamalı.

2. **KEP zorunluluğunun sunucu tarafı (B13).** Kurumsal kayıt POST'u
   çalıştırılmadı (staging'e sahte bir kurumsal hesap yazardı).
   `apps/api/src/modules/auth/dto/business-register.dto.ts:49` alanı
   `kepAddress?: string` (opsiyonel) olarak bildiriyor; zorunluluk yalnız
   web'in istemci şemasında. Yani bu bir SUNUCU sözleşmesi farkı değil,
   ürün kararı farkı.

3. **`suspended` ilanın kullanıcıya nasıl göründüğü.** Alanın varlığı ölçüldü;
   ekrandaki hâli KOD OKUNARAK çıkarıldı (`statusTextKey` `null` → ham kod
   basılır). Metro'da elle görülmedi.

4. **Boş gelen alanlar (Task 1-3'ten devam).** `receiverShipment.cargoCode`
   ölçülen takas örneğinde hiç dolu gelmedi; `rejectionReason` staging'deki tek
   `rejected` ilanda `null` (kayıt, alanın kalıcılaştığı 2026-08-13
   değişikliğinden eski). İkisinin de ŞEKLİ kardeş alanlardan biliniyor, DOLU
   bir örnek görülmedi.

5. **`counts.suspended`.** `GET /products/my/stats` bu sayacı döndürmüyor
   (ölçüldü). Bir filtre çipi eklenirse sayacın nereden geleceği açık bir soru;
   backend'e sorulmadı.

---

## Bekçinin kendi başına yakalayamadığı sınıf

Rapordaki bulguların yarısı sözleşme bekçisinden ÇIKMADI, kod okunarak bulundu.
Sebep belgeye geçsin:

- **Yaprak-adı çakışması.** Bekçi bir alan ADININ tip dosyalarında geçip
  geçmediğine bakar, YOLUNA değil. `packages.*` içindeki `orders`, `seller`,
  `cargo` adları başka konumlarda zaten bildirildiği için B10 bekçiden kaçtı.
  Aynı sebeple checkout kökündeki `quantityDiscount`/`feeDiscounts`
  "bildirilmiş" sayılıyor.
- **Doğru alanın yanlış kullanımı.** B1 (takas takip linki) bir alan eksikliği
  değil: `trackingNumber` bildirilmiş, sadece YANLIŞ yerde kullanılıyor.
  Bekçinin göreceği hiçbir iz yok.
- **Ad uyuşmazlığı üzerinden kayıp.** B9'da sunucu `productTitle` diyor, ekran
  `product.title` arıyor. İki ad da kod tabanında geçiyor, bekçi memnun.
- **Var olmayan alanı okumak.** B5'te mobil `limits.maxListings` okuyor; sunucu
  öyle bir alan döndürmüyor. Bekçi "yanıtta olup tipte olmayan"ı arıyor,
  "tipte olup yanıtta olmayan"ı DEĞİL. Ters yön hiç taranmadı — bu, sonraki
  turun kurabileceği ikinci bir bekçi.

---

## Test flake gözlemi

Bu turda düşen test **yok**.

```
$ npx tsc --noEmit
(çıktı yok, exit 0)

$ npx jest --silent
Test Suites: 201 passed, 201 total
Tests:       1609 passed, 1609 total
```

Task 1-3 fixture'ları dosya sistemine dokunmuştu; paket bozulmamış.

---

## Plan B'ye devir sırası

Kullanıcı zararına göre, akış grubu ikincil:

1. **B1** (P0) — takas takip linki. `deriveShipmentView` zaten var, takas tarafı
   çağırmıyor; `TradeShipment` tipine `cargoCode` eklenmeli.
2. **B2** (P1) — satış kartı tutarı. `pricing.subtotal` tek kaynak, yoksa tutar
   HİÇ basılmamalı (`items[].price` yedek DEĞİL).
3. **B5** (P1) — premium tespiti `tierType`'a taşınmalı.
4. **B8**, **B9** (P1) — iki eşleme hatası, ikisi de tek satırlık haritalama.
5. **B3** (P1) — `suspended` durum haritası + menü kapısı.
6. **B7**, **B10** (P1) — yeni ekran/bölüm gerektiriyor, ürün kararı da var.
7. **B4** (P1) — künye tek kaynağa taşınmalı (`legalFacts.ts` genişletilir,
   `PLATFORM_ENTITY` ile eşlenir); yanlış posta kutuları kaldırılmalı.
8. **B6** (P2), **B12**, **B11**, **B13** (P3).
9. **B14** — `docs/PARITE_KALAN_ISLER.md` "Backend / ops bekleyen" tablosuna.
