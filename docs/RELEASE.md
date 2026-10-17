# Tarodan Mobile — Yayın Süreci

Mobil uygulamanın nasıl yayınlandığı: dallar, staging/production/hotfix akışı,
onaylar ve Android durumu. Workflow'lar: `mobile-staging.yml`,
`mobile-production.yml`, `master-flow.yml`, `ci.yml`. Ortak mantık:
`scripts/ci/release.sh`.

## Dallar

| Dal           | Rol                                                                 | Nasıl girilir                                                 |
| ------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `development` | Varsayılan dal; **staging**                                         | Doğrudan push serbest (PR de olur)                            |
| `master`      | **Production** — `development`'tan merge = yeni sürüm (store build) | Yalnız PR ile, yalnız `development` ya da `hotfix/*` dalından |
| `hotfix/*`    | Production'a acil düzeltme (JS ise onaylı OTA)                      | `master`'dan açılır, PR ile `master`'a girer                  |

`master` koruması `master-flow.yml` içindeki **`Master source guard`** check'iyle
sağlanır: kaynak dal `development` ya da `hotfix/*` değilse (ya da PR bir fork'tan
geliyorsa) check kırmızı olur. Ruleset'te `master` için zorunlu check olarak
tanımlı olmalı. Workflow `pull_request_target` ile tetiklenir: dosya PR'dan değil
**master'dan** okunur, PR guard'ı değiştiremez (job PR kodunu checkout etmez,
dal adını yalnız `env` ile okur). Bu yüzden guard, `master-flow.yml` master'a
girdikten sonra devreye girer.

## Uygulamalar

| Ortam      | iOS                                             | Android                                                            | API                      | EAS profili / kanalı        |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------ | ------------------------ | --------------------------- |
| Production | **Tarodan** `com.tarodan.app`                   | `com.tarodan.app` (Play, internal track)                           | `tarodan.com.tr`         | `production` / `production` |
| Staging    | **Tarodan (Staging)** `com.tarodan.app.staging` | `com.tarodan.app.staging` (ayrı Play uygulaması, internal testing) | `staging.tarodan.com.tr` | `staging` / `staging`       |
| Ad-hoc APK | —                                               | `preview` profili, EAS internal distribution (Play'siz)            | `staging.tarodan.com.tr` | `preview` / `staging`       |

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
     ikinci build **yok**. Staging'de **OTA yine çıkar**, ama o build'in
     derlemesi bitene kadar bekleyip (`release.sh await-binary`, en çok 75 dk;
     TestFlight/Play gönderimi beklenmez, geçici EAS hatası yeniden denenir) yayınlanır:
     expo-updates bir güncellemeyi yalnız zaman damgası (commitTime) gömülü
     JS'inkinden yeniyse uygular, build anından önce yayınlanan bir OTA o build'e
     inmezdi. Production'da **bekle**: OTA onaylıdır, binary'si henüz olmayan
     runtime'a onay istenmez; uyarı basar.
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
  için bir build başladıysa ya da gönderildiyse ikinci build almaz, OTA yayınlar
  (build sürüyorsa önce onun bitmesini bekler). Böylece build sürerken gelen bir
  push'un JS'i de testçilere ulaşır.
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

`mobile-production.yml`, `production` profiliyle (`EXPO_PUBLIC_ENVIRONMENT=production`,
`com.tarodan.app`). master'a yalnız PR ile ve yalnız iki daldan girilir; **hangi
daldan geldiği ne olacağını belirler**:

| Merge                                     | Ne olur                                                                                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`development` → `master` (sürüm)**      | **Her zaman store build'i** (iOS → App Store Connect, Android → Play internal). `expo.version` artırılmamışsa build alınmaz, koşu kırmızı olur. Yalnız JS değişmiş olsa da production OTA'sı **çıkmaz**. |
| **`hotfix/*` → `master` (acil düzeltme)** | Yalnız JS değiştiyse **onaylı OTA** hazırlanır (senin onayın olmadan çıkmaz). Native değiştiyse store build'i (sürüm artmış olmalı).                                                                     |

```
ci
  └─ plan  (kaynak dal → sürüm mü hotfix mi; fingerprint + VERSION-GATE)   ← environment: production-build
       ├─ ota            eas update --branch production      ← environment: production (ONAY)
       │                 (yalnız hotfix ya da elle mode=ota; platform başına matrix)
       ├─ build-ios      eas build --profile production -p ios → eas submit --profile production
       └─ build-android  eas build --profile production -p android (AAB)
                         → eas submit --profile production (track: internal)
                         (yalnız vars.ANDROID_RELEASE_ENABLED == 'true')
```

Kaynak dal, merge commit'inin PR'ından okunur (`gh api repos/…/commits/<sha>/pulls`).
Okunamazsa merge **sürüm** sayılır: güvenli taraf, OTA hazırlanmaz; bir hotfix en
kötü ihtimalle "sürümü artır" hatasıyla durur ve elle `mode=ota` ister.

### Sürüm artmış olmalı (VERSION-GATE)

Store build'i alınacaksa `app.json` → `expo.version`, **son bitmiş production
build'inin `appVersion`'ından büyük** olmalı (`sort -V`). Değilse o platform
**blocked** olur, ne build ne OTA çıkar ve hata ne yapılacağını söyler. Kapı
**platform başınadır** (hotfix'te iOS'un kapısı takılırsa Android'in OTA'sı yine
çıkar, ve tersi); koşu sonda kırmızı olur:

> `ios: sürüm merge'ü (kaynak: development) ama app.json expo.version (1.0.6) son
production build'inin sürümünden (1.0.6) büyük değil — store build ALINMADI …`

Çıkış yolları (hata mesajında da yazar):

- **Yeni sürüm:** `development`'ta `expo.version`'ı artır, yeni PR aç.
- **Aynı sürümün yeni build'i** (ör. App Review reddetti, sürüm henüz yayınlanmadı):
  `gh workflow run mobile-production.yml --ref master -f mode=build -f platform=ios`
  (`mode=build` kapıyı yalnız uyarıya çevirir).
- Merge yalnız uygulamaya girmeyen dosyaları değiştirdiyse hata yok sayılabilir
  (salt test/CI/belge merge'leri zaten koşu başlatmaz, bkz. `paths-ignore`).

> ⚠️ Kapı takıldığında master **yayınlanmamış kod** taşır. Bu durumda master'dan
> çıkan her OTA (`hotfix/*` merge'ü ya da `mode=ota`) o kodu da canlıya götürür.
> Önce sürümü artırıp merge'ü tamamla.

Koşu yeniden çalıştırılırsa (ör. bir platform takıldı → "Re-run"), o commit'in
kendi aldığı build kıyasa girmez: zaten gönderilmiş platform `skip` olur, yanlış
"sürüm artmadı" hatası çıkmaz.

Kıyas push tabanıyla değil son production build'iyle yapılır; böylece iptal
edilmiş bir önceki koşu ya da çok commit'li bir merge kapıyı yanıltamaz. Build
numarası EAS'te otomatik artar (`appVersionSource: remote`), sürüm değişse de
sıfırlanmaz; `ios.buildNumber`'a dokunma.

### iOS: inceleme elle

`eas submit` build'i App Store Connect'e yükler (TestFlight'ta görünür).
**App Store incelemesine gönderim (Submit for Review) App Store Connect'te ELLE
yapılır** — workflow bunu yapmaz.

### Production OTA: yalnız hotfix, yalnız onayla

`ota` job'ı `environment: production` taşır. GitHub Environment `production`
(Settings → Environments) required reviewer'larla korunur; onay verilmeden OTA
çıkmaz. Onay **yalnız** burada istenir (plan ve store build'leri onaysız
`production-build` environment'ında). OTA job'u yalnız `hotfix/*` merge'ünde ya
da elle `mode=ota` ile oluşur; sürüm merge'ü onu hiç oluşturmaz. İki platform
için iki job beklerse tek "Review deployments" onayı ikisini de açar. Daha yeni
bir master push'u, başka bir runtime'ın ya da platformun onay bekleyen OTA'sını
**iptal etmez**.

**Gönderilmiş ≠ yayınlanmış.** OTA yalnız aynı runtime'lı binary'ye iner; plan
"binary var" derken App Store Connect / Play'e **gönderilmiş** build'i kastediyor.
master'a yeni bir sürüm merge edilip henüz mağazada yayınlanmadıysa (ör.
incelemede), master'dan çıkan hotfix OTA'sı yalnız o yeni sürüme iner; canlıdaki
önceki sürümün kullanıcıları düzeltmeyi **almaz** (plan bunu uyarı olarak yazar).
O arada acil bir canlı düzeltme gerekiyorsa yol yeni sürümün yayınlanmasıdır
(gerekirse App Store'dan hızlandırılmış inceleme istenir).

### Elle tetikleme

```bash
gh workflow run mobile-production.yml --ref master                     # mode=auto: SÜRÜM kuralı
gh workflow run mobile-production.yml --ref master -f mode=ota          # acil JS düzeltmesi, onay ister
gh workflow run mobile-production.yml --ref master -f mode=build -f platform=ios
```

Başka bir ref'ten tetiklenirse `plan` durur (`release.sh guard-ref`; ayrıca
`production-build` / `production` environment'ları yalnız master'a açık).

### Sürüm numarası: development hep bir sonraki sürümü taşır

Canlıda 1.2.3 varken staging'de yapılan her şey **1.2.4**'tür; testçi TestFlight'ta
"1.2.4 (n)" görür ve canlıdakiyle karıştırmaz. Build numarası ayrıdır, EAS'te
otomatik artar ve sürüm değişince sıfırlanmaz.

| Sürüm parçası                     | Ne zaman                         | Kim                                              |
| --------------------------------- | -------------------------------- | ------------------------------------------------ |
| Yama (1.2.**4**)                  | Her yayından sonra               | **Otomatik** (aşağıda)                           |
| Ara (1.**3**.0) / ana (**2**.0.0) | Özellik grubu / büyük değişiklik | Elle: development'ta `app.json` → `expo.version` |

### Yayın sonrası (otomatik): etiket, sürüm notu, sonraki sürüm

`release-bookkeeping` job'ı, master'dan bir store build'i başarıyla
gönderildiğinde (sürüm ya da sürümü artırılmış hotfix) koşar:

1. Yayınlanan commit'e **`v<sürüm>`** git etiketi atar (`v1.2.4`). "Canlıda hangi
   kod var?" sorusunun cevabı ve hotfix'in başlayacağı nokta budur. Aynı sürümün
   ikinci build'inde (ör. App Review reddi sonrası `mode=build`) etiket taşınmaz.
2. PR başlıklarından üretilmiş notlarla bir **GitHub Release** açar (depo herkese
   açık olduğu için Release'ler de açıktır).
3. development'ın sürümü yayınlananınkinden büyük değilse onu **bir sonraki
   yamaya** çeker (`release.sh bump-version`; 1.2.4 → 1.2.5), development'a
   `chore(release): development 1.2.5 (1.2.4 yayına gönderildi)` commit'ini atar ve
   staging'i başlatır (sürüm fingerprint'e girer → yeni staging build'i). Elle
   verilmiş daha büyük bir sürüme (1.3.0) dokunmaz.

Yalnız OTA olan hotfix'ler, takılan (blocked) ya da build'i başarısız koşular bu
adımı tetiklemez. Adım tekrar çalıştırılabilir: etiket/Release varsa ve
development zaten ilerideyse hiçbir şey yapmaz.

### Sürüm akışı (özet)

1. development zaten bir sonraki sürümdedir (otomatik). Ara/ana sürüm istiyorsan
   `app.json` → `expo.version`'ı elle değiştir (ör. `1.2.5` → `1.3.0`).
2. `development` → `master` PR'ı aç; CI + `Master source guard` yeşil olunca merge et.
3. `mobile-production.yml` iOS ve (açıksa) Android store build'ini alıp gönderir;
   ardından etiketi, Release'i ve development'ın sonraki sürümünü ayarlar.
4. App Store Connect'te build'i test et, **incelemeye elle gönder**; Play'de
   internal'dan ileri kanallara **elle** terfi et.

## Hotfix

1. `master`'dan `hotfix/<ad>` dalı aç, düzeltmeyi yap.
2. `hotfix/<ad>` → `master` PR'ı aç (guard izin verir), merge et. Yalnız JS
   değiştiyse production OTA'sı hazırlanır ve **onayını bekler** (Actions →
   koşu → "Review deployments"). Native değiştiyse sürümü artır; store build'i alınır.
   OTA, master'daki sürümün binary'sine iner: master'da henüz yayınlanmamış bir
   sürüm varsa canlı kullanıcılara ulaşmaz (yukarıda "Gönderilmiş ≠ yayınlanmış").
   Hotfix sürümü artırdıysa (ör. 1.2.5) ve development de 1.2.5'teyse, yayın
   sonrası adım development'ı 1.2.6'ya çeker; back-merge PR'ında `app.json`
   sürüm satırı çakışırsa **development'ınkini (büyük olanı)** tut.
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

**Kod hazır, değişkenle kapalı.** Tüm Android build/submit job'ları (staging ve
production) yalnız repo değişkeni `ANDROID_RELEASE_ENABLED` = `true` iken çalışır;
açıldığında Android, iOS ile **aynı kuralları** izler (staging: her development
push'u OTA ya da build; production: sürüm merge'ü store build'i, hotfix onaylı OTA).
Kodda yapılmış olanlar: `staging`/`production` AAB profilleri,
`submit.{staging,production}.android` (`track: internal`), paket doğrulaması
(staging Play uygulamasına production paketi gidemez, tersi de), staging
`google-services.staging.json`, staging keystore. Açmadan önce (ayrıntı
[`ANDROID_RELEASE.md`](./ANDROID_RELEASE.md) Bölüm 4 ve 12):

1. Play Console'da iki uygulama: `com.tarodan.app` ve `com.tarodan.app.staging`.
2. Google Play service account JSON'u EAS'e, **iki paket için de** (`eas credentials -p android`).
3. Her iki uygulama için **ilk AAB elle yüklenip internal testing'de yayınlanmalı**
   (Play API ilk sürümü oluşturamaz; taslak uygulamaya `completed` sürüm gönderilemez).
4. FCM V1 anahtarları (production paketi için de).

Sonra: `gh variable set ANDROID_RELEASE_ENABLED --body true`.

Açıldıktan sonraki ilk development push'u (native değişiklik olmasa da) bir
staging AAB'si alıp Play internal'a gönderir: elle yüklenen ilk AAB EAS üzerinden
gönderilmediği için "binary var" sayılmaz. Ad-hoc APK kullanan testçiler APK'yı
**kaldırıp** Play'den kurmalı: Play'in imzası (Play App Signing) APK'nınkinden
farklı olduğu için üstüne güncellenemez.

**Production'a yükseltme Play Console'da ELLE.** Workflow yalnız `internal`
track'e gönderir. Hesap **kişisel** olduğu için Google, production erişiminden
önce **en az 12 testçiyle 14 gün kesintisiz kapalı test** şartı koyar; bu süre
dolmadan production track'e geçilemez.

## Gereken secret, değişken ve environment'lar

`EXPO_TOKEN` **repo düzeyinde tutulmaz**; her GitHub Environment kendi
`EXPO_TOKEN` secret'ını taşır ve token isteyen her job bir environment'a
bağlıdır. Başka bir daldaki workflow ya da environment'sız bir job token'a
ulaşamaz; production OTA onayı atlanamaz.

| Environment        | Deployment branch                             | Onay                   | Kullanan job'lar                                                         |
| ------------------ | --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `staging`          | `development` (+ `vars.STAGING_APK_BRANCHES`) | yok                    | staging plan / ota / build-ios / build-android / apk, `mobile-build.yml` |
| `production-build` | yalnız `master`                               | yok                    | production plan, build-ios, build-android (store build + submit)         |
| `production`       | yalnız `master`                               | **required reviewers** | yalnız production `ota`                                                  |

| Ad                                                         | Tür                                                         | Kullanan                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`                                               | **Environment secret** (yukarıdaki üçünde de)               | EAS job'ları. Yoksa o job no-op                                                             |
| `ANDROID_RELEASE_ENABLED`                                  | Repo variable (`true` ile açılır)                           | Android build/submit job'ları                                                               |
| `STAGING_MAX_BUILDS_PER_DAY`                               | Repo variable (isteğe bağlı, varsayılan 2)                  | Staging otomatik build kotası                                                               |
| `STAGING_APK_BRANCHES`                                     | Repo variable (isteğe bağlı, varsayılan `development`)      | Ad-hoc APK'nın izinli dalları                                                               |
| App Store Connect API key                                  | EAS sunucusunda (`eas credentials`)                         | `eas submit` iOS                                                                            |
| Google Play service account JSON                           | EAS sunucusunda (`eas credentials`)                         | `eas submit` Android                                                                        |
| `SENTRY_AUTH_TOKEN`                                        | EAS env, `production`, **secret** visibility                | Production EAS build: source map + dSYM upload (see "Sentry source maps and debug symbols") |
| `EXPO_PUBLIC_SENTRY_DSN`                                   | EAS env, `production`, plaintext                            | Production build (and OTA once `publish-ota` loads the EAS env); without it Sentry is off   |
| `SENTRY_AUTH_TOKEN`                                        | GitHub Environment `production` secret (pending, see below) | Production OTA source map upload                                                            |
| "Allow GitHub Actions to create and approve pull requests" | Repo ayarı (Settings → Actions → General)                   | Hotfix back-merge PR'ı                                                                      |

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
[`SECRETS_SETUP.md`](./SECRETS_SETUP.md), OTA: [`EAS_UPDATE_OTA.md`](./EAS_UPDATE_OTA.md).

## Sentry source maps and debug symbols

Production crash reports are only readable when Sentry has the source maps (JS)
and dSYMs (iOS native) of the exact binary or update that crashed. How it is wired:

- `metro.config.js` uses `getSentryExpoConfig`: every bundle and its source map
  carry the same Debug ID, so Sentry matches maps to events without release/dist
  bookkeeping. This holds for EAS builds and for `eas update` bundles.
- `app.json` configures the `@sentry/react-native/expo` plugin with
  `organization: tarodan` and `project: tarodan-mobile`. The auth token is
  **never** in the repo; the plugin and `sentry-cli` read `SENTRY_AUTH_TOKEN`
  from the environment. `SENTRY_ORG` / `SENTRY_PROJECT` in the EAS environment
  override the plugin values if the Sentry slugs ever differ.
- `eas.json`: only the `production` profile uploads. `development`, `preview`,
  `staging` and `maestro` keep `SENTRY_DISABLE_AUTO_UPLOAD=true`, so a missing
  token never blocks staging.
- During a production EAS build the "Bundle React Native code and images" phase
  (iOS) and the `*_SentryUpload_*` task that `sentry.gradle` chains after the
  release JS bundle task (Android) upload the Hermes source map; the "Upload Debug
  Symbols to Sentry" phase uploads the iOS dSYMs. Android has no R8/ProGuard
  mapping today (`android.enableMinifyInReleaseBuilds` is off), so there is
  nothing else to upload there.

**Fail-safe.** On an EAS build worker (`EAS_BUILD`), `app.config.js`
(`assertSentryBuildReady`) stops the build while the config is read when upload
is on and `SENTRY_AUTH_TOKEN` is missing, and on any production build when
`EXPO_PUBLIC_SENTRY_DSN` is missing. A production build that uploads also stops
when `sentry-cli` would run in allow-failure mode: `SENTRY_ALLOW_FAILURE` set to
`true` or `1` (the values `sentry-cli` honours), or `--allow-failure` in
`SENTRY_CLI_EXTRA_ARGS`, `SENTRY_CLI_RN_XCODE_EXTRA_ARGS` or
`SENTRY_CLI_DEBUG_FILES_UPLOAD_EXTRA_ARGS`. `sentry-cli` would then exit 0 on a
failed upload and the binary would ship without symbols, unnoticed. Why fail
rather than skip: a store binary cannot get its symbols later (the dSYMs and
Hermes maps exist only inside that build), so a silent skip would ship 1.1.0
with unreadable crashes. Failing at the "Read app config" step, a few minutes in
and with the fix in the message, is cheaper than failing at the end of the
native build, which is what a failed Hermes source map upload does on its own
(iOS and Android).

**Known gap: iOS dSYMs.** The "Upload Debug Symbols to Sentry" phase
(`@sentry/react-native` `scripts/sentry-xcode-debug-files.sh`) only logs
`error: sentry-cli - ...` when the dSYM upload fails and still exits 0, so a
green production iOS build does **not** prove its dSYMs reached Sentry. After
every production iOS build, search the EAS build log for `error: sentry-cli` and
check Debug Files in Sentry (step 5 below). If they are missing, fix the cause
and ship a new build before that binary is released; its own native crashes
stay unsymbolicated. Staging and development builds are never blocked (they keep
`SENTRY_DISABLE_AUTO_UPLOAD=true` and need no DSN). Note that the `staging` store
profile sets no `environment`, so EAS builds it with the **`production`**
variables: it receives the production DSN and sees `SENTRY_AUTH_TOKEN` (unused
there), and any change to the `production` environment reaches staging store
builds too. To ship a production build without symbols on
purpose (for example during a Sentry outage), set `SENTRY_DISABLE_AUTO_UPLOAD=true`
in the EAS `production` environment; the build logs a warning. Remove it again
afterwards. `SENTRY_ALLOW_FAILURE` is not a way to do this: set the opt-out.

### One-time setup (user)

1. **Sentry project.** In org `tarodan`, create (or confirm) a React Native project
   with the slug `tarodan-mobile`. If it already exists under another slug, either
   rename it or add `SENTRY_PROJECT=<slug>` to the EAS `production` environment
   (plaintext).
2. **DSN.** Project Settings -> Client Keys (DSN). Add it to EAS:

   ```bash
   eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN \
     --visibility plaintext --scope project
   ```

   Add the same DSN to the `preview` environment too (`docs/SECRETS_SETUP.md`
   section 3c) so internal builds report as well.

3. **Auth token.** Sentry -> Settings -> Developer Settings -> **Organization
   Tokens** -> "Create New Token" (name it e.g. `eas-tarodan-mobile`). Organization
   tokens carry the CI scope Sentry needs for source maps and debug files; prefer
   them over a personal token. Store it as an EAS **secret** (not readable outside
   EAS servers):

   ```bash
   eas env:create --environment production --name SENTRY_AUTH_TOKEN \
     --visibility secret --scope project
   ```

   Run both commands without `--value` and paste the value at the prompt, so it
   never lands in shell history. Never put the token in `eas.json`, `app.json`,
   `.env*` files or a commit.

4. **Check names only:** `eas env:list production --format short` must list
   `EXPO_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` (the secret shows masked), and
   `eas env:list preview --format short` must list `EXPO_PUBLIC_SENTRY_DSN`.
5. **After the first production build** (and the dSYM check after every
   production iOS build, see "Known gap: iOS dSYMs"): in Sentry, Project
   Settings -> Source Maps shows an artifact bundle with the build's Debug ID,
   and Debug Files shows the iOS dSYMs. Trigger a test error on a TestFlight build and confirm the stack
   shows `src/...` file names and line numbers.

### Production OTA (hotfix)

`eas update` runs on the GitHub runner, where EAS **secret** variables are not
readable, and without `--environment` it loads no EAS variables at all. Two
changes in `scripts/ci/release.sh` (`publish_ota`) and `mobile-production.yml`
(`ota` job) are therefore needed and are tracked with the CI release work:
pass `--environment` to `eas update` (so `EXPO_PUBLIC_SENTRY_DSN` reaches the OTA
bundle), and upload `dist/` with `npx sentry-expo-upload-sourcemaps dist` using a
`SENTRY_AUTH_TOKEN` secret in the GitHub Environment `production`. Until both
land, a production OTA ships without uploaded source maps. A manual upload is
possible right after a manual `eas update`, from the same checkout:
`SENTRY_AUTH_TOKEN=... npx sentry-expo-upload-sourcemaps dist`.

## Kopya kağıdı

```
JS düzeltmesi → staging          development'a push (otomatik OTA)
Native değişiklik → staging      development'a push (otomatik build + TestFlight/Play internal)
Ad-hoc APK                       gh workflow run mobile-staging.yml --ref development -f mode=apk
Production sürümü                development → master PR → merge
                                 → otomatik store build (iOS + açıksa Android) + etiket + Release
                                 → development otomatik bir sonraki yamaya geçer
                                 → App Store Connect'te incelemeye ELLE gönder
Ara/ana sürüm (1.3.0)            development'ta app.json expo.version'ı elle değiştir
Acil JS düzeltmesi → production  hotfix/<ad> → master PR → merge → OTA'yı onayla (Review deployments)
                                 → otomatik back-merge PR'ını merge et
Aynı sürümün yeni build'i        gh workflow run mobile-production.yml --ref master -f mode=build -f platform=ios
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
