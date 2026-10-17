# Tarodan Mobile — TestFlight / EAS secret setup

Bu dosya, Apple Developer hesabı + EAS hesabı oluşturulduktan sonra
adım-adım ne yapılacağını gösterir. Sıralı yürütülmeli.

## 0) Tek seferlik insan adımları

- [ ] Apple Developer Program üyeliği ($99/yıl) — müşteri/şirket hesabı.
- [ ] App Store Connect → My Apps → New App
  - Bundle ID: `com.tarodan.app`
  - Primary Language: Turkish
  - SKU: `tarodan-ios-001` (örnek)
  - Apple ID, ASC App ID, Apple Team ID notlanır.
- [ ] Expo hesabı (https://expo.dev). Şirket ortak hesabı önerilir.
- [ ] Production API'nin public bir URL'de çalışıyor olması (Railway / Render).
      Şu an `apps/api/.env` lokale bağlı. TestFlight build'i URL setlenmeden
      derlenmemeli.

## 1) EAS projesini bağla

```bash
cd apps/mobile
pnpm dlx eas-cli login
pnpm dlx eas-cli init --id-method new
```

`init` sonrası `app.json` içindeki `extra.eas.projectId` otomatik dolar
(`REPLACE_WITH_EAS_PROJECT_ID` yerine gerçek UUID gelir). Commit'le.

## 2) `eas.json` placeholder'larını doldur

`apps/mobile/eas.json` → `submit.production.ios`:

- `appleId` → App Store Connect'e login olduğun e-mail
- `ascAppId` → ASC'de yeni uygulamanın "Apple ID" sayısal ID'si
- `appleTeamId` → Apple Developer membership Team ID'si

## 3) EAS secret'ları (production env)

Bu değerler EAS sunucusunda saklanır, lokal repo'ya hiçbir zaman düşmez.

```bash
# Public (bundle'a dahil edilebilir, EXPO_PUBLIC_ prefix'i şart)
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://tarodan.com.tr/api" --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value "<sentry-dsn>" --visibility plaintext

# Preview (TestFlight'tan ayrı bir staging dağıtımı tutarsanız)
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value "https://staging.tarodan.com.tr/api" --visibility plaintext
```

`eas.json` `production.env` bloğunda `EXPO_PUBLIC_ENVIRONMENT=production`
zaten setli; üstüne yazmıyoruz.

## 3b) Staging variant — prod ile yan yana kurulum (#229)

`preview` profili ayrı bir **staging varyantı** üretir: `app.config.js`,
`EXPO_PUBLIC_ENVIRONMENT=preview` olduğunda **iOS** uygulama kimliğini `.staging`
ekiyle türetir ve ana ekran adını "Staging" yapar. Böylece tester aynı cihazda
iOS prod + staging'i yan yana tutabilir.

| Alan                     | Production                   | Preview / Staging                              |
| ------------------------ | ---------------------------- | ---------------------------------------------- |
| iOS `bundleIdentifier`   | `com.tarodan.app`            | `com.tarodan.app.staging`                      |
| Android `package`        | `com.tarodan.app`            | `com.tarodan.app.staging`                      |
| Uygulama adı (ana ekran) | Tarodan                      | Staging                                        |
| iOS `associatedDomains`  | `applinks:tarodan.com.tr`    | yok (AASA `.staging` appID'sini talep etmiyor) |
| Android App Links        | `tarodan.com.tr`             | yalnız `staging.tarodan.com.tr`                |
| `EXPO_PUBLIC_API_URL`    | `https://tarodan.com.tr/api` | `https://staging.tarodan.com.tr/api`           |

> **Android da iOS gibi `.staging` alır** (`com.tarodan.app.staging`): iki ayrı Play
> uygulaması, iki ayrı Firebase projesi, aynı cihazda yan yana kurulum. Android
> için tüm kurulum adımları ve kimin yapacağı: [`docs/ANDROID_RELEASE.md`](./ANDROID_RELEASE.md).
>
> Doğrula: `EXPO_PUBLIC_ENVIRONMENT=preview npx expo config --type public --json`
> → `ios.bundleIdentifier` ve `android.package` `.staging` ile bitmeli;
> `android.intentFilters[0].data` yalnız staging host'unu içermeli. `production`
> ile aynı komutta staging host'u/paketi görünmemeli.

**Önkoşullar:**

- **Android / Firebase:** staging paketi ayrı Firebase projesinde (`tarodan-staging`)
  ve kendi `google-services.json`'ı var: repoda `google-services.staging.json`
  (varsayılan kaynak). EAS `preview` ortamındaki `GOOGLE_SERVICES_JSON_STAGING`
  (file tipi) aynı içerikte isteğe bağlı yedek. İkisi de yoksa Android build'i açık
  hatayla durur (production dosyasına düşmez). Repodaki `google-services.json`
  yalnız `com.tarodan.app` içindir.
- **Android / Google Sign-In:** iki paket için ayrı Android OAuth istemcileri
  (upload + Play App Signing SHA-1) web client ID'nin GCP projesinde (`243308404313`)
  oluşturulur. Bayrak `EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED` bu iş bitene kadar
  `"false"` kalır. Ayrıntı: `docs/ANDROID_RELEASE.md` §9.
- **iOS / Google Sign-In (opsiyonel):** `com.tarodan.app.staging` bundle id'si
  için ayrı iOS OAuth client gerekir; iOS Google girişi staging için de birlikte
  ele alınır.

`EXPO_PUBLIC_API_URL` staging değeri hem `eas.json` `preview.env` bloğunda hem de
(EAS env kullanıyorsanız) yukarıdaki §3 komutuyla set edilir.

## 3c) Sentry (error tracking and source maps)

`src/services/sentry.ts` reads the DSN **only** from `EXPO_PUBLIC_SENTRY_DSN`;
without it Sentry is silently off. The `eas.json` profiles do not carry the DSN;
it is an EAS environment variable (plaintext), and a production EAS build stops
when it is missing:

```bash
# No --value: paste the DSN at the prompt (same habit as for the secret token).
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --visibility plaintext --scope project
eas env:create --environment preview    --name EXPO_PUBLIC_SENTRY_DSN --visibility plaintext --scope project
```

The `preview` value covers the `preview` profile's internal-distribution builds
(iOS ad-hoc and Android APK), and staging OTAs once `publish-ota` passes
`--environment`; without it those run with Sentry off. The `staging` store profile
sets no `environment`, so EAS builds it with the `production` variables. The
`maestro` profile uses its own `maestro` environment and stays without a DSN
unless one is added there.

Source map and dSYM upload is on for the `production` profile only and needs the
EAS secret `SENTRY_AUTH_TOKEN`. Setup steps (Sentry project, DSN, token, OTA):
[`RELEASE.md`](./RELEASE.md), "Sentry source maps and debug symbols".

## 4) GitHub Actions secret'ları

`gh secret set` ya da Settings → Secrets and variables → Actions:

- `EXPO_TOKEN` — `https://expo.dev/accounts/<org>/settings/access-tokens` üzerinden
  oluşturulan access token. **Repo secret'ı DEĞİL, environment secret'ı**: üç
  GitHub Environment'ın (`staging`, `production-build`, `production`) her birine
  ayrı ayrı (tercihen environment başına ayrı Expo robot token'ı) eklenir.
  Token isteyen her job bir environment'a bağlı; secret'ı olmayan environment'ın
  job'ları guard'lı no-op. Kurulum ve geçiş: [`docs/RELEASE.md`](./RELEASE.md)
  → "Gereken secret, değişken ve environment'lar".
- (opsiyonel) `EAS_BUILD_PROFILE_OVERRIDE` — manuel workflow_dispatch için.

Hem **Apple** (App Store Connect API key) hem **Google Play** (service account
JSON) submit credential'ları **EAS sunucusunda** tutulur (`eas credentials`),
GitHub'a veya repo'ya koymuyoruz. Bu yüzden `eas.json` `submit.production.android`
sadece `track` taşır — `serviceAccountKeyPath` YOK (eski `./google-services.json`
değeri yanlıştı: o dosya Firebase config'i, Play service account'ı değil).

Tam release akışı (staging OTA/preview + production tag) ve secrets tablosu:
[`docs/RELEASE.md`](./RELEASE.md). Android (Play, iki uygulamalı model,
Firebase/FCM, Google girişi, assetlinks): [`docs/ANDROID_RELEASE.md`](./ANDROID_RELEASE.md).

## 5) İlk manuel build (workflow'dan önce sanity check)

```bash
cd apps/mobile
eas build --platform ios --profile production
# 15-25 dk → .ipa hazır
eas submit --platform ios --latest
# 5-10 dk processing → ASC'de TestFlight altında "Ready to Test"
```

App Store Connect → TestFlight → Internal Testing group → müşterinin
Apple ID'sini ekle → davet maili gider.

## 6) Otomatik pipeline (release branch ile)

`.github/workflows/mobile-testflight.yml` aşağıdaki tetikleyicileri kabul eder:

- `release/mobile-*` branch'ine push
- `workflow_dispatch` (manuel, profile seçimi ile)

Workflow tek adımda build + submit yapar. Build tamamlanınca EAS,
ASC'ye yükler.

## 7) TestFlight'ta external public link (opsiyonel)

ASC → TestFlight → External Testing → "Add Group" → "Enable Public Link"
→ tek bir URL çıkar, kayıtsız kişi de yükleyebilir (max 10k kişi).
İlk build'de Apple Beta App Review (~24 saat).

## Doğrulama checklist'i

- [ ] `app.json` `ITSAppUsesNonExemptEncryption: false` set
- [ ] `app.json` `extra.eas.projectId` gerçek UUID
- [ ] `eas.json` `submit.production.ios` placeholder'ları gerçek
- [ ] `EXPO_TOKEN` üç environment'ta (`staging`, `production-build`, `production`) set; repo düzeyinde YOK
- [ ] App Store Connect API key EAS'e yüklü (`eas credentials`, iOS submit)
- [ ] Google Play service account JSON EAS'e yüklü (`eas credentials`, Android submit)
- [ ] `EXPO_PUBLIC_API_URL` EAS secret'ı set (preview→staging, production→prod)
- [ ] Production API public URL'de erişilebilir (curl ile)
- [ ] App icon 1024×1024 alpha kanalsız (icon.png)
- [ ] Privacy Policy URL ASC'de doldurulu (zorunlu, app.tarodan.com/privacy gibi)
- [ ] Release akışı okundu: [`docs/RELEASE.md`](./RELEASE.md)

## Standalone repo pipeline ön koşulları (2026-07-24)

Mobil monorepo'dan bu ayrı repoya (`sigmoida/tarodan-mobile`) taşındı. Aşağıdakiler
CI/pipeline'ın çalışması için gerekli — kod değil, ops. `EXPO_TOKEN` yoksa TÜM
mobile workflow'ları sessiz no-op olur (guard).

| Ön koşul                                             | Kimde                       | Not                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EXPO_TOKEN` (repo secret)                           | EAS hesabı                  | Yoksa TÜM mobile workflow'lar no-op (pipeline'ın hiç çalışmamasının asıl nedeni)                                                                                                                                                                                                                             |
| `MAESTRO_CLOUD_API_KEY` + `MAESTRO_CLOUD_PROJECT_ID` | Maestro Cloud               | e2e (`maestro-cloud.yml`)                                                                                                                                                                                                                                                                                    |
| GitHub `production` Environment                      | repo ayarı                  | TestFlight onay kapısı (`mobile-testflight.yml`)                                                                                                                                                                                                                                                             |
| Apple ASC API key / Google Play service account      | Apple + Google (imza Murat) | `eas submit` (`eas credentials`)                                                                                                                                                                                                                                                                             |
| Firebase `google-services.json` (`com.tarodan.app`)  | Firebase konsolu            | Production: repoda, proje `tarodan-prod`. Staging Android (`com.tarodan.app.staging`) ayrı projede (`tarodan-staging`); dosyası repoda `google-services.staging.json` (EAS `preview` ortamında aynı içerikli `GOOGLE_SERVICES_JSON_STAGING` yedeği). Bkz. [`docs/ANDROID_RELEASE.md`](./ANDROID_RELEASE.md). |
| App Store Connect "Tarodan (Staging)" app            | Apple (imza Murat)          | Anında açılır, beta review YOK (internal TestFlight)                                                                                                                                                                                                                                                         |
| `api.staging.tarodan.shop` teyidi                    | Coolify                     | `eas.json` preview env'deki adres gerçek staging domain mi? (teyit edilmedi)                                                                                                                                                                                                                                 |

Branch modeli: `develop` → staging (OTA/preview), `main` + `mobile-v*` tag → prod.
runtimeVersion politikası `fingerprint` (uyumsuz OTA'yı engeller).

## Staging/Prod TestFlight pipeline (2026-07-25)

Branch modeli: **main = staging → Tarodan Staging (yeni ASC app)**, **master = prod → mevcut Tarodan app**.
(Backend monorepo `master`=prod ile uyumlu; mobil `main`, backend `development` staging rolünü oynar.)

| Ön koşul                                                                                                                                                   | Kimde         | Kritiklik                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------- |
| ASC'de "Tarodan Staging" app (`com.tarodan.app.staging`) + ascAppId → `eas.json` `submit.staging.ios.ascAppId` (`REPLACE_WITH_TARODAN_STAGING_ASC_APP_ID`) | Apple (Murat) | Zorunlu (staging submit)                        |
| Staging backend `staging.tarodan.com.tr`'a deploy + DNS                                                                                                    | Backend/ops   | **Zorunlu — yoksa staging app API'ye ulaşamaz** |
| `EXPO_TOKEN` GitHub secret                                                                                                                                 | EAS hesabı    | Zorunlu (yoksa tüm workflow'lar no-op)          |
| `master` branch'i `main`'den açılır                                                                                                                        | Sen           | Prod tetikleyici                                |
| Testçiler "Tarodan Staging" internal tester                                                                                                                | Apple (Murat) | İlk staging build sonrası                       |

**Staging** (`main` push): JS/asset-only → `eas update` (OTA, staging channel); native → `eas build --profile staging --platform ios` (store dist) + `eas submit --profile staging` → Tarodan Staging TestFlight.
**Prod** (`master` push): `app.json` `version` DEĞİŞTİYSE → `eas build --profile production --platform all` + iOS submit (mevcut app TF) + Android submit (Play internal). Version değişmezse skip. `workflow_dispatch` ile elle de tetiklenebilir.

**Opsiyonel — secret-scan:** `GITLEAKS_LICENSE` (org repo gitleaks lisansı) eklenince `secret-scan.yml` taramaya başlar; yoksa guarded no-op.
