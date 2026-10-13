# Tarodan Mobile — Yayın Süreci

Mobil uygulamanın nasıl yayınlandığı: dallar, staging/production/hotfix akışı,
onaylar ve Android durumu. Workflow'lar: `mobile-staging.yml`,
`mobile-production.yml`, `master-flow.yml`, `ci.yml`. Ortak mantık:
`scripts/ci/release.sh`.

## Dallar

| Dal           | Rol                                              | Nasıl girilir                                       |
| ------------- | ------------------------------------------------ | --------------------------------------------------- |
| `development` | Varsayılan dal; **staging**                      | Doğrudan push serbest (PR de olur)                  |
| `master`      | **Production** — `development`'tan merge = yeni sürüm (store build) | Yalnız PR ile, yalnız `development` ya da `hotfix/*` dalından |
| `hotfix/*`    | Production'a acil düzeltme (JS ise onaylı OTA)   | `master`'dan açılır, PR ile `master`'a girer        |

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

| Merge | Ne olur |
| --- | --- |
| **`development` → `master` (sürüm)** | **Her zaman store build'i** (iOS → App Store Connect, Android → Play internal). `expo.version` artırılmamışsa build alınmaz, koşu kırmızı olur. Yalnız JS değişmiş olsa da production OTA'sı **çıkmaz**. |
| **`hotfix/*` → `master` (acil düzeltme)** | Yalnız JS değiştiyse **onaylı OTA** hazırlanır (senin onayın olmadan çıkmaz). Native değiştiyse store build'i (sürüm artmış olmalı). |

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
> production build'inin sürümünden (1.0.6) büyük değil — store build ALINMADI …`

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

### Sürüm akışı (özet)

1. `development`'ta `app.json` `expo.version`'ı artır (ör. `1.0.6` → `1.0.7`).
   Bu staging'de de yeni bir build demektir (sürüm fingerprint'e girer).
2. `development` → `master` PR'ı aç; CI + `Master source guard` yeşil olunca merge et.
3. `mobile-production.yml` iOS ve (açıksa) Android store build'ini alıp gönderir.
4. App Store Connect'te build'i test et, **incelemeye elle gönder**; Play'de
   internal'dan ileri kanallara **elle** terfi et.

## Hotfix

1. `master`'dan `hotfix/<ad>` dalı aç, düzeltmeyi yap.
2. `hotfix/<ad>` → `master` PR'ı aç (guard izin verir), merge et. Yalnız JS
   değiştiyse production OTA'sı hazırlanır ve **onayını bekler** (Actions →
   koşu → "Review deployments"). Native değiştiyse sürümü artır; store build'i alınır.
   OTA, master'daki sürümün binary'sine iner: master'da henüz yayınlanmamış bir
   sürüm varsa canlı kullanıcılara ulaşmaz (yukarıda "Gönderilmiş ≠ yayınlanmış").
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
                                 → otomatik store build (iOS + açıksa Android)
                                 → App Store Connect'te incelemeye ELLE gönder
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
