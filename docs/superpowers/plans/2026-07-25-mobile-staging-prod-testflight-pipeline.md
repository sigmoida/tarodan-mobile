# Mobil staging/prod TestFlight Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** İki-ortamlı otomatik TestFlight deploy kur: `main` push → Tarodan Staging (yeni ASC app), `master` push (version değişince) → mevcut Tarodan prod app.

**Architecture:** Mevcut merge'lenmiş pipeline'ı yeniden kurgular. `eas.json`'a TestFlight-submittable `staging` build+submit profili eklenir. `mobile-staging.yml` `main`'e taşınır ve native path'i iOS TF'e submit eder. `mobile-testflight.yml` → `mobile-production.yml` olur, `master` push + `app.json` version-gate ile tetiklenir. Diğer workflow branch refleri güncellenir.

**Tech Stack:** EAS Build/Update/Submit, GitHub Actions, Expo SDK 54, app.config.js variant logic.

## Global Constraints

- Branch modeli: **`main`=staging, `master`=prod**. Tüm `develop` referansları `main` olur, `master` eklenir.
- Staging build imzası **`distribution: "store"`** (TestFlight ister; `internal` ad-hoc submit EDİLEMEZ).
- Staging bundle `com.tarodan.app.staging` (app.config.js `EXPO_PUBLIC_ENVIRONMENT=preview` ile üretir — DEĞİŞTİRME).
- Prod bundle `com.tarodan.app` **değişmez**; `submit.production` (ascAppId `6786614139`, appleId `mki19xci@gmail.com`, teamId `P2628CQK26`) **bozulmaz**.
- Staging API: `https://staging-api.tarodan.com/api`. Google client id'ler: web `243308404313-kdc77bd36flfhv6ujlb5tfd4qjteh94c.apps.googleusercontent.com`, ios `243308404313-92c5475nff3874maoqes02ajakn81hvh.apps.googleusercontent.com`.
- Staging = **iOS odaklı** (TestFlight). Android staging kapsam dışı.
- Her workflow `EXPO_TOKEN` guard'lı (yoksa no-op).
- YAML doğrulaması: `actionlint` temiz (SC2001/SC2129 stil nitleri kabul edilebilir).
- Git commit ipucu (bu makinede FS flaky): commit öncesi `rm -f .git/index.lock`, `git -c gc.auto=0 -c core.fsmonitor=false commit --no-verify`.

---

### Task 1: eas.json — staging build + submit profilleri

**Files:**
- Modify: `eas.json`

**Interfaces:**
- Produces: `build.staging` (distribution store, channel staging, staging env) ve `submit.staging` (ios ascAppId placeholder). `mobile-staging.yml` bunları `--profile staging` ile kullanır.

- [ ] **Step 1: Mevcut yapıyı doğrula**

Run: `node -e "const e=require('./eas.json'); console.log(Object.keys(e.build), '| submit:', Object.keys(e.submit))"`
Expected: `[ 'development', 'preview', 'production' ] | submit: [ 'production' ]`

- [ ] **Step 2: `build.staging` profilini ekle**

`eas.json` → `build` objesine (`production`'dan sonra) ekle:
```jsonc
"staging": {
  "distribution": "store",
  "channel": "staging",
  "ios": { "autoIncrement": "buildNumber" },
  "env": {
    "EXPO_PUBLIC_ENVIRONMENT": "preview",
    "EXPO_PUBLIC_API_URL": "https://staging-api.tarodan.com/api",
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "243308404313-kdc77bd36flfhv6ujlb5tfd4qjteh94c.apps.googleusercontent.com",
    "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "243308404313-92c5475nff3874maoqes02ajakn81hvh.apps.googleusercontent.com"
  }
}
```

- [ ] **Step 3: `submit.staging` profilini ekle**

`eas.json` → `submit` objesine ekle:
```jsonc
"staging": {
  "ios": {
    "appleId": "mki19xci@gmail.com",
    "ascAppId": "REPLACE_WITH_TARODAN_STAGING_ASC_APP_ID",
    "appleTeamId": "P2628CQK26"
  }
}
```
Not: `ascAppId` placeholder bilinçli — ASC'de "Tarodan Staging" app oluşturulunca gerçek id girilir (ön koşul).

- [ ] **Step 4: JSON geçerliliği + profiller**

Run: `node -e "const e=require('./eas.json'); console.log('build:', Object.keys(e.build).join(','), '| submit:', Object.keys(e.submit).join(',')); console.log('staging dist:', e.build.staging.distribution, '| channel:', e.build.staging.channel)"`
Expected: `build: development,preview,production,staging | submit: production,staging` ve `staging dist: store | channel: staging`.

- [ ] **Step 5: production submit bozulmadı doğrula**

Run: `node -e "console.log(require('./eas.json').submit.production.ios.ascAppId)"`
Expected: `6786614139`

- [ ] **Step 6: Commit**

```bash
rm -f .git/index.lock
git add eas.json
git -c gc.auto=0 -c core.fsmonitor=false commit --no-verify -m "ci(mobile): eas.json staging build+submit profilleri (store dist → TestFlight)"
```

---

### Task 2: mobile-staging.yml — main tetiği + iOS TestFlight submit

**Files:**
- Modify: `.github/workflows/mobile-staging.yml`

**Interfaces:**
- Consumes: `secrets.EXPO_TOKEN`, Task 1'in `staging` build+submit profilleri.
- Produces: `main` push'ta JS→OTA / native→iOS `staging` build + Tarodan Staging TestFlight submit.

- [ ] **Step 1: Tetik branch'ini `develop`→`main` yap**

`on.push.branches` içinde `[develop]` → `[main]`.

- [ ] **Step 2: `build` job'ının adımını iOS staging build+submit'e çevir**

`build` job'ındaki mevcut son adım:
```yaml
      - name: EAS preview build (internal, staging-api)
        run: eas build --platform all --profile preview --non-interactive --no-wait
```
şununla değiştir:
```yaml
      - name: EAS staging build (iOS, store dist → TestFlight)
        run: eas build --platform ios --profile staging --non-interactive --wait
      - name: Submit to Tarodan Staging (TestFlight)
        run: eas submit --platform ios --profile staging --latest --non-interactive
```
(`--no-wait` → `--wait` çünkü submit build'in bitmesini bekler; `preview`→`staging`; `all`→`ios`.)

- [ ] **Step 3: `build` job adını güncelle (opsiyonel netlik)**

`build` job'ının `name:` değerini `Staging build (iOS) → Tarodan Staging TestFlight` yap.

- [ ] **Step 4: OTA job değişmedi doğrula**

Run: `grep -n "eas update --branch staging" .github/workflows/mobile-staging.yml`
Expected: OTA adımı hâlâ mevcut (preview env'li — değişmez).

- [ ] **Step 5: actionlint**

Run: `actionlint .github/workflows/mobile-staging.yml`
Expected: Temiz (SC2001 stil nit'i kabul).

- [ ] **Step 6: Commit**

```bash
rm -f .git/index.lock
git add .github/workflows/mobile-staging.yml
git -c gc.auto=0 -c core.fsmonitor=false commit --no-verify -m "ci(mobile): staging main push → iOS TestFlight (Tarodan Staging) + OTA fast-path"
```

---

### Task 3: mobile-production.yml — master push + version-gate

**Files:**
- Rename/Rewrite: `.github/workflows/mobile-testflight.yml` → `.github/workflows/mobile-production.yml`

**Interfaces:**
- Consumes: `secrets.EXPO_TOKEN`, `submit.production`.
- Produces: `master` push'ta `app.json` version değişince prod build+submit; değişmezse skip.

- [ ] **Step 1: Dosyayı yeniden adlandır**

```bash
git mv .github/workflows/mobile-testflight.yml .github/workflows/mobile-production.yml
```

- [ ] **Step 2: Tetiği `mobile-v*` tag → `master` push yap**

`on:` bloğunu şu hale getir (workflow_dispatch korunur, tag kaldırılır):
```yaml
on:
  push:
    branches: [master]
  workflow_dispatch:
    inputs:
      submit:
        description: 'Submit to stores after build?'
        required: true
        default: true
        type: boolean
```

- [ ] **Step 3: Version-gate job'ı ekle (build'den önce)**

`build-and-submit` job'ının başına, guard'dan sonra bir version-değişim kontrolü ekle. `checkout` `fetch-depth: 2` ile (HEAD~1 diff için), ardından:
```yaml
      - name: Version-gate — app.json version değişti mi?
        id: vergate
        if: steps.guard.outputs.skip != 'true' && github.event_name == 'push'
        run: |
          set -euo pipefail
          # Merge commit'te ilk-parent; normalde HEAD~1..HEAD.
          if git diff "HEAD~1" HEAD -- app.json | grep -qE '^\+\s*"version"\s*:'; then
            echo "changed=true" >> "$GITHUB_OUTPUT"
            echo "::notice::app.json version değişti — prod release devam."
          else
            echo "changed=false" >> "$GITHUB_OUTPUT"
            echo "::notice::app.json version değişmedi — prod release skip."
          fi
```
Not: `workflow_dispatch` çalıştırmasında `vergate` çalışmaz → aşağıdaki adımlar `changed` boşsa da manuel dispatch'te çalışmalı (bkz. Step 4 koşulu).

- [ ] **Step 4: Build+submit adımlarını version-gate'e bağla**

`checkout`'u `fetch-depth: 2` yap. Sonra kurulum (pnpm/node/expo) ve build+submit adımlarının `if:` koşulunu şuna güncelle (guard + [version değişti VEYA manuel dispatch]):
```yaml
        if: steps.guard.outputs.skip != 'true' && (steps.vergate.outputs.changed == 'true' || github.event_name == 'workflow_dispatch')
```
Bunu: pnpm setup, node setup, expo setup, install, **EAS build**, **iOS submit**, **Android submit** adımlarının hepsine uygula. (Mevcut tag-tabanlı `resolve`/`Verify tag matches` adımları KALDIRILIR — version-gate onların yerini alır.)

- [ ] **Step 5: build+submit komutlarını sabitle**

Build: `eas build --platform all --profile production --non-interactive --wait`
iOS submit: `eas submit --platform ios --profile production --latest --non-interactive`
Android submit: `eas submit --platform android --profile production --latest --non-interactive`
(iOS+Android submit `if:` koşuluna ek olarak `workflow_dispatch`'te `inputs.submit == true` de eklenebilir — mevcut submit toggle mantığını koru.)

- [ ] **Step 6: actionlint + skip mantığı doğrula**

Run: `actionlint .github/workflows/mobile-production.yml`
Expected: Temiz.
Run (yerel version-gate mantığı):
```bash
git diff HEAD~1 HEAD -- app.json | grep -qE '^\+\s*"version"\s*:' && echo "changed(release)" || echo "unchanged(skip)"
```
Expected: Son commit app.json version'a dokunmadıysa `unchanged(skip)`.

- [ ] **Step 7: Commit**

```bash
rm -f .git/index.lock
git add -A .github/workflows/
git -c gc.auto=0 -c core.fsmonitor=false commit --no-verify -m "ci(mobile): prod release master push + app.json version-gate (mobile-testflight → mobile-production)"
```

---

### Task 4: Diğer workflow'ların branch referansları

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/mobile-build.yml`
- Modify: `.github/workflows/maestro-cloud.yml`
- Modify: `.github/workflows/codeql.yml`

**Interfaces:**
- Produces: Tüm workflow'lar `main`/`master` branch modeline hizalı.

- [ ] **Step 1: ci.yml**

`on.push.branches` → `[main]`; `on.pull_request.branches` → `[main, master]`.

- [ ] **Step 2: mobile-build.yml**

`on.push.branches` → `[main]`; `on.pull_request.branches` → `[main, master]`.

- [ ] **Step 3: maestro-cloud.yml**

`on.push.branches` → `[main]`; `on.pull_request.branches` → `[main, master]`.

- [ ] **Step 4: codeql.yml**

`on.push.branches` → `[main, master]`; `on.pull_request.branches` → `[main, master]`.

- [ ] **Step 5: `develop` kalıntısı yok doğrula**

Run: `grep -rn "develop" .github/workflows/ || echo "temiz — develop referansı yok"`
Expected: `temiz — develop referansı yok`.

- [ ] **Step 6: actionlint (hepsi)**

Run: `actionlint .github/workflows/*.yml 2>&1 | grep -vE "SC2001|SC2129" | grep -E "error|::" || echo "temiz"`
Expected: `temiz` (yalnız kabul edilen stil nitleri).

- [ ] **Step 7: Commit**

```bash
rm -f .git/index.lock
git add .github/workflows/ci.yml .github/workflows/mobile-build.yml .github/workflows/maestro-cloud.yml .github/workflows/codeql.yml
git -c gc.auto=0 -c core.fsmonitor=false commit --no-verify -m "ci(mobile): branch refleri main=staging/master=prod modeline hizalandı"
```

---

### Task 5: SECRETS_SETUP.md — yeni ön koşullar + branch modeli

**Files:**
- Modify: `SECRETS_SETUP.md`

**Interfaces:**
- Produces: Yeni pipeline'ın ops ön koşulları tek listede.

- [ ] **Step 1: Yeni bölüm ekle**

`SECRETS_SETUP.md` sonuna "## Staging/Prod TestFlight pipeline (2026-07-25)" başlığıyla ekle:
```markdown
## Staging/Prod TestFlight pipeline (2026-07-25)

Branch modeli: **main = staging → Tarodan Staging (yeni ASC app)**, **master = prod → mevcut Tarodan app**.

| Ön koşul | Kimde | Kritiklik |
|---|---|---|
| ASC'de "Tarodan Staging" app (`com.tarodan.app.staging`) + ascAppId → eas.json `submit.staging.ios.ascAppId` | Apple (Murat) | Zorunlu (staging submit) |
| Staging backend `staging-api.tarodan.com`'a deploy + DNS | Backend/ops | **Zorunlu — yoksa staging app API'ye ulaşamaz (şu an NXDOMAIN)** |
| `EXPO_TOKEN` GitHub secret | EAS hesabı | Zorunlu (yoksa tüm workflow'lar no-op) |
| `master` branch'i `main`'den açılır | Sen | Prod tetikleyici |
| Testçiler "Tarodan Staging" internal tester | Apple (Murat) | İlk staging build sonrası |

Prod release: `master`'a push + `app.json` `version` değişimi → otomatik build+submit (mevcut app TestFlight + Play internal). Version değişmezse skip.
Staging: `main`'e push → JS ise OTA (staging channel), native ise iOS build + Tarodan Staging TestFlight.
```

- [ ] **Step 2: Commit**

```bash
rm -f .git/index.lock
git add SECRETS_SETUP.md
git -c gc.auto=0 -c core.fsmonitor=false commit --no-verify -m "docs(mobile): staging/prod TestFlight pipeline ön koşul checklist'i"
```

---

## Self-Review Notları (plan yazarı)

- **Spec coverage:** §3 eas.json↔Task1, §4 mobile-staging↔Task2, §4 mobile-production↔Task3, §4 diğer branch refleri↔Task4, §5 ön koşullar↔Task5. Tüm spec maddeleri bir göreve bağlı.
- **Sıra:** Task1 (eas profilleri) Task2/3'ten önce (workflow'lar profillere referans verir). Task4/5 bağımsız.
- **Kritik doğruluk:** staging `distribution: store` (TF şartı); prod `submit.production` bozulmaz; `develop` kalıntısı sıfır; version-gate manuel dispatch'te de çalışır.
- **Placeholder:** `ascAppId` placeholder bilinçli (ops); plan içinde başka placeholder yok.
- **Not:** `master` branch'i ve ASC staging app ops ön koşulu — pipeline kodu commit'lenir ama secret/app gelene kadar no-op/eksik submit olur (guard).
