# Parite — Kalan İşler

**Güncelleme:** 2026-08-10
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

### 2. İlan düzenleme formu `edit` projeksiyonundan doldurulmalı (delta 18 §2c)

`GET /products/my/:id` artık iki projeksiyon döndürüyor: üst seviye (gösterim) ve
`edit` (kayda geri yazılabilir ham değerler). Form **yalnız `edit`'ten**
doldurulmalı — bugün üst seviyeden dolduruluyor, bu yüzden fiyat, paket boyutu,
görseller ve nitelikler geri yazımda bozulabiliyor.

- Uç `Cache-Control: no-store` döndürüyor; mobil de kalıcı cache'ten doldurmamalı.
- İndirim için kanonik çift `edit.price` + `edit.oldPrice`'tır (`oldPrice > price`
  ise normal fiyat `oldPrice`, indirimli `price`). `edit.salePrice` geriye uyum
  alanıdır, tek başına otorite değildir.
- **Bu madde yukarıdaki paket kademesi tıkanıklığını da kapatıyor.**

### 3. Görsel sahiplik ve sıra sözleşmesi (delta 18 §2d)

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

### 4. Kargo akışı — mevcut shipment'ı önce oku (delta 18 §4)

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
| 6 | `carModelId` ve `modelCode` **opsiyonel** oldu — formdaki zorunluluk kaldırılmalı. Temizleme: `carModelId: null`, model kodu için boş string | delta 18 §2a |
| 7 | Yeni ilan **indirimli açılabiliyor**: `originalPrice`, `salePrice`, `saleStartDate`, `saleEndDate`. Etkin fiyatı istemcide türetme — `price`/`oldPrice`/`isOnSale` esas | delta 18 §2b |
| 8 | `GET /products/my` satırlarında `relatedOrder` / `relatedTrade` — satılmış/rezerve ilan aksiyonunu tahminî `orderId`'den türetmeyi bırak | delta 18 §2e |
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

Bunlar yeni bir denetimde "mobil bulgusu" olarak açılmamalı — sözleşme eksiğidir.

---

## 📋 Matristen kalan açık satırlar

| # | Madde | Durum |
| --- | --- | --- |
| 7 | Satıcı iade gelen kutusu — sekme açıldı ama **salt okunur** | Backend bekliyor (onay/ret ucu yok) |
| 9 | `EMAIL_NOT_VERIFIED` refresh 401'i | `errorCode` üzerinden bağlandı; gövde canlı üretilemedi, kod gelmezse davranış aynı |
| 10 | IP-engel 403'ü | Backend bekliyor; yerine `x-request-id` raporlanıyor |
| 15 | iOS universal link | **Artık açılabilir** — AASA canlı (yukarı bak) |
| 20 | Satıcı takip numarası serbest metin | P1 #4 ile birlikte ele alınmalı — sunucu üretimli `PKG-`/`providerTrackingId` düzeniyle çelişiyor |

---

## Önerilen sıra

1. **P1 #2 + #3** (ilan düzenleme `edit` + görsel sözleşmesi) — birlikte yapılmalı,
   ikisi de aynı ekrana dokunuyor ve #2 paket kademesi tıkanıklığını da kapatıyor.
2. **P1 #1** (bildirim resolver'ı) — tek katman, sonrasında her yeni tip ucuz.
3. **P1 #4 + matris #20** (kargo akışı ve kod ayrımı) — kullanıcıya yanlış kod
   gösterilmesini bitirir.
4. **P1 #5** (kurumsal satış yetkisi) — satın alınamaz ürünün satın alınabilir
   görünmesini bitirir.
5. **P2 toplu tur** — çoğu tek dosyalık; #10 ve #11 sıfır API işi.
6. **Temizlik turu** — 2026-08-09 ertelenenleri + iOS `associatedDomains`.
