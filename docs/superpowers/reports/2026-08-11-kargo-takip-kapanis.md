# Kargo Akışı ve Takip Kodu Turu — Kapanış

**Tarih:** 2026-08-11
**Branch:** `feat/kargo-takip-kodu` (12 commit, `f0f10a6` üzerinden)
**Spec:** `docs/superpowers/specs/2026-08-10-kargo-takip-kodu-design.md`
**Plan:** `docs/superpowers/plans/2026-08-10-kargo-takip-kodu.md`

## Sorun

Sunucu aynı gönderi için iki numara veriyor:

| Alan | Ne işe yarar |
| --- | --- |
| `trackingNumber` (`PKG-…`/`ORD-…`) | Tarodan **iç referansı**. Satıcı şubede verir. **Sürat tanımaz.** |
| `providerTrackingId` | Gerçek **Sürat kodu**. Takip bununla yapılır, şube kabulünden sonra dolar. |

Mobil birincisini kullanıcıya "takip numarası" diye basıyor ve ondan Sürat'ın
tanımadığı bir link kuruyordu.

## Ne kapandı

**1. Tek kod kaynağı.** `src/lib/shipping/tracking.ts` — `deriveShipmentView`
(hangi numara, hangi role) ve `buildTrackingUrl` (link **koddan kurulur**).
`shipmentStatusLabel` de aynı klasöre alındı, üç ekran oradan okuyor.

**2. `trackingUrl` artık hiç okunmuyor.** Ölçüm (13 kayıt, istisnasız): gerçek
kod varsa alan `null`, yoksa iç referansı taşıyan bozuk bir Sürat linki. Üretimde
elle URL kurulumu **sıfır** — `grep kargotakipno` yalnız `tracking.ts`'i buluyor.

**3. Rol ayrımı dört ekranda birden.** Alıcı `PKG-`'yi takip numarası olarak
hiçbir yerde görmüyor; satıcı onu yalnız şube referansı olarak görüyor.

| Ekran | Öncesi | Sonrası |
| --- | --- | --- |
| `app/orders/[id]` (alıcı detay) | `PKG-` + bozuk link | Kod varsa takip no + kurulmuş link; yoksa "satıcı hazırlıyor" |
| `app/sales/[id]` (satıcı detay) | `PKG-` + **elle kurulmuş** bozuk link, ham durum kodu | Referans + yönerge; kod gelince takip no + link; durum etiketli |
| `app/orders/group/[id]` (grup) | Alıcıya "Kargo Takibi: PKG-…" | Kod varsa takip no; yoksa bekleme metni |
| `app/order-track` (misafir) | "Takip Numarası: PKG-…" | Kargo **durumu** (aşağıdaki backend maddesi) |

**4. Satıcı akışı tersine döndü.** Koşulsuz `POST /shipping` yerine önce oku;
`POST` yalnız onarım yolu (`404` + `preparing` + satıcı). `404` dışı hatalar
yutulmuyor — geçici bir `500`'de mükerrer kayıt riski yok.

**5. Elle takip numarası girişi kalktı** (matris #20). `shippingApi.updateTracking`
metodu silindi; numarayı sunucu üretiyor. `ShipDialog` onay diyaloğu oldu ve
satıcının şubede vereceği referansı gösteriyor.

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npx tsc --noEmit` | 0 hata |
| `npx jest --forceExit` | 183 suite / **1467** test PASS (tur başında 178/1429) |
| `npx eslint app src` | 0 error |
| `grep kargotakipno` (üretim) | yalnız `src/lib/shipping/tracking.ts` |
| `grep updateTracking` | yalnız test iddiaları |

**Metro'da elle denenmedi.** Merge öncesi:
- **Alıcı olarak** `ORD-PYK6QAP8GH`: takip alanında `PKG-` görmemelisin.
- **Satıcı hesabında**: kargo kaydı olan bir siparişte "Kargoya Ver" ham `400`
  vermemeli; diyalog şubede verilecek referansı göstermeli.
- Gerçek kodu olan bir kayıtta takip linki Sürat sayfasını **gerçek kodla** açmalı.

## Planın hatası

**Dosya listesi eksikti.** Plan yalnız `app/orders/[id]`'yi kapsıyordu; aynı hata
diğer üç ekranda aynen duruyordu. Final inceleme dördünü de yakaladı ve tek
düzeltme dalgasında kapatıldı. Bunlardan en ağırı satıcının **ana** kargo
ekranıydı — orada link elle kuruluyordu, yani `buildTrackingUrl`'ün var olma
sebebinin ta kendisi ıskalanmıştı.

Ayrıca tur kendi getirdiği iki gerilemeyi de yakalayıp kapattı: kargo kaydı
zaten varken "Başarılı — sipariş durumu güncellendi" denmesi (ölçüme göre 13
siparişin 8'i bu durumda) ve `ShipDialog`'un "bu numarayı veriniz" deyip numarayı
göstermemesi.

## Backend bekleyen yeni madde

**`POST /orders/guest/track` gerçek Sürat kodunu döndürmüyor.** Uç yalnız
`provider`, `trackingNumber` (iç referans), `trackingUrl` (bozuk), `status` ve
`estimatedDelivery` veriyor — uygulayıcı backend kaynağından doğruladı.

Alan uydurulmadı: misafir takip ekranı numara yerine kargo **durumunu**
gösteriyor. Uç `providerTrackingId`/`cargoCode` yayınlayana kadar misafir takip
numarası göremez.

## Takip maddesi

**Satıcı kartındaki "Kargoya Ver" butonu kayıt zaten varken de görünüyor.**
Sipariş durumu şube kabulüne kadar değişmediği için buton kalıyor; satıcı tekrar
basabilir (ikinci basışta hiçbir çağrı gitmiyor, aynı mesaj döner). Mesaj artık
dürüst ama döngü kapanmadı. Kartı referans + "şubeye teslim edin" durumuna
çevirmek kapatır — `useOrderShipment` zaten paylaşılan hook olarak hazır.

## Parklananlar

| Konu | Karar |
| --- | --- |
| Alıcı hâlâ bir `PKG-` görüyor — ama "Teslimat No"/`packageNumber` olarak, takip numarası olarak değil | Önceki turun bilinçli kararı ve misafir takip kutusu bu biçimi kabul ediyor — meşru. Ama yeni testteki `queryByText(/PKG-/)` null yalnız fixture `packageNumber` taşımadığı için geçiyor; koruma göründüğünden dar |
| `ShipmentLike` gevşemesi | Gerçek tip kaybı: tüm alanlar opsiyonel, farklı adla taşıyan nesne derlemeden geçip sessizce `null` üretir. Testler kapatıyor, derleyici kapatmıyor |
| `SaleDetailBody` `hasShipment` uç durumu | Kayıt var ama iki numara da boşken durum satırı gizleniyor — kozmetik |
| Ölü `view` prop / `showTrackingCard` | `derive.ts` hesaplıyor, kimse okumuyor. Üstelik yanıltıcı: kartın gerçek kapısından daha katı |
| Katalogda çift kargo-durumu bloğu | Eski `order.shipStatus*` blokları ölü ve **eksik** (delivered/cancelled/unknown yok); yeni `order.shipmentStatus.*` tam ve kullanılıyor. Doğru temizlik eskisini silmek |
