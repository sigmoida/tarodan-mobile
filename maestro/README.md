# Tarodan Mobile — Maestro E2E Test Suite

Bu klasör mobil uygulamanın e2e test akışlarını barındırır. [Maestro](https://maestro.mobile.dev) kullanılır — YAML tabanlı.

> **Önemli:** Flow'lar **Expo Go değil, dev build**'i hedefler (`appId: ${APP_ID}`, varsayılan `com.tarodan.app`; bkz. [Uygulama kimliği](#uygulama-kimliği-appid)).
> Test koşumu için Metro (ya da release build) **`EXPO_PUBLIC_MAESTRO=1`** + **`EXPO_PUBLIC_MAESTRO_EMAIL`** + **`EXPO_PUBLIC_MAESTRO_PASSWORD`** ile derlenmeli; bu, [authStore.loadToken](../src/stores/authStore.ts) içindeki auto-login'i açar (login UI'sını atlar). Kapının tek kaynağı [src/config/maestro.ts](../src/config/maestro.ts). En kolay yol: **`pnpm maestro:dev <flow>`** (bkz. [run.sh](run.sh)) — backend health + booted simülatör + Metro'yu garanti edip flow'u görünür simülatörde koşar.

## Kurulum (tek seferlik)

```bash
# 1. Maestro CLI (Java gerektirir)
curl -fsSL "https://get.maestro.mobile.dev" | bash

# 2. Java (Maestro için gerekli)
brew install openjdk
echo 'export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"' >> ~/.zshrc

# Yeni terminalde doğrula:
maestro --version  # 2.5.x
```

## Ön koşullar (her test koşusu)

1. **Backend** ayakta: `curl http://localhost:3001/api/health` → 200.
2. **DB** seed'li: `pnpm db:seed` (en az bir kez).
3. **iOS Simulator** boot edili (iPhone 17 önerilen).
4. **Expo Go** kurulu sim'de + **Tarodan projesi son açılmış** (Maestro `launchApp` Expo Go'nun cache'inden son projeyi açar).
   - İlk açılış için `cd apps/mobile && pnpm ios` çalıştır, app açılana kadar bekle, sonra Maestro'yu başlat.
5. `PAYMENT_BYPASS=true` `apps/api/.env`'de (B-001 fix bypass yolunu test ettiği için).

## Çalıştırma

**Önerilen (harness):**

```bash
cd apps/mobile
pnpm maestro:dev flows/01-smoke.yaml          # tek flow, görünür simülatörde
MAESTRO_EMAIL=ahmet@demo.com pnpm maestro:dev flows/E-05-membership-manage.yaml
```

**Düşük seviye (manuel):**

```bash
cd apps/mobile/maestro

# Tek flow  (APP_ID ZORUNLU: flow'lar `appId: ${APP_ID}` kullanır)
maestro test --env APP_ID=com.tarodan.app flows/01-smoke.yaml

# Tüm flow'lar (sıralı)
maestro test --env APP_ID=com.tarodan.app flows/

# Farklı kullanıcıyla
maestro test --env EMAIL=ahmet@demo.com flows/02-auth-login.yaml

# Studio (interactive recorder/debugger)
maestro studio
```

## Uygulama kimliği (`appId`)

Flow ve subflow'ların hepsi `appId: ${APP_ID}` kullanır; paket/bundle id sabit yazılmaz.
Aynı flow'lar farklı build'lere karşı koşabilsin diye: iOS'ta EAS `maestro` profili
`.staging` ekli kimlik üretir (`com.tarodan.app.staging`, `app.config.js`; iOS ve Android
aynı). Yerel dev-client ise her iki platformda `com.tarodan.app`dır.

| Hedef | iOS | Android |
|---|---|---|
| `dev` (yerel dev-client, varsayılan) | `com.tarodan.app` | `com.tarodan.app` |
| `staging` (EAS `maestro` profili build'i) | `com.tarodan.app.staging` | `com.tarodan.app.staging` |

- `pnpm maestro:dev <flow>` değeri `app-id.sh`'tan alıp `--env APP_ID=...` ile geçirir.
  Varsayılan `dev` → **eski davranış aynen korunur**. EAS `maestro` simülatör build'ine
  karşı: `MAESTRO_TARGET=staging pnpm maestro:dev flows/01-smoke.yaml`.
- Özel id: `APP_ID=com.ornek.app pnpm maestro:dev ...`.
- Doğrudan `maestro test` / Maestro Cloud'da `APP_ID` **mutlaka** `--env` ile verilmeli
  (Cloud action'ında `env:`). Değeri `bash maestro/app-id.sh <ios|android> <dev|staging>` yazar.
  `.github/workflows/maestro-cloud.yml` bunu yapar: `app-id.sh ios staging` çıktısını action'a
  `env: APP_ID=...` verir (özel build için repo değişkeni `MAESTRO_APP_ID`); `.app`/secret yoksa no-op.
- Flow başlıklarına inline `env: APP_ID:` varsayılanı KOYMA: Maestro'da inline env `--env`'i ezer
  (J1 flow'larındaki not).
- `src/config/__tests__/maestroAppId.test.ts` hiçbir flow'un sabit id taşımadığını ve
  `app-id.sh` tablosunun `app.json` / `app.config.js` ile aynı kaldığını doğrular.

## Tag stratejisi

Her flow YAML başında `tags:` bloğu ile bir öncelik kategorisine atanır:

| Tag | Ne zaman koşar | İçerdiği | Toplam koşum |
|-----|---------------|----------|-------------|
| `smoke` | Her PR (Maestro Cloud workflow) | 01-smoke, 01-01-login-happy, 03-search, 05-ilanlarim-diagnostic, D-01 | ~2 dk 30 sn |
| `regression` | Nightly + release öncesi | 01-02, 01-03, 01-12, 02-auth-login, D-02, D-03, D-04, D-05, E-03, E-07 | ~6 dk |
| `manual` | Yerel + fixture'a bağlı (CI'da koşulmaz) | E-01, E-02, E-04, E-05, E-06, E-08 | — |
| `placeholder` | Deprecated (D-01 ile kapatıldı) | 04-checkout-bypass | — |

### Yeni E-XX flow'ları (kapsam genişletme)

| Flow | Senaryo | Ön koşul / fixture |
|------|---------|--------------------|
| E-01 | Stockout dedicated page (deep link) | `STOCKOUT_PRODUCT_ID` env (gerçek satılmış ürün UUID'si) |
| E-02 | Iade talep akışı (modal → Hasarlı geldi → submit) | Zeynep'in `payment.status=completed` siparişi olmalı |
| E-03 | Tekliflerim listesi açılır | `pnpm db:seed` (default seed) |
| E-04 | `shipping_to_warehouse` takasında otomatik kargo kartı | Zeynep'te bu durumda aktif takas seed'li olmalı |
| E-05 | Üyelik Yönet ekranı (Otomatik Yenileme + İptal) | `PREMIUM_EMAIL` (ahmet@demo.com) aktif premium aboneliği |
| E-06 | Cash takas `awaiting_payment` → "Ödeme Yap" CTA | Zeynep'te `cashPayerId === user`, status `awaiting_payment` takas |
| E-07 | Bildirimler tab smoke | `pnpm db:seed` |
| E-08 | Push deep-link routing simülasyonu (`tarodan://products/unavailable/{id}`) | `STOCKOUT_PRODUCT_ID` env |

**Not (manual tag):** E-01, E-02, E-04, E-05, E-06, E-08 backend fixture'ına bağımlıdır. CI Maestro Cloud workflow `--include-tags smoke` veya `regression` koşar; `manual` tag'li flow'lar yerelde elle koşulur.

### Yeni F-XX flow'ları (comprehensive multi-step regression)

01-XX/D-XX/E-XX smoke seti ekran açılır kontrolleri yapar; F-XX seti **5–15 adımlık gerçek user journey**'ler ile state geçişlerini, recovery yollarını ve happy/error path'leri birlikte kapsar.

| Flow | Senaryo | Tag | Önkoşul / Seed user |
|------|---------|-----|---------------------|
| F-01 | Register form → verify-email gate | `manual` | timestamp-bazlı `REG_EMAIL` env (her run override) |
| F-02 | Yanlış şifre → recover with right (form reload yok) | `regression` | zeynep |
| F-03 | Forgot password → success notice | `regression` | zeynep |
| F-04 | Logout superset (input cleared, no toast error) | `regression` | zeynep |
| F-05 | Tab navigation (Ana Sayfa/Favoriler/Mesajlar/Profil) + arama alanından arama | `smoke` | zeynep |
| F-06 | Search → product detail → back nav | `smoke` | zeynep |
| F-07 | Category drill-down (3-deep) | `regression` | zeynep |
| F-08 | Favorite toggle (list + detail) | `manual` | zeynep — heart accessibility label kararsız |
| F-09 | Add to cart → cart screen → remove | `regression` | zeynep |
| F-10 | Make offer → Tekliflerim'de görünür | `manual` | **mehmet** (kendi listing değil) |
| F-11 | Bypass checkout end-to-end → order created | `manual` | zeynep + `PAYMENT_BYPASS=true` apps/api/.env + kayıtlı adres |
| F-12 | Stockout deep-link redirect | `manual` | `STOCKOUT_PRODUCT_ID` env |
| F-13 | Address create → edit → delete | `regression` | zeynep |
| F-14 | Initiate trade flow | `manual` | **ali** + tradeAvailable fixture |
| F-15 | Trade detail status display | `manual` | zeynep — aktif takas fixture |
| F-16 | Language toggle (TR ↔ EN) | `regression` | zeynep |
| F-17 | Notification prefs persistence | `regression` | zeynep |
| F-18 | Empty cart checkout blocked | `smoke` | zeynep |
| F-19 | Offer modal validation + recovery | `manual` | mehmet |

**CI eligible (smoke + regression):** F-02, F-03, F-04, F-05, F-06, F-07, F-09, F-13, F-16, F-17, F-18 (= 11 flow). Manual: F-01, F-08, F-10, F-11, F-12, F-14, F-15, F-19 (= 8 flow, fixture/seed user'a veya `PAYMENT_BYPASS` env'e bağımlı).

**`PAYMENT_BYPASS=true` gereksinimi:** F-11 dev modda bypass üzerinden checkout chain'i bitirir. Olmadan PayTR iframe'i Maestro'nun erişemeyeceği WebView'a düşer.

**Seed user kullanımı:**
- `zeynep@demo.com` (FREE, default) — F-02, F-03, F-04, F-05, F-06, F-07, F-09, F-11, F-12, F-13, F-15, F-16, F-17, F-18
- `mehmet@demo.com` — F-10, F-19 (kendi listing'ine offer yapmayan ikinci kullanıcı)
- `ali@demo.com` (BUSINESS) — F-14 (trade initiator)
- `ahmet@demo.com` (PREMIUM) — kullanılmıyor (E-05'te kullanılır)
- F-01: timestamp-bazlı yeni email; her run override'lı.

Çalıştırma örnekleri:
```bash
maestro test maestro/flows --include-tags smoke         # her PR
maestro test maestro/flows --include-tags regression    # nightly
maestro test maestro/flows                              # hepsi (placeholder dahil)
```

Cloud workflow (`.github/workflows/maestro-cloud.yml`) `include-tags: smoke` kullanır → secret + .app artefact eklenince her PR'da smoke set otomatik koşar.

## Klasör yapısı

```
maestro/
├── config.yaml          # paylaşılan env (kullanıcı, şifre)
├── flows/               # numaralı, bağımsız e2e senaryolar
│   ├── 01-smoke.yaml              # ✅ Tarodan açılır, home content
│   ├── 02-auth-login.yaml         # ✅ Profil tab + login/logout idempotent
│   ├── 03-search.yaml             # ✅ Arama ekranı (üst bar arama alanından) listesi yüklenir
│   ├── 04-checkout-bypass.yaml    # 🔶 PLACEHOLDER — testID eklenince aktive
│   └── 05-ilanlarim-diagnostic.yaml # ✅ İlanlarım ekranı açılır + boş hata yok
└── subflows/            # paylaşılan parça akışlar
    ├── open-tarodan.yaml      # Expo Go → Tarodan launch
    ├── login-as.yaml          # Profil → Giriş Yap formu (zeynep, hard-coded)
    ├── logout.yaml            # Profil → Çıkış Yap
    ├── open-first-order.yaml  # Profil → Siparişlerim → ilk kart
    ├── open-first-trade.yaml  # Profil → Takaslarım → liste
    └── open-search.yaml       # Üst bar arama alanına dokun → /search (Ara sekmesi yok)
```

## Selector stratejisi (önemli)

Expo Router + React Native Paper UI'ı Maestro'nun text dump'ına `text` alanı olarak değil **`accessibilityText`** olarak çıkıyor. Maestro `tapOn: "..."` accessibility text'inde substring/regex araması yapar. Bu yüzden:

- ✅ İyi: `tapOn: id: "tab-profile"` — alt menü sekmeleri testID ile (`tab-home`, `tab-favorites`, `tab-sell`, `tab-messages`, `tab-profile`; bkz. [AppTabBar](../src/components/shell/AppTabBar.tsx)). Arama: `runFlow: ../subflows/open-search.yaml`
- ✅ İyi: `assertVisible: text: ".*sonuç bulundu.*"`
- ❌ Çalışmaz: `tapOn: "Profil"` (anchor'sız aramada multi-part label'a takılabilir)

Daha sağlam flow'lar için `testID` prop'larını kritik UI öğelerine eklemek (ürün kartı, "Hemen Al" buton, checkout adımları) ve Maestro'da `id:` selector'ı kullanmak en doğrusu — `04-checkout-bypass.yaml`'ı aktifleştirmek için bu yapılmalı.

## Yeni flow yazarken

- Her flow `appId: host.exp.Exponent` ile başlar (Expo Go).
- `launchApp:` `clearState: false` — Expo Go state'ini koru, yoksa proje cache'i silinir.
- `extendedWaitUntil` ile bekle, `assertVisible` ile doğrula.
- TestID henüz uygulamada yaygın değil — şimdilik **görünür metne** göre seçici yaz (`tapOn: "Profil"`).
- Her flow tek başına çalışabilir olmalı (state varsayma).

## Bilinen sınırlamalar

- **Expo Go cache'i**: Sim'de Expo Go en son Tarodan'ı açmış olmalı, yoksa `launchApp` boş Expo Go açar. Çözüm: testlerden önce manuel olarak `pnpm ios` ile bir kez yükle.
- **Push notification testleri**: Expo Go'da push çalışmaz — Maestro ile de test edilemez.
- **PayTR iframe (sandbox kart)**: WebView içine Maestro tıklayamaz; PayTR yolu için ayrı strateji (manual veya MockServer) gerekecek.
- **Java warning** (`restricted method in java.lang.System`): Maestro 2.5 + JDK 25 cosmetic uyarısı, görmezden gel.

## EAS `maestro` profili (release build'e karşı koşum)

Maestro staging **release** build'ine karşı koşacaksa (dev client / Metro yok)
`EXPO_PUBLIC_MAESTRO=1` derleme anında bundle'a gömülmelidir. Bu bayrak maskesiz
şifre alanı ve auto-login açar; bu yüzden **insan testçilere giden hiçbir build'de
olmamalı**. Bu iş için `eas.json`'da `preview`'dan türeyen ayrı bir profil var:

| Profil | `extends` | Kanal | `EXPO_PUBLIC_MAESTRO` | Kime |
|---|---|---|---|---|
| `preview` | - | `staging` | yok | iç testçiler (APK / ad-hoc IPA) |
| `staging` | - | `staging` | yok | TestFlight "Tarodan Staging" |
| `production` | - | `production` | yok | mağaza |
| **`maestro`** | `preview` | **`maestro`** | **`1`** | yalnız Maestro koşumu |

- `maestro` profili preview'ın staging API/Web adreslerini ve `EXPO_PUBLIC_ENVIRONMENT=preview`
  değerini devralır (iOS ve Android paket adı `com.tarodan.app.staging`; Android build'i staging `google-services.json` ister, bkz. `docs/ANDROID_RELEASE.md`);
  iOS için `ios.simulator: true` (Maestro gerçek iOS cihaza bağlanmaz, `.app` üretir).
- Kendi `maestro` kanalı olduğundan staging OTA'ları (`eas update --branch staging`) bu
  build'e ulaşmaz, tersi de geçerli.
- Profilin kendi EAS ortamı var: `"environment": "maestro"` (preview'dan DEVRALINMAZ,
  `preview` ortamını kullanmaz). **Maestro kimlik bilgileri (`EXPO_PUBLIC_MAESTRO_EMAIL` /
  `EXPO_PUBLIC_MAESTRO_PASSWORD`) YALNIZ `maestro` EAS ortamına konur**; `eas.json`'a yazılmaz,
  `preview`/`production`/`development` ortamlarına ASLA konmaz — `EXPO_PUBLIC_*` değerleri o
  ortamdaki TÜM build'lere gömülür ve insan testçilerin kurduğu build'de açık kalır.

  ```bash
  eas env:create --environment maestro --name EXPO_PUBLIC_MAESTRO_EMAIL    --value "<e-posta>" --visibility plaintext
  eas env:create --environment maestro --name EXPO_PUBLIC_MAESTRO_PASSWORD --value "<şifre>"   --visibility plaintext
  ```

  (`EXPO_PUBLIC_*` değerleri her halükarda bundle'a gömülür; bu yüzden test hesabı yalnız
  staging'de geçerli, üretim verisi olmayan bir hesap olmalıdır. Production hesabı KULLANMA.)
- Maestro build'leri sürüm numarası yakmaz: profilde `ios.autoIncrement` ve `android.autoIncrement`
  `false`. (`preview`/`production` her build'de `buildNumber` / `versionCode` artırır; `extends`
  bunu devralırdı, test koşumları mağaza sayaçlarını tüketmemeli.)
- Bayrak ve profil koruması `src/config/__tests__/easProfiles.test.ts` ile çivilidir:
  `development`/`preview`/`staging`/`production` profillerinde ve `.github/workflows/*`
  içinde `EXPO_PUBLIC_MAESTRO*` bulunursa test kırılır; `maestro` profili `preview`'dan
  türemeli ve ayrı kanal taşımalıdır.

```bash
eas build --profile maestro --platform ios      # simülatör .app
eas build --profile maestro --platform android  # APK
```

Bu profilin çıktısı mağazaya/TestFlight'a **gönderilmez** (`eas submit` yok).

## CI entegrasyonu

İki ayrı katmanda otomatik koruma vardır:

### 1. API e2e (her PR'da otomatik) ✅

`.github/workflows/ci.yml`'in `e2e-test` job'u Jest ile **tüm `*.e2e-spec.ts`** dosyalarını koşar — `payment-bypass.e2e-spec.ts` (B-001 regression) dahil. PR açılınca veya `development` branch'ine push edilince **otomatik tetiklenir**, ekstra ayar gerekmez.

Yerel doğrulama:
```bash
cd apps/api
pnpm test:e2e --testPathPattern=payment-bypass
```

### 2. Maestro UI Cloud (opsiyonel — secret bekliyor)

`.github/workflows/maestro-cloud.yml` hazır ama `MAESTRO_CLOUD_API_KEY` secret'ı eklenmediği sürece no-op olarak biter (notice mesajı bırakır).

**Ayrıntılı kurulum talimatı:** [CLOUD_SETUP.md](CLOUD_SETUP.md).

Şimdiye kadar: **API katmanı CI'da koşuyor; UI testleri yerelden manuel koşuluyor.** Bu pratik ayrım: para hareketleri ve veri kontratları otomatik korunuyor, UI smoke'ları sürüm öncesi spot kontrol için yerelde.

## iOS secureTextEntry + Maestro inputText

Maestro'nun yumuşak iOS klavyesi üzerinden `secureTextEntry` input'lara
karakter göndermesinde bir sınırlaması var (boş kalıyor). Çözüm:
**iOS Simulator'da hardware keyboard'ı aç**:

```bash
defaults write com.apple.iphonesimulator HardwareKeyboardEnabled -bool true
# veya simulator menu'sünden Cmd+Shift+K
```

Sonra Maestro inputText karakterleri klavye eventi olarak gönderir,
secureTextEntry alanları normal şekilde alır.

Bu ayar sim'in disk state'inde kalıcıdır; CI runner'larda bir kere
açılması yeterli.

## F-XX flow envanteri (yeni eklenenler)

| Flow | Tag | Pre-condition |
|---|---|---|
| F-20 | manual | zeynep'in `shipping_to_warehouse` takası + manuel `prisma.tradeShipment.update`'ler |
| F-21 | manual | zeynep'in `shipping_to_recipients` takası + outbound shipment.status='delivered' |
| F-22 | regression | zeynep'in en az bir sales order'ı (seed.ts default'lar yeterli) |
| F-23 | smoke | `EXPO_PUBLIC_MAESTRO=1` + dev client + saved address |
| F-24 | manual | zeynep'in delivered order'ı (14 gün içinde) + manual RefundRequest.status update |
| F-25 | regression | zeynep girişli; profili düzenle bölümleri (kullanıcı adı / e-posta "Değiştir" → alan açılır → "Vazgeç"); kod doğrulaması otomasyonda YOK |

## CI keyboard requirement

```bash
defaults write com.apple.iphonesimulator HardwareKeyboardEnabled -bool true
```

## Auto-login (test mode)

Maestro flow'larında login UI üzerinden geçmek yerine `authStore.loadToken`
boot sırasında otomatik login yapar:

- **Kapı (tek kaynak)**: [`src/config/maestro.ts`](../src/config/maestro.ts) →
  `IS_MAESTRO = process.env.EXPO_PUBLIC_MAESTRO === '1'`. Auto-login,
  `EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN`, maskesiz şifre alanları (login/kayıt),
  login `getValues()` fallback'i ve kayıt doğum tarihi ön doldurması hep bu
  kapıyı kullanır. **`__DEV__`'e bağlı değildir**: aynı env ile derlenmiş
  staging/preview **release** build'inde de çalışır.
- **Zorunlu env (derleme anı)**:
  - `EXPO_PUBLIC_MAESTRO=1`
  - `EXPO_PUBLIC_MAESTRO_EMAIL` ve `EXPO_PUBLIC_MAESTRO_PASSWORD` — **ikisi de
    zorunlu, kodda varsayılan YOK**. Biri eksikse auto-login yapılmaz ve açılışta
    `[maestro] … eksik — auto-login YAPILMAYACAK` `console.warn`'ı basılır.
    `pnpm maestro:dev` ([run.sh](run.sh)) bunları kendisi set eder
    (varsayılan `zeynep@demo.com` / `Demo123!` yalnız bu shell script'inde, dev seed'i).
  - `EXPO_PUBLIC_MAESTRO_NO_AUTOLOGIN=1` (opsiyonel, kayıt/misafir yolculukları):
    yalnız `EXPO_PUBLIC_MAESTRO=1` ile birlikte etkilidir.
- **Release (staging) build'e karşı koşum**: env'ler `expo start` değil **build**
  sırasında verilmelidir (EAS'ta ilgili profilin `env` bloğu ya da EAS
  environment). Aynı kanala env'siz bir OTA (`eas update`) basılırsa bundle
  kapıyı kapalı getirir ve auto-login durur — Maestro koşulacak build'e env'siz
  OTA gitmemeli.
- **Davranış**: SecureStore'da token yoksa app `POST /auth/login`'u credentials
  ile çağırır, başarılıysa standart `login()` flow'undan token + user state'i
  doldurur, doğrudan home ekranına düşer. Login fail olursa normal
  unauthenticated state'e geri döner (login UI görünür).
- **`open-tarodan.yaml` subflow**'u artık login formunu doldurmaz; sadece home
  ekranını bekler.

```bash
cd apps/mobile
EXPO_PUBLIC_MAESTRO=1 \
  EXPO_PUBLIC_MAESTRO_EMAIL=zeynep@demo.com \
  EXPO_PUBLIC_MAESTRO_PASSWORD=Demo123! \
  pnpm exec expo start --dev-client --port 8081 --clear
```

### Production safety

Maestro kod yolları **production build'lere sızmaz** çünkü:

1. `process.env.EXPO_PUBLIC_*` Expo'nun Metro/Babel transformer'ı tarafından
   **compile-time'da** literal string'e replace edilir. Production build sırasında
   `EXPO_PUBLIC_MAESTRO` set edilmediği için `IS_MAESTRO` `undefined === '1'`, yani
   sabit `false` olur; Maestro şubeleri hiçbir koşulda çalışmaz.
2. EAS `production` profili hiçbir `EXPO_PUBLIC_MAESTRO*` değişkeni taşımaz — bu
   [src/config/__tests__/maestro.test.ts](../src/config/__tests__/maestro.test.ts)
   içinde `eas.json` okunarak birim testiyle çivilidir (CI'da kırılır).
3. Test kimlik bilgileri kodda **yok** — yalnız env'den okunur; env yoksa
   auto-login denenmez.

`__DEV__` kapısı bilinçli olarak kaldırıldı (staging release build'inde Maestro
koşabilmek için); koruma yukarıdaki derleme-anı env'idir. Şüphe halinde bundle'da
`EXPO_PUBLIC_MAESTRO` / test e-postası literal'i grep ile aranabilir; production
build'de bulunmamalı.

## PayTR bypass-kapalı coverage

Mobile UI tarafında WebView içi PayTR iframe'i Maestro accessibility tree'sinden
okunamıyor. Bu yüzden gerçek-PayTR uçtan uca testi `apps/api/test/e2e/purchase.e2e-spec.ts`
`signCallback` ile API E2E'de karşılanıyor.

## Yasal kimlik kapısı (1.0.6)

Ödeme, takas ve ilan akışlarında hesabın yasal kimliği eksikse kapatılamayan bir kimlik ekranı
açılır. `subflows/pass-identity-gate.yaml` ekran görünürse onu doldurur; görünmezse hiçbir şey
yapmaz. Demo hesaplara (`zeynep@demo.com` vb.) sunucu kimlik yazmaz. Bu yüzden bu akışları
çalıştırırken bir test TCKN'si verin:

```bash
maestro test --env MAESTRO_TEST_TCKN=<11 haneli test TCKN> flows/F-23-bypass-complete-end-to-end.yaml
```

TCKN repoya yazılmaz: repo herkese açık ve algoritmayı geçen bir numaranın gerçek bir kişiye ait
olmadığı garanti edilemez. Kimlik bir kez kaydedildikten sonra aynı hesapta kapı tekrar açılmaz.

Fiyat seçicileri artık `₺` değil, fiyat biçimini (`1.234,50 TL`) arar: `.*[0-9],[0-9][0-9] TL.*`.
