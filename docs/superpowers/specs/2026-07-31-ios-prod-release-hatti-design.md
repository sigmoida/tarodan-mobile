# iOS Production Yayın Hattı (master → Tarodan) — Tasarım

**Tarih:** 2026-07-31
**Kapsam:** `master` branch'i + production ortamı; mevcut **Tarodan** iOS uygulamasına
otomatik EAS build + TestFlight submit. Android bu turda **uygulanmaz**, yalnız planlanır.

---

## 1. Amaç

`master`'a yapılan sürüm yükseltmeli merge'lerin, insan eli değmeden mevcut Tarodan iOS
uygulamasına TestFlight build'i üretmesi.

---

## 2. Başlangıç durumu (doğrulandı)

Bu bir sıfırdan kurulum **değil**. Hat büyük ölçüde yazılmış:

| Bileşen | Durum |
|---|---|
| `.github/workflows/mobile-production.yml` | **Var** — `master` push → sürüm kapısı → `eas build` + submit |
| `.github/workflows/mobile-staging.yml` | **Var** — `main` push → OTA veya staging build → Tarodan Staging |
| `eas.json` `production` profili | **Var** — `channel: production`, `distribution: store`, `EXPO_PUBLIC_API_URL=https://tarodan.com.tr/api` |
| `app.config.js` | **Var** — staging build'e `.staging` bundle id verir, iki app yan yana kurulabilir |
| `EXPO_TOKEN` repo secret'ı | **Ekli** (2026-07-25) |
| `master` branch'i | **YOK** — hattın hiç çalışmamasının sebebi bu |
| GitHub `production` Environment | Yok (onay kapısı istenmedi) |

**Uygulama kimliği** (repodan bağımsız):

| Kimlik | Değer |
|---|---|
| Bundle ID | `com.tarodan.app` |
| ASC app (prod) | `6786614139` |
| ASC app (staging) | `6794634529` |
| Apple Team | `P2628CQK26` |
| EAS projesi | `a1d4149d-bbbc-49a8-9a26-d2b81cd842d3` (`mki19xcis-organization`) |

---

## 3. Yeni repoya geçiş prod build'i etkiler mi? — Hayır

Uygulama kimliği git reposuna değil, Apple ve EAS tarafındaki kayıtlara bağlı (§2 tablosu).
İmza sertifikaları ve provisioning profile'lar EAS sunucusunda durur. `eas.json`'da
`appVersionSource: "remote"` olduğu için **build numaraları da EAS'ta tutulur** — repo
değişse bile numara dizisi kaldığı yerden devam eder, "build numarası zaten kullanılmış"
reddi alınmaz.

**Doğrulanması gereken (ops):** önceki prod build'lerin bu EAS projesinden çıktığı.
expo.dev'de projenin build geçmişine bakılır. Çıkmadıysa credential'lar taşınmalı.

---

## 4. Branch modeli

| Branch | Rol | Tetiklediği |
|---|---|---|
| `main` | staging | `ci`, `mobile-build`, `maestro-cloud`, `codeql`, `secret-scan` + `mobile-staging` → Tarodan Staging TestFlight |
| `master` | **production** | `codeql`, `secret-scan` + `mobile-production` → **yalnız `app.json` `version` değiştiyse** → Tarodan TestFlight |

Yayın akışı: geliştirme `main`'de → `app.json` `version` yükseltilir → `main` → `master`
merge → prod build.

`mobile-staging.yml` native dosya değişimini (`app.json`, `eas.json`, `package.json`,
`pnpm-lock.yaml`, `app.config.js`, `google-services.json`, `ios/`, `android/`, `plugins/`,
`patches/`, `credentials/`) full build sayar; değilse OTA gönderir.

---

## 5. Kod değişikliği

Tek dosya: `.github/workflows/mobile-production.yml`

1. `eas build --platform all --profile production` → **`--platform ios`**
2. "EAS submit — Android (Play internal)" adımı **silinir**

Değişmeden kalanlar: sürüm kapısı (`app.json` `expo.version` HEAD~1 ile karşılaştırılır),
`workflow_dispatch` + `submit` girdisi, `EXPO_TOKEN` guard'ı, `concurrency` grubu,
`timeout-minutes: 120`.

**Onay kapısı eklenmez** — TestFlight zaten iç test ortamı; App Store'a çıkmak ayrı bir
manuel adım.

### Neden platform sabit, ayar düğmesi değil

Değerlendirilen alternatifler: (a) workflow input'u ile platform seçimi, (b) ayrı bir
`mobile-production-android.yml`. İkisi de bugün kullanılmayacak bir mekanizma üretiyor.
Android geri eklenirken tek satır değişecek — YAGNI.

---

## 6. Devreye alma sırası

| # | Adım | Beklenen sonuç |
|---|---|---|
| 1 | `main`'i push et | 29 commit'lik P0 işi uzağa gider; native dosyalar değiştiği için staging **full build** → Tarodan Staging TestFlight. Elle test buradan yapılır |
| 2 | `master`'ı `main`'den aç ve push et | `version` değişmediği için prod build **tetiklenmez** (güvenli) |
| 3 | `workflow_dispatch` → `submit: false` | Prod profiliyle deneme build'i. İmza/credential/EAS zinciri doğrulanır, TestFlight'a **hiçbir şey gitmez** |
| 4 | Prod API canlı olunca: `version` 1.0.0 → 1.0.1, `main` → `master` merge | Gerçek prod yayını |

Adım 3 yeşil dönerse hat çalışıyor demektir.

---

## 7. Android planı (bu turda uygulanmaz)

iOS hattı çalıştıktan sonra sırasıyla:

| Adım | Kimde | Not |
|---|---|---|
| Play Console'da uygulama + `com.tarodan.app` paketi | Sen / Murat | |
| Play service account JSON → `eas credentials` ile EAS'a yüklenir | Sen | Repoya **konmaz** |
| Firebase'e `com.tarodan.app.staging` paketi kaydedilir | Sen | Ardından `google-services.json` **yeniden indirilir** — hem `com.tarodan.app` hem `com.tarodan.app.staging` client'ını içermeli. Tek client'lı dosya staging Gradle build'ini "No matching client found" ile keser |
| Workflow'a `--platform android` + `eas submit --platform android --profile production` geri eklenir | Geliştirme | Tek satır |

`eas.json` `submit.production.android.track: "internal"` zaten hazır.

---

## 8. Doğrulama

- Değiştirilen workflow'un YAML'ı geçerli (GitHub Actions parse etmeli).
- **Asıl doğrulama adım 3'tür**: submit'siz prod build'in yeşil dönmesi. Bundan önceki
  hiçbir statik kontrol imza zincirinin çalıştığını kanıtlamaz.
- Adım 2'den sonra `master` push'unun prod build tetiklemediği Actions sekmesinden teyit
  edilir (sürüm kapısının çalıştığının kanıtı).

**Not:** `ci.yml` (lint + tsc + jest) `main` push'unda ve `main`/`master`'a açılan PR'larda
çalışır; **`master` push'unda çalışmaz**. `master`'a yalnız `main`'den merge ile kod geldiği
sürece bu bir boşluk değil — kod `main`'de zaten test edilmiş olur. `master`'a doğrudan push
edilirse testler atlanır; disiplin olarak `master`'a elle commit atılmamalı.

---

## 9. Bu iş bitse de açık kalanlar

| Açık | Etki |
|---|---|
| **Production API 500** (`tarodan.com.tr/api/*`) | Gerçek yayının önkoşulu. Prod build'i şimdi TestFlight'a gönderilirse uygulama tamamen ölü görünür — bu yüzden adım 4 API'ye bağlı |
| **AASA + `assetlinks.json` 404** (her iki domain) | Universal link çalışmaz; custom scheme (`tarodan://`) çalışır |
| EAS proje sürekliliği | §3 — expo.dev'den teyit |
| Apple ASC API key | `eas submit` için şart; `eas credentials`'tan teyit |

---

## 10. Kapsam dışı

- GitHub `production` Environment / onay kapısı (bilinçli karar).
- App Store'a (TestFlight ötesi) otomatik yayın — manuel kalır.
- Android build/submit uygulaması (§7 yalnız plan).
- Prod backend'in ayağa kaldırılması — mobil reponun işi değil.
