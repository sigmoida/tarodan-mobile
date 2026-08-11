# Ölçüm — bildirim sözleşmesi (staging, 36 kayıt)

**Tarih:** 2026-08-11
**Uç:** `GET /notifications?limit=50`, `ahmet@demo.com`
**Yanıt şekli:** `{ notifications[], pagination, unreadCount }`
**Kayıt alanları:** `id, type, title, message, icon, link, data, isRead, createdAt`

Bu dosya delta 18 §3'ün yerine geçmez; **ölçülen** hâli anlatır. Kod bu dosyadan
yazılır, delta dosyasından değil.

---

## Görülen tipler (36 kayıtta)

| tip | adet | dokümanda var mı |
| --- | --- | --- |
| `seller_did_not_ship_refunded` | 9 | ✗ |
| `payment_refunded` | 9 | ✓ |
| `payment_confirmed` | 8 | ✓ |
| `order_reservation_released` | 2 | ✗ |
| `trade_auto_cancelled` | 2 | ✗ |
| `order_cancelled` | 1 | ✗ |
| `trade_counter` | 1 | ✗ |
| `trade_ready_for_shipping` | 1 | ✓ |
| `trade_accepted` | 1 | ✗ |
| `offer_accepted` | 1 | ✗ |
| `cargo_code_ready` | 1 | ✗ |

Yani enum kapalı olsa bile **delta dosyasındaki liste eksik**: 11 tipin 8'i orada
yok. Tip listesine göre `switch` yazmak bu yüzden kırılgan — bilinmeyen tip
normal durumdur, hata değil.

## `data` alanları

| anahtar | kaç kayıtta |
| --- | --- |
| `icon` | 36 |
| `link` | 32 |
| `orderId` | 26 |
| `type` | 21 |
| `orderNumber` | 11 |
| `audience` | 9 |
| `groupNumber` | 7 |
| `checkoutGroupId` | 7 |
| `tradeId` | 6 |
| `productTitle` | 3 |
| `offerId` | 1 |
| `counterOffererName` · `shippingDeadline` · `reference` | 1 |

`audience` yalnız `payment_refunded` kayıtlarında ve hepsinde değeri `'buyer'`.
Örnekte `'seller'` görülmedi — ama alan var, sözleşme gerçek.

## Üç sürpriz

### 1. `link` ile `data.link` AYNI DEĞİL

Üst seviye `link` web profil yolu (`/profile/orders/:id`), `data.link` ise
öneksiz sürüm (`/orders/:id`). Beş kayıtta ayrıştılar:

```
trade_auto_cancelled      /profile/trades          ≠  /trades/12012f5e-…
trade_ready_for_shipping  /profile/trades/efee…    ≠  /trades/efee…
payment_confirmed         /profile/orders/e975…    ≠  /orders/e975…
offer_accepted            /profile/orders/e975…    ≠  /orders/e975…
cargo_code_ready          /profile/trades/2753…    ≠  /trades/2753…
```

`trade_auto_cancelled`'da **`data.link` daha spesifik**: üst seviye link listeye,
`data.link` ilgili takasa gidiyor.

### 2. Grup ödemesinde `link` kayıp bilgi taşıyor

Dört `payment_confirmed` kaydında `link = '/profile/orders'` — yani **liste**.
Ama `data` grubu tanımlıyor:

```json
{"type":"payment_confirmed","groupNumber":"GRP-AT979R67NS",
 "checkoutGroupId":"35481072-5428-41e8-8115-e7bff8c64717"}
```

Mobilde `app/orders/group/[id]` rotası **var**. Link'e uyan bir çözümleyici
kullanıcıyı listeye (hatta Profil sekmesine) atıyor; `data` doğru hedefi
biliyor. **Link tek başına otorite değil.**

### 3. `link` bu örneklemde hiç `null` gelmedi

36/36 dolu. Doküman `null` gelebileceğini söylüyor; ele alınmalı ama sık yol bu değil.

---

## Bugünkü mobil davranış — iki çözümleyici, iki farklı sonuç

| | uygulama içi liste | push tap |
| --- | --- | --- |
| karar yeri | `_hooks/useNotifications.ts` (`handlePress`) + `_lib/route.ts` | `src/services/push.ts` |
| yöntem | `offer_counter` istisnası → **`link`** → `data` id'leri | **`link`** → 3 tiplik switch → `data` id'leri |
| `type` okur mu | tek tip | üç tip |
| `audience` okur mu | hayır | hayır |

İkisi de **link öncelikli**; ayrıştıkları yer tip istisnaları ve sıralama.
Ölçümdeki somut sonuçlar:

- **`payment_confirmed` (grup):** `link = '/profile/orders'` → yol eşlemesi
  `sectionId` bulamayıp **Profil sekmesine** düşürüyor. Her iki yol da oraya
  gidiyor; doğrusu `/orders/group/<checkoutGroupId>` ve bilgi `data`'da duruyor.
- **`trade_auto_cancelled`:** `link = '/profile/trades'` → yine **Profil sekmesi**,
  oysa `data.tradeId` ilgili takası veriyor.
- **`audience: 'seller'`:** hiçbir yerde okunmuyor. Satıcıya ait bir sipariş
  bildirimi satıcıyı alıcı ekranına (`/orders/:id`) götürür; oysa `app/sales/[id]`
  var.
- **`products/unavailable` kuralı yalnız push'ta:** stok bitmiş ürün bildirimine
  listeden dokunan kullanıcı ürün detayına, push'tan dokunan "satışta değil"
  ekranına gidiyor. Aynı bildirim, iki ekran.

`toMobileRoute(link)` yol eşlemesi olarak **iyi durumda** (`/profile/orders/:id`,
`/profile/trades/:id`, `/messages?thread=`, ödeme dönüşünü bilerek engelleme…).
Sorun eşlemede değil, **girdisinde**: yalnız `link` alıyor, `type`/`data`
göremiyor.

---

## Sıra kararı: önce `data`, sonra `link` — bir istisnayla

Ölçüm iki kez `link`'in kayıp bilgi taşıdığını gösterdi, o yüzden tipli
kimlikler önce okunuyor. **Ama sipariş, grubun önünde**: sunucu tek siparişi
bildiğinde HEM `orderId` HEM spesifik link veriyor (3 kayıt); yalnız grubu
bildiğinde link listeye düşüyor (4 kayıt). Yani `orderId` varken grup daha az
spesifik hedef.

| kayıt | `orderId` | `checkoutGroupId` | `link` | hedef |
| --- | --- | --- | --- | --- |
| 3 adet | ✓ | ✓ | `/profile/orders/:id` | `/orders/:id` |
| 4 adet | ✗ | ✓ | `/profile/orders` (liste) | `/orders/group/:id` |

---

## Cihazda doğrulanamayan kısım (dürüst kayıt)

Grup vakası **birim testlerinde** kapalı ama simülatörde üretilemedi, iki
bağımsız engel yüzünden — ikisi de kendi başına bulgu:

1. **Bildirim listesinde sayfalama yok.** Ekran `GET /notifications`'ı
   parametresiz çağırıyor → sunucu varsayılanı **20**; hesapta 36 kayıt var
   (`pagination: {pages: 2}`). Grup kayıtları 26–29. sıralarda, yani ekranda
   **hiç görünmüyor**. 36 kaydın 16'sı kullanıcı için erişilemez durumda.
2. **Simülatöre push sunulamıyor.** `registerForPushNotifications`
   `!Device.isDevice` kapısında **izin istemeden** dönüyor, bu yüzden iOS
   bildirimi göstermiyor; `simctl push` sessizce yutuluyor. Push tap yolu
   yalnız gerçek cihazda ya da izin akışı simülatörde de çalıştırılırsa
   sınanabilir.

Erişilebilir 20 satırın hepsi `orderId` + spesifik link taşıyor; onlarda
davranış değişmedi ve gerçek ekranda gerileme olmadığı doğrulandı (bildirime
dokunma → sipariş detayı).
