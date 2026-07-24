# Mobil Standalone Build Fix + Staging/Prod Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bu standalone repoda mobil build'i SDK 54 baseline'ına + tam CNG'ye kavuşturmak ve monorepo'daki mobile otomasyonunu (7 parça) bu repoya uyarlayarak staging(develop)/prod(main+tag) pipeline'ını kurmak.

**Architecture:** Bölüm A (build fix) Bölüm B'nin (CI/pipeline) ön koşuludur; sırayla ilerler. Native tarafı CNG'den üretilir (`android/`/`ios/` git-ignored, `plugins/` config-plugin ile özelleştirilir). CI, monorepo'nun composite `setup-workspace` action'ı yerine inline `pnpm/action-setup` + `actions/setup-node` kullanır. Her workflow, ilgili secret yoksa sessiz no-op (guard) olur.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, expo-router 6, EAS Build/Update/Submit, GitHub Actions, pnpm 10, Maestro Cloud, Dependabot.

## Global Constraints

- Node `>=20 <22`; pnpm `>=10` (paket yöneticisi `pnpm@10.34.5`). Verbatim `package.json`'dan.
- React Native **PIN**: `0.81.5` (Expo SDK 54 baseline). `0.86.0`'a asla dönülmez.
- Expo SDK: `~54.0.35`. Çevre paketleri `expo install --check` ile SDK 54'e hizalanır.
- Prod bundle id **DEĞİŞMEZ**: iOS/Android `com.tarodan.app`. Staging: `com.tarodan.app.staging` (yalnız `EXPO_PUBLIC_ENVIRONMENT=preview`).
- Native tarafta **elle değişiklik YASAK**; her özelleştirme `plugins/` altında config plugin. `app.json` + `app.config.js` tek doğruluk kaynağı.
- `debug.keystore` **byte-identical** korunur (Google Giriş bozulmaz).
- CI'da monorepo composite action'ları (`setup-workspace` vb.) kullanılmaz → inline pnpm+node setup.
- Branch modeli: `develop` → staging, `main` + `mobile-v*` tag → prod. Path filtreleri düz kök (monorepo `apps/mobile/**` değil).
- Her workflow guard'lı: `EXPO_TOKEN` (ve Maestro secret'ları) yoksa no-op — commit'lenebilir, secret gelene kadar yeşil no-op.
- Hardcoded hex/rgba yok; `src/theme/colors` yasak import yok (mevcut lint kuralları).
- EAS: `appVersionSource: remote` (build number/version code EAS auto-increment).

---

## Bölüm A — Build Fix + Repo Baseline

### Task A1: React Native + Expo SDK 54 sürüm hizalama

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `pnpm-lock.yaml` (install üretir)

**Interfaces:**
- Produces: `react-native@0.81.5` ve SDK 54 uyumlu çevre paketleri kurulu; `npx expo export` `onModeChange` hatası vermez.

- [ ] **Step 1: Mevcut durumu kanıtla (baseline)**

Run: `grep '"react-native"' package.json`
Expected: `"react-native": "0.86.0",` (sapma mevcut).

- [ ] **Step 2: react-native pin'ini düzelt**

`package.json` → `dependencies` içinde:
```json
"react-native": "0.81.5",
```
(`0.86.0` → `0.81.5`)

- [ ] **Step 3: SDK 54 baseline'a kur ve doğrula**

Run:
```bash
pnpm install
npx expo install --check
```
Expected: `expo install --check`, SDK 54 ile uyumsuz paketleri listeler. Önerilen tüm sürümleri kabul et (özellikle `react`, `react-dom`, `react-native`, `expo-*`, `react-native-*`, `@sentry/react-native`, `metro-*`, `react-test-renderer`, `jest-expo`, `babel-preset-expo`). `react-native`'in `0.81.5`'te kaldığını doğrula.

- [ ] **Step 4: Bundle üretimini doğrula (build fix kanıtı)**

Run: `npx expo export --platform ios 2>&1 | tail -30`
Expected: Export tamamlanır; çıktıda `onModeChange` **geçmez**. (Kök nedenin gittiğinin kanıtı.)

- [ ] **Step 5: tsc baseline'ı bozmadığını doğrula**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: Yeni hata yok (mevcut tracked baseline ile aynı sayı).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "fix(mobile): align RN to 0.81.5 + Expo SDK 54 baseline"
```

---

### Task A2: Tam CNG — android/ git'ten çıkar, ios/ ignore

**Files:**
- Modify: `.gitignore`
- Delete (git-tracked): `android/**` (50 dosya) — `debug.keystore` ve `google-services.json` dışında
- Preserve: `android/app/debug.keystore` (byte-identical), `google-services.json` (kök input)

**Interfaces:**
- Consumes: A1'in hizalanmış bağımlılıkları (prebuild bunları kullanır).
- Produces: `android/`/`ios/` git-ignored; `expo prebuild` native'i üretir; `EXPO_PUBLIC_ENVIRONMENT=preview` prebuild → `com.tarodan.app.staging`.

- [ ] **Step 1: keystore'un mevcut hash'ini kaydet (byte-identical kanıtı)**

Run: `shasum -a 256 android/app/debug.keystore | tee /tmp/keystore-before.txt`
Expected: Bir SHA-256 yazdırır; sakla.

- [ ] **Step 2: keystore + google-services'i güvenli konuma yedekle**

Run:
```bash
mkdir -p credentials
cp android/app/debug.keystore credentials/debug.keystore
cp google-services.json credentials/google-services.json
```
(Kök `google-services.json` zaten var; `credentials/` prebuild-input yedeği.)

- [ ] **Step 3: android/'ı git takibinden çıkar**

Run: `git rm -r --cached android`
Expected: 50 dosya "rm 'android/...'" olarak listelenir (diskteki dosyalar silinmez, sadece index'ten çıkar).

- [ ] **Step 4: .gitignore'a native dizinleri ekle**

`.gitignore` sonuna ekle:
```gitignore
# CNG: native dizinler prebuild'den üretilir, git'te tutulmaz
/android
/ios
```

- [ ] **Step 5: keystore byte-identical mı doğrula**

Run: `shasum -a 256 credentials/debug.keystore`
Expected: `/tmp/keystore-before.txt` içindeki hash ile AYNI.

- [ ] **Step 6: Prebuild staging paket adını doğrula**

Run:
```bash
EXPO_PUBLIC_ENVIRONMENT=preview npx expo prebuild --platform android --no-install --clean
grep -r "com.tarodan.app.staging" android/app/build.gradle
```
Expected: `applicationId 'com.tarodan.app.staging'` bulunur. Ardından üretilen `android/` yeniden ignore'lu (git status'te görünmez).

- [ ] **Step 7: Prod paket adı değişmemiş doğrula**

Run:
```bash
npx expo prebuild --platform android --no-install --clean
grep -r "applicationId" android/app/build.gradle
```
Expected: `applicationId 'com.tarodan.app'` (staging suffix YOK).

- [ ] **Step 8: Üretilen android/'ı temizle (git'e sızmasın)**

Run: `rm -rf android && git status --short`
Expected: `android/` git status'te GÖRÜNMEZ (ignore çalışıyor). `credentials/` görünür.

- [ ] **Step 9: Commit**

```bash
git add .gitignore credentials/debug.keystore credentials/google-services.json
git commit -m "fix(mobile): full CNG — untrack android/, ignore native dirs, preserve keystore+google-services"
```

---

### Task A3: runtimeVersion → fingerprint

**Files:**
- Modify: `app.json:6-8` (`expo.runtimeVersion`)

**Interfaces:**
- Produces: `runtimeVersion.policy = "fingerprint"`; OTA yalnız uyumlu native build'lere gider.

- [ ] **Step 1: Mevcut politikayı doğrula**

Run: `node -p "require('./app.json').expo.runtimeVersion"`
Expected: `{ policy: 'appVersion' }`

- [ ] **Step 2: fingerprint'e geçir**

`app.json` içinde:
```json
"runtimeVersion": {
  "policy": "fingerprint"
},
```

- [ ] **Step 3: fingerprint hesaplanabiliyor mu doğrula**

Run: `npx expo config --json > /dev/null && node -p "require('./app.json').expo.runtimeVersion.policy"`
Expected: `fingerprint`. (`expo config` hata vermeden geçmeli — fingerprint SDK 54'te destekli.)

- [ ] **Step 4: Commit**

```bash
git add app.json
git commit -m "fix(mobile): runtimeVersion policy fingerprint (prevent incompatible OTA)"
```

---

### Task A4: CLAUDE.md doküman senkronu (vendored gerçeği)

**Files:**
- Modify: `CLAUDE.md` (web→mobile mapping tablosu + §1 import kuralı)

**Interfaces:**
- Produces: Doküman, kodun `@/ui` / `@/theme` vendored gerçeğini yansıtır.

- [ ] **Step 1: Gerçeği doğrula (import kanıtı)**

Run: `grep -rn "from '@tarodan" src app | wc -l`
Expected: `0` (hiç `@tarodan/*` import'u yok — vendored).

- [ ] **Step 2: Mapping tablosunu güncelle**

`CLAUDE.md` içinde web→mobile tablosunda:
- `` `@tarodan/ui-native` `` satırını `` `@tarodan/ui-native` (vendored → `@/ui`) `` yap.
- `` `@tarodan/design-tokens` `` / `theme.*` satırını `` vendored → `@/theme` (re-exported via `@/ui`) `` yap.

§1 başlığındaki "Import from `@tarodan/ui-native`." cümlesini "Import from `@/ui` (vendored `@tarodan/ui-native`)." ile değiştir.

- [ ] **Step 3: Tutarlılık kontrolü**

Run: `grep -n "@/ui" CLAUDE.md | head`
Expected: Güncellenen satırlar `@/ui` içeriyor.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(mobile): CLAUDE.md mapping vendored gerçeğe (@/ui, @/theme) hizalandı"
```

---

## Bölüm B — Otomasyon / Pipeline

> Her workflow'dan sonra doğrulama: `actionlint` (yoksa `brew install actionlint`)
> ile YAML'ı lint et; `EXPO_TOKEN` olmadan guard'ın no-op verdiğini iş mantığından
> teyit et. `.github/actions/setup-workspace` KULLANILMAZ — inline setup.

### Task B1: ci.yml — Mobile PR kontrolleri (yalın, YENİ)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: PR'da lint + tsc + jest çalıştıran job. Diğer workflow'lardan bağımsız.

- [ ] **Step 1: ci.yml yaz**

`.github/workflows/ci.yml`:
```yaml
name: CI (Mobile)

on:
  push:
    branches: [develop]
  pull_request:
    branches: [develop, main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    name: Lint + Typecheck + Test
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
        with:
          version: 10
      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: 'pnpm'
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm lint
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Test
        run: pnpm test
```

- [ ] **Step 2: YAML lint**

Run: `actionlint .github/workflows/ci.yml`
Expected: Çıktı yok (temiz). (actionlint yoksa: `brew install actionlint`.)

- [ ] **Step 3: Yerel eşdeğerini çalıştır (mantık kanıtı)**

Run: `pnpm lint && npx tsc --noEmit && pnpm test 2>&1 | tail -15`
Expected: lint temiz, tsc baseline'ı bozmaz, jest yeşil (ya da mevcut bilinen skip'ler).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(mobile): PR lint + typecheck + test workflow"
```

---

### Task B2: dependabot.yml — Expo/RN sapma koruması

**Files:**
- Create: `.github/dependabot.yml`

**Interfaces:**
- Produces: Haftalık gruplu npm + github-actions bump; Expo/RN ekosistemi ignore (A1 sapmasının tekrarını engeller).

- [ ] **Step 1: dependabot.yml yaz**

`.github/dependabot.yml`:
```yaml
version: 2
updates:
  # npm — haftalık TEK gruplu PR (minor/patch). Major'lar ve Expo/RN ekosistemi
  # ELLE yapılır: gruplu bump RN'i SDK baseline'ından kaydırıp build'i kırdı.
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      npm-minor-patch:
        patterns:
          - "*"
        update-types:
          - minor
          - patch
    ignore:
      - dependency-name: "*"
        update-types:
          - version-update:semver-major
      # Expo/RN ekosistemi — SDK 54 baseline'ına elle hizalanır (bkz. build fix).
      - dependency-name: "expo"
      - dependency-name: "expo-*"
      - dependency-name: "react-native"
      - dependency-name: "react-native-*"
      - dependency-name: "@react-native-*/*"
      - dependency-name: "react"
      - dependency-name: "react-dom"
      - dependency-name: "react-test-renderer"
      - dependency-name: "@sentry/react-native"
      - dependency-name: "metro-*"
      - dependency-name: "@testing-library/react-native"
      - dependency-name: "jest-expo"
      - dependency-name: "babel-preset-expo"
      - dependency-name: "metro-react-native-babel-preset"
  # github-actions — haftalık gruplu bump.
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      github-actions-all:
        patterns:
          - "*"
```

- [ ] **Step 2: YAML geçerliliği**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/dependabot.yml')); print('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci(mobile): dependabot — grup + Expo/RN sürüm sapması koruması"
```

---

### Task B3: mobile-staging.yml — OTA + Preview Build

**Files:**
- Create: `.github/workflows/mobile-staging.yml`

**Interfaces:**
- Consumes: `secrets.EXPO_TOKEN`.
- Produces: `develop` push → JS-only ise `eas update --branch staging`, native ise `preview` EAS build.

- [ ] **Step 1: mobile-staging.yml yaz (düz kök uyarlaması)**

`.github/workflows/mobile-staging.yml`:
```yaml
name: Mobile Staging (OTA + Preview Build)

# develop'e mobile-etkileyen her push staging kanalına gider:
#   JS/asset-only -> eas update --branch staging (OTA)
#   native        -> preview EAS build (iOS+Android internal, staging-api)
# Guard: EXPO_TOKEN yoksa no-op.

on:
  push:
    branches: [develop]
    paths:
      - '**'
      - '!docs/**'
      - '!**/*.md'
      - '!maestro/**'
  schedule:
    - cron: '0 3 * * 1'
  workflow_dispatch:
    inputs:
      mode:
        description: 'What to ship to staging'
        required: true
        default: 'build'
        type: choice
        options: [build, ota]

concurrency:
  group: mobile-staging-${{ github.ref }}
  cancel-in-progress: false

jobs:
  classify:
    name: Classify change (native -> build, JS -> OTA)
    runs-on: ubuntu-latest
    outputs:
      mode: ${{ steps.decide.outputs.mode }}
      skip: ${{ steps.guard.outputs.skip }}
    steps:
      - name: Guard — skip if EXPO_TOKEN missing
        id: guard
        run: |
          if [ -z "${{ secrets.EXPO_TOKEN }}" ]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
            echo "::notice::EXPO_TOKEN missing — mobile-staging no-op."
          else
            echo "skip=false" >> "$GITHUB_OUTPUT"
          fi
      - uses: actions/checkout@v7
        if: steps.guard.outputs.skip != 'true'
        with:
          fetch-depth: 0
      - id: decide
        name: Decide OTA vs full build
        if: steps.guard.outputs.skip != 'true'
        env:
          EVENT_NAME: ${{ github.event_name }}
          DISPATCH_MODE: ${{ inputs.mode }}
        run: |
          set -euo pipefail
          native_re='^(package\.json|pnpm-lock\.yaml|app\.json|app\.config\.js|eas\.json|google-services\.json)$|^(ios|android|plugins|patches|credentials)/'
          if [ "$EVENT_NAME" = "workflow_dispatch" ]; then
            echo "mode=${DISPATCH_MODE}" >> "$GITHUB_OUTPUT"
          elif [ "$EVENT_NAME" = "schedule" ]; then
            echo "mode=build" >> "$GITHUB_OUTPUT"
          elif [ "$(git rev-list --parents -n1 HEAD | wc -w)" -gt 2 ]; then
            echo "Merge commit -> full build (safe)."
            echo "mode=build" >> "$GITHUB_OUTPUT"
          else
            changed="$(git diff --name-only HEAD~1 HEAD)"
            echo "Changed:"; echo "$changed" | sed 's/^/  /'
            if echo "$changed" | grep -qE "$native_re"; then
              echo "mode=build" >> "$GITHUB_OUTPUT"
            else
              echo "mode=ota" >> "$GITHUB_OUTPUT"
            fi
          fi

  ota:
    name: OTA update -> staging channel
    needs: classify
    if: needs.classify.outputs.skip != 'true' && needs.classify.outputs.mode == 'ota'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
        with:
          version: 10
      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: expo/expo-github-action@v9
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Publish OTA to staging
        env:
          MSG: ${{ github.event.head_commit.message || 'manual staging OTA' }}
        run: eas update --branch staging --message "$MSG" --non-interactive

  build:
    name: Preview build (iOS+Android) -> internal, staging-api
    needs: classify
    if: needs.classify.outputs.skip != 'true' && needs.classify.outputs.mode == 'build'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
        with:
          version: 10
      - uses: actions/setup-node@v6
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: expo/expo-github-action@v9
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: EAS preview build (internal, staging-api)
        run: eas build --platform all --profile preview --non-interactive --no-wait
```

- [ ] **Step 2: YAML lint**

Run: `actionlint .github/workflows/mobile-staging.yml`
Expected: Temiz.

- [ ] **Step 3: native-regex mantığını yerel doğrula**

Run:
```bash
native_re='^(package\.json|pnpm-lock\.yaml|app\.json|app\.config\.js|eas\.json|google-services\.json)$|^(ios|android|plugins|patches|credentials)/'
echo -e "src/foo.tsx\napp/bar/index.tsx" | grep -qE "$native_re" && echo "BUILD(yanlış)" || echo "OTA(doğru)"
echo -e "package.json" | grep -qE "$native_re" && echo "BUILD(doğru)" || echo "OTA(yanlış)"
```
Expected: İlk satır `OTA(doğru)`, ikinci `BUILD(doğru)`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/mobile-staging.yml
git commit -m "ci(mobile): staging pipeline — OTA/preview classify (develop)"
```

---

### Task B4: mobile-testflight.yml — Prod Release (Build + Submit)

**Files:**
- Create: `.github/workflows/mobile-testflight.yml`

**Interfaces:**
- Consumes: `secrets.EXPO_TOKEN`, `production` GitHub Environment.
- Produces: `mobile-v*` tag → EAS build (all) + submit TestFlight/Play internal; tag↔`app.json` version guard.

- [ ] **Step 1: mobile-testflight.yml yaz**

`.github/workflows/mobile-testflight.yml`:
```yaml
name: Mobile Release (EAS Build + Submit)

# mobile-v* tag (main üzerinde) -> prod build + submit (TestFlight + Play internal).
# Tag, app.json expo.version ile EŞLEŞMELİ (CI mismatch'te fail; version'u ezmez).
# Guard: EXPO_TOKEN yoksa no-op.

on:
  workflow_dispatch:
    inputs:
      profile:
        description: 'EAS build profile'
        required: true
        default: 'production'
        type: choice
        options: [production, preview]
      submit:
        description: 'Submit to stores after build?'
        required: true
        default: true
        type: boolean
  push:
    tags: ['mobile-v*']

concurrency:
  group: mobile-release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build-and-submit:
    name: EAS Build + Submit (iOS & Android)
    runs-on: ubuntu-latest
    environment: production
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v7
      - name: Guard — skip if EXPO_TOKEN missing
        id: guard
        run: |
          if [ -z "${{ secrets.EXPO_TOKEN }}" ]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
            echo "::notice::EXPO_TOKEN missing — no-op."
          else
            echo "skip=false" >> "$GITHUB_OUTPUT"
          fi
      - uses: pnpm/action-setup@v6
        if: steps.guard.outputs.skip != 'true'
        with:
          version: 10
      - uses: actions/setup-node@v6
        if: steps.guard.outputs.skip != 'true'
        with:
          node-version: 20
          cache: 'pnpm'
      - uses: expo/expo-github-action@v9
        if: steps.guard.outputs.skip != 'true'
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install
        if: steps.guard.outputs.skip != 'true'
        run: pnpm install --frozen-lockfile
      - name: Resolve profile, submit, version
        if: steps.guard.outputs.skip != 'true'
        id: resolve
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "profile=${{ inputs.profile }}" >> "$GITHUB_OUTPUT"
            echo "submit=${{ inputs.submit }}" >> "$GITHUB_OUTPUT"
            echo "version=" >> "$GITHUB_OUTPUT"
          else
            VERSION="${GITHUB_REF_NAME#mobile-v}"
            echo "profile=production" >> "$GITHUB_OUTPUT"
            echo "submit=true" >> "$GITHUB_OUTPUT"
            echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          fi
      - name: Verify tag matches app.json version
        if: steps.guard.outputs.skip != 'true' && steps.resolve.outputs.version != ''
        env:
          TAG_VERSION: ${{ steps.resolve.outputs.version }}
        run: |
          APP_VERSION=$(node -p "require('./app.json').expo.version")
          if [ "$APP_VERSION" != "$TAG_VERSION" ]; then
            echo "::error::Tag mobile-v$TAG_VERSION != app.json expo.version ($APP_VERSION)."
            exit 1
          fi
          echo "OK tag matches app.json $APP_VERSION"
      - name: EAS build (iOS + Android)
        if: steps.guard.outputs.skip != 'true'
        run: eas build --platform all --profile ${{ steps.resolve.outputs.profile }} --non-interactive --wait
      - name: EAS submit — iOS (TestFlight)
        if: steps.guard.outputs.skip != 'true' && steps.resolve.outputs.submit == 'true'
        run: eas submit --platform ios --profile production --latest --non-interactive
      - name: EAS submit — Android (Play internal)
        if: steps.guard.outputs.skip != 'true' && steps.resolve.outputs.submit == 'true'
        run: eas submit --platform android --profile production --latest --non-interactive
```

- [ ] **Step 2: YAML lint**

Run: `actionlint .github/workflows/mobile-testflight.yml`
Expected: Temiz.

- [ ] **Step 3: version guard mantığını yerel doğrula**

Run:
```bash
APP_VERSION=$(node -p "require('./app.json').expo.version"); echo "app.json version: $APP_VERSION"
TAG_VERSION="9.9.9"; [ "$APP_VERSION" != "$TAG_VERSION" ] && echo "mismatch -> fail (doğru)" || echo "match"
```
Expected: `mismatch -> fail (doğru)` (guard yanlış tag'i yakalar).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/mobile-testflight.yml
git commit -m "ci(mobile): prod release — EAS build+submit, tag↔version guard (mobile-v*)"
```

---

### Task B5: mobile-build.yml — EAS Simulator Build (Maestro girdisi)

**Files:**
- Create: `.github/workflows/mobile-build.yml`

**Interfaces:**
- Consumes: `secrets.EXPO_TOKEN`.
- Produces: `development` profili iOS simulator `.app` (imzasız) — Maestro tüketir.

- [ ] **Step 1: mobile-build.yml yaz**

`.github/workflows/mobile-build.yml`:
```yaml
name: Mobile Build (iOS Simulator)

# development profili iOS simulator .app (imzasız) — Maestro Cloud girdisi.
# Guard: EXPO_TOKEN yoksa no-op.

on:
  push:
    branches: [develop]
    paths:
      - '**'
      - '!docs/**'
      - '!**/*.md'
  pull_request:
    branches: [develop, main]
    paths:
      - '**'
      - '!docs/**'
      - '!**/*.md'
  workflow_dispatch:

jobs:
  build:
    name: EAS Simulator Build (iOS)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Guard — skip if EXPO_TOKEN missing
        id: guard
        run: |
          if [ -z "${{ secrets.EXPO_TOKEN }}" ]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
            echo "::notice::EXPO_TOKEN missing — mobile build no-op."
          else
            echo "skip=false" >> "$GITHUB_OUTPUT"
          fi
      - uses: pnpm/action-setup@v6
        if: steps.guard.outputs.skip == 'false'
        with:
          version: 10
      - uses: actions/setup-node@v6
        if: steps.guard.outputs.skip == 'false'
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
        if: steps.guard.outputs.skip == 'false'
      - uses: expo/expo-github-action@v9
        if: steps.guard.outputs.skip == 'false'
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: EAS build (development, iOS simulator)
        if: steps.guard.outputs.skip == 'false'
        run: eas build --profile development --platform ios --non-interactive --no-wait
```

- [ ] **Step 2: YAML lint**

Run: `actionlint .github/workflows/mobile-build.yml`
Expected: Temiz.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/mobile-build.yml
git commit -m "ci(mobile): EAS iOS simulator build for Maestro (develop)"
```

---

### Task B6: maestro-cloud.yml — Mobile e2e

**Files:**
- Create: `.github/workflows/maestro-cloud.yml`

**Interfaces:**
- Consumes: `secrets.MAESTRO_CLOUD_API_KEY`, `secrets.MAESTRO_CLOUD_PROJECT_ID`, `build/Tarodan.app`.
- Produces: Maestro Cloud'da `smoke` tag'li akışlar (`workspace: maestro`).

- [ ] **Step 1: maestro-cloud.yml yaz**

`.github/workflows/maestro-cloud.yml`:
```yaml
name: Maestro Cloud (Mobile e2e)

# Mobile UI akışları Maestro Cloud'da (gerçek iOS simulator).
# Guard: secret'lar veya build/Tarodan.app yoksa no-op.

on:
  workflow_dispatch:
  push:
    branches: [develop]
    paths:
      - '**'
      - '!docs/**'
      - '!**/*.md'
  pull_request:
    branches: [develop, main]
    paths:
      - '**'
      - '!docs/**'
      - '!**/*.md'

jobs:
  maestro:
    name: Maestro Cloud
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Guard — skip if secrets or .app missing
        id: guard
        run: |
          if [ -z "${{ secrets.MAESTRO_CLOUD_API_KEY }}" ] || [ -z "${{ secrets.MAESTRO_CLOUD_PROJECT_ID }}" ]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
            echo "::notice::Maestro secrets eksik — no-op."
          elif [ ! -e build/Tarodan.app ]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
            echo "::notice::build/Tarodan.app yok — no-op."
          else
            echo "skip=false" >> "$GITHUB_OUTPUT"
          fi
      - name: Run flows on Maestro Cloud
        if: steps.guard.outputs.skip == 'false'
        uses: mobile-dev-inc/action-maestro-cloud@v3
        with:
          api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
          project-id: ${{ secrets.MAESTRO_CLOUD_PROJECT_ID }}
          app-file: build/Tarodan.app
          workspace: maestro
          include-tags: smoke
```

- [ ] **Step 2: YAML lint + maestro/ dizini var mı**

Run: `actionlint .github/workflows/maestro-cloud.yml && ls maestro | head`
Expected: actionlint temiz; `maestro/` içeriği listelenir.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/maestro-cloud.yml
git commit -m "ci(mobile): Maestro Cloud e2e (smoke), guarded no-op"
```

---

### Task B7: codeql.yml — JS/TS güvenlik taraması (opsiyonel)

**Files:**
- Create: `.github/workflows/codeql.yml`

**Interfaces:**
- Produces: `javascript-typescript` CodeQL taraması (PR + haftalık).

- [ ] **Step 1: codeql.yml yaz**

`.github/workflows/codeql.yml`:
```yaml
name: CodeQL

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]
  schedule:
    - cron: '0 4 * * 1'

jobs:
  analyze:
    name: Analyze (javascript-typescript)
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v7
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
```

- [ ] **Step 2: YAML lint**

Run: `actionlint .github/workflows/codeql.yml`
Expected: Temiz.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/codeql.yml
git commit -m "ci(mobile): CodeQL javascript-typescript taraması"
```

---

### Task B8: Ön koşul dokümanı (ops checklist)

**Files:**
- Create veya Modify: `SECRETS_SETUP.md` (bu repoda mevcut — mobile ön koşullarını güncelle/ekle)

**Interfaces:**
- Produces: Secret/hesap ön koşullarının tek listesi (kod değil; ops referansı).

- [ ] **Step 1: Mevcut SECRETS_SETUP.md'yi oku ve standalone ön koşul bölümü ekle**

`SECRETS_SETUP.md` sonuna "## Standalone repo pipeline ön koşulları (2026-07-24)" başlığıyla tablo ekle:
```markdown
## Standalone repo pipeline ön koşulları (2026-07-24)

| Ön koşul | Kimde | Not |
|---|---|---|
| `EXPO_TOKEN` (repo secret) | EAS hesabı | Yoksa TÜM mobile workflow'lar no-op |
| `MAESTRO_CLOUD_API_KEY` + `MAESTRO_CLOUD_PROJECT_ID` | Maestro Cloud | e2e |
| GitHub `production` Environment | repo ayarı | TestFlight onay kapısı (mobile-testflight.yml) |
| Apple ASC API key / Google Play service account | Apple + Google (imza Murat) | `eas submit` |
| Firebase `com.tarodan.app.staging` kaydı | Firebase | Yoksa staging Android build "No matching client found" |
| App Store Connect "Tarodan (Staging)" app | Apple (Murat) | Anında, review yok |
| `staging-api.tarodan.com` teyidi | Coolify | eas.json preview env gerçek staging domain mi? |
```

- [ ] **Step 2: Commit**

```bash
git add SECRETS_SETUP.md
git commit -m "docs(mobile): standalone pipeline ön koşul checklist'i"
```

---

## Self-Review Notları (plan yazarı)

- **Spec coverage:** A1↔A1, A2↔A2, A3↔A3, A5↔A4(CLAUDE.md), A4(dependabot)↔B2. B1(staging)↔B3, B2(testflight)↔B4, B3(build)↔B5, B4(maestro)↔B6, B5(ci)↔B1, B6(dependabot)↔B2, B7(codeql)↔B7, C(ön koşul)↔B8. Tüm spec maddeleri bir göreve bağlı.
- **Sıra:** A1→A2 zorunlu (prebuild hizalı deps ister); A3/A4 bağımsız. B görevleri A'dan sonra; B'ler birbirinden bağımsız (her biri ayrı dosya).
- **Native-regex:** `credentials/` de native-input olduğundan build tetikler (doğru).
- **Placeholder:** yok — her workflow tam içerikli.
