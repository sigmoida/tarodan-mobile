# Parite — Kalan İşler

**Güncelleme:** 2026-08-11 (Metro elle test turu sonrası)
**Referans noktası:** `sigmoida/tarodan-app` `development` @ `cfc058da` (2026-08-07)
— o tarihten beri mobili ilgilendiren yeni commit yok (kontrol edildi).

Bu dosya "web'de var, mobilde yok" listesi değil; **açık kalan sözleşme ve
davranış maddeleridir**. Kaynaklar: `mobile-parity docs/15,17,18`, delta 18'den
sonra giren `8f9ae671`, `13-parity-matrix.md`'nin kapanmamış satırları ve
2026-08-09 kırıcı turunun ertelenenleri.

Kapanan tur: `docs/superpowers/reports/2026-08-09-delta-17-18-kapanis.md`.

---

## 🎉 Önce iyi haber — iki tıkanıklık kalktı

Bunlar "backend bekliyor" diye kapatılmıştı; artık yapılabilir:

| Madde | Eski durum | Bugün |
| --- | --- | --- |
| **İlan düzenlemede kargo paket kademesi** | Sunucu kademeyi geri döndürmüyordu, prefill yapılamıyordu | `GET /products/my/:id` artık `edit.shippingPackageTier` döndürüyor (delta 18 §2c). **Backend bekleme maddesi kapandı** |
| **iOS Universal Links** | AASA yayında değildi, `ios.associatedDomains` bilerek eklenmemişti | AASA **canlı**: `https://tarodan.com.tr/.well-known/apple-app-site-association` → `200`, `Content-Type: application/json`. `app.json`'a `associatedDomains` eklenebilir |

Hâlâ bekleyen: **Android `assetlinks.json` 404** — imza parmak izi iletilmeden
açılamaz (boş liste yayınlamak Android doğrulamasını kalıcı düşürür).

---

## ✅ 2026-08-10 ilan formu turunda KAPANANLAR

`feat/ilan-formu-sozlesmesi` — kapanış:
`docs/superpowers/reports/2026-08-10-ilan-formu-kapanis.md`

- ~~**P1 #2** İlan düzenleme formu `edit` projeksiyonundan doldurulmalı~~ ✅
  (kargo paket kademesi tıkanıklığı da bununla kapandı)
- ~~**P1 #3** Görsel sahiplik ve sıra sözleşmesi~~ ✅
- ~~**P2 #6** `carModelId` / `modelCode` opsiyonel~~ ✅
  (`carModelId` zaten opsiyonelmiş; `modelCode` forma eklendi)
- ~~**P2 #7** Yeni ilan indirimli açılabilir~~ 🟡 **payload hazır, UI yok** —
  aşağıya bakın
- **P2 #8** `relatedOrder` / `relatedTrade` → **backend bekliyor**, ölçümle
  doğrulandı (`docs/superpowers/reports/2026-08-10-products-my-olcum.md`):
  hesapta 1 `sold` + 2 `reserved` ilan var, alan yine gelmiyor. Yani "örnek veri
  yok" değil, uç yayınlamıyor.

**Yeni P2 — oluşturma ekranında indirim girdisi UI'ı yok.** Boru hattı hazır ve
testli ama indirim kutusu yalnız düzenleme modunda render ediliyor
(`ListingSections.tsx`'te bir `isEdit` kapısı). Satıcı yeni ilanı doğrudan
indirimli açamıyor; oluşturup sonra düzenlemeden ekliyor. Tek satırlık bir kapı
gibi görünüyor ama gerçek ekrandan (input→handler→submit) bir entegrasyon testi
de gerekecek.

---

## ✅ 2026-08-11 kargo/takip turunda KAPANANLAR

`feat/kargo-takip-kodu` — kapanış:
`docs/superpowers/reports/2026-08-11-kargo-takip-kapanis.md`

- ~~**P1 #4** Kargo akışı — mevcut shipment'ı önce oku~~ ✅
- ~~**Matris #20** Satıcı takip numarası serbest metin~~ ✅ (elle giriş kalktı,
  `shippingApi.updateTracking` silindi — numarayı sunucu üretiyor)
- ~~`trackingNumber` vs `providerTrackingId` ayrımı~~ ✅ **dört ekranda birden**
  (alıcı detay, satıcı detay, grup, misafir takip). Alıcı `PKG-`'yi takip
  numarası olarak hiçbir yerde görmüyor; link `providerTrackingId`'den kuruluyor
  ve sunucunun bozuk `trackingUrl`'ü hiç okunmuyor.
- ~~Sürat durum kodu 1 → `picked_up`~~ ✅ (durum etiketi sözlüğü eklendi, bilinmeyen
  durumda ham kod basılmıyor)

**Yeni takip maddesi — satıcı kartındaki "Kargoya Ver" butonu döngüsü.** Kargo
kaydı zaten varken buton görünmeye devam ediyor (sipariş durumu şube kabulüne
kadar değişmiyor). Mesaj artık dürüst ama satıcı tekrar basabilir. Kartı
referans + "şubeye teslim edin" durumuna çevirmek kapatır; `useOrderShipment`
paylaşılan hook olarak hazır.

---

## 🧪 2026-08-11 Metro elle test turunda ÇIKANLAR

Üç turun ilk gerçek ekran doğrulaması. Rapor:
`docs/superpowers/reports/2026-08-11-metro-elle-test-turu.md`

**Doğrulandı:** ilan düzenlemede yalnız-başlık kaydı fiyat/kademe/görsel/nitelik/
modelCode/stok'u bozmuyor (API diff'i temiz); alıcı sipariş detayı `PKG-` iç
referansını hiçbir yerde göstermiyor ve bozuk `trackingUrl`'ü okumuyor;
checkout üç adım boyunca toplamı kaydırmıyor.

**Yeni P1 — teslim edilmiş siparişte takip kartı kendini yalanlıyor.**
`app/orders/[id]/_components/OrderInfoCards.tsx:149-152` alıcı dalı, `cargoCode`
yoksa **shipment durumuna bakmadan** "Satıcı paketinizi hazırlıyor…" basıyor.
`providerTrackingId` hiç gelmediği için bu dal her siparişte çalışıyor: kartın
sağı "Teslim edildi" derken gövdesi paketin hazırlandığını söylüyor. Aynı hata
grup ekranında ve misafir takipte **yok** (ikisi de durumu kapıyor), yani tek
dosyalık tutarsızlık — bir dosya + bir test.

**Yeni P2 — paket kademesi etiketlerinde Türkçe karakter yok** ("Kucuk Paket",
"Buyuk Paket"). Kaynak `GET /shipping/package-tiers`; mobil `tier.label`'ı aynen
basıyor. Ya backend tarifeyi düzeltir ya mobil `code → i18n etiketi` eşler.

**Gözlem:** ilan kaydetme diyaloğu açıkken derin bağlantıyla gidilen yeni rotanın
**üstünde** kalıyor (donma yok, dokununca kapanıyor). CLAUDE.md §12 ailesinden.

**Ortam borcu:** `maestro/run.sh` bu repoda çalışmıyor — yerel `:3001` backend'i
şart koşuyor, oysa standalone repo staging'e bakıyor. Ayrıca Maestro 2.5.1
Xcode 26 ile sürücü kuramıyordu; 2.8.0'a yükseltildi + simülatör yeniden
başlatıldı (asıl çözen bu).

---

## 🔴 P1 — Yanlış davranış veya kullanıcıyı yanıltan eksik

### 1. Bildirim sözleşmesi + tek route resolver'ı (delta 18 §3)

`09-messaging-notifications.md`'deki "`type` serbest metindir" bilgisi **artık
geçersiz** — sunucuda kapalı `NotificationType` enum'u var ve `link` sunucuda
merkezî olarak çözülüyor.

- Yeni tipler: `admin_broadcast`, `payment_confirmed`, `payment_failed`,
  `payment_refunded`, `trade_ready_for_shipping`, `trade_warehouse_approved`,
  `trade_warehouse_rejected`, `trade_cancel_locked`, `trade_return_completed`,
  `trade_return_lost`, `trade_refund_failed`, `trade_refund_completed`.
- **`8f9ae671` ile iki tane daha** (hiçbir delta dosyasında yok):
  `refund_request_received_seller` → satıcı siparişi,
  `refund_review_required_admin` → serbest admin linki, mobil hedefi yok.
- `data.audience` (`buyer | seller`) aynı tipin alıcı/satıcı ekranını seçiyor.
- `link` **`null` gelebilir** — kart yine gösterilmeli, tıklama devre dışı.
- Serbest hedefler yalnız `https://` veya `/` ile başlayabilir. Mobil
  `javascript:`, özel scheme veya bilinmeyen host'u **açmamalı**.
- Tek bir `toMobileRoute(type, link, data)` katmanı; ön plan, arka plan ve soğuk
  başlatma **aynı** resolver'ı kullanmalı.

### ~~2. İlan düzenleme formu `edit` projeksiyonundan doldurulmalı~~ ✅ KAPANDI (2026-08-10)

`GET /products/my/:id` artık iki projeksiyon döndürüyor: üst seviye (gösterim) ve
`edit` (kayda geri yazılabilir ham değerler). Form **yalnız `edit`'ten**
doldurulmalı — bugün üst seviyeden dolduruluyor, bu yüzden fiyat, paket boyutu,
görseller ve nitelikler geri yazımda bozulabiliyor.

- Uç `Cache-Control: no-store` döndürüyor; mobil de kalıcı cache'ten doldurmamalı.
- İndirim için kanonik çift `edit.price` + `edit.oldPrice`'tır (`oldPrice > price`
  ise normal fiyat `oldPrice`, indirimli `price`). `edit.salePrice` geriye uyum
  alanıdır, tek başına otorite değildir.
- **Bu madde yukarıdaki paket kademesi tıkanıklığını da kapatıyor.**

### ~~3. Görsel sahiplik ve sıra sözleşmesi~~ ✅ KAPANDI (2026-08-10)

- `POST /media/upload/product` yanıtındaki `cardKey`/`detailKey` artık kullanıcının
  geçici klasörüne bağlı. İstemci **key üretmemeli**, URL'den key çıkarmamalı,
  başka bir ilanın key'ini yeni upload gibi kullanmamalı.
- `images[]` sırası kanoniktir → indeks `sortOrder` olur, kapak ilk elemandır.
- Aynı key'in tekrarı reddedilir; yeni key isteği yapan kullanıcının upload'ından
  gelmelidir; üyelik görsel üst sınırı create ve update'te uygulanır.
- Update'te `images` göndermemek listeyi korur, göndermek tamamını değiştirir,
  `[]` hepsini temizler.
- Yükleme kuyruğu bitmeden kaydetme açılmamalı; geçici önizleme URL'i değil
  API'nin döndürdüğü `cardUrl`/`detailUrl` + key çifti saklanmalı.
- `409`/iyimser kilit hatasında yerel form **kaydedilmiş sayılmamalı**.

### ~~4. Kargo akışı — mevcut shipment'ı önce oku~~ ✅ KAPANDI (2026-08-11)

- Ödeme tamamlanınca backend shipment satırını **otomatik** oluşturuyor.
- Satıcı kargo ekranı önce `GET /shipping/order/:orderId` çağırmalı; shipment
  varsa tekrar `POST /shipping` **yapmamalı** (uç hata döndürür).
- Onarım yolu yalnız: shipment `404` **ve** sipariş `preparing` **ve** kullanıcı satıcı.
- **Kod ayrımı** (bugün karışık): `trackingNumber` Tarodan/Sürat sorgu referansıdır
  (`PKG-`/`ORD-`) ve **UI kargo kodu değildir**; kullanıcıya gösterilecek ve takip
  bağlantısına verilecek olan `providerTrackingId` (`shipment.cargoCode`).
- `status = pending` + `providerTrackingId = null` **normal ara durumdur** —
  "Kargo kodu hazırlanıyor" gösterilmeli, hata sayılmamalı; odağa gelince/pull-to-
  refresh ile tazelenmeli.
- **`8f9ae671` (dokümansız):** Sürat durum kodu `1` artık `pending` değil
  **`picked_up`** — "şubede fiziksel kabul edildi" demek. Durum haritası gözden geçirilmeli.

### 5. Kurumsal satış yetkisi (delta 18 §1)

- `POST /cart/items` askıdaki satıcı ürünü için `409 SELLER_SALES_SUSPENDED`
  dönebilir.
- Public katalog ve ürün detayı satış yetkisi olmayan satıcının ilanlarını
  gizliyor; daha önce açılmış detay `404` olabilir → bayat detayı satın alınabilir
  gösterme, listeye dön.
- Üyeliği biten kurumsal satıcı ilan oluşturamaz/düzenleyemez (yalnız pasife alma
  açık) → BUSINESS üyelik yenileme akışına yönlendir.

---

## 🟠 P2 — Eksik ama yanıltmayan

| # | Madde | Kaynak |
| --- | --- | --- |
| ~~6~~ | ✅ KAPANDI (2026-08-10) — `carModelId` zaten opsiyoneldi, `modelCode` forma eklendi — formdaki zorunluluk kaldırılmalı. Temizleme: `carModelId: null`, model kodu için boş string | delta 18 §2a |
| ~~7~~ | 🟡 Payload hazır (2026-08-10) ama **oluşturma ekranında UI yok** — satıcı yeni ilanı doğrudan indirimli açamıyor: `originalPrice`, `salePrice`, `saleStartDate`, `saleEndDate`. Etkin fiyatı istemcide türetme — `price`/`oldPrice`/`isOnSale` esas | delta 18 §2b |
| ~~8~~ | 🧱 **Backend bekliyor** — alan yayınlanmıyor (ölçüldü). `relatedOrder` / `relatedTrade` — satılmış/rezerve ilan aksiyonunu tahminî `orderId`'den türetmeyi bırak | delta 18 §2e |
| 9 | `distanceSalesAccepted` (opsiyonel) + onay kutusu. **İlk çağrıda gönder** (idempotency replay sonradan gelen onayı işlemez). Buy-now `/orders/buy` kullanıyorsa onay düşemez — tek ürünlük `/orders/checkout`'a geçmeyi değerlendir | delta 17 §2 |
| 10 | **Sepette satır seçerek ödeme** — API işi **sıfır**, tamamen istemci durumu. `POST /orders/quote`/`checkout` zaten gönderilen `items`'ı fiyatlıyor ve yalnız onları sepetten düşüyor | delta 17 §3 |
| 11 | Checkout sonrası sepeti **yeniden çek**, `DELETE /cart/items` atma — sunucu satırları transaction içinde zaten siliyor, ekstra silme `404` alır | delta 17 §3 |
| 12 | Bülten formu: kutular **işaretsiz** başlasın (KVKK/ETK); ikisi de `false` → yeni `400` | delta 17 §6 |
| 13 | `GET /products/filters` → `scales` **boş dizi** dönebilir (16'lık sabit fallback kaldırıldı); filtre UI'ı `[]`'e dayanıklı olsun | delta 17 §7 |
| 14 | `DELETE /membership/cards/:id` başarılı yanıtından sonra listeyi invalidate et; PayTR temizliğini bekleme | delta 18 §5 |
| 15 | `/security/*` eski şifre-sıfırlama uçları silinmek üzere (issue #432) — mobilin bunları çağırmadığı teyit edilmeli; akış `/auth/*` üzerinden olmalı | delta 17 §7 |
| 16 | **iOS `associatedDomains`** eklenebilir (AASA canlı). appID: `P2628CQK26.com.tarodan.app`. Kapsam dışı bırakılanlar: `/checkout*`, `/payment/*`, `/admin/*`, `/api/*` | delta 17 §5 |

---

## 🧹 2026-08-09 turundan ertelenenler

Hiçbiri merge'ü engellemedi; gerekçeleri kapanış raporunda.

| Madde | Not |
| --- | --- |
| v1 ödeme butonundaki " (komisyon dahil)" ibaresi kaldırıldı | Tutar doğru ve değişmedi, yalnız şeffaflık metni gitti. Yeni katalog anahtarı gerektiriyor (ör. `payment.commissionIncluded`) |
| `uid` çözülmemişken iki takas kartı da gizli kalabiliyor | Pencere auth rehydrate anıyla sınırlı. Temiz çözüm: `TradePaymentsCard` kapısını da `totalCount === 0`'a bağlamak — iki kapı aynı sinyalin iki yüzü olur |
| `TradeCostPreviewCard.lockedPaymentCount` opsiyonel | Unutulan çağrı sessizce eski dala düşer. Prop zorunlu olup `app/trade/new` açıkça `0` geçmeli |
| `unavailableProductIds` useMemo'sunda `exhaustive-deps` susturması | Bayat kapanış riski yok; aynı dosyadaki `itemsSignature` kalıbı daha temiz |
| Tüm satırlar ayrılırsa özet "0 ürün" dalı | Test edilmemiş kenar durum |
| `renderOtherShipmentHint`'te gereksiz `s !== "delivered"` | Kozmetik |

---

## 🧱 Backend bekleyenler (mobil tek başına kapatamaz)

`shippingPackageTier` maddesi **çözüldü** (yukarı bak). Kalan dört:

| Madde | Neden mobilde kapatılamıyor |
| --- | --- |
| **10 üyelik limiti** hiçbir uçta yayınlanmıyor | İstemci sabiti kalmak zorunda |
| **İade onay/ret ucu yok** | Satıcı iade sekmesi salt okunur kalmak zorunda |
| **IP-blok 403'ünde ayırt edici alan yok** | O hata dalı bilerek yazılmadı |
| **Kupon reddi 400'ünde yapısal alan yok** | Ayrım mesaj metnine bağlı kalıyor |
| **Android `assetlinks.json` yayında değil** | İmza parmak izi backend/ops tarafına iletilmeli |
| **`POST /orders/guest/track` gerçek Sürat kodunu döndürmüyor** | Yalnız `provider`, `trackingNumber` (iç referans), `trackingUrl` (bozuk), `status`, `estimatedDelivery` veriyor. Misafir takip ekranı numara yerine **durum** gösteriyor; alan uydurulmadı |
| **`GET /products/my` `relatedOrder`/`relatedTrade` yayınlamıyor** | Ölçümle doğrulandı: 1 `sold` + 2 `reserved` ilan var, alan yine gelmiyor |

Bunlar yeni bir denetimde "mobil bulgusu" olarak açılmamalı — sözleşme eksiğidir.

---

## 📋 Matristen kalan açık satırlar

| # | Madde | Durum |
| --- | --- | --- |
| 7 | Satıcı iade gelen kutusu — sekme açıldı ama **salt okunur** | Backend bekliyor (onay/ret ucu yok) |
| 9 | `EMAIL_NOT_VERIFIED` refresh 401'i | `errorCode` üzerinden bağlandı; gövde canlı üretilemedi, kod gelmezse davranış aynı |
| 10 | IP-engel 403'ü | Backend bekliyor; yerine `x-request-id` raporlanıyor |
| 15 | iOS universal link | **Artık açılabilir** — AASA canlı; P2 #16 ile aynı iş |
| ~~20~~ | ✅ **KAPANDI** (2026-08-11) — elle giriş kalktı, `updateTracking` silindi |

---

## Önerilen sıra (güncel)

0. **Takip kartı durum kapısı** (Metro turunun P1'i) — tek dosya, tek test;
   bugün her teslim edilmiş siparişte yanlış metin gösteriliyor. Ucuz ve
   kullanıcıyı doğrudan yanıltıyor, o yüzden başa alındı.
1. **P1 #1** (bildirim resolver'ı) — kalan iki P1'den daha temel; tek katman,
   sonrasında her yeni tip ucuz. 14 tip, ikisi hiçbir delta dosyasında yok.
2. **P1 #5** (kurumsal satış yetkisi) — satın alınamaz ürünün satın alınabilir
   görünmesini bitirir.
3. **P2 toplu tur** — çoğu tek dosyalık; **#10 ve #11 sıfır API işi**;
   paket kademesi etiketleri de buraya.
4. **Temizlik turu** — üç turun ertelenenleri + iOS `associatedDomains` (P2 #16,
   matris #15 ile aynı iş) + `maestro/run.sh`'ın staging'e uyarlanması.
