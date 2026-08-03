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

Bunun tekrarını dört bekçi testi engelliyor:

- `src/lib/deeplinks/__tests__/paths.test.ts` — `paths.json`'daki her satırın
  `toMobileRoute` çözücüsüyle (`src/utils/notificationRoute.ts`) doğru şekilde
  çözüldüğünü/dışlandığını doğrular; eski listenin mobil-rota-adlı örneklerini
  (`/order-track`, `/corporate-invite`, `/trade/5`, `/product/123`) tabloya geri
  sızmaya karşı regresyon kilidiyle tutar. Üretilen AASA'yı **iki yönde** de
  ölçer: tablodaki her desen (locale varyantlarıyla) dosyada var, dosyadaki
  hiçbir desen tablo dışı değil — yani teyitli bir satır silinip
  `pnpm wellknown:gen` koşulmazsa canlı kalan talep yakalanır.
- `src/lib/deeplinks/__tests__/routes.test.ts` — çözülen her rotanın `app/`
  altında **gerçekten var olduğunu** doğrular (bkz. §11).
- `src/lib/deeplinks/__tests__/appConfig.test.ts` — `app.json`'daki Android
  intent filter'ının (tek filtre) tabloyla birebir aynı olduğunu, hiçbir yol
  niteliğiyle (`path`/`pathPrefix`/`pathPattern`/`pathSuffix`) ödeme/checkout
  talep etmediğini ve `{scheme, host}` ikilisinin yolsuz (tüm host'u talep eden)
  bir girdi olarak kalmadığını doğrular.
- `app/__tests__/native-intent.test.ts` — teslim kancasının (§12) web yolunu
  mobil rotaya çevirdiğini ve **ödeme dönüş URL'lerinde gezinmediğini** doğrular.

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
   alanına yaz. **Biçim:** 32 adet iki haneli **BÜYÜK harf** hex, `:` ile
   ayrılmış (`A1:B2:…:FF`, 95 karakter). Küçük harfli ya da `TODO` gibi bir
   değer yazılırsa `gen-wellknown.mjs` **hata verip durur** — çünkü öyle bir
   değerle yayınlanan dosya Android doğrulamasını *kesin olarak* düşürür, tam
   da boş-liste bekçisinin engellemek için var olduğu sonuç.
3. `pnpm wellknown:gen` çalıştır — `docs/wellknown/assetlinks.json` üretilir.
4. **Sürüm kapısı:** parmak izi girildikten sonra üretim
   `pnpm wellknown:gen:strict` ile koşulur. `--strict`, parmak izi yoksa
   uyarıyla geçmez, **çıkış kodu 1** verir — CI/sürüm adımında kullanılacak
   biçim budur (bkz. §6 adım 4).

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

Sürüm kontrol listesi (parmak izi girildikten sonra, her sürümde):

```bash
pnpm wellknown:gen:strict   # parmak izi yoksa çıkış 1 — kapı budur
pnpm wellknown:check        # yayındaki dosyaları ölçer, hepsi yeşil olmalı
```

`wellknown:gen:strict` çıktısı `git status`'ta bir değişiklik bırakıyorsa
`paths.json` düzenlenip üretim koşulmamış demektir; üretilen dosyalar
commit'lenir.

⚠️ 1. adımdan hemen sonra `wellknown:check`'in **kısmen kırmızı kalması
normaldir**: `app-site-association.cdn-apple.com` Apple'ın kendi önbelleğidir
ve doğru bir yayının **saatler** gerisinde kalabilir. Origin `200` dönüyor +
içerik birebir aynıysa yayın başarılıdır; CDN ve Google doğrulayıcı satırları
kendiliğinden yeşile döner. Aynısı §9 için de geçerli.

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

Her satır ölçüldüğü anda basılır (bir istek asılırsa nerede kalındığı görünür)
ve her isteğin 10 saniyelik zaman aşımı vardır — WAF arkasında kara deliğe
düşen bir bağlantı script'i kilitlemez.

⚠️ **Yayının hemen ardından bu çıktının kısmen kırmızı kalması beklenir.** Son
iki kontrol (`Apple CDN gördü`, `Google doğrulayıcı`) origin'i değil üçüncü
tarafın önbelleğini sorar; Apple'ınki doğru bir yayının **saatler** gerisinde
kalabilir. `AASA 200` + `AASA içerik üretilenle aynı` yeşilse yayın doğrudur,
kalanları beklemek yeterlidir — yayın başarısız demek değildir.

---

## 10. Teyit bekleyenler

`paths.json`'da `confirmed: false` olan 8 yol — web'de gerçekten var
olduğu **doğrulanmadığı** için üretilen dosyalara girmiyor:

- `/seller/*` (mobil rota var — `app/seller/[id]/index.tsx`; teyit bekleyen
  yalnız **web** yolu)
- `/orders/*` (aşağıda 3. soru)
- `/category/*`
- `/brands/*`
- `/sayfa/*`
- `/membership`
- `/pricing`
- `/favorites`

Web tarafına dört soru:

1. **Bu 7 yol web'de gerçekten bu path'lerde mi yaşıyor?** (`/category/*`,
   `/brands/*`, `/sayfa/*` için `toMobileRoute` içinde henüz bir eşleme de
   yok — hem yol hem eşleme teyit bekliyor.)
2. **Locale ön ek biçimi ne?** `/en/listings/123` geçerli bir URL mü,
   varsayılan dil (`tr`) gerçekten ön eksiz mi (`localePrefix: 'as-needed'`
   varsayımı doğru mu)? Cevap "ön ek yok, hiçbir zaman gerekmiyor" ise
   `paths.json` → `locales` dizisi boşaltılır ve `/tr/*` / `/en/*`
   varyantları üretimden düşer.
3. **Sipariş detayının kanonik web yolu hangisi?** Tabloda
   `/profile/orders/*` teyitli, ama repo içinde `/orders/:id`'nin de servis
   edildiğine dair kanıt var: `docs/manual-test/faz1-kritik-checklist.md:13`
   → `apps/web/src/app/orders/[id]/page.tsx`. İkisi de yayındaysa `/orders/*`
   satırı da `confirmed: true` yapılır (çözücü zaten doğru rotayı veriyor);
   biri yönlendirmeyse hangisinin kanonik olduğu yazılsın.
4. **Sondaki `/` var mı?** AASA ve Android `path` girdileri **birebir**
   eşleşir: `{"path": "/profile"}` `https://host/profile/` adresini
   **eşleştirmez**. Web `/profile/` biçiminde link üretiyorsa (ya da `/profile`
   → `/profile/` yönlendirmesi varsa) tabloya sondaki slash'lı varyantlar da
   eklenmeli. Sitenin gerçekte hangi biçimi ürettiği söylensin.

Cevaplar geldikten sonra: ilgili satırların `confirmed` alanı `true`
yapılır, gerekiyorsa `toMobileRoute` içine eşleme eklenir, `pnpm
wellknown:gen` yeniden çalıştırılır.

---

## 11. Çözücü takibi — açık madde yok

Task 3'ün eklediği bekçi testi (`routes.test.ts`), her `confirmed: true` +
`include: true` satırın çözdüğü rotanın `app/` altında **gerçekten var
olduğunu** doğruluyor. **Yayınlanan yolların tamamı yeşil** — 16'sı da ilk
çalıştırmada geçti. Bu turda düzeltilmeyi bekleyen bir çözücü hatası **yok**.

> Bu bölüm daha önce bir takip maddesi kaydediyordu: "`case 'seller'` →
> `/seller/:id` döndürüyor ama `app/` altında böyle bir rota yok." **Bu iddia
> yanlıştı** — `app/seller/[id]/index.tsx` var, çözücü doğru. İddia kırpılmış
> bir dosya listesinden doğmuş ve `paths.json` yorumuna da sızmıştı; ikisi de
> düzeltildi. `/seller/*` hâlâ `confirmed: false`, ama artık tek sebebi §10'daki
> **web yolu teyidi**.

---

## 12. Bu bitene kadar ne oluyor

E-posta ve web linkleri tarayıcıda açılıyor. `tarodan://` custom scheme'iyle
gelen derin bağlantılar — **push bildirimleri dahil** — **çalışıyor**;
kayıp yalnız `https://` linklerinin uygulamaya düşmemesi. Bu **iki
platformda da** aynı: iOS'ta AASA, Android'de `assetlinks.json` 404 olduğu
sürece hiçbiri doğrulanmıyor.

Yönlendirme mantığı hazır ve dosyalar yayınlanır yayınlanmaz çalışacak:

- Teslim yolu **`app/+native-intent.ts`**'te (`redirectSystemPath`). expo-router
  bu kancayı hem soğuk başlatmada (`getInitialURL`) hem uygulama açıkken
  (`subscribe`) **kendi rotalamasından ÖNCE** çağırır, yani web yolu → mobil
  rota çevirisi rota ağacına girmeden yapılıyor.
- push bildirimleri ve derin bağlantılar aynı çözücüyü paylaşıyor
  (`src/utils/notificationRoute.ts`); push tap'i ayrı akıştır
  (`src/services/push.ts`) ve bu kancadan geçmez.
- Ödeme dönüşü (`/payment/*`, `/checkout*`) kancada **boş string** döndürülerek
  bilerek gezinmesiz bırakılıyor — `app/payment/success.tsx` gerçekten var, aksi
  hâlde PayTR 3DS turu WebView'in dışına çıkardı. Dışlanan yolların tek kaynağı
  `paths.json`'daki `include: false` satırları.

**Neden bu kanca şart:** expo-router gelen URL'yi doğrudan kendi rota ağacında
arıyor ve `app/listings/[id]` diye bir rota **yok**. Kanca olmasaydı, doğrulama
dosyaları yayına girdiği anda `/listings/123` önce "sayfa bulunamadı" ekranını
açar, sonra doğru ekrana atlar (ve not-found geri yığında kalırdı); rota adı
örtüşen `/collections/9`, `/offers`, `/messages`, `/profile` ise **iki kez**
açılırdı. Eski `src/services/deepLinks.ts` çevirisi rotalamadan *sonra*
çalıştığı için bu ikilemeyi üretiyordu; kaldırıldı, davranış testleri
`app/__tests__/native-intent.test.ts`'e taşındı.

Uygulama tarafında bu plan kapsamında başka iş yok — teslim yolu tamam,
bekleyen tek şey §1'deki iki dosyanın yayınlanması.
