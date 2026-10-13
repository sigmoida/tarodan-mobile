# Tarodan Mobile — Android yayın kılavuzu

Android, iOS ile **aynı iki uygulamalı modelle** yayınlanır. Bu dosya kurulumun
tamamını sırasıyla anlatır. Her adımda **Kim** sütunu işi kimin yapacağını söyler:

- **Kullanıcı** — Play Console, Firebase, Google Cloud ve `eas` CLI hesabı gerektiren
  elle yapılan iş (hesap sahibi: Murat).
- **CI** — GitHub Actions; kullanıcı gerekli bayrağı/anahtarı kurduktan sonra kendisi koşar.
- **Kod** — bu repoda zaten yapıldı (bu dalda), kullanıcı bir şey yapmaz.

Genel yayın akışı: [`RELEASE.md`](./RELEASE.md) · EAS hesap/secret kurulumu:
[`../SECRETS_SETUP.md`](../SECRETS_SETUP.md) · Deep link: [`deep-links.md`](./deep-links.md).

---

## 1. İki uygulamalı model

| | Production | Staging |
| --- | --- | --- |
| Paket adı | `com.tarodan.app` | `com.tarodan.app.staging` |
| Uygulama adı | Tarodan | Tarodan (Staging) |
| Play'de | Ayrı uygulama | Ayrı uygulama |
| EAS build profili | `production` (AAB) | `staging` (AAB) · `preview` (ad-hoc APK) |
| Play kanalı | internal → closed → open → production | **yalnız internal** |
| Firebase projesi | `tarodan-c1290` | `tarodan-staging` |
| `google-services.json` | repoda `./google-services.json` | repoda `./google-services.staging.json` |
| API | `https://tarodan.com.tr/api` | `https://staging.tarodan.com.tr/api` |
| App Links host'u | `tarodan.com.tr` | `staging.tarodan.com.tr` |
| `assetlinks` dosyası | `assetlinks.json` | `assetlinks.staging.json` |

Paket adını `app.config.js` seçer: `EXPO_PUBLIC_ENVIRONMENT=preview` olan her build
(`preview`, `staging`, `maestro` profilleri) `.staging` alır; `production` ve
`development` değişmez. Staging uygulaması **yalnız staging host'unu** dinler.
Production host'unu da dinleseydi iki uygulama yan yana kurulu cihazda her
`tarodan.com.tr` linki "hangi uygulama?" seçicisi çıkarırdı.

**`preview` profili kararı:** ad-hoc APK olarak kalır ve staging paketini
(`com.tarodan.app.staging`) üretir. Sebep: paket adı profile değil
`EXPO_PUBLIC_ENVIRONMENT`'a bağlı, `preview` zaten staging API'sine bakıyor ve
APK production'ın yanında kurulabilmeli. Sonucu: `preview` APK'sı da staging
`google-services.json`'ını kullanır (aynı repo dosyası).

**`maestro` profili** `preview`'dan türer, yani Android'de o da
`com.tarodan.app.staging` olur (`maestro/app-id.sh android staging` bunu döner).
Staging dosyası repoda durduğu için `maestro` EAS ortamına ayrıca bir şey
yüklemek gerekmez.

---

## 2. Play test kanalları

| Kanal | Kim kurar | Sınır | İnceleme | Tarodan'da kullanım |
| --- | --- | --- | --- | --- |
| **Internal testing** | E-posta listesindeki testçiler | 100 kişi | Genelde yok, dakikalar içinde | Staging (hep), Production (ilk doğrulama) |
| **Closed testing** | Liste / Google Grubu ile davet | Davet edilen listeler | Var | Production — **12 testçi / 14 gün** kuralı için |
| **Open testing** | Play'de bağlantıyı bulan herkes | Sınırsız | Var | İsteğe bağlı, ön yayın |
| **Production** | Herkes | — | Var | Production, kuralı geçtikten sonra |

`eas.json` submit hedefleri: `submit.production.android` ve
`submit.staging.android` → ikisi de `track: internal`. Daha ileri kanallara
terfi **Play Console'dan elle** yapılır (aynı AAB'yi yeniden yüklemeye gerek yok:
Internal → Promote release → Closed/Production).
`releaseStatus: completed` (staging) internal testçilere inceleme beklemeden açar.
Uygulama Play'de hâlâ "taslak" (draft) durumdaysa API `completed` kabul etmez
("Only releases with status draft may be created on draft app"); ilk elle
yüklemeden sonra bu durum kalkar. Kalkmazsa geçici olarak
`eas submit --profile staging` yerine yüklemeyi Console'dan yapın.

---

## 3. Kişisel hesap kuralı: 12 testçi / 14 gün

Play hesabı **kişisel** (organizasyon değil). Kişisel hesaplarda production'a
çıkmadan önce **Closed testing**'de en az **12 testçi**nin **kesintisiz 14 gün**
uygulamaya dahil kalması gerekir; ardından Console'da "Apply for production"
başvurusu yapılır ve Google yanıt verir.

- Kural **yalnız `com.tarodan.app`** (production uygulaması) için geçerlidir.
  Staging hiçbir zaman production'a çıkmaz, bu kural onu ilgilendirmez.
- 12 kişi **opt-in** etmiş (testçi bağlantısından katılmış) olmalı; yalnız listeye
  eklemek yetmez. 14 gün boyunca katılan sayısı 12'nin altına düşmemeli; erken
  ayrılan olursa sayaç bozulabilir, bu yüzden 12'den fazla (örn. 15-20) testçi
  toplayın.
- Testçiler Google hesabı e-postası ile eklenir. Mümkünse bir Google Grubu kullanın.
- Süreyi kısaltan bir yol yok; takvimi buna göre kurun. **Kullanıcı** yapar.

---

## 4. Adım adım kurulum (sıra önemli)

| # | İş | Kim |
| --- | --- | --- |
| 1 | Play Console'da iki uygulama oluştur: "Tarodan" (`com.tarodan.app`) ve "Tarodan (Staging)" (`com.tarodan.app.staging`). Paket adı **sonradan değişmez**. | Kullanıcı |
| 2 | Firebase'de staging projesi + Android uygulaması (Bölüm 7); `google-services.staging.json` repoda (yapıldı) | Kullanıcı |
| 3 | Play service account + EAS'e yükleme (Bölüm 6) | Kullanıcı |
| 4 | Her paket için ilk AAB'yi **elle** yükle (Bölüm 5) | Kullanıcı |
| 5 | Play App Signing parmak izlerini al, `fingerprints.json`'ı doldur (Bölüm 10) | Kullanıcı |
| 6 | Mağaza kayıt formları (Bölüm 11) | Kullanıcı |
| 7 | FCM V1 anahtarlarını EAS'e yükle (Bölüm 8) | Kullanıcı |
| 8 | Google girişi: OAuth istemcileri → bayrağı aç (Bölüm 9) | Kullanıcı |
| 9 | `assetlinks` dosyalarını web'de yayınla | Kullanıcı üretir (`pnpm wellknown:gen`), web/infra yayınlar |
| 10 | `ANDROID_RELEASE_ENABLED` değişkenini aç (Bölüm 12) | Kullanıcı; sonrası CI |
| 11 | Closed test → 12 testçi / 14 gün → production başvurusu | Kullanıcı |

---

## 5. İlk AAB elle yüklenir

Play Developer API bir uygulamanın **ilk sürümünü oluşturamaz**: uygulama
Console'da ilk kez elle bir AAB alana kadar API/`eas submit` "Package not found"
benzeri hatayla düşer. Bu iş her paket için bir kez yapılır.

1. AAB'yi üret (**Kullanıcı**, yerel terminalde; ilk çalıştırmada EAS Android
   keystore'unu soruyla oluşturur — etkileşimli olmalı):

   ```bash
   eas build --platform android --profile staging      # com.tarodan.app.staging
   eas build --platform android --profile production   # com.tarodan.app
   ```

   Staging için repo kökündeki `google-services.staging.json` kullanılır (Bölüm 7);
   dosya (ve yedek EAS değişkeni) yoksa `app.config.js` build'i **açık bir hatayla**
   durdurur, production dosyasına sessizce düşmez.
2. EAS build sayfasından `.aab` dosyasını indir.
3. Play Console → ilgili uygulama → **Test and release → Testing → Internal
   testing → Create new release** → AAB'yi yükle. Karşılaşılan ilk istekte
   **Play App Signing**'e katıl (zorunlu, Bölüm 6).
4. Testçi e-posta listesini oluştur ve yayınla. Staging için bu listenin tamamı
   iş; production için de 14 günlük süreç Bölüm 3'te.
5. Bundan sonra `eas submit` / CI sürümleri API ile yükleyebilir (**CI**).

---

## 6. Play App Signing ve service account

### Play App Signing (zorunlu)

Yeni uygulamalar AAB ile yayınlanır ve imzalama anahtarını Google tutar. EAS'in
ürettiği keystore yalnızca **upload anahtarıdır**. Sonuçlar:

- Mağazadan inen APK'yı Google'ın **App signing key**'i imzalar; parmak izi
  EAS keystore'undan farklıdır. `assetlinks.json` ve Google girişi **iki**
  parmak izine de ihtiyaç duyar (Bölüm 9, 10).
- EAS keystore'u **paket adı başına** üretilir: `com.tarodan.app.staging`'in
  yükleme anahtarı production'ınkinden farklıdır (`fingerprints.json`'daki
  `eas_upload_keystore` production, `staging_eas_upload_keystore` staging).
- Upload anahtarı kaybolursa Play Console'dan sıfırlama istenebilir; yine de
  `eas credentials` yedeğini alın.

### Service account (`eas submit` için)

Anahtar **repoya konmaz**; EAS sunucusunda durur (`eas.json`'da
`serviceAccountKeyPath` yok ve test bunu kilitler).

1. **Kullanıcı** — Google Cloud Console → bir proje seç → **IAM & Admin →
   Service Accounts → Create** (ör. `play-publisher`). Rol vermek gerekmez.
2. **Kullanıcı** — aynı projede **Google Play Android Developer API**'yi etkinleştir.
3. **Kullanıcı** — service account → **Keys → Add key → JSON** → dosyayı indir.
4. **Kullanıcı** — Play Console → **Users and permissions → Invite new users** →
   service account e-postasını gir → **her iki uygulama için** şu izinleri ver:
   *Release apps to testing tracks*, *Release to production, exclude devices, and
   use Play App Signing*, *View app information and download bulk reports*.
5. **Kullanıcı** — EAS'e yükle (iki paket için aynı anahtar kullanılabilir, her
   birine ayrı atanır):

   ```bash
   eas credentials --platform android
   # build profili: production → Google Service Account → Manage your Google Service
   #   Account Key for Play Store Submissions → Set up → JSON'u göster
   # sonra profil: staging için aynısını tekrarla
   ```

   Anahtar dosyasını sonra silin; repoya girmemeli (`*-firebase-adminsdk-*.json`
   zaten `.gitignore`'da, Play anahtarı için ek önlem alın).

Play Console API izinleri bazen yayılması ~dakikalar sürer; ilk `eas submit`
"permission denied" derse bekleyip tekrar deneyin.

---

## 7. Firebase: staging için ayrı proje ve `google-services.json`

Staging ve production **ayrı Firebase projelerindedir**:

| Paket | Firebase projesi |
| --- | --- |
| `com.tarodan.app` | `tarodan-c1290` |
| `com.tarodan.app.staging` | `tarodan-staging` |

Gradle google-services eklentisi, `google-services.json` içinde derlenen paketin
istemcisi yoksa build'i durdurur. Production dosyası (`./google-services.json`,
yalnız `com.tarodan.app`) staging paketini içermez; bu yüzden staging **kendi
dosyasını** kullanır.

1. **Kullanıcı** — Firebase Console → `tarodan-staging` → **Project settings →
   Add app → Android** → paket adı `com.tarodan.app.staging` → `google-services.json`'ı indir.
2. **Dosya repoda** — indirilen dosya repo köküne `google-services.staging.json`
   adıyla konur (yapıldı; proje `tarodan-staging`, paket `com.tarodan.app.staging`).
   Firebase istemci yapılandırması gizli bilgi sayılmaz; production dosyası da
   zaten repoda.
3. **Kod** — `app.config.js` staging'de sırayla şunu seçer:
   1. repo kökünde `./google-services.staging.json` (**varsayılan**)
   2. `GOOGLE_SERVICES_JSON_STAGING` (EAS file değişkeni) — **yalnız repo dosyası
      yoksa** yedek
   3. ikisi de yoksa: Android build bağlamında (EAS Android build, `expo run:android`,
      `expo prebuild` Android'i kapsıyorsa) **açık hata**. iOS build'i, `eas update`
      (OTA) ve `expo start` Android dosyasına dokunmadığı için etkilenmez.

   Dosya Android native bağlamında okunabiliyorsa içinde `com.tarodan.app.staging`
   istemcisi olduğu da doğrulanır; yanlış dosya (örn. production'ınki) Gradle'dan
   önce yakalanır.

**Neden repo dosyası önde (OTA fingerprint):** `expo-updates` fingerprint'i
Android'de bu dosyanın **içeriğini** hash'ler (yolunu değil; ölçüldü). EAS build'i
ile `eas update` job'u aynı içeriği görmezse runtime fingerprint'i eşleşmez ve
staging OTA'ları Android staging cihazlarına hiç ulaşmaz. OTA job'unda EAS file
değişkeni yoktur, repo dosyası her zaman vardır. Dosya yoksa hash da değişir
(`e49478f…` ↔ `9ee3e91…`). Bu yüzden repo dosyası her yerde aynı kaynaktır.

**EAS değişkeni (isteğe bağlı yedek):** `GOOGLE_SERVICES_JSON_STAGING` `preview`
ortamında zaten yüklü ve repo dosyasıyla **aynı içerikte**. Repo dosyası yerindeyken
okunmaz. Dosyayı değiştirirseniz değişkeni de aynı içerikle güncelleyin, yoksa
dosya bir gün silinirse build farklı içerikle sessizce devam eder (güncelleme:
`eas env:update`, tip `file`, değer `./google-services.staging.json`).

**`.gitignore` kararı:** `google-services.staging.json` **ignore edilmez**.
Gerekçe: (a) `google-services.json` zaten repoda (Firebase Android yapılandırması
düşük hassasiyetlidir); (b) EAS build'leri `.gitignore`'u dikkate alarak arşiv
çıkarır, ignore edilen dosya bulutta görünmez; (c) `.gitignore` değişikliği runtime
fingerprint'ine girer.

**Not (OTA / CI):** `.github/workflows/mobile-staging.yml` içindeki `native_re` listesi
bugün yalnız `google-services.json` içeriyor; `google-services.staging.json` de
eklenmeli ki dosya değişince OTA "native değişti" uyarısı versin (CI sahibine iletildi).

---

## 8. FCM V1 anahtarları (paket başına)

Android push bildirimi (expo-notifications) için EAS'e her paketin FCM V1
service account anahtarı gerekir. Anahtar paketin **kendi Firebase projesinden**
alınır:

| Paket | Anahtarın alındığı proje |
| --- | --- |
| `com.tarodan.app.staging` | `tarodan-staging` |
| `com.tarodan.app` | `tarodan-c1290` |

1. **Kullanıcı** — Firebase Console → ilgili proje → **Project settings → Service
   accounts → Generate new private key** (JSON).
2. **Kullanıcı** — EAS'e yükle (paket EAS'te profile bağlıdır):

   ```bash
   eas credentials --platform android
   # build profili: staging  → Google Service Account → FCM V1 key → Set up → tarodan-staging JSON'u
   # build profili: production → aynısı, tarodan-c1290 JSON'u
   ```

3. Anahtarları repoya koymayın (`*-firebase-adminsdk-*.json` `.gitignore`'da).
   Yanlış projenin anahtarı yüklenirse push token'ı alınır ama bildirim
   **sessizce gelmez** — iki paketin karıştırılmadığını bir test bildirimiyle doğrulayın.

---

## 9. Google ile giriş (Android)

`@react-native-google-signin` Android'de, Google Cloud'da **paket adı + imza
SHA-1** eşleşen bir **Android OAuth istemcisi** ister. Eksikse build düşmez;
giriş çalışma anında `DEVELOPER_ERROR` (kod 10) ile ölür.

Bu istemciler Firebase projelerinde **değil**, mobil web client ID'nin bulunduğu
**GCP projesinde (`243308404313`)** oluşturulur — iki paket için ayrı ayrı
(Firebase'de otomatik oluşan istemciler buna sayılmaz):

| OAuth Android istemcisi | Paket | SHA-1'ler |
| --- | --- | --- |
| #1 | `com.tarodan.app` | upload (EAS) + Play App Signing |
| #2 | `com.tarodan.app.staging` | upload (EAS, staging'e ait) + Play App Signing |

Her paket için **iki** SHA-1 gerekir (bir istemciye birden çok SHA-1 eklenemez;
her SHA-1 için ayrı Android istemcisi oluşturulur):

- **Upload SHA-1:** `eas credentials -p android` → build profili → Keystore →
  `SHA1 Fingerprint`. EAS/preview APK'ları ve ilk testler bununla imzalı.
- **Play App Signing SHA-1:** Play Console → ilgili uygulama → Test and release
  → **App integrity → App signing key certificate → SHA-1**. Mağazadan inen
  sürümler bununla imzalı.

Uygulama `webClientId`'yi `serverClientID` olarak gönderir; token'ın `aud`'u web
client ID'dir (bkz. `RELEASE.md` "Google sign-in audience"). Android istemcileri
eklemek API tarafında yeni bir `aud` gerektirmez.

**Bayrak ne zaman açılır:** `EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED` şu an `eas.json`'daki
tüm profillerde `"false"`. Şunların hepsi tamamlanınca ilgili profilde `"true"`
yapılır (**Kullanıcı** karar verir; kodu bir PR ile değiştirir ve
`src/config/__tests__/easProfiles.test.ts` içindeki "false" beklentisini
günceller):

1. İlgili paketin iki Android OAuth istemcisi (upload + Play) oluşturuldu,
2. İlk AAB Play'e yüklendi ve Play App Signing SHA-1 alındı,
3. Gerçek cihazda, **Play'den kurulan** sürümle giriş denendi.

Staging'i (upload SHA-1 yeterliyse) önce açabilirsiniz; production'ı Play App
Signing SHA-1 hazır olmadan açmayın. Bayrak değişince native değil JS olsa da
`eas.json` değiştiği için fingerprint değişir: yeni build gerekir.

---

## 10. `assetlinks` parmak izleri

`https://<host>/.well-known/assetlinks.json` Android App Links'i doğrular.
Üretim: `pnpm wellknown:gen` (tek kaynak `scripts/gen-wellknown.mjs`; girdi
`docs/wellknown/fingerprints.json`). İki dosya çıkar:

| Dosya | Yayın yeri | Paket |
| --- | --- | --- |
| `docs/wellknown/assetlinks.json` | `https://tarodan.com.tr/.well-known/assetlinks.json` | `com.tarodan.app` |
| `docs/wellknown/assetlinks.staging.json` | `https://staging.tarodan.com.tr/.well-known/assetlinks.json` | `com.tarodan.app.staging` |

`fingerprints.json` alanları (SHA-**256**, büyük harf hex, `:` ayrılmış):

| Alan | Paket | Durum | Nereden |
| --- | --- | --- | --- |
| `eas_upload_keystore` | `com.tarodan.app` | **dolu** | `eas credentials -p android` |
| `play_app_signing` | `com.tarodan.app` | **boş (bilerek)** | Play Console → App integrity → App signing key SHA-256 |
| `staging_eas_upload_keystore` | `com.tarodan.app.staging` | **boş (bilerek)** | ilk staging build'inden sonra `eas credentials` |
| `staging_play_app_signing` | `com.tarodan.app.staging` | **boş (bilerek)** | Play Console (Staging) → App integrity |

Kurallar:

- Production'ın EAS parmak izi staging'e **kopyalanmaz**; EAS keystore paket başına üretilir.
- Boş alan dosyaya yazılmaz. Hiç parmak izi olmayan pakete dosya **üretilmez**
  (boş liste yayınlamak doğrulamayı kesin düşürür).
- Play App Signing değerleri **ilk AAB yüklendikten sonra** doldurulur — **Kullanıcı**.
  Doldurmadan production'a çıkmayın: mağazadan kuranlarda App Links düşer.
- Doldurduktan sonra `pnpm wellknown:gen` (sürüm kapısı: `pnpm wellknown:gen:strict`
  yalnız production dosyasını zorunlu tutar) ve çıktıyı web/infra'ya ilet;
  yayında `pnpm wellknown:check` ile doğrula.

---

## 11. Mağaza kayıtları (Play Console)

Hepsini **Kullanıcı** doldurur; production için eksiksiz olmalı, staging (yalnız
internal) için ilk yayına kadar gerekenler yeter.

- **Data Safety (Veri güvenliği):** toplanan/paylaşılan veri türleri — hesap
  bilgisi (ad, e-posta, telefon), adres, ödeme (PayTR üzerinden; kart verisi
  uygulamada tutulmaz), kullanıcı içeriği (fotoğraf, mesaj), cihaz/kimlik
  (push token), çökme/tanılama (Sentry). Veri aktarımda şifreli mi, silme
  talep edilebilir mi alanları doldurulur. Beyan, gerçek SDK davranışıyla
  (Sentry, Firebase, Google Sign-In, expo-notifications) tutarlı olmalı.
- **İçerik derecelendirmesi (IARC anketi):** pazaryeri/kullanıcı içeriği
  (mesajlaşma, ilan) ve gerçek para işlemi sorularını doğru işaretleyin.
- **Hedef kitle ve içerik:** hedef yaş grubu çocuklar **değil** (yetişkin
  alışveriş uygulaması; 18+ öneriliyor); "Families" programı dışında.
- **Reklam beyanı:** uygulama içi reklam/sponsorlu yerleşim (ana sayfa
  banner/hotspot reklamları) **var**; "Contains ads" işaretlenir. Üçüncü taraf
  reklam SDK'sı yoksa bile satıcı reklamları da beyan kapsamındadır — kullanıcı
  son kararı verir.
- **Gizlilik politikası URL'si:** herkese açık, canlı bir URL (aynı bağlantı iOS
  App Store Connect'te de kullanılıyor).
- **Hesap silme:** hesap oluşturulabilen uygulamalarda Play, uygulama içi silme
  yolunun **yanında** herkesin erişebileceği bir **web hesap silme URL'si** ister
  (Data Safety → "Data deletion" alanına girilir). URL giriş gerektirmeden
  talep verebilmeli; adresi web ekibinden teyit edin (bu repo bir URL tanımlamıyor).
- **Uygulama erişimi (App access):** giriş gerektiren bölümler için inceleme
  ekibine **test hesabı** verin (Review Notes ile aynı hesap).
- **Diğer beyanlar:** finansal özellikler (ödeme/cüzdan), haber, sağlık, hükümet
  = hepsi "hayır"/geçerli değil olarak gözden geçirilir; hedef API seviyesi
  Expo SDK 54 ile karşılanır.
- **Mağaza girdisi:** kısa/uzun açıklama (TR), ikon, öne çıkan görsel, en az 2
  telefon ekran görüntüsü.

---

## 12. CI: `ANDROID_RELEASE_ENABLED`

Workflow'lar `.github/` altında ayrıca yazılır (bu dosyanın kapsamı dışında).
Android build/submit adımları `ANDROID_RELEASE_ENABLED` değişkeni açılana kadar
çalışmaz (güvenli no-op).

1. **Kullanıcı**, şu öncesi tamamlanmadan değişkeni **açmaz**: ilk AAB'ler elle
   yüklendi (Bölüm 5), service account EAS'te (Bölüm 6), `google-services.staging.json`
   repoda (Bölüm 7), FCM anahtarları (Bölüm 8).
2. **Kullanıcı** — GitHub → repo → *Settings → Secrets and variables → Actions →
   **Variables*** → `ANDROID_RELEASE_ENABLED` = `true`
   (`gh variable set ANDROID_RELEASE_ENABLED --body true`). `EXPO_TOKEN` zaten secret olarak gerekli.
3. **CI** — staging: `main`'e gelen native değişiklik/`workflow_dispatch` →
   `eas build --profile staging --platform android` → `eas submit --profile staging`
   (Play internal, `com.tarodan.app.staging`).
   production: `master`'da `expo.version` değişince → `eas build --profile production
   --platform android` → `eas submit --profile production` (Play internal,
   `com.tarodan.app`). Closed/open/production terfisi yine Console'dan **Kullanıcı**.
4. `versionCode` EAS'te uzaktan, paket başına artar (`appVersionSource: remote`).
   İki uygulamanın sayaçları bağımsızdır.

---

## 13. Bilinen sınırlar

- Staging Android'in force-update ekranı (`src/constants/appUpdate.ts`) production
  Play sayfasına gider; internal track'te anlamlı bir mağaza bağlantısı yoktur.
  Staging API'de minimum sürüm yükseltilmedikçe tetiklenmez.
- `releaseStatus: completed` taslak uygulamada reddedilir (Bölüm 2).
- `EXPO_PUBLIC_GOOGLE_ANDROID_ENABLED` kapalıyken Android'de Google giriş seçeneği
  hiç sunulmaz (`src/services/googleSignin.ts`); bayrak Bölüm 9'daki koşullarla açılır.
