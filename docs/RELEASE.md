# Tarodan Mobile — Yayın Süreci

Mobil uygulamanın nasıl yayınlandığı: dallar, staging/production/hotfix akışı,
onaylar ve Android durumu. Workflow'lar: `mobile-staging.yml`,
`mobile-production.yml`, `master-flow.yml`, `ci.yml`. Ortak mantık:
`scripts/ci/release.sh`.

## Dallar

| Dal           | Rol                                              | Nasıl girilir                                       |
| ------------- | ------------------------------------------------ | --------------------------------------------------- |
| `development` | Varsayılan dal; **staging**                      | Doğrudan push serbest (PR de olur)                  |
| `master`      | **Production**                                   | Yalnız PR ile, yalnız `development` ya da `hotfix/*` dalından |
| `hotfix/*`    | Production'a acil düzeltme                       | `master`'dan açılır, PR ile `master`'a girer        |

`master` koruması `master-flow.yml` içindeki **`Master source guard`** check'iyle
sağlanır: kaynak dal `development` ya da `hotfix/*` değilse (ya da PR bir fork'tan
geliyorsa) check kırmızı olur. Ruleset'te `master` için zorunlu check olarak
tanımlı olmalı. Workflow `pull_request_target` ile tetiklenir: dosya PR'dan değil
**master'dan** okunur, PR guard'ı değiştiremez (job PR kodunu checkout etmez,
dal adını yalnız `env` ile okur). Bu yüzden guard, `master-flow.yml` master'a
girdikten sonra devreye girer.

## Uygulamalar

| Ortam       | iOS                                                 | Android                                                   | API                       | EAS profili / kanalı |
| ----------- | --------------------------------------------------- | --------------------------------------------------------- | ------------------------- | -------------------- |
| Production  | **Tarodan** `com.tarodan.app`                       | `com.tarodan.app` (Play, internal track)                  | `tarodan.com.tr`          | `production` / `production` |
| Staging     | **Tarodan (Staging)** `com.tarodan.app.staging`     | `com.tarodan.app.staging` (ayrı Play uygulaması, internal testing) | `staging.tarodan.com.tr`  | `staging` / `staging` |
| Ad-hoc APK  | —                                                   | `preview` profili, EAS internal distribution (Play'siz)  | `staging.tarodan.com.tr`  | `preview` / `staging` |

`.staging` kimliği `app.config.js`'te `EXPO_PUBLIC_ENVIRONMENT=preview` iken eklenir.
Android'in `.staging` paketi ve `eas.json`'daki `staging` Android profili /
`submit.staging.android` ayrı bir işte (`parity/android-release`) geliyor; bu
hat onları varsayar.

## Temel kural: native mi, JS mi? → fingerprint

`app.json` → `runtimeVersion.policy: "fingerprint"`. Her binary'nin
`runtimeVersion`'ı, onu üreten native girdilerin özetidir. Bir OTA yalnız
**aynı** runtimeVersion'lı binary'lere iner.

Workflow her yayın öncesi, platform başına:

1. `EXPO_PUBLIC_ENVIRONMENT=<preview|production> npx expo-updates fingerprint:generate --platform <ios|android>`
   ile commit'in fingerprint'ini hesaplar (`release.sh fingerprint`; env
   `eas.json`'daki profilden yüklenir).
2. `release.sh build-state`: `eas build:list --runtime-version <fp> --json` ve
   gerekirse `eas submit:list --json` ile bu runtime'ın binary durumunu okur:
   - **available** — bitmiş **ve** gönderimi başarılı (TestFlight / Play) build;
     gönderim gerektirmeyen `preview` APK'sı için bitmiş olması yeter → **OTA**
   - **pending** — kuyrukta / derleniyor / bitti ama gönderimi sürüyor →
     **bekle**: OTA yok (binary henüz yok), ikinci build de yok; uyarı basar
   - **none** — hata, iptal, gönderimi başarısız ya da hiç gönderilmemiş →
     **build**
   Belirsiz her şey (tanınmayan CLI JSON'u dahil) "binary var" sayılmaz.
3. Build kararı otomatikse iki koruma uygulanır (aşağıda "Build korumaları").

Fingerprint'e girenler (doğrulandı): `app.config.js`'in **çıktısı**
(çözümlenmiş expo config — `.staging` kimliği dahil; app.config.js'te çıktıyı
değiştirmeyen düzenleme build tetiklemez), `app.json` alanları — **`expo.version`
dahil**, `eas.json`, config plugin'leri (`plugins/`), native autolinking,
`package.json` script'leri, ikon/splash dosyaları. Sonuç:

- **`expo.version` artışı her zaman yeni build'dir.**
- **`eas.json`'daki her değişiklik** (yalnız `submit` bloğu bile) yeni build'dir.
- JS/TS, i18n, görseller (config'te referanslanmayanlar) → OTA.

Platformlar ayrı değerlendirilir: aynı push'ta iOS OTA alırken Android build
alabilir.

## Staging — `development`'a push (tam otomatik)

`mobile-staging.yml`:

```
ci (lint + tsc + test)
  └─ plan  (fingerprint → OTA mı build mi, platform başına)
       ├─ ota            eas update --branch staging --platform <OTA'lık platformlar>
       ├─ build-ios      eas build --profile staging -p ios → eas submit --profile staging --id <build>
       │                 → Tarodan (Staging), TestFlight
       └─ build-android  eas build --profile staging -p android (AAB)
                         → eas submit --profile staging --id <build> → Play internal testing
                         (yalnız vars.ANDROID_RELEASE_ENABLED == 'true')
```

- CI kırmızıysa hiçbir şey yayınlanmaz. `docs/**`, `*.md`, `maestro/**`,
  `.github/**` değişiklikleri yayın tetiklemez.
- **Concurrency:** hiçbir yayın adımı yeni bir push'la iptal edilmez. OTA job'u
  platform başına bir matrix job'udur; kuyruğu **platform + runtime** başınadır
  (`mobile-staging-ota-<platform>-<fp>`): başka runtime'ın ya da diğer
  platformun push'u bekleyen OTA'yı düşürmez, aynı runtime'ın OTA'ları sırayla
  çıkar (GitHub, aynı kuyrukta bekleyen ikinci işi üçüncüsü gelince düşürür — o
  da aynı runtime'ın daha yeni kodudur). Başlamış bir **build/submit asla iptal
  edilmez**. Build job'ı kilidi
  aldıktan sonra yeniden sorgular (`release.sh recheck`); arada aynı runtime
  için gönderilmiş bir binary oluştuysa build yerine OTA yayınlar, build hâlâ
  sürüyorsa hiçbir şey yapmaz.
- **Ref koruması:** elle tetikleme yalnız `development`'ta; `mode=apk` ayrıca
  `vars.STAGING_APK_BRANCHES`'teki dallardan (bkz. aşağı).
- Submit `--latest` ile değil **build id** ile yapılır (paralel biten başka
  profilin build'i yanlış uygulamaya gönderilemez).
- Android kapalıyken (`ANDROID_RELEASE_ENABLED` yok): Android native değişikliği
  build almaz (notice basar); mevcut ad-hoc APK'lar için JS değişikliği yine OTA
  olarak yayınlanır.

### Build korumaları (otomatik build'den önce)

- **Günlük kota (staging):** ücretsiz plan iOS'ta ayda 15 build veriyor. Bugün
  (UTC) o profil için `vars.STAGING_MAX_BUILDS_PER_DAY` (varsayılan **2**)
  build alınmışsa build alınmaz, uyarı yazılır (OTA da çıkmaz: binary yok).
  Elle `mode=build` sınırı atlar.
- **Fingerprint döngüsü (her ortam):** CI, build mesajına `ci-fp:<fingerprint>`
  damgalar. EAS'in hesapladığı runtime farklıysa build job'u uyarır; son 2 CI
  build'inde art arda farklıysa plan o platformu **blocked** yapar. Aksi halde
  her push "bu runtime için binary yok" görüp sonsuz build döngüsüne girerdi.
  Sebebi giderip `mode=build` ile elle alın.
- **Paket doğrulaması (Android):** build'den önce profil env'iyle
  `npx expo config` çözümlenir; staging `com.tarodan.app.staging`, production
  `com.tarodan.app` değilse durur. Gönderimden önce bitmiş build'in
  `appIdentifier`'ı da kontrol edilir (eas submit Play uygulamasını paket
  adından seçer).
- **OTA env doğrulaması:** `eas update` öncesi `EXPO_PUBLIC_ENVIRONMENT`,
  `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL` dolu ve https olmalı; production
  OTA'sı `production` env'i ister ve staging/yerel adrese bakamaz; profilin
  kanalı OTA dalıyla aynı olmalı.

### Elle tetikleme

```bash
gh workflow run mobile-staging.yml --ref development                      # mode=auto: push ile aynı karar
gh workflow run mobile-staging.yml --ref development -f mode=ota -f platform=ios
gh workflow run mobile-staging.yml --ref development -f mode=build -f platform=ios
gh workflow run mobile-staging.yml --ref development -f mode=apk          # ad-hoc Android APK
```

### Ad-hoc staging APK (Play'siz bir testçiye link)

`mode=apk` yalnız elle çalışır, `preview` profiliyle EAS internal distribution
APK'sı üretir ve job özetine **"Staging APK hazır"** bloğuyla kurulum sayfası
linkini yazar. Play'e bağlı olmadığı için `ANDROID_RELEASE_ENABLED`'a bağlanmadı.
`development` dışındaki bir daldan APK almak için dalı (glob olabilir)
`vars.STAGING_APK_BRANCHES`'e (boşlukla ayrılmış, ör. `development feature/*`)
**ve** `staging` environment'ının deployment-branch kuralına ekleyin.
Testçi linki Android tarayıcısında açar, APK iner, "bilinmeyen kaynaktan yükleme"
onayıyla kurulur. Sonraki JS değişiklikleri bu APK'ya da OTA ile iner (kanal
`staging`, aynı runtime olduğu sürece).

## Production — `master`'a merge

`mobile-production.yml`, staging ile aynı mantık, `production` profiliyle
(`EXPO_PUBLIC_ENVIRONMENT=production`, `com.tarodan.app`):

```
ci
  └─ plan  (fingerprint vs production build'leri + VERSION-GATE)   ← environment: production-build
       ├─ ota            eas update --branch production      ← environment: production (ONAY)
       │                 (platform başına matrix; kuyruk platform + runtime başına)
       ├─ build-ios      eas build --profile production -p ios → eas submit --profile production
       └─ build-android  eas build --profile production -p android (AAB)
                         → eas submit --profile production (track: internal)
                         (yalnız vars.ANDROID_RELEASE_ENABLED == 'true')
```

### Native değiştiyse: sürüm artmış olmalı (VERSION-GATE)

Production build'i gerekiyorsa `app.json` → `expo.version`, **son bitmiş
production build'inin `appVersion`'ından büyük** olmalı (`sort -V`). Değilse o
platform **blocked** olur ve şu tür bir hata basılır. Kapı **platform başınadır**:
iOS'un kapısı takılırsa Android'in OTA'sı yine çıkar (ve tersi); koşu sonda
kırmızı olur:

> `ios: native değişti (…) ama app.json expo.version (1.0.6) son production
> build'inin sürümünden (1.0.6) büyük değil. Bu merge'de expo.version'ı artır …`

Kıyas push tabanıyla değil son production build'iyle yapılır; böylece iptal
edilmiş bir önceki koşu ya da çok commit'li bir merge kapıyı yanıltamaz.
`workflow_dispatch -f mode=build` kapıyı yalnız uyarıya çevirir (bilinçli insan
kararı: ör. aynı sürümün build'ini yeniden almak). Build numarası EAS'te otomatik
artar (`appVersionSource: remote`); `ios.buildNumber`'a dokunma.

### iOS: inceleme elle

`eas submit` build'i App Store Connect'e yükler (TestFlight'ta görünür).
**App Store incelemesine gönderim (Submit for Review) App Store Connect'te ELLE
yapılır** — workflow bunu yapmaz.

### JS değiştiyse: onaylı OTA

`ota` job'ı `environment: production` taşır. GitHub Environment `production`
(Settings → Environments) required reviewer'larla korunur; onay verilmeden OTA
çıkmaz. Onay **yalnız** burada istenir (plan ve store build'leri onaysız
`production-build` environment'ında). İki platform için iki job beklerse tek
"Review deployments" onayı ikisini de açar. Daha yeni bir master push'u, başka
bir runtime'ın ya da platformun onay bekleyen OTA'sını **iptal etmez**.

### Elle tetikleme

```bash
gh workflow run mobile-production.yml --ref master                     # mode=auto
gh workflow run mobile-production.yml --ref master -f mode=ota          # onay ister
gh workflow run mobile-production.yml --ref master -f mode=build -f platform=ios
```

Başka bir ref'ten tetiklenirse `plan` durur (`release.sh guard-ref`; ayrıca
`production-build` / `production` environment'ları yalnız master'a açık).

### Sürüm akışı (özet)

1. `development`'ta `app.json` `expo.version`'ı artır (ör. `1.0.6` → `1.0.7`).
   Bu staging'de de yeni bir build demektir (sürüm fingerprint'e girer).
2. `development` → `master` PR'ı aç; CI + `Master source guard` yeşil olunca merge et.
3. `mobile-production.yml` build + submit'i yapar.
4. App Store Connect'te build'i test et, **incelemeye elle gönder**.

## Hotfix

1. `master`'dan `hotfix/<ad>` dalı aç, düzeltmeyi yap.
2. `hotfix/<ad>` → `master` PR'ı aç (guard izin verir), merge et. Production
   yukarıdaki gibi davranır (native ise sürümü artırmayı unutma).
3. Merge sonrası `master-flow.yml` → **`Hotfix back-merge PR (master → development)`**
   job'ı master'ın merge commit'inden `backmerge/<ad>-<PR no>` dalını açar ve
   `development`'a PR açar. **Çakışma olsa da PR açılır**; çakışmayı o dalda
   çöz (`git merge origin/development`), sonra merge et. development zaten
   düzeltmeyi içeriyorsa PR açılmaz.
   - `GITHUB_TOKEN` ile açılan PR'lar workflow tetiklemez: CI için PR'ı
     kapatıp yeniden aç ya da dala bir commit at.

## Android durumu

> Android'in iki uygulamalı modeli (Tarodan `com.tarodan.app` / Tarodan (Staging)
> `com.tarodan.app.staging`), Play kurulumu, Firebase/FCM, keystore, Google girişi ve
> assetlinks adımları ile kimin yapacağı: [`docs/ANDROID_RELEASE.md`](./ANDROID_RELEASE.md).

**Hazır ama kapalı.** Tüm Android build/submit job'ları (staging ve production)
yalnız repo değişkeni `ANDROID_RELEASE_ENABLED` = `true` iken çalışır. Açmadan önce:

1. Play Console hesabı; iki uygulama: `com.tarodan.app` ve `com.tarodan.app.staging`.
2. Google Play service account JSON'u EAS'e yüklenmiş olmalı (`eas credentials -p android`).
3. Her iki uygulama için **ilk AAB elle yüklenmeli** (Play API ilk yüklemeyi kabul etmez).
4. `eas.json`: `staging` profiline Android bloğu ve `submit.staging.android`
   (`track: internal`) — `parity/android-release` işi.
5. `.staging` paketi için Firebase (FCM, `google-services.json`) ve Google Cloud
   OAuth Android client kaydı (aşağıdaki Google sign-in notu).

Sonra: `gh variable set ANDROID_RELEASE_ENABLED --body true`.

**Production'a yükseltme Play Console'da ELLE.** Workflow yalnız `internal`
track'e gönderir. Hesap **kişisel** olduğu için Google, production erişiminden
önce **en az 12 testçiyle 14 gün kesintisiz kapalı test** şartı koyar; bu süre
dolmadan production track'e geçilemez.

## Gereken secret, değişken ve environment'lar

`EXPO_TOKEN` **repo düzeyinde tutulmaz**; her GitHub Environment kendi
`EXPO_TOKEN` secret'ını taşır ve token isteyen her job bir environment'a
bağlıdır. Başka bir daldaki workflow ya da environment'sız bir job token'a
ulaşamaz; production OTA onayı atlanamaz.

| Environment        | Deployment branch                          | Onay        | Kullanan job'lar |
| ------------------ | ------------------------------------------ | ----------- | ---------------- |
| `staging`          | `development` (+ `vars.STAGING_APK_BRANCHES`) | yok      | staging plan / ota / build-ios / build-android / apk, `mobile-build.yml` |
| `production-build` | yalnız `master`                            | yok         | production plan, build-ios, build-android (store build + submit) |
| `production`       | yalnız `master`                            | **required reviewers** | yalnız production `ota` |

| Ad                                 | Tür                         | Kullanan                                  |
| ---------------------------------- | --------------------------- | ----------------------------------------- |
| `EXPO_TOKEN`                       | **Environment secret** (yukarıdaki üçünde de) | EAS job'ları. Yoksa o job no-op |
| `ANDROID_RELEASE_ENABLED`          | Repo variable (`true` ile açılır) | Android build/submit job'ları        |
| `STAGING_MAX_BUILDS_PER_DAY`       | Repo variable (isteğe bağlı, varsayılan 2) | Staging otomatik build kotası |
| `STAGING_APK_BRANCHES`             | Repo variable (isteğe bağlı, varsayılan `development`) | Ad-hoc APK'nın izinli dalları |
| App Store Connect API key          | EAS sunucusunda (`eas credentials`) | `eas submit` iOS                  |
| Google Play service account JSON   | EAS sunucusunda (`eas credentials`) | `eas submit` Android              |
| "Allow GitHub Actions to create and approve pull requests" | Repo ayarı (Settings → Actions → General) | Hotfix back-merge PR'ı |

> ⚠️ Workflow'da adı geçen bir environment yoksa GitHub onu **korumasız**
> oluşturur. Üç environment'ı (branch kuralı + `production` onayı) bu workflow'lar
> `development`/`master`'a girmeden ÖNCE kurun. Repo düzeyinde `EXPO_TOKEN`
> dururken environment secret'ı eksik olan job sessizce repo secret'ına düşer
> (öncelik: environment > repo > organization) ve izolasyon olmaz — repo
> secret'ını environment secret'ları kurulduktan hemen sonra silin.
>
> Expo token'ları kanal bazında yetki taşımaz: `staging` token'ı da EAS'te
> production'a OTA yayınlayabilir. GitHub tarafı production token'larını master
> dışındaki koda vermez; `staging` token'ına `development`'a push edebilen herkes
> ulaşabilir. Her environment için ayrı bir Expo robot hesabı/token'ı kullanın
> (iptal ve denetim ayrı olsun).

Submit kimlik bilgileri EAS sunucularında durur, repoya girmez. Ayrıntı:
[`SECRETS_SETUP.md`](../SECRETS_SETUP.md), OTA: [`EAS_UPDATE_OTA.md`](./EAS_UPDATE_OTA.md).

## Kopya kağıdı

```
JS düzeltmesi → staging          development'a push (otomatik OTA)
Native değişiklik → staging      development'a push (otomatik build + TestFlight/Play internal)
Ad-hoc APK                       gh workflow run mobile-staging.yml --ref development -f mode=apk
Production sürümü                expo.version artır → development → master PR → merge
                                 → App Store Connect'te incelemeye ELLE gönder
JS düzeltmesi → production       development → master PR → merge → production environment onayı
Acil düzeltme                    hotfix/<ad> → master PR → merge → otomatik back-merge PR'ını merge et
```

---

## Bilinen açıklar (Android / Google)

**Deep links (staging).** `assetlinks.json` staging domaini için yayında değil;
`https://staging.tarodan.com.tr/...` linkleri uygulama yerine tarayıcıda açılır
(`tarodan://` linkleri çalışır). E-posta doğrulama / şifre sıfırlama akışı bu
yüzden uygulama içinde uçtan uca test edilemez. Kapatmak için imza anahtarının
SHA-256'sı (`eas credentials -p android`) web tarafında `assetlinks.json`'a
eklenmeli — rebuild gerekmez. Bkz. [`deep-links.md`](./deep-links.md).

**Google sign-in (Android).** Projeden henüz Android release'i çıkmadı; imza
anahtarının SHA-1'i hiçbir yerde kayıtlı değil. Buton görünür ama dokununca
`DEVELOPER_ERROR` (kod 10) verir: `@react-native-google-signin`, paket adı **ve**
SHA-1 ile eşleşen bir Android OAuth client ister. Her paket (`com.tarodan.app`,
`com.tarodan.app.staging`) için ayrı client kaydı gerekir; aynı komutun SHA-256
çıktısı deep-links açığını da kapatır.

**Sunucu tarafı — Google sign-in audience.** API, gelen `idToken`'ı
`GOOGLE_CLIENT_ID_WEB`, `GOOGLE_CLIENT_ID_IOS`, `GOOGLE_CLIENT_ID_ANDROID`'den
kurulan bir audience listesine karşı doğrular (tanımsız olanlar sessizce düşer).
Uygulama `webClientId`'yi native SDK'ya `serverClientID` olarak verdiği için
token'ın `aud`'u **web** client ID'sidir (`243308404313-kdc77bd36…`). Bu ID
2026-09-07'de API ortamına eklendi (`GOOGLE_CLIENT_ID_ANDROID` slotu). Belirti
yanıltıcıdır: Google akışı başarılı olur, sonra `POST /auth/google` 401 döner
("kod: `ERR_BAD_REQUEST`"); API logu
`Wrong recipient, payload audience != requiredAudience` der. Ortam değişikliği
için konteyner **yeniden deploy** edilmeli (restart yetmez). Üç Google Cloud
projesi hâlâ kullanımda (web `1048836099670`, mobil `243308404313`,
`google-services.json` `575470440212`); birleştirmek güvenli (hesap eşleşmesi
Google `sub`'ına bağlı).
