# Derin bağlantılar (Universal Links + App Links) — teslim

`https://tarodan.com.tr/...` linkine tıklandığında tarayıcı yerine uygulamanın
açılması. İki mekanizma, ikisi de aynı iki dosyaya bağlı:

- **iOS Universal Links** — `apple-app-site-association` (AASA) dosyasını
  gerektirir.
- **Android App Links** — `assetlinks.json` dosyasını gerektirir.

Bu doküman, geri kalan işi bu repo dışındaki iki tarafa **soru sormadan**
uygulayabilecekleri şekilde devrediyor: web/infra dosyaları yayınlayacak,
Apple Developer / Google Play hesabını yöneten kişi capability ve imza
kaydını girecek.

---

## 1. Durum tablosu (düzeltilmiş, ölçülmüş — 2026-08-03)

Eski `docs/ios-universal-links.md`, **"Android'de zaten çalışıyor"** diyordu.
Bu **yanlıştı**: Android'in `autoVerify` doğrulaması da `assetlinks.json`
dosyasına bağlı, o da 404. Sonuç: iki platformda da `https://` linkleri
tarayıcıda kalıyor, sadece iOS'un görünür bir hata mesajı yok.

| # | Parça | Sorumlu | Durum |
|---|---|---|---|
| 1 | AASA dosyası yayını (iOS) | **web / infra** | ❌ 404 — her iki alan adında |
| 2 | `assetlinks.json` yayını (Android) | **web / infra** | ❌ 404 — her iki alan adında |
| 3 | Apple `Associated Domains` capability | Apple Developer / EAS | ❓ doğrulanmadı |
| 4 | Android imza parmak izi (`fingerprints.json`) | bu repo + Play Console | ❌ iki alan da boş |
| 5 | `ios.associatedDomains` (`app.json`) | bu repo | ❌ bilerek eklenmedi (bkz. §6) |

**Ölçüm:** `node scripts/check-deeplinks.mjs`, 2026-08-03, exit kodu **1**,
**2/16 kontrol geçti**:

- `tarodan.com.tr` AASA → `HTTP 404`, `content-type: text/html; charset=utf-8`
- `tarodan.com.tr` `assetlinks.json` → `HTTP 404`
- `app-site-association.cdn-apple.com/a/v1/tarodan.com.tr` (Apple'ın kendi
  CDN'i — cihazlar dosyayı origin'den değil buradan çeker) → `HTTP 404`
- Google digitalassetlinks doğrulayıcısı → `ERROR_CODE_FETCH_ERROR`
- `staging.tarodan.com.tr` için aynı dört sonuç
- Geçen tek iki kontrol **"yönlendirme yok"** — dosya zaten 404 döndüğü için
  bu kontrol anlamsızca geçiyor, bir ilerleme göstergesi değil.

---

## 2. Yolların tek kaynağı

Yayınlanacak yol listesi elle yazılmıyor. Tek kaynak:
`src/lib/deeplinks/paths.json` — `locales`, `appIDs`, `androidPackage`,
`hosts`, ve her yol için `{ pattern, sample, include, confirmed, comment }`.
`docs/wellknown/apple-app-site-association` ve Android intent filter'ı
(`app.json`) bu dosyadan **üretiliyor** (`pnpm wellknown:gen`; `app.json`
elle senkron tutuluyor ve bir bekçi testiyle denetleniyor).

**Eski liste neden yanlıştı:** `docs/ios-universal-links.md`'deki AASA örneği
**mobil rota adlarıyla** yazılmıştı (`/product/*`, `/trade/*`,
`/order-track*`, `/corporate-invite*`) — bunlar web'in kullandığı URL'ler
değil. Web tarafı gerçekte `/listings/:id`, `/trades/:id`, `/track-order`,
`/corporate/invite` gibi **çoğul / farklı isimli** yollar kullanıyor. O dosya
öyle yayınlansaydı Apple onu kabul eder, doğrulama yeşil görünür, ama
kullanıcıların tıkladığı gerçek web linklerinin çoğu yine Safari'de açılırdı
— hatasız görünen, sessizce çalışmayan bir kurulum.

Bunun tekrarını üç bekçi testi engelliyor (`src/lib/deeplinks/__tests__/`):

- `paths.test.ts` — `paths.json`'daki her satırın `toMobileRoute` çözücüsüyle
  (`src/utils/notificationRoute.ts`) doğru şekilde çözüldüğünü/dışlandığını
  doğrular; eski listenin mobil-rota-adlı örneklerini (`/order-track`,
  `/corporate-invite`, `/trade/5`, `/product/123`) tabloya geri sızmaya karşı
  regresyon kilidiyle tutar.
- `routes.test.ts` — çözülen her rotanın `app/` altında **gerçekten var
  olduğunu** doğrular (bkz. §11).
- `appConfig.test.ts` — `app.json`'daki Android intent filter'ının tabloyla
  birebir aynı olduğunu, ödeme/checkout yollarını talep etmediğini ve
  `{scheme, host}` ikilisinin yolsuz (tüm host'u talep eden) bir girdi
  olarak kalmadığını doğrular.

---

## 3. Web/infra teslim bölümü

İki dosya yayınlanacak. İçerikleri **elle yazılmaz** — `docs/wellknown/`
altındaki dosyalar **birebir** (byte-exact) kopyalanır.

| Dosya | Konum | Kaynak |
|---|---|---|
| AASA | `https://<host>/.well-known/apple-app-site-association` | `docs/wellknown/apple-app-site-association` |
| Android | `https://<host>/.well-known/assetlinks.json` | `docs/wellknown/assetlinks.json` (bkz. §4 — şu an bu dosya **yok**) |

**Her iki dosya için kurallar:**

- `Content-Type: application/json`
- AASA dosyasının **adında uzantı yok** — tam olarak `apple-app-site-association`
- **Yönlendirme yok** — 301/302/303/307/308 kabul edilmez, doğrudan `200`
  dönmeli
- Kimlik doğrulaması **olmadan** erişilebilir olmalı (login duvarı, WAF
  kuralı vb. arkasında kalmamalı)
- HTTPS ve geçerli sertifika zorunlu
- **Her iki alan adında** yayınlanmalı: `tarodan.com.tr` **ve**
  `staging.tarodan.com.tr` — Android intent filter'ı ikisini de sayıyor, iOS
  tarafı da simetrik olmalı.

Yayınlandıktan sonraki doğrulama komutu §9'da.

⚠️ **`/checkout*` ve `/payment/*` bu içeriğe bilerek girmiyor — her iki
platformda da.** PayTR 3DS turu tarayıcıda başlayıp tarayıcıda bitiyor;
kullanıcıyı akışın ortasında uygulamaya çeken bir link ödemeyi bozar. Risk
özellikle **uygulama dışından** gelen bir tıklama — e-posta, SMS, Chrome/
Safari; checkout ekranının kendi içindeki WebView navigasyonu intent
filter'ı/Universal Link'i hiç tetiklemiyor, o yüzden bu ekranın kendi akışı
tehlikede değil. Bu, sonra kapatılacak bir eksiklik **değil** — `paths.json`'a
bu yolları `include: true` olarak eklemek ödeme akışına aynı hatayı geri
sokar.

---

## 4. Android imza parmak izleri

`docs/wellknown/assetlinks.json` şu an **yok** — bilerek. Boş
`sha256_cert_fingerprints` ile yayınlanan bir dosya, doğrulamayı
**kesin olarak başarısız** yapar; hiç dosya olmamasından daha kötüdür
(`scripts/gen-wellknown.mjs`, parmak izi yoksa dosyayı yazmaz/siler).

1. EAS keystore'un SHA-256'sını al:
   ```bash
   eas credentials -p android --profile production
   ```
   → Keystore → SHA256 Fingerprint.
2. Değeri `docs/wellknown/fingerprints.json` → `eas_upload_keystore.sha256`
   alanına yaz.
3. `pnpm wellknown:gen` çalıştır — `docs/wellknown/assetlinks.json` üretilir.

⚠️ **Sürüm kontrol listesi maddesi — atlanırsa mağazadan kuran herkeste
doğrulama düşer:** ilk Play Store yüklemesinden sonra Play Console → **Test
and release → App integrity → App signing key certificate → SHA-256**
değeri alınıp `fingerprints.json` → `play_app_signing.sha256` alanına
**eklenmek zorunda**. Play, yüklediğin APK'yı kendi anahtarıyla yeniden
imzalıyor; mağazadan inen APK'nın imzası EAS keystore'undan **farklı**.
Sadece `eas_upload_keystore` girilirse doğrulama geliştirme build'lerinde
çalışır, Play'den inen sürümde düşer.

---

## 5. Apple `Associated Domains` capability

App ID `com.tarodan.app` üzerinde açık olmalı. İki yol:

- **EAS** — `eas credentials` çalıştırıldığında capability'yi otomatik
  yönetebilir; `app.json`'a `associatedDomains` eklendikten sonraki ilk
  build'de sorar.
- **Elle** — Apple Developer → Certificates, Identifiers & Profiles →
  Identifiers → `com.tarodan.app` → **Associated Domains** işaretle → kaydet
  → provisioning profile'ı yenile.

---

## 6. Sıra kuralı: 1 → 2 → 3

1. Web dosyaları yayınlanır (§3, §4).
2. Apple capability açılır (§5).
3. **Ancak sonra** `app.json` → `ios.associatedDomains` eklenir (§7) ve yeni
   build alınır.

**3'ü önce yapmak zarar verir:**

- iOS, uygulama kurulurken AASA dosyasını **bir kez** çeker ve
  **başarısızlığı önbelleğe alır**. Dosya 404 iken `associatedDomains`
  yayınlanırsa, kullanıcının cihazında "bu alan adı doğrulanamadı" sonucu
  takılı kalır ve dosya sonradan yayına girse bile **bir süre çalışmaz**.
- `Associated Domains` capability App ID'de açık değilse, entitlement ile
  provisioning profile uyuşmaz ve **build imzalanamaz**.

---

## 7. Bekleyen `app.json` yaması — henüz uygulanmadı

1 ve 2 bitmeden bu yama **uygulanmaz**:

```jsonc
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.tarodan.app",
  "associatedDomains": [
    "applinks:tarodan.com.tr",
    "applinks:staging.tarodan.com.tr"
  ]
}
```

Ardından **yeni build** gerekir — `associatedDomains` bir entitlement, OTA
güncellemesiyle geçmez.

---

## 8. Android farkı

Android tarafında `autoVerify: true` ile intent filter **zaten shipping**
(mevcut sürümde). Bunun anlamı: `assetlinks.json` yayına girdiği anda yeni
kurulumlar otomatik doğrulanır — ama **mevcut kurulumlar kendiliğinden
doğrulanmaz**. Android, App Links doğrulamasını genelde yalnız kurulum
anında dener; dosya sonradan 200 dönmeye başlasa bile zaten kurulu bir
uygulama tekrar denemez. Kullanıcının linklerin uygulamaya düşmesi için
**uygulamayı güncellemesi veya yeniden kurması** gerekir.

Geliştirme cihazında zorlamak için:

```bash
adb shell pm verify-app-links --re-verify com.tarodan.app
adb shell pm get-app-links com.tarodan.app   # durumu okur
```

---

## 9. Doğrulama

```bash
pnpm wellknown:check
```

(`scripts/check-deeplinks.mjs`'i çalıştırır.) Her host için 8 kontrol —
toplam **16 doğrulama kontrolü** (2 host × 8):

- AASA `HTTP 200`
- AASA `content-type: application/json`
- AASA yönlendirme yok
- AASA içeriği `docs/wellknown/apple-app-site-association` ile **birebir
  aynı**
- `assetlinks.json` `HTTP 200`
- `assetlinks.json`'daki parmak izleri yerel dosyayla tam eşleşiyor
- Apple'ın kendi CDN'i (`app-site-association.cdn-apple.com`) dosyayı görüyor
- Google'ın digitalassetlinks doğrulayıcısı en az bir `statement` döndürüyor

Herhangi bir kontrol başarısızsa **exit kodu 1**. Bugünkü (2026-08-03) çalışma
16 kontrolün 2'sini geçiyor — bkz. §1.

---

## 10. Teyit bekleyenler

`paths.json`'da `confirmed: false` olan 7 yol — web'de gerçekten var
olduğu **doğrulanmadığı** için üretilen dosyalara girmiyor:

- `/seller/*`
- `/category/*`
- `/brands/*`
- `/sayfa/*`
- `/membership`
- `/pricing`
- `/favorites`

Web tarafına iki soru:

1. **Bu 7 yol web'de gerçekten bu path'lerde mi yaşıyor?** (`/category/*`,
   `/brands/*`, `/sayfa/*` için `toMobileRoute` içinde henüz bir eşleme de
   yok — hem yol hem eşleme teyit bekliyor.)
2. **Locale ön ek biçimi ne?** `/en/listings/123` geçerli bir URL mü,
   varsayılan dil (`tr`) gerçekten ön eksiz mi (`localePrefix: 'as-needed'`
   varsayımı doğru mu)? Cevap "ön ek yok, hiçbir zaman gerekmiyor" ise
   `paths.json` → `locales` dizisi boşaltılır ve `/tr/*` / `/en/*`
   varyantları üretimden düşer.

Cevaplar geldikten sonra: ilgili satırların `confirmed` alanı `true`
yapılır, gerekiyorsa `toMobileRoute` içine eşleme eklenir, `pnpm
wellknown:gen` yeniden çalıştırılır.

---

## 11. Takip maddeleri

Task 3'ün eklediği bekçi testi (`routes.test.ts`), her `confirmed: true` +
`include: true` satırın çözdüğü rotanın `app/` altında **gerçekten var
olduğunu** doğruluyor. **Bu turda tüm teyitli yollar yeşil** — 16 yayınlanan
yolun tamamı ilk çalıştırmada geçti; `/seller/*` teyit beklediği için kapsam
dışı kaldı.

Ortaya çıkan, bu turda **kasıtlı olarak düzeltilmeyen** bir gerçek hata var:
`toMobileRoute` içinde `case 'seller'` → `/seller/:id` döndürüyor, ama `app/`
altında böyle bir rota **yok**. Bu turda düzeltilmedi çünkü `/seller/*`
zaten `confirmed: false` — yayına hiç girmiyor, dolayısıyla bekçi testinin
kapsamı dışında kalıyor (test yalnız `confirmed: true` satırları kontrol
ediyor). `/seller/*` teyit edilip `confirmed: true` yapıldığında bu eşleme
düzeltilmeden `routes.test.ts` kırmızı verecek — o an fark edilecek, sessizce
geçmeyecek.

---

## 12. Bu bitene kadar ne oluyor

E-posta ve web linkleri tarayıcıda açılıyor. `tarodan://` custom scheme'iyle
gelen derin bağlantılar — **push bildirimleri dahil** — **çalışıyor**;
kayıp yalnız `https://` linklerinin uygulamaya düşmemesi. Bu **iki
platformda da** aynı: iOS'ta AASA, Android'de `assetlinks.json` 404 olduğu
sürece hiçbiri doğrulanmıyor.

Yönlendirme mantığı hazır ve dosyalar yayınlanır yayınlanmaz çalışacak:

- `expo-linking` cold/warm start'ı ele alıyor
- push bildirimleri ve derin bağlantılar aynı çözücüyü paylaşıyor
  (`src/utils/notificationRoute.ts`)
- Universal/App Link açıldığında uygulama zaten doğru ekrana gidiyor;
  eksik olan tek şey platformların linki uygulamaya **teslim etmesi**

Uygulama tarafında bu plan kapsamında başka iş yok.
