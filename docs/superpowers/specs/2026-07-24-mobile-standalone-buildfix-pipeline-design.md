# Mobil standalone repo — build fix + staging/prod pipeline (tasarım)

> Tarih: 2026-07-24. Repo: `sigmoida/tarodan-mobile` (standalone).
> Kaynak monorepo: `sigmoida/tarodan-app`.
> Bu spec, mobil uygulamanın monorepo'dan ayrı repoya taşınmasından sonra
> (1) build'i sağlığına kavuşturmayı ve (2) monorepo'daki mobile otomasyonunu bu
> repoya sadık şekilde yeniden kurmayı kapsar. **Bu spec bir tasarımdır; kod
> içermez.** Uygulama planı ayrı yazılacak (writing-plans).

---

## 0. Reality-check — bu reponun gerçek durumu (2026-07-24 taraması)

Handoff dokümanının varsaydığı durum ile bu reponun gerçek durumu iki noktada
ayrışıyor. Öncelik sırasını bunlar belirler:

1. **Paylaşılan paketler sorunu ZATEN ÇÖZÜLMÜŞ (vendoring).**
   - `src/` içinde tek bir `@tarodan/*` import'u yok.
   - `@tarodan/ui-native` → `src/ui` (kodda `@/ui`), `@tarodan/design-tokens` →
     `src/theme`, types/api-client → `src/types`, `src/lib/api`.
   - `package.json` / `eas.json` / `.npmrc`'de `workspace:` / `file:` /
     `eas-build-post-install` / monorepo path'i **yok**; `pnpm-workspace.yaml` yok.
   - **Karar (kayıt altına alındı): paket tüketim modeli = vendoring.** Handoff'un
     §3/§5 forku (private registry / submodule / vendoring) pratikte kapandı.

2. **Build fix bu repoda YOK** (handoff "tamamlandı" diyordu — monorepo branch'i
   `docs/mobile-build-fix-spec` merge edilmeden bu repo tohumlanmış):
   - `package.json`: `react-native: 0.86.0` (sapma geri gelmiş; SDK 54 → 0.81.5 bekler).
   - `android/` git'te takipli (50 dosya) → tam CNG uygulanmamış.
   - `node_modules` kurulu değil.

3. **Pipeline altyapısı kısmen hazır, CI tamamen eksik:**
   - `eas.json`: `development`/`preview`/`production` profilleri, `staging` kanalı,
     `staging-api.tarodan.com`, Google client ID'leri ve `submit.production`
     (Apple `ascAppId`/`appleId`/`appleTeamId`, Android `track: internal`) mevcut.
   - `app.config.js`: staging suffix (`.staging` + "(Staging)") mantığı yerinde.
   - `app.json`: `runtimeVersion.policy = "appVersion"`, `version 1.0.0`,
     EAS `projectId` + `owner` set.
   - `.github/` **yok** → hiçbir workflow yok.

### Alınan kararlar (bu brainstorm)

| Konu | Karar |
|---|---|
| Build fix | Bu temiz repoda **yeniden uygula** (monorepo commit'lerine bağımlı kalmadan) |
| Branch modeli | **main + develop** (`develop`→staging, `main`+`mobile-v*` tag→prod) |
| runtimeVersion | **`fingerprint`** politikasına geç (uyumsuz OTA'yı yapısal olarak engeller) |
| Paket tüketimi | **vendoring** (zaten uygulanmış; korunur) |

---

## Bölüm A — Build fix yeniden uygulama + repo baseline (ön koşul)

### A1. Sürüm hizalama (SDK 54 baseline)
- `react-native` `0.86.0` → `0.81.5`; Expo SDK 54'ün beklediği çevre paketleri
  hizalanır (react-dom, expo-font vb. dedupe). `onModeChange` JS codegen hatasının
  kök nedeni budur.
- Doğrulama: `pnpm install` + `npx expo export` temiz geçer (`onModeChange` yok).

### A2. Tam CNG (Continuous Native Generation)
- `android/` git'ten çıkar; `.gitignore`'a `android/` ve `ios/` eklenir.
- Input olarak kalması gerekenler korunur: `debug.keystore` (byte-identical —
  Google Giriş etkilenmez), `google-services.json`.
- Native artık `expo prebuild`'den üretilir. **Kalıcı kural:** native tarafta elle
  değişiklik yapılamaz; her özelleştirme `plugins/` altında bir config plugin olur
  (mevcut `plugins/withGoogleSigninPods.js` deseni). `app.json` + `app.config.js`
  tek doğruluk kaynağı.
- Doğrulama: `EXPO_PUBLIC_ENVIRONMENT=preview` prebuild → `com.tarodan.app.staging`;
  prod paket adı `com.tarodan.app` değişmez.

### A3. runtimeVersion → fingerprint
- `app.json`: `runtimeVersion.policy` = `"appVersion"` → `"fingerprint"`.
- Etki: native bağımlılık değişince runtimeVersion otomatik değişir → OTA yalnızca
  uyumlu build'lere gider. `appVersion` + sabit `1.0.0` ile oluşan "farklı native
  build'ler aynı JS payload'ını alır → çökme" riskini yapısal olarak kaldırır.
- Not: fingerprint, EAS build ve `eas update`'in aynı runtimeVersion'ı hesaplaması
  için `expo-updates` fingerprint desteğini gerektirir (SDK 54'te mevcut). CI'da
  `eas update` ile build'in fingerprint'i tutarlı olmalı.

### A4. Bağımlılık koruması (dependabot)
- Expo/RN ekosisteminin tekrar kaymasını engelleyen ignore listesi (sürüm
  sapmasının kök nedeni). Detay Bölüm B'deki `dependabot.yml`'de.

### A5. Doküman senkronu
- `CLAUDE.md`: web→mobile mapping tablosunda `@tarodan/ui-native` /
  `@tarodan/design-tokens` satırları **vendored** gerçeğe göre güncellenir
  (`@/ui`, `@/theme`). Import kuralı "`@tarodan/ui-native`'den import et" →
  "`@/ui`'den import et" olarak düzeltilir.

---

## Bölüm B — Otomasyon/pipeline portu (monorepo → standalone)

Monorepo'da mobile'a dokunan **7 otomasyon parçası** bu repoya taşınır. Ortak
uyarlama kuralları:

- Path filtreleri `apps/mobile/**` → kök (`**`) ve mobile-ilgili kök dosyalar.
- `working-directory: apps/mobile` **kaldırılır** (her şey kökte).
- `./.github/actions/setup-workspace` (monorepo composite; prisma/turbo)
  **kullanılmaz** → inline `pnpm/action-setup` + `actions/setup-node` (cache: pnpm)
  deseni standartlaşır (`mobile-testflight.yml` zaten böyle yapıyor).
- Branch: `development` → `develop`, `master` → `main`.
- `packages/**` ve `pnpm-workspace.yaml` path filtreleri silinir (vendored; yok).

### B1. `mobile-staging.yml` — OTA + Preview Build
- Tetik: `develop`'e push (mobile dosyaları), haftalık cron (Pzt 03:00 UTC),
  `workflow_dispatch` (mode: build|ota).
- `classify` job'ı değişikliği sınıflandırır:
  - **JS/asset-only** → `eas update --branch staging` (OTA, ~1 dk).
  - **Native** → `preview` profili EAS build (iOS+Android, internal, staging-api).
- Native-etkileyen regex (düz kök için yeniden yazılır):
  `package.json`, `pnpm-lock.yaml`, `app.json`, `app.config.js`, `eas.json`,
  `google-services.json`, `ios/`, `android/`, `plugins/`, `patches/`.
- Merge commit (2+ parent) → güvenli tarafta full build.
- Guard: `EXPO_TOKEN` yoksa no-op.
- Concurrency: `mobile-staging-${{ github.ref }}`, cancel-in-progress: false.

### B2. `mobile-testflight.yml` — Prod Release (Build + Submit)
- Tetik: `mobile-v*` tag push → prod; `workflow_dispatch` (profile + submit toggle).
- `production` GitHub Environment → manuel onay kapısı.
- **Tag ↔ `app.json` `expo.version` eşleşme guard'ı** (uyuşmazlıkta fail; CI asla
  version'u ezmez). `appVersionSource: remote` ile build number/version code EAS
  auto-increment.
- Adımlar: inline pnpm+node → EAS build (`--platform all --wait`) → `eas submit`
  iOS (TestFlight) + Android (Play internal).
- Guard: `EXPO_TOKEN` yoksa no-op.

### B3. `mobile-build.yml` — EAS Simulator Build (Maestro girdisi)
- Tetik: `develop` push/PR (+ PR hedefleri `develop`, `main`), `workflow_dispatch`.
- `development` profili ile iOS **simulator** `.app` (imzasız) üretir — Maestro
  Cloud'un tükettiği artefakt.
- Guard: `EXPO_TOKEN` yoksa no-op.

### B4. `maestro-cloud.yml` — Mobile e2e
- Tetik: `develop` push/PR, `workflow_dispatch`.
- Maestro Cloud'da `smoke` tag'li akışlar; `workspace: maestro` (bu repoda
  `maestro/` mevcut), `app-file: build/Tarodan.app`.
- Guard: `MAESTRO_CLOUD_API_KEY` / `MAESTRO_CLOUD_PROJECT_ID` veya `.app` yoksa no-op.

### B5. `ci.yml` — Mobile PR kontrolleri (YENİ, yalın)
- Monorepo `ci.yml`'i tamamen web/api — mobile CI yoktu. Sıfırdan küçük bir job:
- Tetik: PR (`develop`, `main`), `develop` push.
- Adımlar: inline pnpm+node → `pnpm install --frozen-lockfile` →
  `pnpm lint` + `npx tsc --noEmit` (tracked baseline üstüne yeni hata yok) +
  `pnpm test` (jest --forceExit).

### B6. `dependabot.yml`
- Haftalık gruplu **npm** (minor/patch tek PR) + **github-actions** grubu.
- Major'lar ignore (elle yapılır).
- **Build-fix koruması buraya taşınır:** Expo/RN ekosistemini gruplu bump'tan
  **çıkaran** ignore listesi — `expo`, `expo-*`, `react-native`, `react-native-*`,
  `react`, `react-dom`, `@sentry/react-native`, `metro-*`,
  `@testing-library/react-native`, `react-test-renderer`, `jest-expo`,
  `babel-preset-expo` (~18 pattern). Sürüm sapmasının kök nedeni bu bump'lardı.
- Web/api'ye özel ignore'lar (`next`, `eslint-config-next`, `sharp`) **çıkarılır**.

### B7. `codeql.yml` (opsiyonel)
- JS/TS güvenlik taraması. Hafif; standalone'a JS-only olarak alınabilir.

### Taşınmayanlar (bilinçli)
- `deploy-production.yml`, `deploy-staging.yml`, `moderation.yml`,
  `staging-reset.yml` → web/api/backend; mobil değil.
- `.github/actions/setup-workspace|prisma-generate|coolify-deploy` → monorepo'ya
  özel composite'ler; inline setup ile ikame edilir.

---

## C. Ön koşul checklist'i (kod değil — ops; senin/Murat'ın sağlaması)

| Ön koşul | Kimde | Not |
|---|---|---|
| `EXPO_TOKEN` (repo secret) | EAS hesabı — sende | Yoksa **tüm** workflow'lar sessiz no-op (pipeline'ın hiç çalışmamasının asıl nedeni) |
| `MAESTRO_CLOUD_API_KEY` + `MAESTRO_CLOUD_PROJECT_ID` | Maestro Cloud | e2e için |
| GitHub `production` Environment | repo ayarı — sende | TestFlight onay kapısı |
| Apple ASC API key / Google Play service account | Apple+Google — imza Murat'ta | `eas submit` için |
| Firebase'e `com.tarodan.app.staging` kaydı | Firebase — sende | Yoksa staging Android Gradle build "No matching client found" ile kesilir |
| App Store Connect'te "Tarodan (Staging)" app | Apple — Murat | Anında açılır, review yok |
| `staging-api.tarodan.com` doğrulaması | Coolify | eas.json'daki adres gerçek staging domain mi? (teyit edilmedi) |

---

## D. Doğrulama (Definition of Done)

- `pnpm install` + `npx expo export` temiz (`onModeChange` yok).
- `npx tsc --noEmit` tracked baseline üstüne yeni hata üretmez.
- `pnpm lint` temiz (hardcoded hex/rgba yok, `src/theme/colors` yasak import yok).
- `pnpm test` dokunulan alanlarda yeşil.
- `EXPO_PUBLIC_ENVIRONMENT=preview` prebuild → `com.tarodan.app.staging`; prod
  `com.tarodan.app` değişmez.
- `android/` git'ten çıkmış, `.gitignore`'da; `debug.keystore` byte-identical.
- 7 otomasyon dosyası `.github/`'a eklenmiş; `actionlint` temiz; `EXPO_TOKEN`
  yokken hepsi no-op olarak yeşil geçer (guard doğrulaması).

## E. Açık konular
- `staging-api.tarodan.com`'un gerçek staging domain olduğu Coolify'da teyit edilmeli.
- Apple imza yetkisi (staging app kaydı + imzalı build) Murat'ta — takvim darboğazı.
- fingerprint'e geçişte ilk build sonrası mevcut `appVersion`-tabanlı OTA
  kanalıyla süreklilik: yeni runtimeVersion'lı ilk build gerekir (eski build'ler
  yeni OTA'yı almaz — beklenen davranış).
