# iOS'ta dijital satış kapısı — tasarım

App Store Guideline `3.1.1`, `3.1.3(g)` ve `2.1(b)` reddine karşı: iOS
uygulamasından **üyelik aboneliği** ve **ilan öne çıkarma (boost)** satın alma
yüzeylerinin ve bunlara giden tüm çağrıların kaldırılması.

Bağlam ve önceki turlar: `docs/APP_REVIEW_1.2_ENGELLEME_DEVIR.md`,
`docs/APP_REVIEW_CEVAP_1.2.md`.

---

## 1. Problem

Uygulama, otomatik yenilenen bir üyelik aboneliğini ve ilan boost'unu **PayTR**
üzerinden satıyor. Depoda hiçbir IAP kütüphanesi yok. Apple'ın kuralları:

- **`3.1.1`** — "If you want to unlock features or functionality within your app
  (by way of example: subscriptions…), you must use in-app purchase."
  Üyelik ilan limiti, analitik, işletme paneli ve kayıtlı arama açıyor →
  uygulama içi işlevsellik.
- **`3.1.3(g)`** — "Digital purchases for content that is experienced or consumed
  in an app, **including buying advertisements to display in the same app (such
  as sales of 'boosts' for posts in a social media app) must use in-app
  purchase.**" Boost kılavuzda adıyla geçiyor.
- **`3.1.3` giriş paragrafı** — "Apps in this section cannot, within the app,
  encourage users to use a purchasing method other than in-app purchase, except
  for apps on the **United States storefront** and as set forth in 3.1.1(a) and
  3.1.3(a)." Türkiye vitrini istisna değil; `3.1.3(a)` reader uygulamalara özel
  ve pazaryeri o kategoride değil. **Web'e yönlendirme de yasak.**

Buna karşılık **`3.1.3(e)`** fiziksel malı IAP'nin dışında tutuyor: diecast
satışı, takas nakit farkı, kargo ve komisyon PayTR'de kalmak **zorunda**. Bu
tasarım onlara dokunmaz.

Aynı paragrafın son cümlesi kapsamı çiziyor: "Developers can send communications
**outside of the app** to their user base about purchasing methods other than
in-app purchase." Kısıt yalnız uygulamanın ekranında; e-posta ve web serbest.

## 2. Kapsam

**Kapatılacak (dijital, uygulama içi):**

| Yüzey | Uçlar |
| --- | --- |
| Üyelik aboneliği | `POST /membership/subscribe`, `POST /membership/payments/initiate`, `PATCH /membership/auto-renew`, `/membership/cards` |
| İlan boost | `GET /products/:id/boost/options`, `POST /products/:id/boost/initiate` |
| Yükseltme çağrıları | 18 giriş noktası, hepsi `/upgrade` → `/membership` |

**Dokunulmayacak (fiziksel, `3.1.3(e)` gereği IAP dışında kalmalı):**
ürün checkout'u (`POST /payments/initiate`, `/payments/direct-form`), takas nakit
farkı (`/payments/initiate-trade-cash`), kargo/komisyon/hizmet bedeli, kayıtlı
kartlar ve adresler, satıcı ödemeleri, indirim/kupon, reklam gösterimi.

**Kapsam dışı:** Android ve web (bugünkü gibi satmaya devam eder), IAP
entegrasyonu (ayrı ve sonraki iş), backend (hiç değişmiyor).

## 3. Kararlar

Beyin fırtınasında alındı:

1. **Kapı yalnız iOS.** `Platform.OS === 'ios'`. Android ve web etkilenmez.
   Google Play'in de benzer bir kuralı var ama Android henüz yayınlanmadı; o
   karar Play'e çıkarken verilir. Kapı tek noktada durduğu için genişletmek tek
   satır.
2. **Üyelik ekranında yalnız mevcut paket kalır.** Fiyat, aylık/yıllık geçişi ve
   diğer paket kartları gider. Diğer paketlerin içerikleri fiyatsız bile
   gösterilmez — o da bir abonelik referansı.
3. **Ücretli üye yalnız iptal edebilir.** Otomatik yenileme anahtarı, kart
   yönetimi ve bekleyen ödeme bandı iOS'ta görünmez. İptal satın alma değil;
   yenilemeyi tekrar açmak ise PayTR'de yinelenen tahsilatı yeniden başlatmak
   demek — o yüzden anahtar tamamen kalkıyor.
4. **Aşılabilir limitlerde dürüst bilgi, kapalı özelliklerde nötr kapı.**
   Limit: kullanıcıya uygulama içinde yapabileceği şey söylenir. Kapalı özellik:
   giriş noktası kalır, kapı "hesabınızda kullanılamıyor" der.
5. **Tek kaynak + iki paylaşılan parça + emniyet kilidi** (bkz. §4).

### Metin çizgisi

Kural: **hesabın mevcut durumuna dair olgu söylenebilir; ücretli bir kademeyi
işaret eden hiçbir şey söylenemez.** Paket adı, "yükseltin", "geçin", "daha
fazlası için" ifadeleri yasak — link ve fiyat olmasa bile. Gerekçe: o cümle,
inceleyene satın alma yolu aramak için sebep verir; olmadığında arayacağı bir şey
yoktur.

| Durum | iOS metni |
| --- | --- |
| Kapalı özellik | "Bu özellik hesabınızda kullanılamıyor." / "This feature isn't available on your account." |
| Aşılabilir limit | "{count} ilan hakkının tamamını kullandın. Yeni ilan eklemek için mevcut ilanlarından birini kaldırabilirsin." |

## 4. Mimari

Üç parça. Koşul mantığı **yalnız iki dosyada** yaşar; 18 çağrı yerinin her biri
tek satırlık değişiklik alır. Amaç kopyalanmış `Platform.OS` koşullarından
kaçınmak — kaçağın en muhtemel sebebi o.

### 4.1 `src/lib/purchases.ts` — tek kaynak

```ts
/** iOS'ta uygulama içi dijital satış Apple IAP'siz yapılamaz (3.1.1/3.1.3(g)). */
export const CAN_BUY_DIGITAL = Platform.OS !== 'ios';
```

Tek sabit. Ekranlar doğrudan `Platform`'a bakmaz — kural değişirse (Android
eklenir, sunucu bayrağına taşınır) tek dosya değişir.

### 4.2 `<UpgradeCta/>` — render edilen çağrılar

iOS'ta `null` döner, diğer platformlarda bugünkü düğmeyi render eder. Yerine
geçtiği yerler tek satıra iner. Konum: `src/components/UpgradeCta.tsx`.

Kullanıldığı yerler (render edilen düğme/link biçimindekiler):
`(tabs)/messages/index.tsx`, `messages/new/_components/NewMessageBody.tsx`,
`settings/analytics/_components/AnalyticsContent.tsx`,
`settings/collections.tsx`, `settings/my-listings/_components/MyListingsSections.tsx`,
`settings/saved-searches/index.tsx`,
`settings/subscription/_components/SubscriptionBody.tsx`,
`settings/edit-profile/_components/EditProfileSections.tsx`,
`collections/_components/CollectionsInfoCard.tsx`,
`collections/[id]/_components/CollectionDetailBody.tsx`,
`seller/register.tsx`, `membership/manage/_components/ManageSections.tsx`.

### 4.3 `limitAlert()` — alert içindeki çağrılar

`appAlert` ile açılan limit uyarıları için tek yardımcı. Yükseltme düğmesini
yalnız `CAN_BUY_DIGITAL` iken ekler; iOS'ta uyarı yalnız bilgi ve "Tamam" içerir.
Konum: `src/lib/purchases.ts` — sabitle aynı dosya, koşul mantığı dağılmasın.

Kullanıldığı yerler: `settings/addresses/_hooks/useAddresses.ts`,
`settings/my-listings/_hooks/useMyListings.ts` (limit + relist),
`settings/collections.tsx` (gecikmeli `setTimeout` yönlendirmesi de kalkar),
`(auth)/login/_hooks/useLogin.ts` (kurumsal yükseltme uyarısı).

### 4.4 Emniyet kilidi — satın alma rotaları

Bir CTA gözden kaçsa bile ödemeye ulaşılamaması için:

- `app/membership/checkout/` — iOS'ta hiç render edilmez, `/membership`'e
  `Redirect`.
- `src/components/product/BoostModal.tsx` — iOS'ta açılmaz (`null` döner) ve
  `my-listings` menüsündeki "Öne çıkar" aksiyonu iOS'ta listelenmez.
- `app/payment/[id].tsx` — `type === 'membership'` iOS'ta reddedilir. **Ekran
  silinmez**: fiziksel sipariş, sepet ve takas ödemesi aynı ekrandan geçmeye
  devam eder.

`/upgrade` ve `/pricing` yönlendirmeleri (`Redirect href="/membership"`) olduğu
gibi kalır — hedef ekran zaten satış içermeyecek.

## 5. Ekran değişiklikleri

### 5.1 `app/membership/` (üyelik ekranı)

iOS'ta kalan: mevcut paket kartı (`MembershipCurrentPlan`) + o paketin
içerdikleri + limit durumu.
iOS'ta kalkan: `MembershipBillingToggle` (aylık/yıllık), paket kartları ve
`MembershipTierList` (fiyatlar), `MembershipBanners` içindeki bekleyen ödeme
bandı.

### 5.2 `app/settings/subscription/`

`!isPremium` bloğundaki `membership.freePlanPromo` metni ve
`membership.upgradeToPremium` düğmesi iOS'ta görünmez. Ücretli üyede: paket adı,
yenileme tarihi ve **iptal** kalır; otomatik yenileme anahtarı ile kart
listesi/silme kalkar.

### 5.3 `app/membership/manage/`

İçindeki `/membership`'e yönlendiren yükseltme düğmeleri `<UpgradeCta/>` ile
sarılır. Ekranın kendisi (durum + iptal) kalır.

### 5.4 Kapalı özellik kapıları

`NewTradeGate` ve `NewCollectionGates`, metni `getUpgradeMessage`'dan alıyor.
iOS'ta nötr metin gösterilir; giriş noktaları **kaldırılmaz** (kullanıcı özelliğin
var olduğunu görür, kapıda ne olduğunu öğrenir). `getUpgradeMessage` tek kaynak
olduğu için değişiklik oraya girer.

### 5.5 Profil menüsü

"Üyelik Planı" (`/membership`) ve "Abonelik" (`/settings/subscription`) satırları
iOS'ta benzer içeriğe çıkıyor. Bu bir düzen kusuru, uyum sorunu değil:
`/membership` limitleri, `/settings/subscription` iptali taşıyor. **Kapsam dışı
bırakıldı** — Apple için gerekli değil ve dokunmak iki ekranın sorumluluğunu
yeniden bölmek demek. İstenirse ayrı bir iş olarak ele alınır.

## 6. i18n

Yeni anahtarlar (`tr` + `en`, `pnpm i18n:codegen` ile üretilir):

- `membership.featureUnavailableOnAccount` — "Bu özellik hesabınızda kullanılamıyor."
- `listing.limitReachedInfo` — "{count} ilan hakkının tamamını kullandın. Yeni ilan eklemek için mevcut ilanlarından birini kaldırabilirsin."

Mevcut `address.goPremium`, `membership.upgradeToPremium`, `membership.freePlanPromo`
anahtarları **silinmez** — Android ve web hâlâ kullanıyor.

## 7. Test

1. **Kapı birim testi** — `CAN_BUY_DIGITAL` iOS'ta `false`, diğerlerinde `true`.
2. **Regresyon testi (asıl koruma)** — `Platform.OS` iOS'a sabitlenmiş bir test,
   kilit ekranları (üyelik, abonelik, ilanlarım, analitik, koleksiyonlar,
   mesajlar) render eder ve **hiçbir yükseltme çağrısı, BAŞKA paket adı veya
   fiyat görünmediğini** doğrular. Kullanıcının KENDİ paketinin adı ("Ücretsiz
   Üyelik") görünmeye devam eder — §3.2 kararı bunu istiyor; test onu yasaklamaz. Aynı test Android'de tersini doğrular: çağrılar
   yerinde. Bu, ileride kimsenin yanlışlıkla geri koymamasını sağlar.
3. **Rota kilidi testi** — iOS'ta `membership/checkout` `/membership`'e
   yönlendiriyor, `BoostModal` render etmiyor, `payment/[id]` `type=membership`
   ile açılmıyor; fiziksel ödeme (`orderId`/`tradeId`) **açılmaya devam ediyor**.
4. **Mevcut süit yeşil kalır** — 216 süit / 1713 test.
5. **Cihazda doğrulama** — iOS simülatöründe üyelik, ilanlarım, koleksiyon ve
   takas akışları gezilir; Android'de satın almanın bozulmadığı görülür.

## 8. Riskler

| Risk | Önlem |
| --- | --- |
| Bir CTA gözden kaçar | Emniyet kilidi (§4.4) satın almaya ulaşmayı engeller; regresyon testi (§7.2) çağrıyı yakalar |
| Fiziksel ödeme yanlışlıkla bozulur | `payment/[id]` silinmez, yalnız `type=membership` reddedilir; test fiziksel yolun açık kaldığını doğrular |
| Android/web satışı bozulur | Kapı tek sabitte ve `Platform.OS !== 'ios'`; test Android'de çağrıların yerinde olduğunu doğrular |
| Ücretli üye iOS'ta mahsur kalır | İptal kalıyor; kart ve yenileme yönetimi web'de mevcut |
| Kullanıcı özelliğin neden kapalı olduğunu anlamaz | Nötr kapı metni durumu söylüyor; ayrıntı web ve e-posta kanallarında |

## 9. Bu tasarımın çözmediği

- **IAP entegrasyonu.** iOS'ta abonelik satmak istendiğinde ayrı bir iş: ASC
  ürünleri, StoreKit (native modül → yeni build), sunucuda makbuz doğrulama,
  "Restore Purchases", App Store sunucu bildirimleri. Komisyon %30, yıllık geliri
  1M$ altındaki geliştiriciler için %15.
- **Guideline 2.1 (demo hesabı)** ve **1.2 (ekran kaydı + filtreleme anlatımı)** —
  `docs/APP_REVIEW_CEVAP_1.2.md`'de ayrıca ele alınıyor.
- **App Store Connect metadata** — Privacy Policy URL ve EULA alanı. Uygulamada
  abonelik kalmayınca `3.1.2(c)`'nin uygulama içi şartları düşer; ASC'deki
  gizlilik politikası alanı her hâlükârda zorunlu.
