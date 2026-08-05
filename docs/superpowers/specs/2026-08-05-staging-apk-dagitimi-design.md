# Staging APK dağıtımı — tasarım (2026-08-05)

Kapsam: müşterinin kendi Android telefonuna kurup test edebileceği bir **staging
APK**'sı üretmek ve dağıtmak. Dağıtım kanalı EAS internal distribution (install
link), üretim kanalı mevcut `mobile-staging.yml` workflow'u.

Öncül: `docs/superpowers/specs/2026-07-25-mobile-staging-prod-testflight-pipeline-design.md` ·
`docs/superpowers/specs/2026-08-03-deep-links-design.md` · `docs/RELEASE.md`

---

## 1. Ölçülen durum (2026-08-05)

| Kontrol | Sonuç |
| --- | --- |
| `eas.json` → `preview` profili | hazır: `buildType: apk`, `distribution: internal`, staging URL'leri, `channel: staging` |
| EAS Android build geçmişi (`eas build:list -p android`) | **boş** — bu projeden hiç Android build alınmamış |
| `credentials/` | yalnız `debug.keystore`; release keystore yok |
| `app.config.js` (preview) | Android paketini `com.tarodan.app.staging` yapıyor |
| `google-services.json` | yalnız `com.tarodan.app` kayıtlı; `oauth_client` dizisi **boş**; proje `tarodan-c1290` |
| `mobile-staging.yml` → `build` job | yalnız iOS (`--profile staging` → TestFlight) |
| `assetlinks.json` (staging alanı) | yayında yok |
| Android prod yayını | yok — Play Console'a hiçbir şey gitmemiş |

**EAS ücretsiz plan kotası platform başına ayrı: 15 Android + 15 iOS**, ortak
havuz değil ([expo.dev/pricing](https://expo.dev/pricing)). `mobile-staging.yml`
yorumundaki "aylık 15" kısıtı yalnız iOS'u bağlıyor; Android eklemek o kotayı
tüketmiyor.

## 2. Asıl bulgu — `.staging` suffix'inin görünmeyen ikinci maliyeti

`app.config.js` preview build'inde Android paketini `com.tarodan.app.staging`
yapıyor. Dosyanın kendi yorumu tek bir önkoşuldan söz ediyor (Firebase'e paketi
kaydet). Ölçüm ikinci bir önkoşul daha olduğunu gösterdi:

1. **Firebase / FCM** — `expo-notifications`'ın Android push'u FCM üzerinden
   çalışıyor ve `google-services.json` isteniyor. Yeni paket kayıtlı değilse
   Gradle'ın `google-services` eklentisi build'i "No matching client found for
   package name" ile düşürür.
2. **Google Cloud OAuth client** — `@react-native-google-signin` Android'de paket
   adı + keystore SHA-1 ile kayıtlı bir Android OAuth client istiyor.
   `src/services/googleSignin.ts:22` yalnız `webClientId`/`iosClientId` geçiyor,
   `google-services.json`'daki `oauth_client` dizisi boş. Yeni paket + yeni
   keystore = yeni kayıt.

İkincisi build'i **düşürmez**; APK üretilir, kurulur ve ancak müşteri "Google ile
giriş"e bastığında patlar. Sessiz başarısızlık, en pahalı tür.

**Merkezi karar: Android staging suffix almaz.** Gerekçe, "yan yana kurulum"
kazancının bugün karşılığı olmaması: Android prod paketi hiçbir yere
yayınlanmamış, ne mağazada ne kimsenin telefonunda. Üstüne kurulacak bir şey yok.
Buna karşılık suffix iki konsol kaydı, biri sessiz başarısızlık riski taşıyor.
iOS'ta suffix **korunur** — orada App Store Connect'te canlı bir uygulama var
(`ascAppId 6786614139`) ve yan yana kurulum gerçek bir ihtiyaç (issue #229).

Ertelenen iş, kaybedilen iş değil: ileride Android prod yayınlanırsa suffix geri
getirilebilir, o gün iki kayıt yapılır.

## 3. Mimari

```
app.config.js                  # suffix yalnız iOS'a; android bloğu değişmeden geçer
  __tests__/app.config.test.js # preview/production/development için beklenen id'ler
.github/workflows/mobile-staging.yml
  build job: iOS adımı (mevcut) + Android adımı (yeni) + APK linkini özete yaz
docs/RELEASE.md                # "Müşteriye staging APK gönderme" bölümü + deep link borcu
```

Değişmeyen: `eas.json` (preview profili zaten doğru), `google-services.json`,
`app.json`, Firebase, Google Cloud.

### 3.1 `app.config.js`

`STAGING_SUFFIX` yalnız `ios.bundleIdentifier`'a uygulanır. `android` bloğu
`config`'ten olduğu gibi geçer, yani preview Android paketi `com.tarodan.app`
kalır. `name` override'ı (`... (Staging)`) korunur — müşteri ikonun altında
"Tarodan (Staging)" görür, hangi ortamı test ettiği belli olur.

Dosya başındaki "⚠️ Android prerequisite" bloğu artık geçersiz; yerine Android'in
neden bilinçli olarak suffix almadığı (§2 gerekçesi) yazılır. Yorumu silmek değil
**doğru bilgiyle değiştirmek** gerekiyor — o uyarı ileride suffix'i geri getirmek
isteyen kişinin bulması gereken bilgiyi taşıyor.

### 3.2 Test

`app.config.js` şu an test edilmiyor. Üç senaryo için saf bir birim testi eklenir
(dosya bir fonksiyon export ediyor, ağ/dosya bağımlılığı yok):

| `EXPO_PUBLIC_ENVIRONMENT` | `ios.bundleIdentifier` | `android.package` | `name` |
| --- | --- | --- | --- |
| `preview` | `com.tarodan.app.staging` | `com.tarodan.app` | `... (Staging)` |
| `production` | `com.tarodan.app` | `com.tarodan.app` | değişmez |
| `development` | `com.tarodan.app` | `com.tarodan.app` | değişmez |

Testin asıl işi ikinci sütun ile üçüncü sütunun **ayrıştığını** sabitlemek: biri
suffix alır, diğeri almaz. İleride biri "tutarlılık" adına ikisini eşitlemeye
kalkarsa test düşer ve §2'yi okur.

### 3.3 Tek seferlik keystore (elle, CI dışı)

`eas credentials -p android --profile preview` → yeni keystore üret. EAS
sunucusunda saklanır, repoya girmez (`.gitignore:18` `*.keystore`).

Bu adım **şart**: keystore yokken CI'ın `--non-interactive` build'i keystore
üretmesi gerektiğinde hata verip durur. Sırası da önemli — CI değişikliğinden
önce yapılmalı, yoksa ilk CI koşusu boşa gider.

Ardından CI'a dokunmadan lokal doğrulama: `eas build -p android --profile preview`.
Burada geçmeyen CI'da da geçmez; bir build hakkı harcayıp erken öğrenmek doğru
takas.

### 3.4 CI

`mobile-staging.yml` → `build` job'ına Android adımı **ve bir `platform` seçimi**
eklenir.

`-p all` **kullanılamaz**: iOS `staging` profilini (store dist → TestFlight),
Android `preview` profilini (apk → internal) kullanıyor. `staging` profilinde
`android` bloğu yok; oradan Android build'i alınsa `distribution: store` ile AAB
üretirdi — dağıtamayacağımız bir çıktı. Dolayısıyla iki ayrı `eas build` adımı.

**Platform seçimi.** `workflow_dispatch`'e ikinci bir input girer:

```yaml
platform:
  description: 'Which platform to build'
  required: true
  default: 'android'
  type: choice
  options: [android, ios, all]
```

Her build adımı kendi koşuluyla gizlenir (`inputs.platform` `android`/`ios` veya
`all`). iOS `submit` adımı da iOS build adımıyla aynı koşula bağlanır — build
alınmadan submit anlamsız.

**Varsayılan `android`, bilinçli.** Bugünkü ihtiyaç müşteriye APK göndermek; iOS
TestFlight'a gidecek bir şey yok ve o kota tarihsel olarak darboğaz (workflow'un
kendi yorumunda push'tan build bu yüzden kaldırılmış). Düşünmeden `-f mode=build`
diyen kişi iOS hakkı yakmaz. Karşılığı: staging TestFlight sürümü istendiğinde
`-f platform=ios` açıkça yazılmalı — `docs/RELEASE.md`'e bu not düşer.
İki platform aynı anda gerektiğinde `platform=all` zaten var; ileride varsayılanı
`all`'a çevirmek tek satır.

`build` job'ı yalnız `workflow_dispatch`'ten `mode=build` ile tetikleniyor (push
yolu `ota` veya `none` üretir), dolayısıyla `inputs.platform` bu job koştuğunda
her zaman tanımlı.

Sıra ve dayanıklılık: `platform=all` durumunda Android adımı iOS'tan **sonra**,
ama iOS adımlarının sonucundan bağımsız koşar (`!cancelled()` ile birleşik
koşul). Gerekçe kayıtlı bir vaka: 2026-08-04'te `eas submit` App Store Connect'i
53 dakika bekledi ve job kesildi — build başarılıydı. Aynı kesinti APK'yı da
götürmemeli.

Build bitince APK'nın install link'i `$GITHUB_STEP_SUMMARY`'ye yazılır
(`eas build ... --json` çıktısındaki artifact URL'i). Müşteriye gönderilecek link
job özetinde durur; EAS panelinde aramak gerekmez.

### 3.5 Dokümantasyon

`docs/RELEASE.md`'e "Müşteriye staging APK gönderme" bölümü:

- Tetikleme: `gh workflow run mobile-staging.yml --ref main -f mode=build`
  (varsayılan `platform=android`; iOS TestFlight için `-f platform=ios`, ikisi
  birden için `-f platform=all`)
- Linkin nereden alınacağı (job özeti)
- Müşteri tarafı: linki Android telefonun tarayıcısında aç → APK iner →
  "bilinmeyen kaynaktan yükleme" onayı → kurulur. Uygulama normal bir uygulama
  olarak açılır; test tarayıcıdan değil uygulama içinden yapılır.
- Güncelleme: JS-only değişiklikler OTA ile iner (`channel: staging`), APK'yı
  yeniden göndermek gerekmez. Native değişirse yeni APK şart.

## 4. Bilinçli kapsam dışı — deep link borcu

`assetlinks.json` bu turda kurulmuyor. Sonucu: APK kurulur ve tam çalışır, ama
`https://staging.tarodan.com.tr/...` linkleri **tarayıcıda açılır**, uygulamaya
sıçramaz. `tarodan://` custom scheme etkilenmez.

Pratik etkisi tek bir yerde canlı: **e-posta doğrulama ve şifre sıfırlama**.
Müşteri staging'de kayıt olur, e-postadaki linke basar, siteye gider. Kayıt akışı
uçtan uca uygulama içinden test edilemez.

Kapatmak için gereken (ayrı tur): ilk Android build'inden sonra
`eas credentials -p android` ile keystore'un SHA-256'sını al →
`com.tarodan.app` paketi ile `assetlinks.json`'a ekle →
`https://staging.tarodan.com.tr/.well-known/assetlinks.json` altında yayınla (web
deploy'u, bu repo dışı) → ikinci bir build gerekmez, doğrulama sunucu tarafında.

Suffix kararı bu borcu **ucuzlattı**: paket `com.tarodan.app` kaldığı için
staging ve prod aynı `assetlinks.json` girdisini paylaşabilir — imza parmak izi
farklıysa ikinci bir `sha256_cert_fingerprints` değeri eklemek yeter, ayrı bir
paket bloğu gerekmez.

## 5. Uygulama sırası

1. `app.config.js` + testi (kod; CI'sız doğrulanabilir)
2. `eas credentials -p android --profile preview` (elle, tek seferlik)
3. `eas build -p android --profile preview` (lokal doğrulama; 1 ve 2 doğruysa geçer)
4. `mobile-staging.yml` Android adımı (3 geçtikten sonra)
5. `docs/RELEASE.md`

1 ve 2 birbirinden bağımsız, paralel yapılabilir. 3, ikisini birden doğrulayan
kapı — geçmeden 4'e geçilmez.

## 6. Doğrulama

- `npx tsc --noEmit` — takip edilen taban dışında yeni hata yok
- `pnpm --filter @tarodan/mobile test` — yeni `app.config` testi dahil yeşil
- `eas build -p android --profile preview` — APK üretir, install link verir
- APK gerçek bir Android cihaza kurulur, açılır, staging API'ye bağlanır
  (`EXPO_PUBLIC_API_URL` = `https://staging.tarodan.com.tr/api`)
- Google ile giriş çalışır (§2'deki sessiz başarısızlığın olmadığının kanıtı)
- `gh workflow run mobile-staging.yml -f mode=build` — yalnız Android koşar
  (iOS adımları atlanır, hiçbir iOS build hakkı yanmaz) ve APK install link'i job
  özetinde belirir
