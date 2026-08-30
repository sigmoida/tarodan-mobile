# Kargo Akışı ve Takip Kodu (Tasarım)

**Tarih:** 2026-08-10
**Kaynak:** `mobile-parity docs/18-api-delta-2026-08-07.md` §4, artı delta 18'den
sonra giren `8f9ae671` (hiçbir delta dosyasında yok)
**Ana repo:** `sigmoida/tarodan-app` `development` @ `cfc058da` (2026-08-07)
**Backlog:** `docs/PARITE_KALAN_ISLER.md` → P1 #4, matris #20

## Amaç

Satıcı kargo akışını sunucunun yeni yaşam döngüsüne getirmek ve kullanıcıya
**doğru numarayı** göstermek. Bugün mobil, sunucunun iç referansını (`PKG-…`)
alıcıya "takip numarası" diye basıyor ve ondan Sürat'ın tanımadığı bir takip
linki kuruyor.

## Kapsam

**İçinde:** satıcı kargo akışı (mevcut shipment'ı önce oku, mükerrer `POST`
yapma, elle takip numarası girişini kaldır) ve alıcı/satıcı tarafında doğru
numaranın gösterilmesi + shipment durum etiketleri.

**Dışında:** bildirim resolver'ı (P1 #1), kurumsal satış yetkisi (P1 #5), iade
kargosu akışı.

## Ölçüm (staging, 2026-08-10)

Sözleşme dokümandan değil canlıdan doğrulandı. **Bu turun kapısı tasarım
aşamasında geçildi**, planda ayrı bir ölçüm görevi yok.

| Ölçüm | Sonuç |
| --- | --- |
| `GET /shipping/order/:orderId` | **Tek nesne** döndürüyor (dizi değil), `200` |
| Kargo kaydı yokken | `404 {"message":"Bu sipariş için kargo bulunamadı"}` |
| Mevcut shipment'lı siparişe `POST /shipping` (satıcı olarak) | `400 {"message":"Sipariş hazırlanma durumunda değil"}` — kapı **durum** tabanlı |
| 13 satıcı siparişi | 5'inin hiç shipment'ı yok → `POST` onarım yolu bunlar için meşru |

Ham kayıt örneği:

```jsonc
{
  "id": "038d23b6-…",
  "orderId": "0cd43fd3-…",
  "provider": "surat",
  "trackingNumber": "PKG-CMRGW9D6ZH",      // iç referans
  "providerTrackingId": null,               // gerçek Sürat kodu (henüz yok)
  "trackingUrl": null,
  "status": "label_created",
  "cost": 50,
  "estimatedDelivery": "2026-08-13T11:37:48.537Z",
  "events": []
}
```

### Dokümanın söylemediği: `trackingUrl` kullanılamaz

13 satıcı siparişinin kargo kayıtları tarandı; örüntü istisnasız:

| Durum | `trackingUrl` |
| --- | --- |
| `providerTrackingId` **dolu** (gerçek kod var) | **`null`** |
| `providerTrackingId` **boş** | İç referansı içeriyor: `suratkargo.com.tr/KargoTakip/?kargotakipno=PKG-3BQ2W4JPJ3` |

Yani alan ya yok ya da Sürat'ın tanımadığı bir numara taşıyor. **Mobil
`trackingUrl`'i hiç okumamalı**; linki `providerTrackingId`'den kendisi kurmalı.

Gerçek kodun geldiği de doğrulandı — üç kayıtta dolu:
`79174212154116`, `11079211193731`, `18841250533621`.

## 1. İki numara, iki iş

Bu turun özü. Katalogdaki metinler (zaten mevcut, hiç kullanılmıyor) tasarımı
açıkça anlatıyor:

| Alan | Katalog etiketi | Kimin işine yarar |
| --- | --- | --- |
| `trackingNumber` (`PKG-…`) | `order.cargoReference` — "Kargo Referans Numarası" | **Satıcı**, paketi şubeye teslim ederken verir |
| `providerTrackingId` | `order.trackingNumber` — "Takip Numarası" | **Her iki taraf**, kargoyu takip eder |

`order.cargoRefInstructions`: *"Paketi Sürat Kargo şubesine teslim ederken bu
numarayı veriniz. Gönderi zaten sistemde kayıtlıdır — şube tüm bilgileri
otomatik olarak alacaktır."*

`order.trackingAppearsAfterDropoff`: *"Şube paketinizi aldığında Sürat takip
numarası burada otomatik olarak görünecektir (30 dakika içinde)."*

Bu, `8f9ae671`'in yorum değişikliğiyle örtüşüyor: gerçek kod **şube kabulünden
sonra** geliyor.

**Doğru davranış "`PKG-`'yi gizle" değil, rolüne göre göster:**

- **Satıcı, teslimden önce:** `PKG-…` → "Kargo Referans Numarası" +
  `cargoRefInstructions` + `trackingAppearsAfterDropoff`. Kopyalanabilir
  (`order.cargoCodeCopied` mevcut).
- **Her iki taraf, kod geldikten sonra:** `providerTrackingId` → "Takip
  Numarası" + çalışan takip linki (`order.trackShipment`).
- **Alıcı, kod gelmeden:** `order.shipmentPreparingBuyer`. Alıcıya `PKG-`
  **hiç gösterilmez** — onun işine yaramaz.

Bugünkü hata tam olarak bu ayrımın yokluğu.

## 2. Mimari

### Tek okuma noktası

```ts
// src/hooks/useOrderShipment.ts  (cross-route: hem orders hem sales kullanıyor)
useOrderShipment(orderId) → { shipment: Shipment | null, isLoading, refetch }
```

`404`'ü **hata değil, "kargo yok"** olarak çevirir (`null`) — ölçülmüş gerçek
davranış. Diğer hatalar normal hata yolunda kalır. Query key
`qk.shipping.byOrder(orderId)`.

### Tek kod kaynağı

Sunucu aynı bilgiyi iki adla veriyor: `/shipping/order/:id` →
`providerTrackingId`, sipariş/grup yanıtları → `shipment.cargoCode`. Saf
türetici ikisini birleştirir:

```ts
// src/lib/shipping/tracking.ts
deriveShipmentView(s: Shipment | null) → {
  cargoCode: string | null;      // providerTrackingId ?? cargoCode
  reference: string | null;      // trackingNumber (PKG-/ORD-)
  isCodePending: boolean;        // shipment var ama cargoCode yok
  trackingUrl: string | null;    // cargoCode'dan KURULUR, sunucudan okunmaz
}

buildTrackingUrl(provider: string, code: string | null) → string | null
```

`buildTrackingUrl` bugün yalnız `surat`'ı tanır; kod yoksa veya sağlayıcı
bilinmiyorsa `null` döner. İkinci sağlayıcı gelirse eklenecek yer belli.

### Satıcı akışı tersine döner

Bugün ([`useSaleActions.ts:38-43`](../../../app/sales/_hooks/useSaleActions.ts)):
koşulsuz `POST /shipping` → satıcının elle yazdığı numarayla
`PATCH /shipping/:id/tracking`.

Yarın: **önce oku.** `POST` yalnız onarım yolu — shipment `404` **ve** sipariş
`preparing` **ve** kullanıcı satıcı. Ölçümde gördük ki mevcut shipment'a `POST`
`400` veriyor ve bugünkü akış o hatayı satıcıya ham mesajla gösteriyor.

### Elle takip numarası girişi kaldırılır (matris #20)

`trackingNumber` state'i, ship dialog'undaki input ve `shippingApi.updateTracking`
çağrısı gider. Sunucu numarayı kendi üretiyor; satıcının yazdığı serbest metin
sunucunun `PKG-` düzeniyle çelişiyordu. Çağıranı kalmazsa `updateTracking`
metodu da silinir — ölü API yüzeyi yanıltıcıdır.

### Tazeleme

Zamanlayıcı **yok**. Ekran odağa geldiğinde ve pull-to-refresh ile yenilenir.
`isCodePending` **normal bir ara durum** olduğu için sürekli poll etmek pil
yakar ve hiçbir şeyi hızlandırmaz.

## 3. Shipment durum etiketleri

Sipariş tarafında shipment durumu için **hiç etiket yok** (arama boş döndü).
Bu turda tek bir sözlük eklenir: `label_created`, `pending`, `picked_up`,
`in_transit`, `at_delivery_branch`, `out_for_delivery`, `delivered`,
`return_in_progress`, `returned`, `cancelled`, `failed`.

**`8f9ae671` (dokümansız):** Sürat durum kodu `1` artık `pending` değil
**`picked_up`** — "şubede fiziksel kabul edildi" demek. Sunucu tarafı bir
eşleme değişikliği; mobil için sonucu, `picked_up`'ın artık gerçekten
gelmesidir.

**Bilinmeyen durumda ham kod basılmaz** — nötr bir metin gösterilir. Aksi halde
sunucu yeni bir durum eklediğinde ekranda `at_delivery_branch` yazar.

## 4. i18n

**Yeni anahtar gerekmiyor.** Katalogda dokuz ilgili anahtar zaten var ve
**hiçbiri kullanılmıyor**: `order.cargoReference`, `order.trackingNumber`,
`order.cargoRefInstructions`, `order.trackingAppearsAfterDropoff`,
`order.cargoCodeInstructions`, `order.cargoCodePending`, `order.cargoCodeCopied`,
`order.shipmentPreparingBuyer`, `order.trackShipment`.

Shipment durum etiketleri için katalogda karşılık yoksa eklenir (hem `tr` hem
`en`, sonra `pnpm i18n:codegen`).

`order.enterTrackingNumber` elle giriş kalkınca ölü kalır — katalogdan
silinmez (başka bir yerde kullanılıyor olabilir), ama çağrısı kaldırılır.

## Test

- **`buildTrackingUrl`** — `surat` + kod → Sürat URL'i; kod `null` → `null`;
  bilinmeyen sağlayıcı → `null`.
- **`deriveShipmentView`** — `providerTrackingId` kullanılıyor; yoksa
  `cargoCode`'a düşüyor; ikisi de yoksa `isCodePending: true`. **Fixture'a
  bilerek bozuk bir `trackingUrl` konur ve çıktıda görünmediği doğrulanır** —
  sunucunun alanının okunmadığının kanıtı.
- **`useOrderShipment`** — `404` → `null`, hata durumuna düşmüyor; diğer
  hatalar hata yolunda.
- **Satıcı akışı** — mevcut shipment varken `POST /shipping` **çağrılmıyor**;
  `404` + `preparing` + satıcı iken çağrılıyor.
- **Gösterim** — alıcı `PKG-`'yi **hiç görmüyor**; satıcı kod gelmeden `PKG-`'yi
  referans olarak, kod gelince takip numarasını görüyor.
- **Durum etiketi** — bilinmeyen durumda ham kod basılmıyor.

## Teslim sırası

| # | Adım |
| - | ---- |
| 1 | `buildTrackingUrl` + `deriveShipmentView` (saf, testli) |
| 2 | `useOrderShipment` hook'u + `qk.shipping.byOrder` |
| 3 | Satıcı akışı: önce oku, elle takip numarası girişini kaldır |
| 4 | Gösterim: role duyarlı numara + shipment durum etiketleri |
| 5 | Tam doğrulama + kapanış raporu |

## Riskler

- **Elle takip numarası girişini kaldırmak bir ürün kararıdır.** Sunucu numarayı
  üretiyor, ama bugün bir satıcı bunu başka bir amaçla kullanıyorsa (ör. Sürat
  dışı gönderi) o yol kapanır. `PATCH /shipping/:id/tracking` sunucuda kalıyor,
  yalnız arayüzden çekiliyor.
- **`trackingUrl`'e güvenmeme kararı 13 kayıt üzerinden ölçüldü.** Sunucu
  ileride alanı düzeltse bile bizim kurduğumuz URL doğru kalır — yanlış tarafta
  olma riski yok.
- **Rol ayrımı yanlış kurulursa** alıcıya işine yaramayan bir numara gösterilir
  (bugünkü hata) veya satıcı şubeye vereceği referansı göremez. Bu yüzden
  gösterim testleri iki rolü de kapsıyor.
- **Durum sözlüğü eksik kalırsa** ekranda ham kod belirir; nötr fallback bunu
  karşılıyor.

## Doğrulama (CLAUDE.md §13)

- `npx tsc --noEmit` — takip edilen temel dışında yeni hata yok
- `pnpm --filter @tarodan/mobile lint` temiz
- `npx jest` yeşil (şu an 178 suite / 1429 test)
- Metro'da elle: `ORD-PYK6QAP8GH` siparişi — **alıcı olarak `PKG-` görmemelisin**;
  satıcı hesabında kargo ekranı mevcut shipment'ı okuyup mükerrer `POST`
  denememeli.
