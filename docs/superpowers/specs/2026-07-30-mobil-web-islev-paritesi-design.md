# Mobil ↔ Web İşlev Paritesi + Layout Denetimi — Tasarım

**Tarih:** 2026-07-30
**Branch:** `feat/mobil-api-parite`
**Girdi:** `docs/mobile-parity/` (00–13) + üretilen `docs/mobile-api-reference.html` (295 endpoint)

---

## 1. Amaç

Web (`apps/web`) ve backend'in son halinde bulunan her kullanıcı işlevini mobil
uygulamada da çalışır hale getirmek; ayrıca ekranlardaki layout kaymalarını tek bir
disipline oturtmak.

Kapsam dışı: web'e özgü mekanizmalar (BFF proxy, httpOnly cookie, SSR/ISR, Server
Actions) — parite dökümanlarının "Yapma" bölümleri bağlayıcıdır.

---

## 2. Girdi dökümanlarının doğruluk durumu

Parite matrisi (`13-parity-matrix.md`) kısmen bayat. Bu branch'teki son commit'ler
matristeki bazı P1'leri **zaten kapatmış**. Repo üzerinde doğrulanan gerçek durum:

### Hâlâ açık (doğrulandı)

| Öncelik | Bulgu | Kanıt |
|---|---|---|
| P0 | Kart ödemesi API'de olmayan uca gidiyor | `src/lib/api/checkout.ts:99` → `POST /payments/process-direct` |
| P0 | 2FA girişi yok | `requires2FA` / `twoFactorCode` repoda hiç geçmiyor |
| P0 | Derin bağlantı yapılandırılmamış | `app.json:15` yalnız `scheme: "tarodan"` |
| P0 | Kurumsal davet aktivasyonu yok | `corporate-invitation` repoda hiç geçmiyor |
| P0 | Kurumsal belge ekranları yok | API katmanı `src/lib/api/user.ts:85` var, ekran yok |
| P1 | Üye kupon UI'ı yok | `src/lib/api/cart.ts:53` "bilinçli eklenmedi" notu |
| P1 | E-posta değişikliği / kullanıcı adı talebi yok | `email/request-change`, `me/username` hiç geçmiyor |
| P1 | Telefon doğrulama ekranı yok | `authApi.sendPhoneCode` var (`auth.ts:66`), çağıran ekran yok |
| P2 | Üyelik hakları istemcide sabit | `TIER_LIMITS` (authStore) |
| P2 | `products/:id/click`, `products/popular` çağrılmıyor | — |
| P2 | ~22 ekran menüden erişilemiyor | `13-parity-matrix.md` #15 |
| P2 | Ekranlarda gömülü Türkçe metin | i18n kataloğu hazır |

### Matriste açık görünen ama kapanmış

`ads/active` (`src/lib/api/ads.ts:29`) · misafir kupon doğrulama
(`membership.ts:80`, `app/checkout/_hooks/useCoupon.ts`) · boost `:id/boost/options`
(`products.ts:56`, `BoostModal.tsx`) · `cancel-scheduled-change` (`membership.ts:27`) ·
sepet sunucu aynalama · satıcı fatura yükleme · kurumsal belge **API katmanı**.

---

## 3. Faz 0 — Ortam düzeltmesi (önkoşul)

Domain araştırması sonucu (DNS + HTTP ile doğrulandı):

| Domain | Durum |
|---|---|
| `staging.tarodan.com.tr/api` | **canlı ve sağlıklı** — `app-config` 200, `products` 200 |
| `tarodan.com.tr/api` | site ayakta, API 500 — **production henüz kurulmadı** (bilinen/beklenen) |
| `api.staging.tarodan.shop` | **NXDOMAIN** — app şu an buna bağlı, yani hiçbir API'ye ulaşamıyor |
| `tarodan.shop` | NXDOMAIN (tüm aile ölü) |
| `tarodan.com` | üçüncü tarafa ait site — repo sabitleri (`api.tarodan.com`) yanlış |

`.well-known/apple-app-site-association` ve `assetlinks.json` hiçbir domainde
yayınlanmamış (404).

### Yapılacak

- `.env` ve `eas.json`'da (`preview`, `staging`, `production` profilleri)
  `tarodan.shop` adreslerini değiştir:
  - staging/preview → `https://staging.tarodan.com.tr/api`
  - production → `https://tarodan.com.tr/api` (**henüz canlı değil**; master branch
    CI deploy'u kurulduktan sonra doğrulanacak — bu bir bilinen açık, engelleyici değil)
- `.env.example`'a doğru örnek değerleri yaz.

### Bilinçli olarak dokunulmayacak

`src/constants/legalFacts.ts` içindeki `destek@tarodan.com`, `info@tarodan.com`,
`legal@tarodan.com`, `privacy@tarodan.com`, `seller-support@tarodan.com` ve
`SECRETS_SETUP.md`'deki `api.tarodan.com`. Bunlar hukuki/ops metinlerinde; `.com` mı
`.com.tr` mi olduğu ürün sahibinin kararı. **Teslimde ayrıca raporlanır.**

---

## 4. Faz 1 — P0

### 4.1 Kart ödemesi → `direct-form`

Mevcut `POST /payments/process-direct` API'de yok; kart-verisi sınırı sertleştirmesinde
kaldırıldı ve backend testi varlığını yasaklıyor. Doğru akış (`04-cart-checkout-payment.md` §5):

1. Kart bilgisi **native ekranda** toplanır (Luhn, MM/YY, CVV).
2. `POST /payments/direct-form` → imzalı `{ action, method, fields[], requireCvv, savedCard }`.
3. İki güvenlik kontrolü **zorunlu**:
   - `action` tam olarak `https://www.paytr.com/odeme` (şema + host + path)
   - `fields` içinde ham kart alan adı (`card_number`, `cvv`, `cc_owner`, `expiry_*`) varsa **iptal**
4. Kart alanları istemcide eklenir; WebView ile PayTR'ye POST (`postUrl` / yerel
   auto-submit HTML). `payment_amount` sunucudan geldiği gibi gönderilir, yeniden hesaplanmaz.
5. Dönüş URL'i **prefix** ile yakalanır (`${FRONTEND_URL}/payment/success|fail`),
   navigasyon kesilir, `paymentId`/`guest` ayrıştırılır.
6. `POST /payments/:id/verify` → `completed` olana kadar **max 5 deneme, ~1.2 sn arayla**;
   sonra `GET /payments/:id/status`. Hata yolunda yalnız durum `pending` ise
   `confirm-failed`.
7. WebView kullanıcı tarafından kapatılırsa ödeme **belirsiz** — `status` sorgulanır,
   "başarısız" varsayılmaz.

`paymentAccessToken` güvenli depoda tutulur ve tüm ödeme çağrılarında
`X-Payment-Capability` olarak gönderilir.

**Değişmez:** kart verisi kendi API'mize hiçbir koşulda gönderilmez.

### 4.2 2FA girişi

`POST /auth/login` **200 + `{ requires2FA: true }`** bir hata değil, akış adımıdır.
Kod alanı gösterilir ve aynı e-posta/şifre `twoFactorCode` ile tekrar gönderilir.
Format: `^(?:\d{6}|[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4})$`.

Google/Apple girişinde `TWO_FACTOR_PASSWORD_REQUIRED` (401) → kullanıcı e-posta+şifre
akışına yönlendirilir.

### 4.3 Derin bağlantı

- `app.json`: `ios.associatedDomains` = `applinks:tarodan.com.tr`,
  `applinks:staging.tarodan.com.tr`; `android.intentFilters` (`autoVerify: true`) aynı
  host'lar için; `scheme: "tarodan"` yedek olarak korunur.
- **Yol eşlemesi `src/utils/notificationRoute.ts#toMobileRoute` ile paylaşılır** —
  ikinci bir kopya tutulmaz (DRY, `12-mobile-platform.md` §2).
- `toMobileRoute` eksik yolları için genişletilir: `/verify-email`, `/reset-password`,
  `/corporate/invite`, `/track-order?orderNumber=&email=`.
- `/payment/success` ve `/payment/fail` **bilinçli olarak eşlenmez** — WebView içinde
  yakalanır; uygulama dışına çıkarsa ödeme akışı kopar.

**Sana kalan (ops):** `staging.tarodan.com.tr` ve `tarodan.com.tr` üzerinde
`.well-known/apple-app-site-association` + `assetlinks.json` yayını. Bu yapılmadan
universal link çalışmaz; custom scheme çalışır. Teslimde hatırlatılır.

### 4.4 Kurumsal davet aktivasyonu

`GET /auth/corporate-invitation?token=` → `{ companyTitle, companyEmail, expiresAt }`;
geçersiz/süresi dolmuşta 400 → form gösterilmez, "bağlantı geçersiz" ekranı.
`POST /auth/corporate-invitation/activate` `{ token, username, password }`.

Kullanıcı adı **bir kez belirlenir, değiştirilemez** — formda açıkça yazılır.
Derin bağlantıdan açılır (§4.3'e bağımlı).

### 4.5 Kurumsal başvuru (belgeler)

API katmanı mevcut; ekranlar yok. Zengin akış (`08-membership-corporate.md` §4):

- **Detaylar:** `companyType, taxId, taxOffice, companyCity, companyDistrict,
  bankAccountHolder, iban` → `PATCH .../application`
- **Paydaşlar:** `{ fullName, identityType: tckn|passport, identityNumber? }` +
  paydaş başına ön/arka kimlik yüklemesi
- **Belgeler (7 tür):** `tax_plate, residence_or_invoice, signature_circular,
  trade_registry_gazette, activity_certificate, bank_account_info, contract`
- **Gönder:** `POST .../application/submit`
- **İtiraz:** `POST .../:documentId/appeal { note }` — gerçek form/modal
  (web'in `window.prompt`'u taşınmaz)
- **Kilit kuralı:** `application.status === "under_review"` iken detay formu, paydaş
  formu ve gönder butonu devre dışı; ancak `rejected` / `revision_requested` belgeler
  için yükleme **açık kalır**
- Belge seçici: PDF + görsel, ≤10 MB (görsel seçici değil **belge seçici**)
- `GET /users/me/business-stats` 400'ünde mesajı göster ve doğru ekrana yönlendir

---

## 5. Faz 2 — P1

| İş | Sözleşme |
|---|---|
| Üye kupon UI'ı | `POST /cart/coupon` (kod büyük harfe), `DELETE /cart/coupon`; misafirde mevcut `validate-guest` korunur |
| E-posta değişikliği | `POST /auth/email/request-change { newEmail }` → `POST /auth/email/verify-change { code }` (6 hane); profil formunda e-posta salt okunur |
| Kullanıcı adı talebi | `PATCH /users/me/username`; `GET /auth/username-availability` ile canlı kontrol; yalnız `usernameClaimedAt` boşken göster |
| Telefon doğrulama | `POST /auth/phone/send-code` → `/auth/phone/verify`; doğrulandıysa profilde rozet |
| Üyelik hakları | `TIER_LIMITS` sabiti yerine `GET /users/me` → `membership.tier` ve `GET /membership/me/limits` |
| Tıklama + popüler ray | `POST /products/:id/click` (fire-and-forget), `GET /products/popular` |

---

## 6. Faz 3 — P2

- Menüden erişilemeyen ~22 ekranı profil/ayarlar menüsüne bağla (`payment-methods`,
  `payment-history`, `payments`, `subscription`, `saved-searches`, `discounts`,
  `sales/[id]`, `sayfa/[slug]` + statik içerik sayfaları)
- Gömülü Türkçe metinleri i18n anahtarlarına taşı (katalog hazır)
- `GET /orders/:id/my-review` bağla
- `typing:start` / `typing:stop` yayını

---

## 7. Layout denetimi

Sistematik tarama ve tek disipline oturtma:

1. **Safe area** — `useSafeAreaInsets` / `SafeAreaView` kullanımı tutarlı mı; hangi
   ekranlar insets'i hiç uygulamıyor
2. **Header** — özel header yüksekliği ile `Stack.Screen` header'ı çakışması, çift
   üst boşluk
3. **Tab bar** — tab içi ekranlarda alt padding (liste son öğesinin tab bar altında
   kalması)
4. **Klavye** — `KeyboardAvoidingView` `behavior` platform ayrımı, form ekranlarında
   eksik kullanım
5. **Liste** — `contentContainerStyle` padding vs `ListFooterComponent`, sabit
   `height` yerine `flex` kullanımı; ölçüsü bilinmeyen görsellerde zıplama
6. **Modal** — `ui-native` Modal + insets etkileşimi

Çıktı: bulgu listesi + tekrarlanan kök nedenler için paylaşılan bir layout yardımcısı
(yeni primitive icat etmeden, `@/ui` içinde varsa onu kullanarak). Bulgular
uygulanmadan önce sana raporlanır.

---

## 8. Doğrulama

Her faz sonunda:

- `npx tsc --noEmit` — tracked baseline üzerine **yeni hata yok**
- lint temiz (hardcoded hex/rgba yok, `src/theme/colors` importu yok, manuel form yok)
- dokunulan rotaların jest testleri yeşil + her yeni hook/mantık için test
- P0 başına bir Maestro akışı (ödeme, 2FA girişi, kurumsal onboarding)

Ödeme akışının uçtan uca gerçek doğrulaması **staging'de elle** yapılır (PayTR
production'da `test_mode` başarı callback'ini reddediyor).

---

## 9. Mimari disiplin

`CLAUDE.md` bağlayıcı: ince ekran (<~150 satır), mantık `_hooks/`'ta, sorgu anahtarları
`@/lib/query` merkezî kayıttan, mutation hook'ları snackbar + `invalidateQueries`
sahibi, her modal kendi `useZodForm` + şemasına sahip, tasarım token'ları (`@/theme`),
`@/ui` primitive'leri. `app/offers/` referans uygulama.

Ödeme gibi riskli akışlarda: **tek büyük controller hook'a birebir taşıma**, yeniden
kurgulama değil (`app/checkout/_hooks/useCheckout` deseni).

**iOS donma tuzağı:** mutation'ın `appAlert`'i `ui-native` Modal açıkken çalışırsa iOS
donuyor — modal mutation'dan **önce** kapatılır.

---

## 10. Ürün kararı bekleyen, kapsam dışı

- Satıcı iade gelen kutusu (`GET /refund-requests/seller`) — her iki platformda da yok
- Marka sayfası — web'de yok, parite fazlası olur
- `lost_in_transit` / `other` iade sebepleri — web sunmuyor
- Sepetin tamamen sunucuya taşınması (yerel 24 saatlik son kullanma mobile özgü)
- Reklam alanlarının mobilde nerede gösterileceği (API bağlı, yerleşim kararı yok)

---

## 11. Uygulama planlarına ayrışma

Bu spec tek bir plan için fazla geniş. Uygulama planları faz başına ayrı yazılır:

1. **Plan 1 — Faz 0 + Faz 1 (P0):** ortam düzeltmesi, ödeme ucu, 2FA, derin bağlantı,
   kurumsal davet + belgeler. Sonunda test edilebilir bir sürüm.
2. **Plan 2 — Layout denetimi:** tarama → rapor → düzeltme. Faz 1 ile paralel
   yürütülebilir (dosya çakışması riski düşük; farklı katmanlar).
3. **Plan 3 — Faz 2 (P1)**
4. **Plan 4 — Faz 3 (P2)**

Her plan kendi spec → plan → uygulama turunu tamamlar; sıra bu spec'teki önceliktir.

---

## 12. Bilinen açıklar

- Production API (`tarodan.com.tr/api`) henüz kurulmadı — master branch CI deploy'u
  sonrası doğrulanacak
- AASA / assetlinks yayını ops tarafında; yapılmadan universal link çalışmaz
- Repo'daki `.com` e-posta/API sabitleri ürün sahibi kararı bekliyor
- `docs/WEB_MOBILE_PARITY.md`, `WEB_MOBILE_GAP_ANALYSIS.md` bayat — güvenilecek kaynak
  `docs/mobile-parity/` ve bu spec
