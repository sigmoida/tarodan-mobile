# Parite — Kalan İşler

**Güncelleme:** 2026-08-11 (P2 toplu tur sonrası — mobil tarafı kapandı)
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

- ~~**Yeni P1** teslim edilmiş siparişte takip kartı kendini yalanlıyor~~ ✅
  **KAPANDI** (`e05f4fd`). Alıcı dalı `cargoCode` yoksa shipment durumuna
  bakmadan "Satıcı paketinizi hazırlıyor…" basıyordu; `providerTrackingId` hiç
  gelmediği için bu dal her siparişte çalışıyordu. Not artık `isAwaitingDropoff`
  kapısından geçiyor ve kapı, başlıktaki durumla **aynı değerden** okunuyor.
  Grup ekranında da daha hafif hâli varmış (yalnız "teslim edildi" muaf tutulmuş,
  kargoya verilmiş sipariş yine "hazırlanıyor" diyordu) — o da kapatıldı. Misafir
  takipteki yerel `AWAITING_DROPOFF` kopyası ortak modüle taşındı, üç ekran tek
  kaynağa bağlı. Simülatörde staging'e karşı doğrulandı.

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

### ~~1. Bildirim sözleşmesi + tek route resolver'ı~~ ✅ KAPANDI (2026-08-11)

Ölçüm: `docs/superpowers/reports/2026-08-11-bildirim-sozlesmesi-olcum.md` (36 kayıt).

Tek katman `notificationRoute(n)` (`src/utils/notificationRoute.ts`); uygulama
içi liste ve push tap artık **aynı** fonksiyonu çağırıyor. Sıra ölçümden çıktı:
tip istisnaları → `data` kimlikleri (`audience` satıcıyı `/sales/:id`'ye
götürür; sipariş gruptan önce gelir) → `data.link` → `link` (mevcut yol
eşlemesi) → `null`. Hedef yoksa **gezinme yok** — kullanıcı alakasız ekrana
atılmıyor. Güvenlik kapısı: yalnız `/…` göreli yol veya tanıdık host üzerinden
`https://`; `javascript:`, özel scheme, protokol-göreli `//host` ve yabancı
host reddediliyor.

Ölçümle yakalanıp kapanan üç ayrışma: grup ödemesi (link listeye düşerken
`checkoutGroupId` grubu açıyor), `trade_auto_cancelled` (link listeye düşerken
`tradeId` takası açıyor), `products/unavailable` kuralının yalnız push'ta
olması. `audience` ilk kez okunuyor.

**Cihazda doğrulandı (2026-08-11, sayfalama açıldıktan sonra):** listede 26.
sıradaki grup ödemesi bildirimine dokunmak artık **grup ekranını** açıyor
(`GRP-AT979R67NS`, üç siparişiyle) — düzeltmeden önce Profil sekmesine
düşüyordu. Push tap yolu hâlâ simülatörde sınanamıyor (P2 #18).

### Eski metin (referans) — bildirim sözleşmesi (delta 18 §3)

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

### 5. Kurumsal satış yetkisi (delta 18 §1) — 🔒 **ÖLÇÜLEMİYOR (2026-08-11)**

Staging'de bu maddenin hiçbir sinyali üretilemiyor:

- **Askıya alınmış satıcı yok** → `409 SELLER_SALES_SUSPENDED` tetiklenemiyor.
  Satışa uygun olmayan ürün için sepet ucu `400 "Bu ürün şu an satışa uygun
  değil"` döndürüyor ve bu gövdede **ne `i18nKey` ne yapısal kod var** (kupon
  reddiyle aynı aile) — yani 409'un gövdesi de tahmin edilemez.
- **Kurumsal hesap yok**: `ahmet@demo.com` ve `ali@demo.com` (dokümanda
  BUSINESS diye geçiyor) ikisinde de `businessStatus: null`, `companyName: null`,
  üyelik `premium` ve **2027-08-05**'e kadar aktif. Üyeliği biten kurumsal
  satıcı akışı gözlemlenemiyor.
- **Bayat detay**: gizlenen ürün gerçekten `404` (`i18nKey:
  server.product.notFound`) — ama erişebildiğim gizli ilanların **hepsi kendi
  ilanım**, o yüzden alıcının bayat-detay yolu üretilemiyor. (Sahibi için ekran
  doğru: alt bar "İlanı Düzenle", satın alma yolu yok.)

Ölçüm kapısı gereği bu maddeye ölü dal yazılmadı. Açılması için staging'de
**askıya alınmış satış yetkisine sahip bir kurumsal satıcı + o satıcının bir
ilanı** gerekiyor; ayrıca 409 gövdesinin ayırt edici alan taşıyıp taşımadığı
netleşmeli.

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
| ~~7~~ | ✅ **KAPANDI** (2026-08-11) — indirim bloğunun önündeki `isEdit` kapısı kaldırıldı; `buildSalePayload` zaten create yolunda da çağrılıyordu, engel yalnız UI'daydı. Güvence ekrandan uçtan uca (girdi → yüzde hesabı) | delta 18 §2b |
| ~~8~~ | 🧱 **Backend bekliyor** — alan yayınlanmıyor (ölçüldü). `relatedOrder` / `relatedTrade` — satılmış/rezerve ilan aksiyonunu tahminî `orderId`'den türetmeyi bırak | delta 18 §2e |
| ~~9~~ | ✅ **KAPANDI** (2026-08-11) — onay kutusu onay adımında, ödemeyi kapatıyor, sözleşme sayfasına link veriyor; alan üye ve misafir yollarında **ilk çağrının** gövdesinde gidiyor ve API DTO'sunda **zorunlu**. Buy-now endişesi mobilde geçersiz: `/orders/buy` API katmanında tanımlı ama **hiç çağrılmıyor**, buy-now da `/checkout?buyNow=1` ile aynı uca gidiyor. ⚠️ Sunucunun alanı işlediği **doğrulanamadı**: uç bilinmeyen alanları reddetmiyor (uydurma alanla aynı 400) | delta 17 §2 |
| ~~10~~ | ✅ **KAPANDI** (2026-08-11) — satır başına onay kutusu + "tümünü seç"; seçim `cartStore.deselectedIds`'te (opt-out: sonradan eklenen satır kendiliğinden seçili). Quote ve checkout yalnız seçilileri görüyor, seçim dışı satır fiyat yerine sebebini yazıyor, hiçbiri seçili değilken ödeme kapalı | delta 17 §3 |
| ~~11~~ | ✅ **KAPANDI** (2026-08-11) — `cartApi.clear()` kaldırıldı; yerelde yalnız ödenen satırlar düşüyor (`onPurchaseComplete`, yazılmış ama hiç çağrılmayan bir ilkeydi), sunucu sepeti `qk.cart.mine` invalidate ile tazeleniyor. Satır seçimiyle birlikte bu artık yalnız gereksiz değil **yıkıcıydı**: `DELETE /cart` seçilmeyen satırları da silerdi | delta 17 §3 |
| ~~12~~ | ✅ **KAPANDI** (2026-08-11) — form hiç onay kutusu göstermiyor, `newsletter: true` sabit gidiyordu (rıza alınmadan abonelik). Artık işaretsiz başlayan bir rıza kutusu abone olmanın kapısı ve gövdeye kullanıcının verdiği değer gidiyor. ⚠️ **Doküman yanlış çıktı:** sunucu "ikisi de false → 400" kuralını UYGULAMIYOR — yalnız `email` zorunlu, `newsletter: false` ile bile abonelik başarılı dönüyor. Kapı tamamen istemcide | delta 17 §6 |
| ~~13~~ | ✅ **KAPANDI** (2026-08-11) — mobil boş yanıt görünce 5 elemanlı bir **istemci listesi** koyuyordu; kullanıcı katalogda karşılığı olmayan ölçekle filtreleyip sıfır sonuç alıyordu. `SCALE_FALLBACK`/`MATERIAL_FALLBACK` silindi, boş dizi aynen geçiyor | delta 17 §7 |
| ~~14~~ | ✅ **KAPANDI** (2026-08-11) — invalidate zaten vardı; eksik olan anahtarın elle yazılmasıydı (`["saved-cards"]`). `qk.payments.savedCards`'a bağlandı — bugün değerler aynı, ama sapma tam böyle başlıyor | delta 18 §5 |
| ~~15~~ | ✅ **TEYİT EDİLDİ** (2026-08-11), kod değişikliği gerekmedi. Mobilin şifre sıfırlama akışı `/auth/forgot-password` + `/auth/reset-password`. `/security/*` altında yalnız **farklı** özellikler çağrılıyor: 2FA (`/security/2fa/*` → `status` 200), şifre **değiştirme** (`/security/password/change` → boş gövdede 400, yani canlı) ve tüm cihazlardan çıkış. Silinecek olan `POST /security/password/reset` staging'de hâlâ ayakta (boş gövdede 400) ama mobil onu **çağırmıyor** | delta 17 §7 |
| ~~16~~ | ✅ **KAPANDI** (2026-08-11) — `app.json`'a `applinks:tarodan.com.tr` + `applinks:staging.tarodan.com.tr` eklendi; host listesi `paths.json`'dan tek kaynak, bekçisi `appConfig.test.ts`. Ölçüm: iki alan adında da AASA `200`/`application/json`, içerik üretilenle aynı, **Apple CDN de görmüş**. ⚠️ Entitlement — **yeni build** gerekir | delta 17 §5 |
| ~~17~~ | ✅ **KAPANDI** (2026-08-11) — `useInfiniteQuery` + `onEndReached`; sunucunun `pagination.{page,pages}` alanları okunuyor, sayfa yokken istek atılmıyor, okundu-işaretleme iyimser güncellemesi sayfalı önbelleğe uyarlandı (işaretlenen satır ikinci sayfada olabilir). Simülatörde 26. sıradaki kayda erişildi | 2026-08-11 ölçümü |
| 18 | **Push yolu simülatörde sınanamıyor** — `registerForPushNotifications` `!Device.isDevice` kapısında **izin istemeden** dönüyor, iOS bildirimi göstermiyor, `simctl push` yutuluyor. İzin isteme adımını simülatörde de çalıştırmak push tap'ini otomasyona açar | 2026-08-11 ölçümü |

---

## 🧹 2026-08-09 turundan ertelenenler

Hiçbiri merge'ü engellemedi; gerekçeleri kapanış raporunda.

**2026-08-11 temizlik turunda hepsi kapandı** (biri hariç, aşağıda).

| Madde | Sonuç |
| --- | --- |
| ~~v1 ödeme butonundaki " (komisyon dahil)" ibaresi kaldırıldı~~ | ✅ `payment.commissionIncluded` katalog anahtarı eklendi; ibare **yalnız v1 ve komisyon > 0** iken basılıyor (v2'de komisyon yok) |
| ~~`uid` çözülmemişken iki takas kartı da gizli kalabiliyor~~ | ✅ `TradePaymentsCard` kapısı satır SAYISINA (`totalCount`) bağlandı — kim olduğumuzdan bağımsız. İki kapı artık aynı sinyalin iki yüzü: her durumda tam olarak biri çiziliyor |
| ~~`TradeCostPreviewCard.lockedPaymentCount` opsiyonel~~ | ✅ zorunlu; `app/trade/new` açıkça `0` geçiyor (kilit kavramı orada yok) |
| ~~`unavailableProductIds` useMemo'sunda `exhaustive-deps` susturması~~ | ✅ `unavailableSignature` ara `useMemo`'suyla susturma kalktı — `itemsSignature` ile aynı kalıp |
| ~~Tüm satırlar ayrılırsa özet "0 ürün" dalı~~ | ✅ satır seçimi bunu **tasarımca ulaşılabilir** yaptı: hiçbir satır seçili değilken özet "Fiyat alınamadı / Tekrar Dene" hata kartına düşüyordu. Artık ne yapılacağını söyleyen not var |
| ~~`renderOtherShipmentHint`'te gereksiz `s !== "delivered"`~~ | ✅ kaldırıldı (`delivered` bir üstteki dalda zaten dönüyor) |

**Kapanmayan tek madde — satıcı "Kargoya Ver" butonu.** Yıkıcı kısmı zaten
kapalı: `handleShip` ÖNCE okuyor, mevcut kayda POST atmıyor, mesaj dürüst ve
`ShipDialog` var olan kaydın referansını gösteriyor. Kalan yalnız buton
etiketinin bitmiş bir işi vaat etmesi. Kartı "referans + şubeye teslim edin"
durumuna çevirmek satır başına kargo verisi ister ve **staging'de gözlemlenemiyor**
(`ahmet@demo.com`'un satışı yok). Körlemesine UI yazmamak için bırakıldı.

---

## 🧱 Backend bekleyenler (mobil tek başına kapatamaz)

`shippingPackageTier` maddesi **çözüldü** (yukarı bak). Kalan dört:

| Madde | Neden mobilde kapatılamıyor |
| --- | --- |
| ~~**10 üyelik limiti** hiçbir uçta yayınlanmıyor~~ **YANLIŞ — 2026-08-11 ölçümü** | `GET /membership/me/limits` `maxImages: 10`, `maxTotalListings: 200` döndürüyor; `/users/me` de `membership.tier` altında veriyor. `useMembershipLimits` beş alanın beşini de eşliyor, ilan formu sunucu değerini okuyor ("3 / 10 yüklendi" ekranda doğrulandı). Gerçek eksik daha dar: `MembershipLimits`'in kalan 10 alanı (`maxAddresses`, `maxSavedSearches`, `maxMessagesPerDay`, `listingExpireDays`, `maxReviewChars`, `maxValuePerListing`, `canFeatureListings`, `canBulkUpload`, `canScheduleListings`, `priorityInSearch`) yayınlanmıyor — onlar istemci sabiti kalıyor |
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
| ~~15~~ | ✅ **KAPANDI** (2026-08-11) — `associatedDomains` eklendi (P2 #16 ile aynı iş) |
| ~~20~~ | ✅ **KAPANDI** (2026-08-11) — elle giriş kalktı, `updateTracking` silindi |

---

## Önerilen sıra (güncel)

0. ~~Takip kartı durum kapısı~~ ✅ kapandı (`e05f4fd`).
1. ~~P1 #1 (bildirim resolver'ı)~~ ✅ kapandı (2026-08-11).
2. **P1 #5** (kurumsal satış yetkisi) — satın alınamaz ürünün satın alınabilir
   görünmesini bitirir.
3. ~~P2 toplu tur~~ ✅ kapandı (2026-08-11): #7, #9, #10, #11, #12, #13, #14, #15, #16, #17.
4. ~~Temizlik turu~~ ✅ kapandı (2026-08-11); yalnız satıcı buton etiketi açık.

**Mobilin tek başına kapatabileceği madde kalmadı.** Açık olanların hepsi ya
staging verisi ya backend sözleşmesi bekliyor:

| Ne bekliyor | Maddeler |
| --- | --- |
| **Staging verisi** | P1 #5 (askıya alınmış kurumsal satıcı + ilanı), satıcı "Kargoya Ver" buton etiketi (satışı olan satıcı hesabı), push tap yolu (P2 #18 — simülatörde izin istenmiyor) |
| **Backend** | Android `assetlinks.json` (imza parmak izi), iade onay/ret ucu, IP-blok 403 ayırt edici alanı, kupon reddi yapısal alanı, `relatedOrder`/`relatedTrade`, misafir takipte gerçek Sürat kodu, paket kademesi etiketlerinde Türkçe karakterler, `MembershipLimits`'in yayınlanmayan 10 alanı |
| **Yeni build** | iOS `associatedDomains` bir entitlement — OTA ile geçmez |

Repoda kalan iş: `maestro/run.sh`'ın staging'e uyarlanması ve iki kararsız test
(`J30.5` koleksiyon düzenle, `J75.2` ödeme WebView — ikisi de izole koşumda
geçiyor, tam koşumda ara sıra düşüyor).
