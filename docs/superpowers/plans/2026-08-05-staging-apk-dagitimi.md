# Staging APK Dağıtımı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Müşterinin kendi Android telefonuna kurup test edebileceği bir staging APK'sı üretmek ve `gh workflow run` ile tek komuta bağlamak.

**Architecture:** `eas.json`'daki `preview` profili zaten APK + internal distribution + staging URL'leri ile doğru. Üç engel kaldırılıyor: (1) `app.config.js`'in Android'e uyguladığı `.staging` paket suffix'i — kayıtlı olmayan bir pakete işaret ettiği için build'i düşürür ve Google Sign-In'i sessizce bozar; (2) EAS'te release keystore olmaması — `--non-interactive` build'i durdurur; (3) `mobile-staging.yml`'ın yalnız iOS build alması.

**Tech Stack:** Expo SDK 54 · EAS Build (`eas-cli` 18.13.1) · GitHub Actions · Jest (`jest-expo` preset)

## Global Constraints

- Tasarım dokümanı: `docs/superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md` — çelişki halinde spec kazanır.
- **iOS suffix'ine dokunulmaz.** `com.tarodan.app.staging` bundle id'si App Store Connect'te canlı uygulamanın yanında durabilmek için gerekli (issue #229). Yalnız Android suffix'i kalkar.
- `google-services.json`, `app.json`, `eas.json`, Firebase ve Google Cloud **değişmez**. Bu turda hiçbir konsola girilmez.
- Keystore repoya girmez (`.gitignore:18` → `*.keystore`, istisna `debug.keystore`). EAS sunucusunda kalır.
- `npx tsc --noEmit` takip edilen taban dışında yeni hata üretmez (CLAUDE.md §13).
- `pnpm test` (= `jest --forceExit`) yeşil kalır.
- Bu repo standalone; `pnpm --filter @tarodan/mobile ...` biçimi CLAUDE.md'de yazılı ama burada karşılığı doğrudan `pnpm test` / `pnpm lint`.

## Task Sırası ve Bağımlılık

```
Task 1 (kod + test)  ─┐
                      ├─→ Task 2 (lokal build = kapı) ─→ Task 3 (CI) ─→ Task 4 (docs)
       (keystore)    ─┘
```

Task 2 **insan tarafından** koşulur (interaktif keystore onayı + gerçek cihaz kurulumu). Task 2 geçmeden Task 3'e geçilmez: CI'ı Android'in derlendiğini bilmeden değiştirmek, hatayı iki kat pahalı bir yerde aramak demek.

---

### Task 1: Android suffix'ini kaldır

**Files:**
- Modify: `app.config.js` (tamamı — 18 satırlık yorum bloğu + `android` override'ı)
- Test: `__tests__/app.config.test.ts` (create)

**Interfaces:**
- Consumes: yok (giriş noktası).
- Produces: `app.config.js` → `module.exports = ({ config }) => ExpoConfig`. `EXPO_PUBLIC_ENVIRONMENT === 'preview'` iken `ios.bundleIdentifier` sonuna `.staging` ekler ve `name` sonuna ` (Staging)` ekler; `android` bloğunu **hiç değiştirmez**. Diğer tüm ortamlarda `config`'i olduğu gibi döndürür.

- [ ] **Step 1: Write the failing test**

`__tests__/app.config.test.ts` oluştur. Test, sabit bir fixture yerine **gerçek `app.json`'ı** okur — böylece ileride `app.json`'daki id'ler değişirse test de gerçeğe bağlı kalır:

```ts
/**
 * app.config.js — varyant override'ları.
 *
 * Bu testin asıl işi iOS ile Android'in AYRIŞTIĞINI sabitlemek: preview
 * build'inde iOS bundle id `.staging` suffix'i alır, Android paketi ALMAZ.
 * Gerekçe: docs/superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md §2
 * (suffix, Firebase/FCM + Google Cloud OAuth client olmak üzere iki kayıt
 * istiyor; ikincisi eksikse build geçer ama Google ile giriş sessizce patlar).
 * "Tutarlılık" adına ikisini eşitlemek isteyen bu testi düşürür ve §2'yi okur.
 */
const withVariant = require('../app.config');
const { expo: baseConfig } = require('../app.json');

const evaluate = (environment: string | undefined) => {
  const previous = process.env.EXPO_PUBLIC_ENVIRONMENT;
  if (environment === undefined) {
    delete process.env.EXPO_PUBLIC_ENVIRONMENT;
  } else {
    process.env.EXPO_PUBLIC_ENVIRONMENT = environment;
  }
  try {
    return withVariant({ config: baseConfig });
  } finally {
    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_ENVIRONMENT;
    } else {
      process.env.EXPO_PUBLIC_ENVIRONMENT = previous;
    }
  }
};

describe('app.config — preview (staging) varyantı', () => {
  it('iOS bundle id\'sine .staging suffix\'i ekler', () => {
    const result = evaluate('preview');
    expect(result.ios.bundleIdentifier).toBe(
      `${baseConfig.ios.bundleIdentifier}.staging`,
    );
  });

  it('Android paketini DEĞİŞTİRMEZ', () => {
    const result = evaluate('preview');
    expect(result.android.package).toBe(baseConfig.android.package);
    expect(result.android.package).not.toMatch(/\.staging$/);
  });

  it('Android bloğunun tamamını olduğu gibi geçirir', () => {
    // googleServicesFile, permissions, intentFilters dahil hiçbir alan
    // kaybolmamalı — spread sırasında düşen bir alan build'de fark edilmez.
    const result = evaluate('preview');
    expect(result.android).toEqual(baseConfig.android);
  });

  it('uygulama adına (Staging) etiketi ekler', () => {
    const result = evaluate('preview');
    expect(result.name).toBe(`${baseConfig.name} (Staging)`);
  });
});

describe('app.config — diğer ortamlar', () => {
  it.each(['production', 'development', undefined])(
    '%s ortamında config\'i olduğu gibi döndürür',
    (environment) => {
      const result = evaluate(environment);
      expect(result).toBe(baseConfig);
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- __tests__/app.config.test.ts
```

Beklenen: **"Android paketini DEĞİŞTİRMEZ"** ve **"Android bloğunun tamamını olduğu gibi geçirir"** testleri FAIL — alınan değer `com.tarodan.app.staging`, beklenen `com.tarodan.app`. Diğer testler zaten PASS (mevcut davranış onları karşılıyor).

İki testin kırmızı, dördünün yeşil olduğunu gör. Hepsi kırmızıysa test dosyası yanlış yerden import ediyor demektir — devam etme.

- [ ] **Step 3: Write minimal implementation**

`app.config.js`'i tamamen aşağıdakiyle değiştir. Değişen iki şey: baştaki yorum bloğu (eski "⚠️ Android prerequisite" uyarısı artık geçersiz) ve dönüş nesnesinden `android` override'ının **çıkarılması**:

```js
// Dynamic Expo config — extends app.json with per-variant overrides.
//
// The static base config lives in app.json (single source of truth). Expo loads
// it first and passes it here as `config`; we only diverge the fields that MUST
// differ per build profile so that a STAGING build can sit next to the
// PRODUCTION build on the same device (issue #229).
//
// The variant is derived from EXPO_PUBLIC_ENVIRONMENT, which every eas.json build
// profile already sets (development | preview | production). Only `preview`
// (= our internal staging distribution) gets the `.staging` id + "(Staging)"
// label; `production` and `development` are returned untouched.
//
// ⚠️  iOS ONLY — Android deliberately keeps `com.tarodan.app`.
// Suffixing the Android package would need TWO registrations, not one:
//   1. Firebase / FCM — expo-notifications' Android push needs google-services.json
//      to list the package, or Gradle fails with "No matching client found".
//   2. Google Cloud OAuth client — @react-native-google-signin needs an Android
//      client registered with the package name + keystore SHA-1. Missing this does
//      NOT fail the build; the APK installs and "Sign in with Google" dies silently.
// The payoff (staging next to production on one device) is currently worthless on
// Android: com.tarodan.app has never been published — no Play release, no installs,
// nothing to sit next to. Revisit when Android production actually ships; both
// registrations must be done that day.
// Rationale in full: docs/superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md §2

const STAGING_SUFFIX = '.staging';

module.exports = ({ config }) => {
  const isStaging = process.env.EXPO_PUBLIC_ENVIRONMENT === 'preview';
  if (!isStaging) {
    return config;
  }

  return {
    ...config,
    name: `${config.name} (Staging)`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios.bundleIdentifier}${STAGING_SUFFIX}`,
    },
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- __tests__/app.config.test.ts
```

Beklenen: 6 test PASS.

- [ ] **Step 5: Verify the whole suite and types are still green**

```bash
pnpm test
npx tsc --noEmit
pnpm lint
```

Beklenen: `pnpm test` yeşil. `tsc` çıktısı takip edilen tabanla aynı — yeni hata yok. `lint` temiz.

- [ ] **Step 6: Verify the config Expo's own eyes see it**

Testin doğru şeyi ölçtüğünü Expo'nun kendi değerlendirmesiyle karşılaştır:

```bash
EXPO_PUBLIC_ENVIRONMENT=preview npx expo config --type public --json | \
  python3 -c "import json,sys; c=json.load(sys.stdin); print('ios:', c['ios']['bundleIdentifier']); print('android:', c['android']['package']); print('name:', c['name'])"
```

Beklenen çıktı:
```
ios: com.tarodan.app.staging
android: com.tarodan.app
name: Tarodan (Staging)
```

Bu adım birim testinin yakalayamayacağı bir şeyi yakalar: `app.config.js`'in Expo tarafından gerçekten yüklendiğini ve `app.json` ile birleştiğini.

- [ ] **Step 7: Commit**

```bash
git add app.config.js __tests__/app.config.test.ts
git commit -m "fix(config): keep the Android package unsuffixed in staging builds

Preview build'i Android paketini com.tarodan.app.staging yapıyordu. O paket
ne Firebase'e ne de Google Cloud'a kayıtlı — birincisi Gradle'da build'i
düşürür, ikincisi build'i düşürmez ve Google ile giriş sessizce patlar.

Suffix'in kazancı (staging ile prod'un telefonda yan yana durması) Android'de
bugün karşılıksız: com.tarodan.app hiçbir yere yayınlanmamış. iOS'ta suffix
korunuyor, orada canlı uygulama var.

Yeni test iOS ile Android'in ayrıştığını sabitliyor.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Keystore'u doğur ve APK'yı gerçek cihazda doğrula

> **⚠️ Bu task'ı insan koşar.** İnteraktif onay (keystore üretimi) ve fiziksel bir Android cihaz gerektiriyor. Agent olarak çalışıyorsan burada dur, komutları kullanıcıya ver ve sonucu bekle.

**Files:** yok — hiçbir dosya değişmez. Çıktı EAS sunucusunda (keystore) ve bir install link'i.

**Interfaces:**
- Consumes: Task 1'in `app.config.js`'i (Android paketi `com.tarodan.app` olmalı; suffix'liyse Gradle düşer).
- Produces: EAS'te `com.tarodan.app` için release keystore + doğrulanmış bir APK install link'i. Task 3 bu keystore'a bağlı — o olmadan CI'ın `--non-interactive` build'i durur.

- [ ] **Step 1: Confirm no Android build has ever run**

```bash
npx eas build:list --platform android --limit 5 --non-interactive
```

Beklenen: boş liste (`Builds for @mki19xcis-organization/tarodan:` altında hiçbir şey). Liste doluysa keystore zaten var — Step 2'yi atla, Step 3'e geç.

- [ ] **Step 2: Trigger the build interactively so EAS generates the keystore**

```bash
npx eas build --platform android --profile preview
```

`--non-interactive` **bilerek yok**. EAS "Generate a new Android Keystore?" diye soracak → **Yes**. Keystore EAS sunucusunda saklanır, repoya inmez.

Beklenen: build kuyruğa girer, ~10-20 dk sürer, sonunda bir build sayfası URL'i basar.

İki olası hata ve anlamı:
- `No matching client found for package name 'com.tarodan.app.staging'` → Task 1 uygulanmamış veya `EXPO_PUBLIC_ENVIRONMENT` yanlış geçmiş. Task 1 Step 6'ya dön.
- `Generating a new Keystore is not supported in --non-interactive mode` → komuta yanlışlıkla `--non-interactive` eklenmiş. Kaldır.

- [ ] **Step 3: Verify the built artifact's identity**

Build bitince EAS'in bastığı build sayfasını aç ve şunları doğrula:

- **Application ID / package:** `com.tarodan.app` (`.staging` YOK)
- **Distribution:** internal
- **Artifact:** `.apk` (`.aab` değil)
- **Channel:** `staging`

`.aab` görüyorsan yanlış profil kullanılmış (`preview` yerine `staging`); `.staging` paket görüyorsan Task 1 devreye girmemiş. İkisinde de durup düzelt — bu APK müşteriye gitmemeli.

- [ ] **Step 4: Install on a real Android device**

Build sayfasındaki install link'ini/QR'ı Android telefonun tarayıcısında aç → APK iner → "bilinmeyen kaynaktan yükleme" onayı ver → kur.

- [ ] **Step 5: Verify the app on the device**

Bu adım plandaki en önemli doğrulama — birim testinin göremediği her şey burada.

| Kontrol | Beklenen |
| --- | --- |
| Uygulama açılıyor mu | Splash geçiyor, ana ekran geliyor (splash'te kilitlenmiyor) |
| İkon altındaki ad | **Tarodan (Staging)** |
| Ürün listesi geliyor mu | Evet → staging API'ye bağlı (`https://staging.tarodan.com.tr/api`) |
| **Google ile giriş** | **Çalışıyor** — §2'deki sessiz başarısızlığın olmadığının tek kanıtı |
| E-posta ile giriş/kayıt | Çalışıyor |
| Bildirim izni istendiğinde | Çökme yok (FCM yapılandırması sağlam) |

Google ile giriş burada patlarsa durup nedenini bul — CI'a geçmenin anlamı yok.

- [ ] **Step 6: Record the outcome**

Commit edilecek dosya yok. Sonucu (build id, install link, cihaz doğrulama tablosunun sonucu) bir sonraki task'a taşı; Task 4'te `docs/RELEASE.md`'e girecek.

---

### Task 3: CI'a platform seçimi ve Android build'i ekle

**Files:**
- Modify: `.github/workflows/mobile-staging.yml`
  - `workflow_dispatch.inputs` (satır ~30-38) — `platform` inputu eklenir
  - `build` job adı (satır ~132 civarı, `name: Staging build (iOS) -> ...`)
  - build adımları (satır 155-158) — koşullar + yeni Android adımı

**Interfaces:**
- Consumes: Task 2'nin EAS'te doğurduğu keystore (yoksa `--non-interactive` build durur) ve Task 1'in `app.config.js`'i.
- Produces: `gh workflow run mobile-staging.yml --ref main -f mode=build [-f platform=android|ios|all]`. Varsayılan `platform=android`. Android build'in install link'i job özetine (`$GITHUB_STEP_SUMMARY`) yazılır.

- [ ] **Step 1: Add the `platform` input**

`.github/workflows/mobile-staging.yml` içinde `workflow_dispatch` bloğunu bul (satır ~30). `mode` inputundan **sonra** `platform`'u ekle:

```yaml
  workflow_dispatch:
    inputs:
      mode:
        description: 'What to ship to staging'
        required: true
        default: 'build'
        type: choice
        options: [build, ota]
      platform:
        description: 'Which platform to build (mode=build only)'
        required: true
        default: 'android'
        type: choice
        options: [android, ios, all]
```

Varsayılan `android`, bilinçli: bugünkü ihtiyaç müşteriye APK göndermek ve iOS kotası tarihsel darboğaz (dosyanın kendi başlık yorumu push'tan build'i bu yüzden kaldırmış). Düşünmeden `-f mode=build` diyen kişi iOS hakkı yakmaz.

- [ ] **Step 2: Document the input in the file's header comment**

Aynı dosyanın tepesindeki açıklama bloğunda şu satır var:

```
#       gh workflow run mobile-staging.yml --ref main -f mode=build
```

Onu şununla değiştir:

```
#       gh workflow run mobile-staging.yml --ref main -f mode=build
#         (varsayılan platform=android — müşteriye APK. iOS TestFlight için
#          -f platform=ios, ikisi birden için -f platform=all. Kotalar platform
#          başına ayrı: 15 Android + 15 iOS.)
```

- [ ] **Step 3: Rename the build job**

`build` job'ının `name:` satırını bul:

```yaml
    name: Staging build (iOS) -> Tarodan Staging TestFlight
```

Şununla değiştir:

```yaml
    name: Staging build -> TestFlight (iOS) / internal APK (Android)
```

- [ ] **Step 4: Gate the iOS steps and add the Android step**

Job'ın son iki adımını (satır 155-158) şununla değiştir:

```yaml
      - name: EAS staging build (iOS, store dist -> TestFlight)
        if: inputs.platform == 'ios' || inputs.platform == 'all'
        run: eas build --platform ios --profile staging --non-interactive --wait
      - name: Submit to Tarodan Staging (TestFlight)
        if: inputs.platform == 'ios' || inputs.platform == 'all'
        run: eas submit --platform ios --profile staging --latest --non-interactive

      # Android, iOS'tan SONRA ama onun sonucundan BAĞIMSIZ koşar. Gerekçe kayıtlı
      # bir vaka: 2026-08-04'te `eas submit` App Store Connect'i 53 dk bekledi ve
      # job kesildi, oysa build başarılıydı. Aynı kesinti APK'yı da götürmemeli.
      #
      # `-p all` kullanılamaz: iOS `staging` profilinde (store dist -> TestFlight),
      # Android `preview` profilinde (apk -> internal). `staging` profilinde android
      # bloğu yok; oradan alınsa dağıtamayacağımız bir AAB çıkardı.
      - name: EAS staging build (Android, APK -> internal distribution)
        if: ${{ !cancelled() && (inputs.platform == 'android' || inputs.platform == 'all') }}
        run: |
          set -euo pipefail
          eas build --platform android --profile preview \
            --non-interactive --wait --json > android-build.json
      - name: Publish the APK install link to the job summary
        if: ${{ !cancelled() && (inputs.platform == 'android' || inputs.platform == 'all') }}
        run: |
          set -euo pipefail
          BUILD_ID="$(jq -r '.[0].id // empty' android-build.json)"
          APK_URL="$(jq -r '.[0].artifacts.buildUrl // .[0].artifacts.applicationArchiveUrl // empty' android-build.json)"
          INSTALL_PAGE="https://expo.dev/accounts/mki19xcis-organization/projects/tarodan/builds/${BUILD_ID}"
          {
            echo "## Staging APK hazır"
            echo
            echo "Müşteriye **kurulum sayfasını** gönder (QR + Install düğmesi var):"
            echo
            echo "  ${INSTALL_PAGE}"
            echo
            echo "Doğrudan APK: ${APK_URL:-yok}"
            echo
            echo "Müşteri tarafı: linki Android telefonun tarayıcısında açar, APK iner,"
            echo "\"bilinmeyen kaynaktan yükleme\" onayı verir, kurulur."
          } >> "$GITHUB_STEP_SUMMARY"
```

`jq` GitHub'ın `ubuntu-latest` imajında kurulu gelir, ek adım gerekmez.

- [ ] **Step 5: Validate the YAML parses**

```bash
python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/mobile-staging.yml')); print('inputs:', list(d[True]['workflow_dispatch']['inputs'])); print('build steps:', [s.get('name') for s in d['jobs']['build']['steps'] if s.get('name')])"
```

Beklenen: `inputs: ['mode', 'platform']` ve build adımları arasında hem iOS hem Android adımlarının göründüğü.

(`d[True]` bir YAML tuhaflığı değil hata: `on:` anahtarı YAML 1.1'de boolean `True` olarak ayrıştırılır.)

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/mobile-staging.yml
git commit -m "ci(mobile): build the staging APK and pick the platform per run

mode=build artık iki platformu birden almıyor: yeni platform inputu
(android | ios | all, varsayılan android) her build adımını kendi koşuluyla
gizliyor. Müşteriye APK göndermek için iOS kotasından harcamak gerekmiyor.

Android adımı preview profilini kullanıyor (apk + internal); -p all
kullanılamıyor çünkü iOS staging profilinde ve orada android bloğu yok.
Adım iOS'un sonucundan bağımsız koşuyor — 53 dakikalık submit beklemesi
APK'yı da götürmesin.

Install link'i job özetine yazılıyor; EAS panelinde aramak gerekmiyor.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Verify with a real dispatch**

```bash
gh workflow run mobile-staging.yml --ref main -f mode=build
gh run watch "$(gh run list --workflow=mobile-staging.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Beklenen:
- iOS adımları **atlanır** (özet ekranında gri/skipped) — hiçbir iOS build hakkı yanmaz
- Android build koşar ve biter
- Job özetinde "Staging APK hazır" başlığı ve tıklanabilir kurulum linki durur

Özet boş geliyorsa `eas build --json` çıktısının şekli beklenenden farklı demektir. Tanılamak için:

```bash
gh run view "$(gh run list --workflow=mobile-staging.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --log | grep -A5 "android-build.json"
```

`jq` filtresini gerçek şekle göre düzelt, yeni bir dispatch ile doğrula. Bir build hakkı daha yanar ama alternatifi, müşteriye link bulamamak.

---

### Task 4: `docs/RELEASE.md`'i gerçekle hizala

**Files:**
- Modify: `docs/RELEASE.md` (satır 31-32 düzeltilir; "Staging (continuous)" ile "Production" arasına yeni bölüm girer; satır 80-87 cheat sheet'e bir satır eklenir)

**Interfaces:**
- Consumes: Task 3'ün `platform` inputu ve job özeti çıktısı; Task 2'nin cihaz doğrulama sonucu.
- Produces: yok (terminal task).

> **Kapsam notu:** `docs/RELEASE.md` başka yerlerde de bayat (`development`/`master` dal adları, artık var olmayan `mobile-testflight.yml`, otomatik build iddiası). Bu turda **dokunulmuyor** — ayrı bir iş. Yalnız APK akışının doğrudan yalanladığı satır 31-32 düzeltiliyor.

- [ ] **Step 1: Fix the now-false install claim**

Satır 31-32 şu an şöyle:

```markdown
Install: staging builds carry the `com.tarodan.app.staging` id and the name
"Tarodan (Staging)" (#229) so they sit next to production on one device.
```

Android için artık yanlış. Şununla değiştir:

```markdown
Install: staging builds carry the name "Tarodan (Staging)". On **iOS** they also
carry the `com.tarodan.app.staging` bundle id (#229), so a staging build sits next
to production on one device. On **Android** the package stays `com.tarodan.app` —
suffixing it would need a Firebase/FCM registration *and* a Google Cloud OAuth
client (missing the latter breaks "Sign in with Google" silently), and the payoff
is currently nil since Android production has never shipped. Rationale:
[`specs/2026-08-05-staging-apk-dagitimi-design.md`](./superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md) §2.
```

- [ ] **Step 2: Add the APK distribution section**

"## Production (tagged release)" başlığından **hemen önce** yeni bir bölüm ekle
(aşağıdaki dış çit dört backtick — içeride `bash` blokları var, onları olduğu
gibi üç backtick ile yaz):

````markdown
## Sending a staging APK to a customer

Android testers install straight from EAS internal distribution — no Play Store,
no account setup on their side.

```bash
gh workflow run mobile-staging.yml --ref main -f mode=build
```

`platform` defaults to `android`, so this burns **no iOS build credit**. For a
staging TestFlight release you must say so explicitly:

```bash
gh workflow run mobile-staging.yml --ref main -f mode=build -f platform=ios
gh workflow run mobile-staging.yml --ref main -f mode=build -f platform=all
```

When the run finishes, the job summary carries a **"Staging APK hazır"** block
with the install page URL. Send that link to the customer. On their phone:

1. Open the link in the Android browser
2. The APK downloads
3. Approve "install from unknown sources" when prompted
4. The app installs as **Tarodan (Staging)** and opens like any other app —
   testing happens inside the app, not in the browser

**Updating them afterwards:** JS/asset changes reach the installed APK over the
air (`channel: staging`) — no new APK, no new link. Only a native change
(deps, `app.json`/`app.config.js`/`eas.json`, `ios/`·`android/`, plugins,
`google-services.json`) needs a fresh build.

**Known gap — deep links.** `assetlinks.json` is not published for the staging
domain, so `https://staging.tarodan.com.tr/...` links open in the browser instead
of jumping into the app. The app itself is unaffected, and `tarodan://` links
still work. The one flow this blocks is **email verification / password reset**:
the customer taps the link in their email and lands on the website, so that
journey can't be tested end-to-end inside the app. Closing it needs the keystore's
SHA-256 (`eas credentials -p android`) published in `assetlinks.json` on the web
side — no rebuild required. See
[`deep-links.md`](./deep-links.md) and
[`specs/2026-08-05-staging-apk-dagitimi-design.md`](./superpowers/specs/2026-08-05-staging-apk-dagitimi-design.md) §4.
````

- [ ] **Step 3: Add a cheat sheet line**

Dosya sonundaki `## Cheat sheet` bloğuna, `New native module / SDK bump` satırından sonra ekle:

```
APK to a customer for testing      → gh workflow run mobile-staging.yml -f mode=build
```

- [ ] **Step 4: Verify the links resolve**

```bash
python3 - <<'PY'
import re, pathlib
doc = pathlib.Path('docs/RELEASE.md')
base = doc.parent
missing = [
    t for t in re.findall(r'\]\((\./[^)#]+)\)', doc.read_text())
    if not (base / t).exists()
]
print('kırık link:', missing or 'yok')
PY
```

Beklenen: `kırık link: yok`.

- [ ] **Step 5: Commit**

```bash
git add docs/RELEASE.md
git commit -m "docs(release): document sending a staging APK to a customer

Tetikleme komutu, linkin job özetinden alınması, müşterinin telefonundaki
kurulum adımları ve OTA ile güncellemenin APK göndermeyi gerektirmediği.

Ayrıca satır 31-32 düzeltildi: staging'in com.tarodan.app.staging taşıdığı
iddiası artık yalnız iOS için doğru.

Deep link borcu (assetlinks.json yok -> e-posta doğrulama linki uygulamaya
sıçramıyor) bilinen eksik olarak yazıldı.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Bu planın kapsamadıkları

- **`assetlinks.json` / Android App Links** — ayrı tur. Task 2'nin doğurduğu keystore beklenen SHA-256'yı üretiyor; kapatma yolu spec §4'te ve `docs/deep-links.md`'de yazılı.
- **`docs/RELEASE.md`'in geri kalanındaki bayatlık** — `development`/`master` dal adları, var olmayan `mobile-testflight.yml` referansı, "otomatik build" iddiası. Ayrı iş.
- **Play Store yayını** — bu tur mağazaya hiçbir şey göndermiyor.
- **Android `.staging` suffix'inin geri getirilmesi** — Android prod yayınlandığı gün, iki konsol kaydıyla birlikte.
