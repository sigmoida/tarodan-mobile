# App Store Review reddi — 16 Temmuz 2026

Submission ID `d11dc2d7-f525-4d31-84a6-d44587a3125c` · İncelenen sürüm `1.0 (2)` ·
Cihaz: iPad Air 11" (M3), iPadOS 26.5.2

Üç madde: 5.1.2(i) ATT, 5.1.1(v) doğum tarihi, 2.1(a) login ağ hatası.

---

## 1. Guideline 2.1(a) — login'de ağ hatası — **ÇÖZÜLDÜ (kök sebep kanıtlandı)**

**Kök sebep.** İncelenen build `7ed6c008-329d-4f28-a83d-76c566e75467` (2 Temmuz 2026,
`production` profili, commit `0ede55b7`). O tarihte `eas.json` production profili
şunu gömüyordu:

    EXPO_PUBLIC_API_URL = https://tarodan.shop/api

`tarodan.shop` için **hiçbir DNS kaydı yok** (29 Ağustos 2026'da yeniden doğrulandı:
`dig +short tarodan.shop A` boş, `curl` http=000). Yani uygulamanın her isteği DNS
aşamasında düşüyordu; axios `response`'suz bir hata fırlatıyor ve
`app/(auth)/login/_hooks/useLogin.ts:105` bunu ham `e.message` — "Network Error" —
olarak ekrana basıyor. Reviewer'ın gördüğü tam olarak budur.

**Düzeltme.** Commit `d8c6fbb` (30 Temmuz 2026) ölü domaini canlı adresle değiştirdi.
Bugünkü durum doğrulandı:

| Adres | /api/health | POST /api/auth/login |
| --- | --- | --- |
| `tarodan.com.tr` | 200 | 401 (beklenen) |
| `staging.tarodan.com.tr` | 200 | 401 (beklenen) |

**Regresyon koruması.** `src/config/__tests__/apiUrl.test.ts` ölü domaini ve
profil adreslerini zaten pinliyordu; buna yeni bir vaka eklendi: *store dağıtımı
yapan her profil* tanımlı, `https`, canlı domain ailesinden bir `EXPO_PUBLIC_API_URL`
taşımak zorunda. Bu, adresin tamamen **eksik** kalması vakasını da kapatır — o
durumda `src/lib/api/client.ts:15-31` sessizce `http://localhost:3001/api`'ye düşer
ve belirti birebir aynı olurdu.

**Kalan iş:** yeni bir production build alıp iPad'de login akışını bizzat doğrulamak.

---

## 2. Guideline 5.1.2(i) — ATT — **ÇÖZÜLDÜ (App Privacy etiketi düzeltildi)**

Bağımlılıklarda reklam ağı, attribution veya veri simsarı SDK'sı yok. Tek üçüncü
taraf `@sentry/react-native` (crash reporting). `POST /products/:id/click` birinci
taraf analitiktir. Apple'ın "tracking" tanımına giren hiçbir şey yok.

**Yapılacak (App Store Connect, Account Holder/Admin):** App Privacy → listelenen
altı kalemin (Payment Info, Physical Address, Other Contact Info, Phone Number,
Coarse Location, Email Address) her birinde **Used for Tracking = No**. "Linked to
You" olduğu gibi kalabilir.

ATT prompt'u **eklenmemeli** — takip etmeyen bir uygulamada izin istemek Apple'ın
kendi kılavuzuna aykırıdır.

---

## 3. Guideline 5.1.1(v) — zorunlu doğum tarihi — **MOBİL + BACKEND HAZIR, DEPLOY BEKLENİYOR**

Mobil taraf: `app/(auth)/register/_lib/schema.ts:31-34` alanı zorunlu kılıyor,
`app/(auth)/register/_components/RegisterForm.tsx:118-127` zorunlu olarak render ediyor.

Backend de zorunlu tutuyor — staging'e alanı atlayan (ve kasten geçersiz olduğu için
kayıt oluşturmayan) bir istekle ölçüldü:

    POST https://staging.tarodan.com.tr/api/auth/register
    → 400 · "Geçerli bir tarih giriniz (YYYY-MM-DD)"

Bu yüzden alanı yalnız mobilde opsiyonel yapmak **kaydı tamamen bozar**. Sıra
zorunludur: önce backend `birthDate`'i opsiyonel yapmalı, sonra mobil.

**Önerilen çözüm (B):** kayıtta opsiyonel; doğum tarihi gerçekten gerektiği anda
(satıcı olma / ödeme-KYC adımı) zorunlu istenir. Apple'ın "non-essential özellik için
isteyebilirsin ama opsiyonel olmalı" formülüne birebir uyar ve 18+ kapısını korur.

**Alternatif (A):** kayıttan tamamen çıkar, yerine 18+ onay kutusu. Kişisel veri
toplamaz, Apple açısından en temiz yol; yaş verisine ödeme tarafında ihtiyaç varsa
uygun değil.

### Mobil tarafta yapılanlar (B seçildi)

- `app/(auth)/register/_lib/schema.ts` — `birthDate` artık `.optional()`. Boş
  bırakılabilir; **girilirse** hâlâ `YYYY-MM-DD` ve 18+ olmak zorunda.
- `app/(auth)/register/_hooks/useRegister.ts` — alan boşsa payload'a **hiç
  konmuyor**. `''` göndermek sunucuda "geçerli bir tarih giriniz" hatası verirdi.
- `app/(auth)/register/_components/RegisterForm.tsx` — etiket artık
  "Doğum Tarihi (İsteğe bağlı)".
- `app/(auth)/register/__tests__/schema.test.ts` — dört yeni vaka: alan yok /
  boş string geçerli, girilmişse 18+ ve biçim kuralları hâlâ geçerli.

### Backend tarafında yapılanlar

`tarodan-app` deposunda, `origin/master`'dan açılan `fix/register-birthdate-optional`
dalı (commit `5f367de1c`, worktree: `/tmp/tarodan-api-bd`):

- `RegisterDto` — `@IsOptional()` + `birthDate?: string` + `ApiPropertyOptional`.
  `IsAdultConstraint` boş değeri zaten geçiriyordu; tek eksik `@IsDateString`'ti.
- `AuthRegistrationService` — `birthDate` yokken atılan
  `BadRequestException(server.auth.birthDateRequired)` kaldırıldı; 18+ kontrolü
  yalnız değer geldiğinde uygulanıyor.
- `prisma.user.create` — değer yoksa `birthDate: null`. Kolon zaten `DateTime?`,
  **şema değişikliği ve migration gerekmiyor**.
- Yeni `register-birthdate-optional.spec.ts` — 4 vaka, mutasyonla doğrulandı.

### ⚠️ Sıra: önce backend deploy, sonra mobil build

Backend bu dal deploy edilene kadar `birthDate`'i zorunlu tutmaya devam eder.
Mobil build önce çıkarsa alanı boş bırakan kullanıcının kaydı `400` ile düşer.
Deploy sonrası doğrulama komutu:

    curl -s -X POST https://staging.tarodan.com.tr/api/auth/register \
      -H 'Content-Type: application/json' -H 'Accept-Language: tr' \
      -d '{"username":"zz","displayName":"z","email":"not-an-email","password":"1"}'

Yanıttaki hata listesinde **"Geçerli bir tarih giriniz (YYYY-MM-DD)" kalmamalı**
(diğer hatalar kalır — payload kasten geçersizdir, kayıt oluşturmaz).

---

## Gönderim sırası

1. ~~App Privacy etiketini düzelt (madde 2).~~ **Tamamlandı** — "Data Used to
   Track You" bölümü kaldırıldı, Coarse Location hatalı işaretiyle birlikte çıktı.
2. Backend dalını (`fix/register-birthdate-optional`) merge + deploy et, aşağıdaki
   curl ile doğrula (madde 3). Mobil build bundan SONRA çıkmalı.
3. Yeni production build + iPad'de login doğrulaması (madde 1).
4. Üçüne birden Resolution Center'dan tek cevap; Review Notes'a test hesabı ve
   alıcı/satıcı senaryosunu yaz.

---

## Sonraki tur için risk taraması (29 Ağu 2026)

Apple aynı uygulamayı ikinci turda **farklı** maddelerden reddedebiliyor. Bu redde
girmemiş ama pazar yerlerinde sık takılan maddeler tarandı:

| Madde | Gereklilik | Durum |
| --- | --- | --- |
| 5.1.1(v) | Hesap açılabiliyorsa uygulama içinden **hesap silme** | ✅ Profil ekranında buton → `userApi.deleteAccount()` → logout. Gerçek silme, "bize yazın" değil. |
| 1.2 | Kullanıcı içeriğinde **şikayet** mekanizması | ✅ `userReportsApi` (`src/lib/api/user.ts:139`) |
| 1.2 | Kullanıcı **engelleme** | ✅ Mesaj başlığında engelle (`app/messages/[threadId]/_hooks/useMessageThread.ts:178`) |
| 3.1.1 | Dijital içerik IAP ile satılmalı | ⚠️ Üyelik/boost PayTR üzerinden satılıyor. Bu redde çıkmadı; fiziksel ürün pazarı olduğu için savunulabilir ama **dijital üyelik** tarafı ileride sorulabilir. |

### Ölü kod / gereksiz izin (redle ilgisiz borç)

- **`expo-camera` hiç kullanılmıyor.** `launchCameraAsync` / `requestCameraPermissions`
  çağrısı yok; paket yalnız `app.json` plugin listesinde duruyor ve
  `NSCameraUsageDescription` ile Android `CAMERA` iznini üretiyor. Fotoğraf akışı
  tamamen `expo-image-picker` üzerinden. Kaldırılabilir.
- **Android `RECORD_AUDIO`** — kodda hiçbir ses/mikrofon API'si yok.
- **Android `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`** — modern
  `expo-image-picker` bunları istemiyor; `WRITE_EXTERNAL_STORAGE` API 30+'ta zaten
  yok sayılıyor.

Üçü de yalnız Android'i etkiliyor ve Android henüz yayınlanmadı, bu yüzden iOS
gönderiminden **sonraya** bırakıldı — şimdi dokunmak gereksiz risk.
