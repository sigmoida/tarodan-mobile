# Parite — Kalan İşler

**Güncelleme:** 2026-08-26 (delta 19 turu)
**Referans noktası:** `sigmoida/tarodan-app` `development` @ `9f2f66bfc` (2026-08-22).

> ℹ️ **Ana repoda `apps/mobile` YOK — 2026-07-28'de silindi** (`b8f08d335`
> "chore(mobile): remove mobile app from monorepo", 860 dosya, −93.142 satır).
> `packages/ui-native` de aynı commit'le boşaldı. Yani mobil istemcinin tek
> kanonik kaynağı bu repo; ayrılma ana repo tarafından bilinçli ve tamamlanmış
> bir karar.
>
> **Tuzak yerelde:** `~/dev/tarodan-app` çalışma kopyası `docs/mobile-build-fix-spec`
> dalında duruyor (2026-07-23, `development`'tan 936 commit geride) ve o dalda
> `apps/mobile` HÂLÂ var. Oradan okunan mobil kod eski. Karşılaştırma yaparken
> önce `git fetch` + `origin/development`'a bak — parite için ana repodan
> okunacak tek şey **web + api sözleşmesi**.



---

## 2026-08-27 · tam parite denetimi (sözleşme taraması + commit süzgeci)

Rapor: `docs/superpowers/reports/2026-08-26-tam-parite-denetimi.md` (bulgular) ve
`docs/superpowers/reports/2026-08-26-parite-uygulama-sirasi.md` (öncelik sırası`. Ölçüm
kaynağı `https://staging.tarodan.com.tr/api`, hesap `ahmet@demo.com`; ana repo
referansı `origin/development` @ `9414935f1`.

**Kapsam.** İki bacak:

1. **Sözleşme taraması** (Task 1-3) — 7 alan (orders, checkout, trades,
   products, membership, user, messaging), 13 uç, 7 ölçülmüş fixture. Bekçi
   `src/lib/api/__tests__/contractCoverage.test.ts`, "sunucunun yanıtında VAR,
   mobilin tipinde YOK" yönünü tarıyor.
2. **Süzülmüş commit taraması** (Task 4) — aralık `d7df71e80..94f372e1b`,
   `apps/web`/`packages/{ui,shared,types,i18n}` yolları, `*(admin)` hariç:
   **147** aday `feat`/`fix` commit, **7**'si desen süzgeciyle okunmadan
   elendi (CSP, çerez onayı, footer/dropdown/grid, responsive/viewport,
   Sentry etiketleme — RN karşılığı yok), **140**'ı tek tek yüründü.

Ayrıntılı kova dağılımı, ham ölçüm gövdeleri ve "temiz çıkan alanlar" listesi
raporda; burada tekrarlanmıyor.

### On iki bulgu

| # | Bulgu (tek satır) | Öncelik | Mobil tek başına kapatır mı |
| --- | --- | --- | --- |
| B1 | Takas takip linki `trackingNumber` (iç referans) ile kuruluyor, `cargoCode` değil — Sürat sayfası tanımıyor | P1 | ✅ evet |
| B2 | Satışlar listesinde alıcının ödediği toplam satıcıya "ürün bedeli" gibi gösteriliyor | P1 | ✅ evet |
| B3 | `suspended` ilan durumu hiç tanınmıyor — ham kod basılıyor, filtre çipi yok | P1 | ✅ evet |
| B4 | Hukuki künye (KVKK/mesafeli satış) uydurma tüzel kişi + var olmayan e-posta alan adları | P1 | ✅ evet |
| B5 | Premium tespiti `limits.maxListings === -1` ile yapılıyor — sunucu böyle bir alan döndürmüyor, hep `false` | P1 | ✅ evet |
| B8 | `me.birthDate` haritalanmıyor — profil formunda doğum tarihi hep boş | P1 | ✅ evet |
| B9 | `normalizeThread` `productTitle`/`productImage`'ı eşlemiyor — ürünlü sohbet "Genel mesaj" görünüyor | P1 | ✅ evet |
| B11 | 2FA kurulumu `payload.qrCode` okuyor (sunucu `qrCodeUrl`/`qrCodeImage` döndürüyor); değer ayrıca `const [, setTotpQr]` ile atılıyor | P1 | ✅ evet |
| B6 | Checkout kökündeki `buyerFeeDiscountTotal`/`sellerFeeDiscountTotal` bildirilmemiş (bugün `0`, kampanya açılınca kırılım okunamaz) | P2 | ✅ evet |
| B7 | Anlaşmazlık akışı yaz-only: `raisedById`/`resolution`/`resolvedAt` hiç okunmuyor | P2 | ✅ evet |
| B10 | Çok satıcılı grup yanıtındaki `packages.*` (satıcı bazlı kargo kırılımı) hiç okunmuyor | P2 | ✅ evet |
| B13 | Kurumsal kayıtta KEP adresi opsiyonel (web'de zorunlu) | P3 | ✅ evet |

Bu turda **P0 yok, backend'e devredilen madde yok** — sekiz P1, üç P2, bir P3.
Rubrik notu raporda: B1'in P1 olması onu kuyrukta geri atmıyor (ölçüm P0'ı
"para/veri kaybı" için ayırıyor; ölü bir takip linki ikisi de değil, ama en
ucuz ve en doğrudan etkili madde).

### Geri çekilen iki bulgu

**B12 (checkout hizmet bedeli oranı) — geri çekildi, parite temeli yok.**
`checkout.platformServiceFeeWithRate` i18n kataloğunda var ama `apps/web`
içinde hiçbir yerden çağrılmıyor; web'in sipariş özeti de oransız
`t("checkout.serviceFee")` basıyor — mobille aynı. Sunucu tarafı
(`pricing.buyerFeeRate`) `b06bcac9f` ile geldi ama web istemcisi hiç
kullanmadı. Bir boşluk değil, en fazla iki istemciye birden açık bir ürün
önerisi; bu raporun kapsamı dışında.

**B14 (`relatedOrder`/`relatedTrade`) — geri çekildi, backend maddesi
AÇILMADI.** `6b25e0148` alanları eklemişti; `bc73db263 fix(api): preserve
category and listing boundaries` ikisini de hem API'den hem web'den BİLEREK
kaldırdı (`product-query.service.ts` −102 satır projeksiyon, `ListingCard.tsx`
−92 satır). `origin/development`'ta alanlar artık ne `apps/web/src`'te ne
`apps/api/src`'te geçiyor. "Web sunuyor, mobil sunamıyor" cümlesi YANLIŞ: web
de sunmuyor.

**Bu dosyada `relatedOrder`/`relatedTrade` daha önce "backend bekliyor" diye
iki tur boyunca kayıtlıydı — o kayıt YANLIŞTI ve yukarıda (Backend/ops
tablosu, delta 18 §2e satırı, "Backend bekleyenler" tablosu, "Önerilen sıra"
özeti) düzeltildi.** Yöntemsel ders: tarama commit'leri tek tek
değerlendiriliyor, aralarındaki "ekle sonra geri al" ilişkisi kurulmuyordu.
Kural: bir alan bulgusundan önce alanın `origin/development`'ta HÂLÂ var
olduğu `git grep` ile doğrulanmalı — commit gövdesi tek başına yeterli değil.

### Taranmamış sınıf — bekçi tek yönlü

`contractCoverage.test.ts` yalnız "sunucunun yanıtında VAR, mobilin tipinde
YOK" yönünü tarıyor. Tersi — **"mobilin kodu okuyor, sunucunun yanıtında YOK"**
— hiç taranmadı. Bu raporda o sınıftan iki canlı örnek bulundu (B5, B11);
ikisi de bekçiden değil kod okunarak çıktı. İmza: kod hiç patlamıyor
(`undefined === -1` → `false`; `payload.qrCode ?? ""` → boş string), ekran
sessizce yanlış davranır. Ölçülmemiş, gerçek bir sınıf — Plan B'nin ilk işi
bu yönün bekçisini kurmak (bkz. denetim raporu:
`docs/superpowers/reports/2026-08-26-tam-parite-denetimi.md` — girdi dosyası
`.superpowers/sdd/2026-08-26-tam-parite-denetimi/plan-b-input.md` gitignore'lu,
depoyu klonlayan biri o dosyaya erişemez).

---

## 2026-08-26 · commit ağacı taraması — delta 19'un kaçırdıkları

Delta 19 turunda adaylar `dto/**` + `*.controller.ts` diffinden türetilmişti.
**Yöntemin deliği:** `pricing.summary` bir SERVİSTE kuruluyor, DTO'da tanımlı
değil — o yüzden hiç görünmedi. `rejectionReason` de öyle. Web'in özellik
commit'leri tek tek yürününce altı davranış farkı çıktı; hepsi staging'de
doğrulandı ve kapatıldı.

| # | Bulgu | Ölçüm | Durum |
|---|---|---|---|
| 1 | **Sepet/ödeme özetinde iki kampanya satırı eksik** | `pricing.summary` **7** alan döndürüyor, mobilin tipi **4** tanesini tanıyordu (`quantityDiscount`, `feeDiscounts`, `feeDiscountTotal` yok) | ✅ kapandı |
| 2 | **Reddedilen ilanın gerekçesi gösterilmiyor** | `GET /products/my` `rejectionReason` yayınlıyor (alan VAR; hesaptaki eski kayıtta `null`) | ✅ kapandı |
| 3 | **Yıllık indirim rozeti fazla vaat edebilir** | Oran yalnız premium'dan türetiliyordu | ✅ kapandı — artık tüm ücretli katmanların EN DÜŞÜĞÜ |
| 4 | **Misafir kurumsal paketi göremiyor** | Web girişsiz ziyaretçiye dördünü de gösteriyor | ✅ kapandı |
| 5 | **1 KB altı görsel kontrolü yok** | Sunucuda alt sınır yok; web istemcide koydu | ✅ kapandı |
| 6 | `quantityDiscount` tipi | (1)'in parçası | ✅ kapandı |

**Kritik tasarım notu (1 için).** Mobilin `OrderSummary`'sinde bunu yasaklayan
gerekçeli bir yorum vardı: *"üç satırın toplamı `total`a eşit olmalı, başka para
satırı eklenmez."* Gerekçe doğruydu; web bunu satırları **toplanan değil
açıklayan** yaparak çözmüş — `productAmount` zaten indirimli tutarı taşıyor,
kampanya satırı yalnız kaynağı söylüyor. `feeDiscountTotal` bilinçli olarak
TOPLAMIN ALTINDA duruyor. Aynı karar mobilde de uygulandı ve yorum güncellendi.

**Doğrulanamayanlar (dürüstlük payı):** `feeDiscounts` dizisinin DOLU hâli
staging'de görülemedi (hesapta aktif kampanya yok, her ölçümde `[]`);
`rejectionReason` da dolu bir örnekte görülemedi (tek reddedilmiş ilan gerekçenin
kalıcılaştığı 2026-08-13 değişikliğinden eski). İkisinin de şekli ana repodan
alındı, ikisi de boşken hiçbir şey çizmiyor.

**Kalıcı ders — yönteme eklendi:** sözleşme taraması DTO diffiyle bitmiyor.
Yanıt gövdesini KURAN servisler ve web'in özellik commit'leri de yürünmeli;
aksi halde iç içe alanlar (`pricing.summary` gibi) ve DTO'suz eklenen alanlar
görünmez kalıyor.

---

## 2026-08-26 · Kalan işler — ölçülmüş durum

Parite matrisinin 22 maddesi kapalı; kalan her şey ya **teknik borç** ya
**backend/ops** bekliyor. Rakamlar bugün ölçüldü (hafızadaki 2026-08-03
sayıları bayattı).

### Mobilin tek başına yapabilecekleri

| # | İş | Ölçülen büyüklük | Not |
| --- | --- | --- | --- |
| 1 | **i18n** | 711 dosyanın **98'i** `useTranslation` kullanıyor; ~588 sabit Türkçe metin | Uygulama İngilizce'ye geçemiyor. Bugün sunucu hataları çevrilir oldu (`Accept-Language`) ama arayüzün %86'sı hâlâ gömülü Türkçe — yani dil anahtarı pratikte hâlâ çalışmıyor |
| 2 | **Ekran gövdeleri** | 200+ satırlık **15 ekran** (en büyüğü 299) | CLAUDE.md §12 deseni. ⚠️ Regex/otomatik dönüşüm bir kez denendi, JSX bozuldu |
| 3 | **`any` borcu** | 1078 eslint uyarısının **860'ı** `no-explicit-any` | 0 error. Kalanlar: 99 `no-var-requires`, 45 `no-empty-function`, 37 `no-unused-vars`, 35 `exhaustive-deps` |
| 4 | **İstemci limit tablosu** | `FREE_MEMBER_LIMITS` / `PREMIUM_MEMBER_LIMITS` elle yazılmış | `/membership/me/limits` yalnız 5 sayı + 4 boolean yayınlıyor (`maxImages`, `maxFreeListings`, `maxTotalListings`, `remaining*`). `maxAddresses`, `maxSavedSearches`, `maxMessagesPerDay`, `listingExpireDays` istemci sabiti kalmak zorunda — sunucuyla sessizce ayrışabilir |
| 5 | **Flake** | Tam turda 1 test bir kez düştü, 4 turda tekrar etmedi | Adı yakalanamadı. Repoda benzer geçmiş var (`ed473a4`) |

### Backend / ops bekleyenler — bugün YENİDEN doğrulandı

| Madde | Ölçüm |
| --- | --- |
| `color` attribute grubu seed'i | `GET /products/attribute-groups` → yalnız `scale`, `material`, `vehicle_type`. Sözleşme yayında, **veri yok** |
| Satıcı iade onay/ret ucu | `refund-requests/:id/{approve,reject,decision}` → **404**. Satıcı iade sekmesi salt okunur kalmak zorunda |
| ~~`relatedOrder` / `relatedTrade`~~ | ✅ **DÜZELTİLDİ (2026-08-27) — bu satır yanlıştı, backend maddesi değil.** `bc73db263` alanları hem API'den hem web'den BİLEREK kaldırdı; `origin/development`'ta ikisi de yok, web de sunmuyor. Ölçüm ("alan gelmiyor") doğruydu, "backend eksiği" sonucu yanlıştı. Ayrıntı: aşağıdaki "2026-08-27 · tam parite denetimi" bölümü |
| Kupon reddi yapısal alanı | `POST /discounts/validate` → `200 {"isValid":false,"error":"<düz metin>"}`, `i18nKey` yok |
| Kupon `target` başarı gövdesi | Staging'de kupon verisi yok → **ölçülemedi** |
| Adres limiti (`maxAddresses`) | Hiçbir uçta yayınlanmıyor → istemci sabiti |
| IP-blok 403 ayırt edici alanı | Yok |
| `POST /orders/guest/track` gerçek kargo kodu | Yok — ekran kod yerine kargo durumunu gösteriyor |
| **Android `assetlinks.json`** | Prod + staging'de **404**. ⚠️ Durum DEĞİŞTİ: parmak izi artık elimizde (`docs/wellknown/fingerprints.json` → `eas_upload_keystore`, 2026-08-12). `pnpm wellknown:gen:strict` dosyayı üretiyor; kalan iş **yayına koymak** (ops). Play App Signing devreye girince ikinci parmak izi eklenmeli |
| Google Sign-In (Android) | `google-services.json` → `com.tarodan.app`, `oauth_client: 0`. SHA-1 hâlâ Google Cloud'a kayıtlı değil |

### Kapanmış — artık listede değil

- ~~iOS `associatedDomains` eklenemiyor~~ → **eklendi**, `app.json:24`. AASA prod +
  staging'de 200/`application/json`, üretilen içerikle birebir aynı.
  `pnpm wellknown:check` 16 kontrolün 10'unu geçiyor; kalan 6'nın hepsi Android
  `assetlinks` 404'üne bağlı.
- ~~Android parmak izi elimizde yok~~ → `eas_upload_keystore.sha256` dolu.

**Derin bağlantıda teyit bekleyen 8 yol** (`gen-wellknown` uyarısı, yayına
konmadı): `/seller/*`, `/orders/*`, `/category/*`, `/brands/*`, `/sayfa/*`,
`/membership`, `/pricing`, `/favorites`. Bu bir ürün kararı — hangi yollar
uygulamayı açsın.

---

## 2026-08-26 · delta 19 turu

Ana repoda **delta 19 dokümanı yazılmamış** (`docs/mobile-parity/` 18'de duruyor,
2026-08-07). Aradaki 891 commit `94f372e1b..9f2f66bfc` diffinden taranıp aday
maddeler çıkarıldı, her biri staging'e istek atılarak ölçüldü:
`docs/superpowers/reports/2026-08-26-delta-19-olcum.md`.

Aralığın ezici çoğunluğu iç refactor (AuthService / DiscountService /
RefundService / PayTR / Elogo bölmeleri + modül klasör düzeni) — hiçbiri uç
adresi veya alan değiştirmiyor. Web'de **08-07'den beri yeni sayfa yok**, yani
ekran-düzeyi parite kapalı.

### Kapananlar

- ✅ **`Accept-Language` gönderiliyor.** Sunucu (#224) hata mesajını isteğin
  diline göre çeviriyor ve gövdeye `i18nKey` koyuyor; mobil başlığı hiç
  göndermediği için İngilizce kullanan Türkçe hata görüyordu.
  `src/lib/api/acceptLanguage.ts`, iki axios instance'ına da takılı.
- ✅ **Misafir sipariş iptali.** `POST /orders/guest/cancel` (staging'de canlı)
  → `app/order-track` artık kargo öncesi iptal sunuyor.
- ✅ **P0 — üye iptalinde eksik `reasonCode`.** Bu turun en pahalı bulgusu:
  `ordersApi.cancel` yalnız serbest metin `reason` gönderiyordu, oysa sunucu
  `paid`/`preparing` siparişlerde kod yoksa `server.order.cancelReasonRequired`
  ile 400 atıyor. Yani **ödenmiş bir siparişin iptali mobilde hiç
  çalışmıyordu** ve hiçbir test bunu yakalamamıştı. Neden listesi tek kaynakta:
  `src/lib/shared/orderCancellation.ts` (değerler staging'den ölçüldü).
- ✅ **`tradeFeeDiscountAmount`.** Takas hizmet bedeli kampanya indirimi ayrı
  satır olarak gösteriliyor. DTO'nun okunuşunun aksine alan `cashPayments[]`
  satırının İÇİNDE dönüyor (ölçüldü).
- ✅ **İade nedenleri sunucu enum'una hizalandı.** `POST /orders/:id/refund-requests`
  geçersiz kodda tam listeyi veriyor (ölçüldü); `defective` ve `buyer_damaged`
  mobilin sözlüğünde YOKTU — o kodu taşıyan talep ekranda ham `snake_case`
  basılıyordu ve alıcı web'de seçebildiği iki nedeni burada seçemiyordu. Seçenek
  listesi artık elle yazılmıyor, sözlükten türetiliyor ve kural web'inkiyle aynı
  (`lost_in_transit` + `other` sunulmaz). **Davranış değişikliği:** alıcı artık
  "Diğer" seçemiyor — web'de de seçemiyor, gerekçe orada yazılı.
- ✅ **Telefon TR-only.** Sunucu 2026-08-14'te `IsTrPhone()`'a geçti
  (`/^\+905\d{9}$/`); mobilin 24 ülkelik seçicisi kullanıcıyı garanti 400'e
  yürütüyordu. Seçici kaldırıldı, web'deki gibi sabit `+90` öneki gösteriliyor.
  Staging'de üç yönlü doğrulandı: yabancı numara ✗, TR sabit hat ✗, TR cep ✓.

### Bu turda AÇILAN madde — backend/ops bekliyor

- 🔴 **`color` attribute grubu staging'de (ve muhtemelen prod'da) SEED
  EDİLMEMİŞ.** Sözleşme yayında: `POST /products` `colors: string[]` kabul
  ediyor, `GET /products?color=red` filtresi gerçekten uygulanıyor
  (`total` 44 → 0; bilinmeyen parametre yutuluyor, yani filtre canlı). Ama
  `GET /products/attribute-groups` yalnız `scale`, `material`, `vehicle_type`
  döndürüyor — renk grubu yok.
  **Mobilde renk seçicisi/filtresi bu yüzden YAZILMADI:** seçenek listesi o
  uçtan geliyor, grup boşken yazılacak kod ölü dal olur (`relatedOrder` turunda
  yapılan hatanın aynısı). Ana repodaki seeder `dc00df45a`; staging + prod'da
  koşulmalı. Not: bu bir mobil/web ayrışması değil — web'de de filtre bugün 0
  sonuç veriyor.

### Ölçülemeyen

- 🟡 **Kupon `target` / `budgetRemaining` / `maxDiscountAmount`.** Hesapta kupon
  yok, geçerli bir kod bulunamadı → başarı gövdesi doğrulanamadı, tip
  yazılmadı. Bedel hedefli kuponlarda `estimatedDiscount` 0 dönüyor;
  `useCoupon` zaten o alanı okumuyor, o yüzden yanlış para gösterme riski yok.

### Yan teyit — açık madde duruyor

**Kupon reddi hâlâ yapısal alan taşımıyor.** `POST /discounts/validate`
geçersiz kodda `200 {"isValid":false,"error":"Kupon kodu bulunamadı"}` dönüyor —
`i18nKey` yok. `i18nMessage` göçü bu yolu kapsamamış (reddi exception olarak
fırlatmıyor). Aşağıdaki listede kalmaya devam ediyor.

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
- ~~**P2 #8** `relatedOrder` / `relatedTrade` → **backend bekliyor**~~ ✅
  **DÜZELTİLDİ (2026-08-27)** — bu bir backend maddesi değildi. Ölçüm
  (`docs/superpowers/reports/2026-08-10-products-my-olcum.md`: hesapta 1
  `sold` + 2 `reserved` ilan var, alan gelmiyor) doğruydu; çıkarılan sonuç
  ("uç yayınlamıyor, backend eksiği") yanlıştı. `bc73db263 fix(api): preserve
  category and listing boundaries` alanları hem API'den hem web'den BİLEREK
  kaldırdı (`product-query.service.ts` −102 satır projeksiyon,
  `ListingCard.tsx` −92 satır) — web de artık sunmuyor. Ayrıntı: aşağıdaki
  "2026-08-27 · tam parite denetimi" bölümü.

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
| ~~8~~ | ✅ **DÜZELTİLDİ (2026-08-27)** — backend maddesi değildi. `relatedOrder`/`relatedTrade` `bc73db263` ile hem API'den hem web'den BİLEREK kaldırıldı; web de sunmuyor. Bkz. aşağıdaki "2026-08-27 · tam parite denetimi" bölümü | delta 18 §2e |
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
| ~~**`GET /products/my` `relatedOrder`/`relatedTrade` yayınlamıyor**~~ | ✅ **DÜZELTİLDİ (2026-08-27) — bu satır bu tablodan çıkmalıydı, backend maddesi değil.** Alanlar `bc73db263` ile API+web'den bilerek kaldırıldı; web de sunmuyor. Bkz. aşağıdaki "2026-08-27 · tam parite denetimi" bölümü |

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
| **Backend** | Android `assetlinks.json` (imza parmak izi), iade onay/ret ucu, IP-blok 403 ayırt edici alanı, kupon reddi yapısal alanı, misafir takipte gerçek Sürat kodu, paket kademesi etiketlerinde Türkçe karakterler, `MembershipLimits`'in yayınlanmayan 10 alanı (~~`relatedOrder`/`relatedTrade`~~ 2026-08-27'de düzeltildi — backend maddesi değildi, bkz. "2026-08-27 · tam parite denetimi" bölümü) |
| **Yeni build** | iOS `associatedDomains` bir entitlement — OTA ile geçmez |

Repoda kalan iş **yok**; ikisi de aynı turda kapandı:

- ~~`maestro/run.sh` staging'e uyarlanmalı~~ ✅ backend adresi artık `.env`'deki
  `EXPO_PUBLIC_API_URL`'den geliyor (`API_URL=` ile ezilebilir). Harness bu
  repoda ilk kez çalışıyor.
- ~~İki kararsız test~~ ✅ kök neden: iddialar zamanlama ölçmüyor ama RNTL'in
  **1000 ms** varsayılan sınırına yaslanıyorlardı. Sınır 150 ms'ye çekilince 8
  test düşüyor (biri `J30.5`) — yani sınıra yakın bir küme var. `jest.setup.ts`'te
  `asyncUtilTimeout: 5000` ile açık bir sınır kondu; kaldırılmadı, yükseltildi.
