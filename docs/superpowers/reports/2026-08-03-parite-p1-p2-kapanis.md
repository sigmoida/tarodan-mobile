# Parite P1/P2 — kapanış turu ve canlı ölçüm bulguları (2026-08-03)

Plan: `plans/2026-08-03-parite-plan5-p1.md` · Denetim: `reports/2026-08-03-parite-p1-p2-denetim.md`
Branch: `feat/parite-p0` · Bu turda **27 commit** (`484e1b3` … `b6a73ac`)
Doğrulama: **161 suite / 1146 test yeşil**, `tsc --noEmit` 0 hata, `eslint` 0 error

Denetimin bıraktığı `DOĞRULANAMADI` maddeleri, kimlikli bir staging oturumuyla
(`ahmet|ayse|ali@demo.com`) kapatıldı. Bu dosya **ölçümleri** ve mobilin tek
başına çözemediği **backend maddelerini** kaydeder.

---

## 1. Backend'e iletilecekler

Mobil tarafta hepsi savunmacı yazıldı; kalıcı çözüm API'de.

### B1. Satıcının kendi ürün okumasında kargo kademesi yok

`GET /products/my/:id` **46 alan** döndürüyor, hiçbiri kargo/kademe değil.
`GET /products/:id` (public) de aynı — `productCode`, `modelCode`,
`isTradeEnabled`, `tradeAvailable` var; `shippingPackageTier` yok.

**Sonuç:** doküman 14'ün kabul kriteri — *"Düzenlemede ürünün mevcut boyutu
seçili geliyor"* — bugün **karşılanamıyor**.

**Mobilde yapılan:** kademe yalnız *oluşturmada* zorunlu; düzenlemede boş
bırakılırsa payload'a **konmuyor**, sunucu kendi kaydını koruyor. Aksi hâlde
satıcı bir yazım hatası düzeltirken görmediği bir alanı sıfırlıyor ve canlı
tarifede paket başına **60 TL** fark oluşuyordu (`e00eaaa`).

**İstenen:** ürün okuma yanıtına `shippingPackageTier` eklenmesi.

### B2. Üyelik limitlerinin 10 alanı hiçbir uçta yayınlanmıyor

`GET /membership/me/limits` **13 alan** döndürüyor:
`canCreateListing`, `canUseFreeSlot`, `canTrade`, `canCreateCollection`,
`isAdFree`, `maxImages`, `maxFreeListings`, `maxTotalListings`,
`remainingFreeListings`, `remainingTotalListings`, `remainingFeaturedSlots`,
`tierName`, `tierType`.

İstemcideki `MembershipLimits` 15 alan; bunlardan sunucu karşılığı olan
**beşinin beşi de** zaten okunuyor (`mapServerLimits`). Kalan 10 alan —
`maxAddresses`, `maxSavedSearches`, `maxMessagesPerDay`, `listingExpireDays`,
`maxReviewChars`, `maxValuePerListing`, `canFeatureListings`, `canBulkUpload`,
`canScheduleListings`, `priorityInSearch` — **hiçbir uçta yok**
(`/admin/settings/public` de `{}` dönüyor).

**Sonuç:** denetimin "5 alan yeterli mi" sorusu kapandı — genişletilecek bir
şey yok. Bu 10 limit istemci sabiti kalmak *zorunda*; değişmesi için önce
backend'in yayınlaması gerekiyor.

### B3. İade onay/ret ucu yok

Üretilen katalogda (`docs/mobile-api-reference.html`, 301 uç) tam olarak beş
iade yolu var:
`/refund-requests` · `/refund-requests/:id` · `/refund-requests/:id/cancel` ·
`/refund-requests/me` · `/refund-requests/seller`

`GET /refund-requests/seller` **canlı çalışıyor ve gerçek veri döndürüyor**
(`refundNumber`, `reason`, `amount`, `status`, iç içe `order` + `requester`).
`cancel` alıcıya ait.

**Mobilde yapılan:** satıcı sekmesi açıldı ama **salt okunur** (`b6a73ac`).
Onay/ret butonu koymak, satıcıya olmayan bir yetki vaat ederdi.

**İstenen:** satıcı onay/ret uçları — yoksa sekme bilgilendirme olarak kalır.

### B4. IP-engel 403'ü için ayırt edici alan yok

Sunucudan üretilen i18n kataloğunda "erişim engellendi" anlamına gelen bir
`server.*` anahtarı **yok**. Hesap durumu engelleri `errorCode` taşıyor
(`USER_BANNED` bunun kanıtı), servis/guard hataları `i18nKey` taşıyor,
`ValidationPipe` 400'leri **hiçbiri**.

**Mobilde yapılan:** `EMAIL_NOT_VERIFIED` `errorCode` üzerinden bağlandı —
kod hiç gelmezse davranış birebir korunuyor (`e00eaaa`). IP-blok dalı
**yazılmadı**: metne bağlı ayrım yapmamak için.

**İstenen:** IP-engel 403'ünün gövdesine `errorCode`.

### B5. Kupon reddi 400'ünde yapısal alan yok

Geçersiz kupon → `{"message":"Kupon kodu bulunamadı","error":"Bad Request","statusCode":400}`.
`i18nKey` de `code` da yok, dolayısıyla `isCouponRejection` sunucu **mesaj
metnine** bağlı kalmak zorunda. Metin değişirse istemci sessizce yanlış
davranır.

**İstenen:** bu 400'e `i18nKey` ya da `errorCode`.

---

## 2. Kapanan `DOĞRULANAMADI` maddeleri

| Kod | Soru | Ölçüm (staging, 2026-08-03) |
|---|---|---|
| D1 | `EMAIL_NOT_VERIFIED` gövdesi | Üretilemedi (üç demo hesap da doğrulanmış). Ama refresh yolunun üretebildiği anahtarlar **yalnız üç tane** ve hiçbiri doğrulamayla ilgili değil → ayrım `errorCode`'a bağlandı, güvenli |
| D2 | IP-blok 403 gövdesi | Katalogda karşılık **yok** → yazılmadı (B4) |
| D3 | Ürün DTO'sunda `shippingPackageTier` | **Yok** — 46 alanın hiçbiri (B1) |
| D5 | `packageNumber` canlı var mı | **Var**: `PKG-7SG2A92V2V`, `groupNumber: GRP-RCMGJ6JVRS` |
| D6 | `me/limits` alan sayısı | **13 alan**, istemci karşılığı olanların hepsi okunuyor (B2) |
| D7 | Kademe 503 gövdesi | Tarife aktif (`tariffVersion: 3`) → hâlâ üretilemedi; kod fail-closed yazıldı |
| — | S3 taban URL'i | Sunucu her görselde **imzasız mutlak URL** de gönderiyor; çözücü onu tercih ediyor → env yedeği hiç çalışmıyor. Ölçülen taban `.env.example`'a not düşüldü, **set edilmedi** (prod kovası farklı olabilir) |

---

## 3. Denetimin kaçırdığı, bu turda çıkan bulgular

1. **Sipariş durum haritası ÜÇ kopyaydı** (liste / detay / grup). Bugün aynı
   olmaları tesadüf; birine durum eklenince diğer ikisi ham kod basardı.
   Tek kaynağa çekildi (`167dd7c`).
2. **`REFUND_REASON_OPTIONS` modülü çökertebiliyordu** — mutasyon denetiminde
   çıktı: sözlükte olmayan tek bir kod `import` anında `TypeError` atıp iade
   ekranını beyaz ekrana çeviriyordu (`7309e9f`).
3. **54 test suite'i selector'süz `useAuthStore` mock'u kullanıyordu** →
   `Bearer [object Object]` üretilebilirdi, test yeşil kalırdı (`3f9c5c3`).
4. **Sentry'de scrub yoktu** — axios `config.data` serileştirilmiş istek
   gövdesi (telefon, adres, IBAN, şifre) kayıt sunucusuna gidebiliyordu
   (`6003228`).
5. **`resolveImageUrl` cihaz-yerel şemaları geçiriyordu** — beyaz liste yalnız
   `[IMG:]` sınırındaydı (`6f07dec`).
6. **`useZodForm` çıktı tipini kaybediyordu** — `transform`'lu alanın ham
   hâlini kullanmak derleyiciden geçiyordu (`e5086c8`).
7. **`refund-requests` ekranının etiketi artık yanıltıcıydı** ("İadelerim"),
   iki sekmeli hâline göre düzeltildi.

---

## 4. Hâlâ açık — cihaz gerektiriyor

`plans/2026-08-03-parite-plan5-p1.md` "Cihazda doğrulanacak" listesi aynen
geçerli; Jest bunları kanıtlayamaz:

- iOS: ertelenen checkout uyarısının OTP modalı kapandıktan sonra çıkması
- `expo-image` 302 → S3 yönlendirmesinde `Authorization` header davranışı
- `expo-image`'ın başarısız URL'leri oturum boyu kara listeye alması
- 50 Maestro akışı (programatik doğrulandı, cihazda koşulmadı)
- PayTR uçtan uca (prod `test_mode`'u reddediyor → staging'de elle)

Ayrıca **misafir takip yanıtında `groupNumber`/`packageNumber` şekli
ölçülemedi**: demo hesapların siparişleri üye siparişi, misafir takip onları
çözmüyor (üç kod biçimi de 404). Eklenen satırlar kendini kapıladığı için
alan yoksa çizilmiyor — davranış güvenli ama **şekil doğrulanmadı**.

> **Güncelleme:** derin bağlantı kalemi ayrı bir tura alındı —
> `docs/superpowers/specs/2026-08-03-deep-links-design.md` (tasarım) ve
> `docs/deep-links.md` (teslim). Android'in "zaten çalıştığı" iddiası
> düzeltildi: `assetlinks.json` da 404, o da aynı doğrulama dosyasını bekliyor.

---

## 5. Çalışma kuralına ek

Plan 5'in kurallarına bu turdan bir madde daha:

7. **Mutasyon denetimi yap.** Testin geçmesi, regresyonu yakalayacağının
   kanıtı değil. Üretim kodunu bilerek boz ve testin KIRMIZI olduğunu gör;
   11 mutasyonun 10'u temiz yakalandı, 11.'si suite'i hiç yükletmedi ve
   böylece modül çökerten bir `!` iddiası ortaya çıktı (§3.2).
