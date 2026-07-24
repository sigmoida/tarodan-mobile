# Mobil staging/prod TestFlight pipeline (tasarım)

> Tarih: 2026-07-25. Repo: `sigmoida/tarodan-mobile`. Monorepo (backend): `sigmoida/tarodan-app`.
> Bu spec, mobil uygulamanın iki-ortamlı otomatik TestFlight deploy kurgusunu tanımlar:
> **main → Tarodan Staging (yeni ASC app)**, **master → Tarodan (mevcut prod app)**.
> Bir önceki spec'te (`2026-07-24-...`) kurulan build-fix + pipeline'ın **üstüne** gelir;
> mevcut workflow'ları yeniden kurgular. Kod değil, tasarım.

---

## 0. Hedef & mevcut durum

**Hedef:** Bu repoda yapılan değişiklikler GitHub Actions ile otomatik deploy olsun:
- **main** (dev/staging branch) → **Tarodan Staging** adlı YENİ App Store Connect app'ine TestFlight internal
- **master** (prod branch, main'den promote edilir) → mevcut **Tarodan** app'ine TestFlight internal

**Mevcut durum (2026-07-24 merge sonrası):**
- `eas.json`: `development`/`preview`/`production` build profilleri; `submit.production` mevcut prod app'e (ascAppId `6786614139`, appleId `mki19xci@gmail.com`, teamId `P2628CQK26`).
- `app.config.js`: `EXPO_PUBLIC_ENVIRONMENT=preview` iken `.staging` suffix + "(Staging)" adı üretir (bundle `com.tarodan.app.staging`).
- `app.json`: `runtimeVersion.policy=fingerprint`, `version 1.0.0`.
- Workflow'lar: `mobile-staging.yml` (tetik `develop`, EAS **internal** preview build — TestFlight submit YOK), `mobile-testflight.yml` (tetik `mobile-v*` tag → prod build+submit), `ci`/`mobile-build`/`maestro-cloud`/`codeql`.
- Branch: yalnız `main`.

## 1. Backend uyumu (doğrulandı — sigmoida/tarodan-app)

- Monorepo backend modeli: **`development`=staging, `master`=production** (`deploy-staging.yml`/`deploy-production.yml` → Coolify). Mobil `master`=prod bununla **birebir uyumlu**; mobil `main`, backend'in `development` staging rolünü oynar (ayrı repo — çelişki yok).
- Prod API domain `tarodan.shop/api` **canlı ve doğrulandı** (DNS çözülüyor; web/image/api tutarlı).
- ⚠️ **Staging API domain `staging-api.tarodan.com` ŞU AN DNS'TE YOK (NXDOMAIN)** ve backend altyapısında (nginx/traefik/Coolify) geçmiyor. Karar: hedef domain aynı kalır; **staging backend'in bu domain'e deploy + DNS'i ZORUNLU ön koşuldur** (yapılmadan staging app hiçbir API'ye ulaşamaz). Bkz. §5.

## 2. Alınan kararlar

| Konu | Karar |
|---|---|
| Branch modeli | **main=staging, master=prod** (master, backend ile uyumlu; main'den promote) |
| Staging tetikleyici (main push) | **Akıllı:** JS/asset-only → `eas update` (OTA, staging channel); native → yeni build + iOS TestFlight submit (Tarodan Staging) |
| Prod tetikleyici (master push) | `app.json` `version` **değişince** build+submit (değişmezse skip); `mobile-v*` tag tetiği kaldırılır, `workflow_dispatch` opsiyonel kalır |
| Staging build imzası | **`distribution: "store"`** (TestFlight ister; mevcut `preview` `internal` ad-hoc TF'e submit EDİLEMEZ) |
| Staging platform | iOS (TestFlight) odaklı. Android staging şimdilik **kapsam dışı** (ayrı Play app + `com.tarodan.app.staging` kaydı gerekir; sonra eklenir) |
| Prod platform | iOS (mevcut app TF) + Android (Play internal) — mevcut `production` submit |
| Prod onay kapısı | Yok (version-gate otomatik). Not: monorepo prod'da `environment: production` reviewer kapısı var; istenirse mobil prod'a da eklenebilir (opsiyonel) |

## 3. eas.json değişiklikleri

**Yeni build profili `staging`:**
```jsonc
"staging": {
  "distribution": "store",          // TestFlight'a submit edilebilir imza
  "channel": "staging",
  "ios": { "autoIncrement": "buildNumber" },
  "env": {
    "EXPO_PUBLIC_ENVIRONMENT": "preview",   // app.config.js → .staging bundle
    "EXPO_PUBLIC_API_URL": "https://staging-api.tarodan.com/api",
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "243308404313-kdc77bd36flfhv6ujlb5tfd4qjteh94c.apps.googleusercontent.com",
    "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "243308404313-92c5475nff3874maoqes02ajakn81hvh.apps.googleusercontent.com"
  }
}
```

**Yeni submit profili `staging`:**
```jsonc
"staging": {
  "ios": {
    "appleId": "mki19xci@gmail.com",
    "ascAppId": "<YENİ Tarodan Staging app id — ASC'den>",
    "appleTeamId": "P2628CQK26"
  }
}
```
- `production` build + submit **aynen kalır** (mevcut app).
- `development` (simulator, Maestro) kalır. Mevcut `preview` (internal) profili: Android internal-link için tutulabilir ya da kaldırılabilir (kullanılmıyorsa kaldır — DRY).

## 4. Workflow yeniden kurgusu

### `mobile-staging.yml` — tetik: `main` push
- `classify` job'ı (mevcut mantık): JS/asset-only → OTA; native → build.
- **ota job:** `eas update --branch staging` (preview env zaten set — fingerprint eşleşir). *(değişmez)*
- **build job:** `eas build --profile staging --platform ios --wait` → `eas submit --profile staging --platform ios --latest` → **Tarodan Staging TestFlight**. (Mevcut build job `preview --platform all --no-wait` idi; `staging --platform ios --wait` + submit olur.)
- Guard: `EXPO_TOKEN`.

### `mobile-production.yml` (mevcut `mobile-testflight.yml` yeniden adlandırılır) — tetik: `master` push
- Tetik `push: branches: [master]` + `workflow_dispatch` (mevcut `tags: mobile-v*` kaldırılır).
- **Version-gate:** `git diff HEAD~1 HEAD -- app.json` içinde `expo.version` satırı değiştiyse devam; değişmediyse job **skip** (build yok). Merge commit'te ilk-parent diff.
- Değiştiyse: `eas build --profile production --platform all --wait` → `eas submit --profile production --platform ios --latest` (mevcut app TF) + `eas submit --profile production --platform android --latest` (Play internal).
- Guard: `EXPO_TOKEN`. (Prod `environment` reviewer kapısı opsiyonel — varsayılan: yok.)

### Diğer workflow'lar — branch referansları
- `ci.yml`: `push: [main]`, `pull_request: [main, master]`.
- `mobile-build.yml` (simulator/Maestro girdisi): `push: [main]`, `pull_request: [main, master]`.
- `maestro-cloud.yml`: `push: [main]`, `pull_request: [main, master]`.
- `codeql.yml`: `push: [main, master]`, `pull_request: [main, master]`.
- (Tüm `develop` referansları `main`, `master` eklenir.)

## 5. Ön koşullar (kod değil — ops)

| Ön koşul | Kimde | Kritiklik |
|---|---|---|
| ASC'de "Tarodan Staging" app (`com.tarodan.app.staging`) + **ascAppId** | Apple (imza Murat) | Zorunlu — staging submit için |
| **Staging backend `staging-api.tarodan.com`'a deploy + DNS** | Backend/ops (sen) | **Zorunlu — yoksa staging app API'ye ulaşamaz (NXDOMAIN)** |
| `EXPO_TOKEN` GitHub secret | EAS hesabı (sen) | Zorunlu — yoksa tüm workflow'lar no-op |
| `master` branch'i `main`'den açılır | Sen | Prod tetikleyici için |
| Testçiler "Tarodan Staging" internal tester olarak eklenir | Apple (Murat) | İlk staging build sonrası |
| Firebase `com.tarodan.app.staging` (Android staging eklenirse) | Firebase (sen) | Android staging kapsama alınırsa |

## 6. Doğrulama (Definition of Done)

- `eas.json` geçerli JSON; `staging` build+submit profilleri eklendi, `production` bozulmadı.
- `actionlint` tüm workflow'larda temiz.
- `mobile-staging.yml` `main` push'ta: JS-only değişiklik → OTA path; native değişiklik → `staging` iOS build + submit path (guard'lı).
- `mobile-production.yml` `master` push'ta: version değişmemişse skip; değişmişse build+submit path.
- `EXPO_TOKEN` yokken tüm workflow'lar yeşil no-op.
- `app.config.js` `preview` env'de `com.tarodan.app.staging` üretir (mevcut, değişmez).

## 7. Açık konular / riskler

- **`staging-api.tarodan.com` canlı değil** → staging app ancak backend deploy+DNS sonrası çalışır (pipeline mekaniği bağımsız kurulur, ama uçtan uca test bu domaine bağlı).
- Yeni ASC staging app'inin ilk build'i Apple processing gerektirir (review değil, ~10-30 dk).
- Android staging kapsam dışı bırakıldı; ileride Play staging app'i + Firebase staging kaydı ile eklenebilir.
