# Metro elle test turu — üç birikmiş turun gerçek ekran doğrulaması

**Tarih:** 2026-08-11
**Kapsam:** delta 17/18 kırıcı parite, ilan formu sözleşmesi, kargo/takip kodu —
üç tur merge edilmişti ama hiçbiri uygulamada çalıştırılmamıştı.
**Ortam:** iPhone 17 Pro simülatörü (iOS 26.0), dev build `com.tarodan.app`,
`EXPO_PUBLIC_API_URL=https://staging.tarodan.com.tr/api`, oturum `ahmet@demo.com`.
**Sürücü:** Maestro (ekran görüntüsü + doğrulama), sözleşme tarafı `curl` ile
staging'den ölçüldü.

---

## Ortam notu — Maestro 2.5.1 Xcode 26 ile sürücü kuramıyor

`maestro test` her koşuda "iOS driver not ready in time" ile düşüyordu. Gerçek
neden zincirin dibinde: `xcodebuild test-without-building` XCUITest runner'ı
simülatöre **kuramıyor**, ardından `Unknown application display identifier
dev.mobile.maestro-driver-iosUITests.xctrunner` ile açmaya çalışıyor.

Çözüm iki adım oldu:

1. Maestro **2.5.1 → 2.8.0** yükseltildi (`~/.maestro-2.5.1-backup` yedeği duruyor).
2. **Simülatör yeniden başlatıldı** (`simctl shutdown` + `boot`). Asıl çözen bu
   oldu — uzun süredir açık simülatörün uygulama veritabanı bayatlamıştı.

Ayrıca `maestro/run.sh` bu repoda çalışmıyor: yerel `:3001` backend'i şart
koşuyor, oysa standalone repo staging'e bakıyor. Bu turda harness atlanıp
`maestro test` doğrudan çağrıldı.

**Maestro kullanırken dikkat:**
- Ekran görüntüsü yolu artık koşum klasörüne **göreli** olmalı (mutlak yol reddediliyor).
- `appAlert` modali erişilebilirlik ağacında görünmüyor; `tapOn: "Tamam"` tutmuyor,
  koordinatla dokunmak gerekiyor.
- Simülatör klavyesi Türkçe: `inputText` içindeki **boşluk "ö" olarak giriyor**.
  Metin girmek yerine `eraseText` tercih edin.
- Sipariş numarası gibi gömülü metinler için `.*ORD-XXX.*` regex'i şart.

---

## ✅ Doğrulananlar

### 1. İlan düzenleme — yalnız başlık değiştirip kaydetme turu

Turun en riskli maddesi buydu: kademe artık koşulsuz gönderildiği için prefill'de
bir hata olsa sessizce yazardı.

`Matchbox McLaren P1` (`7fd32332-…`) düzenleme ekranında **yalnız başlığa** bir
sonek eklendi, kaydedildi, `GET /products/my/:id` `edit` bloğu kayıt öncesi ile
diff'lendi:

| Alan | Önce → Sonra |
| --- | --- |
| `title` | değişti (kasıtlı) |
| `price` `oldPrice` `salePrice` | 4999 / null / null — **korundu** |
| `shippingPackageTier` | `small` — **korundu** |
| `images` (3 adet, key'ler dahil) | **birebir aynı** |
| `attributes` | küme aynı (3/3), yalnız **sunucu sırası** değişti |
| `modelCode` `quantity` `status` `condition` `carModelId` `year` | **korundu** |

Ekranda prefill de `edit` bloğuyla birebir: başlık, açıklama, 3 görsel + `Kapak`
rozeti, `SEED-0031`, 2013, stok 1, `Kucuk Paket` seçili, indirim alanları boş.

Başlık test sonrası eski hâline döndürüldü; ilan başlangıç durumuyla **tamamen
aynı** (nitelik sırası hariç fark yok).

### 2. Kargo/takip kodu ayrımı — alıcı sipariş detayı

Staging tam sınav vakasını veriyor: iki siparişte de `providerTrackingId = null`,
teslim edilmişte `trackingUrl` **bozuk** (`…?kargotakipno=PKG-NKSQYKP256`).

- `preparing` sipariş (`ORD-PYK6QAP8GH`, shipment `label_created`): kart
  "Kargo kaydı oluşturuldu" + "Satıcı paketinizi hazırlıyor…" gösteriyor.
  `PKG-CMRGW9D6ZH` **hiçbir yerde görünmüyor**.
- `delivered` sipariş (`ORD-M9ED69QWAT`): ekranın **tamamı** kaydırılarak
  `PKG-NKSQYKP256` arandı — dört noktada da yok. Bozuk `trackingUrl` okunmuyor.

Yani turun asıl kazancı gerçek ekranda duruyor.

### 3. Checkout — üç adım, tutar tutarlılığı

Sepet → Adres → Ödeme → Onay boyunca toplam **529,96 TL** sabit kaldı
(424,15 + 50,00 kargo + 55,81 platform). Komisyon snapshot'ı adımlar arasında
kaymıyor. Ödeme tamamlanmadı; test ürünü sepetten silindi.

Yan gözlem: ödeme butonunda artık " (komisyon dahil)" ibaresi yok (ertelenen
temizlik maddesiyle uyumlu), ve **satır seçme kutusu yok** (P2 #10 açık),
**mesafeli satış onay kutusu yok** (P2 #9 açık) — ikisi de belgelendiği gibi.

---

## 🔴 Bulunan hata — teslim edilmiş siparişte kendini yalanlayan takip kartı

`app/orders/[id]/_components/OrderInfoCards.tsx:149-152`

Alıcı dalı, `cargoCode` yoksa **shipment durumundan bağımsız** olarak
`order.shipmentPreparingBuyer` basıyor:

```tsx
) : (
  // ALICI: iç referans işine yaramaz, gösterme.
  <Text variant="caption" tone="muted">{t('order.shipmentPreparingBuyer')}</Text>
)}
```

`providerTrackingId` hiçbir zaman gelmediği için (backend bekleyen madde), bu dal
**her** siparişte çalışıyor. Sonuç: teslim edilmiş, üstelik iade sürecindeki bir
siparişte kartın sağı "Teslim edildi" derken gövdesi "Satıcı paketinizi
hazırlıyor. Sürat şubesine teslim edildiği anda takip bilgileri burada
görünecek." diyor. Ekran görüntüsüyle doğrulandı (`ORD-M9ED69QWAT`).

**Aynı hata diğer okuma noktalarında YOK** — ikisi de durumu kapıyor:

- `app/orders/group/[id]/_lib/status.ts:55-59` → `isDelivered ? statusLabel : …`
- `app/order-track/_components/OrderTrackResult.tsx:105-107` → `awaitingDropoff ? … : null`

Yani tek dosyalık bir tutarsızlık; düzeltme `OrderInfoCards`'ın alıcı dalını
`shipment.status`'e bağlamak (teslim/yolda durumlarında hazırlanıyor metnini
basmamak). Kapsam: bir dosya + bir test.

---

## 🟡 İkinci bulgu — paket kademesi etiketlerinde Türkçe karakter yok

Formda "**Kucuk Paket**" / "**Buyuk Paket**" yazıyor. Kaynak mobil değil:

```
GET /shipping/package-tiers → [{code: small, label: "Kucuk Paket"}, …]
```

Mobil `tier.label`'ı olduğu gibi basıyor. İki seçenek: backend'in tarifeyi
düzeltmesi, ya da mobilin `code → i18n etiketi` eşlemesi yapması (ikincisi
i18n göçüne de yarar, ölçü metni zaten sunucudan geliyor).

---

## 🔵 Gözlem — başarı diyaloğu yeni açılan rotanın üstünde kalıyor

İlan kaydetme diyaloğu ("İlan güncellendi!") açıkken derin bağlantıyla başka bir
rotaya gidildiğinde, diyalog **yeni ekranın üstünde** render olmaya devam etti;
sipariş detayı arkasında açıldı. Uygulama donmuyor — diyaloğa dokunulunca
kapanıyor ve gezinme tamamlanıyor. Otomasyonla üretilen sıra dışı bir sıralama,
ama push bildirimi/derin bağlantı bir alert açıkken gelebileceği için gerçek.
CLAUDE.md §12'deki "modali mutasyondan önce kapat" notuyla aynı aile.

---

## Veri durumu

Turda staging verisi değiştirildi ve **geri alındı**: ilan başlığı eski hâline
döndürüldü (diff temiz), sepete eklenen test ürünü silindi. Sipariş
oluşturulmadı, ödeme yapılmadı.
