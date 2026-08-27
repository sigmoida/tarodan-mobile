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

Kova sınırları yargı kararıdır; sha listeleri bu yüzden olabildiğince açık
yazılıyor — sonraki bir tur "kapsanmadı" ile "kapsandı ve elendi"yi ayırt
edebilsin. Listeler TAM DEĞİL: kapsamı kova dağılımının sonunda sayısıyla
yazılı.

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
  aynı yarış yok). **Bu elemenin bir yarısından emin değilim:** `3b21b2acc`
  ayrıca "kapak fotoğrafı YÜKLENMESİ BİTEN ilk görsel olur" kuralını getiriyor
  (yüklenememiş bir ilk karo kapak sanılıp ilan başka bir kapakla
  yayımlanıyordu). Bu kural tarayıcıya özgü DEĞİL. Mobil karşılığına
  bakılmadı; sonraki tur bunu "kapsandı" saymasın.
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

**(d) Yürüdü → BULGU (9 commit).** `e6b48165a`, `6b25e0148`, `daaee6495`,
`b8614b770`, `c99732c13`, `4260ac858`, `f721a5c8d`, `b06bcac9f`, `c443d07f8`.

İkisi inceleme sonrası GERİ ÇEKİLDİ (`b06bcac9f` ve `6b25e0148`'in
`relatedOrder` yarısı) — gerekçe "Geri çekilen iki bulgu" başlığında.
Böylece dokuz commit'ten **yedi** bulgu kaldı.

**Sha listelerinin kapsamı.** Yukarıdaki dört kovada 140 commit'in **127**'si
adıyla yazılı; **13**'ü yazılı değil — hepsi kova (a)'da, o kova bilinçle
"örnekleriyle" verildi. İnceleyen bu 13'ünü tek tek çekip baktı ve
elenmiş gerçek bir bulgu ÇIKMADI. (Bu benim değil, incelemenin kontrolü.)

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

**Bu turda P0 YOK ve backend'e devredilen madde YOK.** On iki bulgu:
8×P1, 3×P2, 1×P3 (+ geri çekilen iki iddia, aşağıda). Kısa değerlendirme: hiçbir
bulgu para ya da veri kaybettirmiyor; ağırlık "kullanıcı yanlış/eksik bilgi
görüyor" bandında.

| # | Bulgu | Ölçüm | Kullanıcı etkisi | Öncelik | Sahip |
|---|---|---|---|---|---|
| B1 | Takas takip linki iç referansla kuruluyor (`trackingNumber`, `cargoCode` değil) | ölçüldü (Task 2): `cargoCode = "12516210181141"`, `trackingNumber = "TKS-…-WH-INI"` | Takas kargosunu takip et → Sürat sayfası kodu tanımıyor; kullanıcı kargosunu izleyemiyor | **P1** | mobil |
| B2 | Satışlar listesinde ALICI'nın ödediği toplam satıcıya gösteriliyor | ölçüldü: `totalAmount = 557,60`, `pricing.subtotal = 449,10` | Satıcı, ürün bedeli sandığı yerde alıcının kargo+alıcı hizmet bedeli+KDV dahil ödediği tutarı görüyor | **P1** | mobil |
| B3 | `suspended` ilan durumu hiç tanınmıyor | ölçüldü: `/products/my` içinde 1 adet `status: "suspended"` (`724cf9c4…`) | Askıya alınmış ilan rozetinde çevrilmemiş ham `suspended` yazıyor, filtre çipi yok, menü hâlâ "Düzenle" öneriyor | **P1** | mobil |
| B4 | Hukuki künye uydurma; destek/info e-postaları var olmayan alan adında | ana repo `PLATFORM_ENTITY` ile karşılaştırıldı (staging'de ölçülemez — statik içerik) | Mesafeli satış sözleşmesi ve KVKK metni yanlış tüzel kişi, yanlış adres, yanlış tebligat kanalı gösteriyor; yazılan destek e-postası geri döner | **P1** | mobil |
| B5 | Analitikte premium tespiti `limits.maxListings === -1` ile yapılıyor — sunucu böyle bir alan döndürmüyor | ölçüldü: `/membership/me/limits` → `maxTotalListings: 200`, `tierType: "premium"`, `maxListings` alanı YOK | Premium üye analitik ekranında premium bölümü hiç görmüyor, yerine "yükselt" kutusunu görüyor — parasını ödediği özellik gizli | **P1** | mobil |
| B11 | 2FA kurulumu `payload.qrCode` okuyor — sunucu `qrCodeUrl` / `qrCodeImage` döndürüyor; üstelik değer `const [, setTotpQr]` ile atılıyor | ana repo `security.dto.ts:14-21`; canlı ölçüm YAPILMADI (aşağıya bakın) | Kullanıcı Authenticator'a secret'ı elle yazmak zorunda; QR hiçbir koşulda çizilemez (alan adı yanlış OLMASA da state atılıyor) | **P1** | mobil |
| B8 | `me.birthDate` `mapApiUserToUser`'da haritalanmıyor | ölçüldü (Task 3): `/users/me` alanı döndürüyor | Profili düzenle ekranında doğum tarihi HER ZAMAN boş açılıyor; kullanıcı kayıtlı bir tarih olsa bile onu hiç göremiyor | **P1** | mobil |
| B9 | `normalizeThread` `productTitle`/`productImage`'ı `thread.product`'a eşlemiyor | ölçüldü (Task 3): iki thread de alanları DOLU | Mesajlar sekmesi ürün üzerinden başlamış her sohbette "Genel mesaj" yazıyor; ürün adı/görseli hiç görünmüyor | **P1** | mobil |
| B6 | Checkout kökündeki `buyerFeeDiscountTotal` / `sellerFeeDiscountTotal` bildirilmemiş | ölçüldü (Task 2, bu turda yeniden): quote kökünde ikisi de var, değer `0` | Bugün görünür etki yok (aktif kampanya yok); kampanya açıldığında alıcı/satıcı kırılımı okunamaz | **P2** | mobil |
| B7 | Anlaşmazlık akışı yaz-only: `dispute.raisedById` / `resolution` / `resolvedAt` hiç okunmuyor | ölçüldü (Task 2) — ama ÇÖZÜLMÜŞ bir anlaşmazlık örneği görülmedi | Kullanıcı itiraz açabiliyor ama sonucu hiçbir ekranda göremiyor; ekranda YANLIŞ bir şey yazmıyor, eksik bir yetenek var | **P2** | mobil |
| B10 | Çok satıcılı grup yanıtındaki `packages.*` (satıcı bazlı kargo kırılımı) hiç okunmuyor | ölçüldü (Task 1): `groups.data.packages[]` dolu | Çok satıcılı bir sepette her satıcının ayrı kargosu/takibi mobilde gösterilmiyor — eksik bölüm, yanlış bilgi değil | **P2** | mobil |
| B13 | Kurumsal kayıtta KEP adresi opsiyonel | ana repo: web zorunlu (`RegisterBusinessForm.tsx:124` `*`), API DTO opsiyonel | Kurumsal hesap yasal tebligat kanalı olmadan başvuru gönderebiliyor | **P3** | mobil |

**B1'in P0'dan P1'e alınması bir aciliyet indirimi DEĞİLDİR.** Rubrik P0'ı
"para veya veri kaybı" için ayırıyor; ölü bir takip linki ikisi de değil.
Kuyrukta **yine ilk sırada** — sebebi öncelik etiketi değil, düzeltmenin ucuz
(`deriveShipmentView` zaten yazılı) ve etkisinin doğrudan olması.

**B2 hakkında Plan B'yi yanıltmayacak bir çekince.** Bulgu gerçek bir kod
olgusu: `SaleCard.tsx:43` alıcının ödediği toplamı basıyor. Ama bu bir PARİTE
farkı DEĞİL — web'in en yakın karşılığı da aynı alıcı toplamını basıyor
(`profile/(insights)/statistics/_sections/RecentSalesSection.tsx:60`,
`formatTL(sale.amount)`). Web yalnız sipariş KARTLARINDA (`e6b48165a`)
`pricing.subtotal`'a geçti, satış özet listesinde geçmedi. Yani B2'yi
düzeltmek web'e YAKINSAMAK değil, web'den AYRIŞMAK olur. Doğru iş olduğunu
düşünüyorum (`e6b48165a`'nın gerekçesi mobil listede aynen geçerli), ama
Plan B bunu "parite düzeltmesi" diye etiketlerse ne yaptığı konusunda
yanılır.

### Geri çekilen iki bulgu

Denetim raporunun işe yaraması, geri çekilen iddiaların da yazılı kalmasına
bağlı — yoksa sonraki tur aynı yanlışı yeniden "keşfeder".

**B12 (checkout hizmet bedeli oranı) — GERİ ÇEKİLDİ, parite temeli yok.**
`checkout.platformServiceFeeWithRate` anahtarı i18n kataloğunda VAR ama
`apps/web` içinde HİÇBİR yerden referans edilmiyor. Web'in sipariş özeti
`OrderSummaryLines.tsx:106`'da `t("checkout.serviceFee")` — yani oransız,
tam olarak mobil gibi. `b06bcac9f` sunucu tarafını (`pricing.buyerFeeRate`)
getirdi, web istemcisi kullanmadı. Ölçüm hâlâ geçerli
(`pricing.buyerFeeRate = 9`), ama bu bir BOŞLUK değil; en fazla iki istemciye
birden açık bir ürün önerisidir ve bu raporun kapsamı dışındadır.

**B14 (`relatedOrder` / `relatedTrade`) — GERİ ÇEKİLDİ, backend maddesi
AÇILMADI.** İki alanı `6b25e0148` eklemişti; `bc73db263 fix(api): preserve
category and listing boundaries` ikisini de hem API'den hem web'den
BİLEREK kaldırdı (`product-query.service.ts` −102 satır projeksiyon,
`ListingCard.tsx` −92 satır). `origin/development`'ta alanlar ne
`apps/web/src`'te ne `apps/api/src`'te geçiyor. Yani "web geçişi sunuyor,
mobil sunamıyor" cümlesi YANLIŞ: web de sunmuyor. Staging'de alanların
bulunmaması bir backend eksiği değil, kasıtlı bir kaldırmanın sonucu.

**Bu geri çekmenin yöntemsel dersi:** `bc73db263` bu raporun kendi (c)
kovasında listeli — yani tarama kaldırma commit'ini OKUDU ve bulguyu yine de
daha eski olan ekleme commit'inden yazdı. Tarama commit'leri tek tek
değerlendiriyor, aralarındaki "ekle sonra geri al" ilişkisini kurmuyor.
Sonraki tur için kural: bir alan bulgusundan önce alanın
`origin/development`'ta HÂLÂ var olduğu `git grep` ile doğrulanmalı — commit
gövdesi yeterli değil.

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
eklenirse sayacı bu uçtan gelmeyecek. B3'ü kapatan task ya sayacı çekili
listeden hesaplamalı ya da bu sayacı backend'den istemeli — bu ikinci yol
ürün/backend'e SORULMADI, açık bir soru olarak duruyor (devredilmiş bir madde
değil).

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

### B12 / B14 — geri çekildi

Bu iki başlığın ham gövdeleri kaldırıldı; gerekçeler "Geri çekilen iki bulgu"
altında. Ölçümlerin kendisi doğru çıkmıştı (`pricing.buyerFeeRate = 9`;
`/products/my` yanıtında `relatedOrder`/`relatedTrade` yok) — yanlış olan
bunlardan bulgu çıkarmaktı.

### B11 — 2FA kurulumu (B5 ile aynı sınıf)

Sunucu sözleşmesi (`apps/api/src/modules/security/dto/security.dto.ts:14-21`,
`origin/development`):

```ts
export class Enable2FAResponseDto {
  secret: string;
  /** `otpauth://...` sağlama URI'si */
  qrCodeUrl: string;
  /** Taranabilir QR görseli (`data:image/png;base64,...`) */
  qrCodeImage: string;
  backupCodes: string[];
}
```

Mobil (`app/settings/security/_hooks/useSecurity.ts`):

```ts
149:  const [, setTotpQr] = useState("");        // ← yazıcı var, OKUYUCU YOK
194:  setTotpQr(payload.qrCode ?? "");           // ← sunucuda `qrCode` diye alan YOK
```

İki ayrı kırık: alan adı yanlış (`qrCode` ↔ `qrCodeUrl`/`qrCodeImage`) VE
yazılan değer zaten atılıyor (`const [, setTotpQr]`). Yani alan adı doğru
olsaydı bile QR çizilmezdi. `backupCodes` ekranda gösteriliyor
(`SecurityDialogs.tsx:159-161`), `secret` de — yalnız QR yolu ölü.

---

## Doğrulanamayanlar

Ölçüm kapısı ihlal edilmesin diye burada AÇIKÇA yazılıyor. Aşağıdakiler
staging'den ölçülmedi; şekilleri ana repodan okundu ya da koddan çıkarıldı.

1. **`qrCodeImage` / `qrCodeUrl` (B11).** `POST /auth/2fa/enable` ÇAĞRILMADI:
   uç bir mutasyon ve paylaşılan `ahmet@demo.com` demo hesabında iki adımlı
   doğrulamayı açardı — sonraki turların giriş yapmasını kırar. Alanların
   varlığı ana repoda doğrulandı (`security.dto.ts:14-21`,
   `security.service.ts:76,111` `QRCode.toDataURL(...)`,
   `two-factor-qr.spec.ts:42` `/^data:image\/png;base64,/`). Canlı yanıtın
   birebir bu adları taşıdığı **ölçülmedi** — Plan B'de bu uca tip yazılmadan
   önce ayrı bir hesapla ölçülmeli. Mobil tarafındaki kırıklık (yanlış ad +
   atılan state) ise koddan KESİN.

2. **KEP zorunluluğunun sunucu tarafı (B13).** Kurumsal kayıt POST'u
   çalıştırılmadı (staging'e sahte bir kurumsal hesap yazardı).
   `apps/api/src/modules/auth/dto/business-register.dto.ts:49` alanı
   `kepAddress?: string` (opsiyonel) bildiriyor; zorunluluk yalnız web'in
   istemci şemasında. Yani bu bir SUNUCU sözleşmesi farkı değil, ürün kararı
   farkı.

3. **ÇÖZÜLMÜŞ bir anlaşmazlık hiç görülmedi (B7).** Ölçülen tek örnekte
   `resolution` ve `resolvedAt` `null`; `raisedById` dolu. Yani alanların
   VARLIĞI ölçüldü, DOLU hâllerinin şekli (metin mi, enum mu, kim tarafından
   yazılıyor) ölçülMEDİ. B7'yi kapatan Plan B task'ı önce çözülmüş bir takas
   anlaşmazlığı örneği bulmalı; bulamazsa ekran metnini alanların şekli
   üzerine kurmamalı.

4. **B5'in ilk-render penceresi.** `useMembershipLimits()` `app/_layout.tsx:76`
   ile kökte çağrılıyor, ama sorgu çözülene KADAR `limits` TIER_LIMITS'ten
   gelir ve orada premium `-1`'dir (`authStore.ts:172`). Yani ekran bir an
   premium bölümü gösterip sonra gizliyor olabilir. Bunu Metro'da GÖRMEDİM;
   koddan çıkardım. Kalıcı hâl (sorgu çözüldükten sonra) kesin ve ölçülü.

5. **`suspended` ilanın kullanıcıya nasıl göründüğü (B3).** Alanın varlığı
   ölçüldü; ekrandaki hâli KOD OKUNARAK çıkarıldı (`statusTextKey` `null`
   döner → ham kod basılır). Metro'da elle görülmedi.

6. **Boş gelen alanlar (Task 1-3'ten devam).** `receiverShipment.cargoCode`
   ölçülen takas örneğinde hiç dolu gelmedi; `rejectionReason` staging'deki tek
   `rejected` ilanda `null` (kayıt, alanın kalıcılaştığı 2026-08-13
   değişikliğinden eski). İkisinin de ŞEKLİ kardeş alanlardan biliniyor, DOLU
   bir örnek görülmedi.

7. **`counts.suspended`.** `GET /products/my/stats` bu sayacı döndürmüyor
   (ölçüldü). Bir filtre çipi eklenirse sayacın nereden geleceği açık bir soru;
   backend'e sorulmadı.

8. **`3b21b2acc`'nin kapak kuralı.** Kova (b)'de açıklandı: eleme kararımın
   yarısından emin değilim, mobil karşılığına bakılmadı.

---

## Bu raporun en önemli çıktısı — TARANMAMIŞ bir sınıf var

**Bekçi TEK YÖNLÜ.** Task 1-3'te kurulan sözleşme bekçisi
(`contractCoverage.test.ts`) yalnız bir yönü tarıyor:

> "Sunucunun yanıtında VAR, mobilin tipinde YOK."

Tersini — **"mobilin kodunda VAR, sunucunun yanıtında YOK"** — hiç taramıyor.
O yön bugüne kadar HİÇ taranmadı, ve bu raporda o sınıftan **iki canlı örnek**
çıktı:

| | Mobil ne okuyor | Sunucu ne döndürüyor | Sonuç |
|---|---|---|---|
| **B5** | `limits.maxListings === -1` | `maxTotalListings: 200` (`maxListings` alanı yok) | Premium üye premium sayılmıyor |
| **B11** | `payload.qrCode` | `qrCodeUrl` + `qrCodeImage` | QR hiç çizilmiyor |

Sınıfın imzası şu: **kod hiç patlamıyor.** `undefined === -1` `false` verir,
`payload.qrCode ?? ""` boş string verir. Ne tip hatası, ne çalışma zamanı
hatası, ne log. Ekran sessizce yanlış davranır. Bu, denetimin kurulma
gerekçesi olan `rejectionReason` sınıfının AYNA GÖRÜNTÜSÜ.

**Öneri (Plan B'ye girdi):** `contractCoverage.ts`'e ikinci bir yön eklemek
Task 1'in mekanizmasıyla ucuz — ölçülmüş gövdenin alan adları çıkarılıyor, kod
tabanında `X.<ad>` deseniyle okunan ama gövdede olmayan adlar raporlanıyor.
Yanlış pozitifleri olacaktır (istemcinin kendi türettiği alanlar), ama
allowlist deseni zaten kurulu.

## Bekçinin kendi başına yakalayamadığı diğer sınıflar

Rapordaki bulguların çoğu bekçiden ÇIKMADI, kod okunarak bulundu. Sebepler
belgeye geçsin:

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
- **İstemcide sabit içerik.** B4'ün ölçülecek bir ucu yok; hiçbir sözleşme
  bekçisi hukuki künyeyi denetleyemez. Karşılığı ana repodaki tek kaynakla
  (`PLATFORM_ENTITY`) eşlenmiş bir birim testi olabilir.
- **Commit'ler arası "ekle sonra geri al".** Geri çekilen B14 bu sınıfın
  örneği; ayrıntısı "Geri çekilen iki bulgu" altında.

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

Kullanıcı zararına ve düzeltme maliyetine göre; öncelik ETİKETİ tek başına
sıralamıyor (B1'in P1 olması onu kuyrukta geri atmaz — bkz. tablonun altındaki
not).

1. **B1** — takas takip linki. `deriveShipmentView` zaten yazılı, takas tarafı
   çağırmıyor; `TradeShipment` tipine `cargoCode` eklenmeli. En ucuz, en
   doğrudan etkili madde.
2. **B5 + B11 birlikte** — ikisi de "kodda var, yanıtta yok" sınıfı. B5
   `tierType`'a taşınmalı, B11'in hem alan adı hem atılan state'i düzeltilmeli.
   Aynı task'ta yapılırsa sınıfın kendisi de belgelenir.
3. **B8**, **B9** — iki eşleme hatası, ikisi de tek satırlık haritalama.
4. **B2** — satış kartı tutarı. `pricing.subtotal` tek kaynak, yoksa tutar HİÇ
   basılmamalı (`items[].price` yedek DEĞİL). Task'ın başlığı "parite
   düzeltmesi" OLMAMALI — bkz. yukarıdaki çekince.
5. **B3** — `suspended` durum haritası + menü kapısı. Filtre çipinin sayacı
   sunucudan gelmiyor; çip eklenecekse sayaç listeden hesaplanmalı.
6. **B4** — künye tek kaynağa taşınmalı (`legalFacts.ts` genişletilir, ana
   reponun `PLATFORM_ENTITY` değerleriyle eşlenir); karşılığı olmayan beş
   posta kutusu kaldırılmalı.
7. **B7**, **B10** (P2) — ikisi de yeni ekran/bölüm gerektiriyor, ürün kararı
   da var. B7'den önce çözülmüş bir anlaşmazlık örneği ölçülmeli.
8. **B6** (P2), **B13** (P3).
9. **Bekçinin ikinci yönü** — B5/B11 sınıfını kalıcı olarak yakalayan tarama.

Bu turda **backend'e devredilen madde YOK.** Tek aday (B14) geri çekildi.
