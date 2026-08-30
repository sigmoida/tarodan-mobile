# Plan 4 — P0: Satın Alma ve Kayıt Yollarını Aç

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Şu an canlıda **tamamen kırık** olan üç akışı açmak: satın alma (400), bireysel kayıt (400), kurumsal kayıt (400) — ve mesaj görsellerini görünür kılmak.

**Architecture:** Dört bağımsız iş. Ortak ilke: **para ve sözleşme sunucunun otoritesindedir** — istemci hesaplamaz, sunucudan geleni basar.

**Tech Stack:** Expo SDK 54, expo-router, React Native, TypeScript, TanStack Query, `@/ui/form` (react-hook-form + zod), expo-image, Jest + RNTL.

**Girdi dökümanları:** `16-agent-brief.md` (okuma sırası), `13-parity-matrix.md` v2 (iş listesi), `15-api-delta-2026-08-02.md` (sözleşme deltası), `04-cart-checkout-payment.md`, `01-auth-account.md`, `09-messaging-notifications.md`.

**Öncelik zinciri (brief §2):** `01–12` → `14` → `15` → `13` → ve hepsini **`apps/api` kodu ezer**. Swagger'a güvenme.

## Global Constraints

- Tasarım token'ları: `theme.colors.*`, `theme.spacing[n]` (**sayısal** anahtar). **Hardcoded hex/rgba YASAK.**
- `src/theme/colors.ts` (`TarodanColors`) import **yasak**.
- Primitive'ler `@/ui`'den; formlar `@/ui/form` `useZodForm` (CLAUDE.md §7) — **elle `useState`-per-field form YASAK**.
- Mantık `_hooks/`, sunum `_components/`, şema/sabit `_lib/`.
- Query anahtarları yalnız `@/lib/query` (`qk.*`).
- Mutation hook'ları snackbar + `invalidateQueries` sahibi.
- **iOS donma tuzağı:** mutation'ın `appAlert`'i `ui-native` Modal açıkken çalışırsa iOS donar — modal mutation'dan **önce** kapatılır.
- **Parayla ilgili hiçbir değeri istemcide hesaplama/yuvarlama** — sunucudan geleni bas (brief §5).
- Commit mesajları **İngilizce**, conventional-commit.
- **Hiçbir koşulda EAS build alınmayacak.** Bu planın tamamı JS → OTA. Kota 10/15.
- Jest `--forceExit` olmadan **bitmiyor**: `npx jest <yol> --ci --silent --forceExit`, **ön planda**. Parantezli yol escape'lenir: `'app/\(tabs\)/'`.
- Doğrulama: `npx tsc --noEmit` + `npx eslint <dokunulan>` + tam suite yeşil (şu an **106 suite / 657 test**).
- Branch: `feat/parite-p0` (`main` @ `e0230f5`'ten).
- Bir bulguyu kapatınca `13-parity-matrix.md` satırını güncelle (brief §5) — matris yaşayan doküman.

## Canlı doğrulanmış başlangıç durumu (2026-08-02, staging)

Brief §5 "önce kanıt satırını aç" kuralı uygulandı. Matris **bizim HEAD'imize** (`e0230f5`) karşı yazılmış, bayat değil.

| Kanıt | Sonuç |
|---|---|
| `POST /auth/register` — mobilin payload'ı | **400** `"username must be a string"` |
| `POST /auth/register/business` — mobilin payload'ı | **400** — `authorizedFullName`, `companyLegalName`, `companyTitle`, `companyAddress`, `companyEmail` beşi eksik |
| `POST /orders/quote` kök alanları | `pricingHash: "70a8bdadff29af70"`, `shippingTariffVersion: 3` — **ikisi de kodda hiç geçmiyor** |
| `pricing.summary` | `{productAmount: 619.92, shippingAmount: 50, serviceFeeAmount: 84.4, total: 754.32}` — üç satır + toplam birebir |
| `pricing.buyerFeeRate` | **10** (statik sayfamız "%3" yazıyor — P1'e not) |
| `taxAmount` | **0** · `pricing.buyerServiceTaxAmount`: 22.4 |
| `shippingBySeller[0]` | `{shippingCost: 50, sellerShippingCost: 50, billableDesi: 2, packageTier: "small"}` |

⚠️ **`pricingHash` ve `shippingTariffVersion` yanıtın KÖKÜNDE, `pricing` içinde DEĞİL.** `useCheckout.ts:85` `res.data?.pricing ?? res.data` ile daraltıyor → ikisini de **çöpe atıyor**. Task 1'in en kolay kaçırılacak detayı bu.

---

### Task 1: Checkout — sözleşme alanları + `pricing.summary` (matris P0 #1 + #3)

Brief §4: bu ikisi **tek PR**, ikisi de `useCheckout` içinde.

**Şu an ne oluyor:** dört satın alma yolunun dördü de 400 alıyor; alsalar bile ekrandaki tutar çekilecek tutardan farklı.

**Files:**
- Modify: `app/checkout/_hooks/useCheckout.ts` (quote query, `total`, `shippingCost`)
- Modify: `src/lib/api/orders.ts` — **4 payload üreticisi**: `checkout`, `checkoutGuest`, `directBuy`, `createGuest`
- Modify: `app/checkout/_components/OrderSummary.tsx` (özet satırları)
- Modify: `app/cart/_hooks/useCart.ts` (sepet toplamı)
- Test: `app/checkout/__tests__/` altında

**1a. Quote'un kökünü koru.** `useCheckout.ts:83-92` şu an `pricing`'e daraltıyor. Kökteki `pricingHash` + `shippingTariffVersion` + `pricing.summary` hepsi lazım. Query'nin dönüş tipini genişlet, daraltma.

**1b. Dört payload'a iki alanı ekle:**
```ts
expectedPricingHash: quote.pricingHash,
expectedShippingTariffVersion: quote.shippingTariffVersion,
```
API DTO'sunda **ikisi de zorunlu** (`checkout.dto.ts`). Web bir hata yapıp `expectedPricingHash`'i yalnız doluysa gönderiyor — **mobil her zaman göndersin** (`04` §3).

**1c. `pricing.summary`'yi aynen bas.** Üç satır + toplam sunucu garantisi (`15` §1a). Yerel aritmetiği **sil**:
```ts
// SİLİNECEK — useCheckout.ts:100
const total = Math.max(0, subtotal + shippingCost + buyerFee + taxAmount - coupon.discount);
```
Yerine `summary.total`. Satırlar: `summary.productAmount` (kupon sonrası ara toplam), `summary.shippingAmount`, `summary.serviceFeeAmount` (hizmet bedeli + TÜM alıcı hizmet KDV'si).

**1d. `GET /shipping/rates` çağrısını ve sabit fallback'i SİL.** `useCheckout.ts:131-148` — başarısızlıkta **34.9 (İstanbul) / 49.9 (diğer)** sabitine düşüyor; `catch` da 49.9 yazıyor. Bu, ağ hatasında **ekrandaki tutarla PayTR'de çekilenin sessizce ayrışması** demek. Kargo **yalnızca quote'tan** gelir (`04` §3 "Yapma"). `weight: 0.5` sabiti de gider.

**1e. 409 `PRICING_CHANGED` ele al.** Ayırt edici: `status === 409 && i18nKey === "server.shipping.pricingChanged"` — **`code` alanı YOK** (`11` §6). Davranış: quote'u yenile, **eski/yeni toplamı göster**, kullanıcıdan yeniden onay al. Web bunu yapmıyor; mobil daha iyisini yapmalı (`04` §8).

- [ ] **Step 1: Testi yaz** — dört payload üreticisinin ikisini de gönderdiğini; toplamın `summary.total`'dan geldiğini; `/shipping/rates` çağrısının hiç yapılmadığını doğrula.
- [ ] **Step 2: Kırmızı** — `npx jest app/checkout/ src/lib/api/ --ci --silent --forceExit`
- [ ] **Step 3: Uygula**
- [ ] **Step 4: Yeşil** + tam suite
- [ ] **Step 5: Commit**

```bash
git commit -m "fix(checkout): send the quote contract fields and print the server total

The API requires expectedPricingHash and expectedShippingTariffVersion on
every order-create path; neither appeared anywhere in the client, so all
four purchase routes returned 400. The quote query also narrowed the
response to pricing, discarding both fields. Print pricing.summary
verbatim and drop the local arithmetic, the /shipping/rates call and its
hardcoded 34.9/49.9 fallback, which could silently diverge from the amount
PayTR actually charges."
```

---

### Task 2: Bireysel kayıt — `username` (matris P0 #2)

**Canlı kanıt:** `400 "username must be a string"`. Hiç kimse hesap açamıyor.

**Files:**
- Modify: `app/(auth)/register/_lib/schema.ts` (`registerSchema`)
- Modify: `app/(auth)/register/_components/RegisterForm.tsx`
- Modify: `src/lib/api/auth.ts:22-29` (`register` payload tipi)
- Create: `app/(auth)/register/_hooks/useUsernameAvailability.ts`
- Test: `app/(auth)/register/__tests__/` altında

**Kurallar (`01` §1, API `register.dto.ts`):**
- Küçük harfe çevrilir, **3–30**, regex `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$`
- **Bir kez belirlenince değiştirilemez** — formda açıkça yaz.

**Uygunluk kontrolü:** `GET /auth/username-availability?username=` → `{ available }`. Throttle **30/dk** → debounce şart (öneri 400 ms) ve yalnız regex geçtikten sonra sorgula.

⚠️ `phone` göndereceksen format `+90` + 10 hane. Zorunlu değil.

- [ ] **Step 1: Testi yaz** — regex sınırları (3/30, baş/son nokta, büyük harf→küçük), `available:false` iken gönderimin engellenmesi.
- [ ] **Step 2: Kırmızı** — `npx jest 'app/\(auth\)/register/' --ci --silent --forceExit`
- [ ] **Step 3: Uygula**
- [ ] **Step 4: Yeşil**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(auth): add the required username field to registration

RegisterDto has required username since 2026-07-30, so every signup
returned 400 with 'username must be a string'. Add the field with the
server's regex, lowercase it on entry, and check availability against
GET /auth/username-availability behind a debounce."
```

---

### Task 3: Kurumsal kayıt — payload tamamen yanlış (**matriste YOK**)

**Canlı kanıt:** `400` — beş zorunlu alan birden eksik. Matris bunu kaçırmış; yalnız bireysel kaydı görmüş.

Mobil şunu gönderiyor: `{ companyName, email, password, phone, taxId, city, district?, companyType?, birthDate?, acceptsMarketingEmails? }`

API şunu bekliyor (`BusinessRegisterDto`, `01` §2):

| Alan | Kural |
|---|---|
| `authorizedFullName` | zorunlu, 2–120 |
| `companyLegalName` | zorunlu, 2–240 |
| `companyTitle` | zorunlu, 2–200 |
| `companyAddress` | zorunlu, **10**–500 |
| `companyEmail` | zorunlu, e-posta |
| `kepAddress` | opsiyonel, e-posta |
| `phone` | zorunlu, `^\+90[0-9]{10}$` |
| `contactPhone` | opsiyonel, aynı format |

⚠️ **`password` YOK.** Bu adımda hesap **oluşmuyor** — ön başvurudur. Admin onayı sonrası e-posta ile davet gelir, şifre orada belirlenir (`01` §3, `08` §3). Formdaki şifre alanları **kaldırılmalı**, yoksa kullanıcıya yanlış zihinsel model veriyoruz.

Başarı yanıtı: `{ applicationId, status, email, message }` → **"başvuru alındı, admin onayı bekleniyor"** ekranı. "Hesabın açıldı" izlenimi verme.

**Files:**
- Create: `app/(auth)/register-business/_lib/schema.ts` (zod)
- Modify: `app/(auth)/register-business/_hooks/useRegisterBusiness.ts`
- Modify: `app/(auth)/register-business/_components/RegisterBusinessForm.tsx`
- Modify: `src/lib/api/auth.ts:31-42`
- Test: `app/(auth)/register-business/__tests__/` (Create)

⚠️ Mevcut hook **elle `useState`-per-field** kullanıyor ve doğrulamayı `appAlert` ile yapıyor — CLAUDE.md §7 ihlali. Yeniden yazarken `@/ui/form` `useZodForm`'a geçir.

- [ ] **Step 1: Testi yaz** — sekiz alanın şema kuralları; payload'ın API DTO'suyla birebir eşleştiği; şifre alanının gönderilmediği.
- [ ] **Step 2: Kırmızı**
- [ ] **Step 3: Uygula**
- [ ] **Step 4: Yeşil**
- [ ] **Step 5: Commit**

```bash
git commit -m "fix(auth): send the business registration payload the API expects

The screen collected companyName/taxId/city and sent a password, none of
which BusinessRegisterDto accepts, so corporate signup returned 400 on
five missing required fields. Collect the eight contract fields instead
and drop the password step — this stage is a pre-application that creates
no account; the password is set later from the invitation email."
```

---

### Task 4: Mesaj görselleri — bearer'lı yükleme (matris P0 #4)

**Şu an ne oluyor:** gönderen de alıcı da görseli göremiyor. `folder=messages` yüklemeleri artık S3 URL'i değil `{API}/api/media/message-attachment/{id}` dönüyor; bu uç **JWT ister** ve 10 dakikalık presigned URL'e **302** yapar (`15` §6). RN `<Image>` bearer göndermiyor → 401 → sessizce placeholder.

**Files:**
- Modify: `src/components/AppImage.tsx` (opsiyonel `headers` desteği)
- Modify: `app/messages/[threadId]/_components/` — mesaj görseli render eden yer
- Modify: `src/utils/contentFilter.ts:115` (`[IMG:` regex'i)
- Test: `app/messages/[threadId]/__tests__/` altında

**4a. Bearer'lı yükleme.** `expo-image` `source.headers` destekliyor. `AppImage`'a opsiyonel bir "authenticated" yolu ekle — **varsayılanı değiştirme**, ürün görselleri public ve token göndermeye gerek yok. Token'ı `expo-secure-store`'dan değil, mevcut auth store'dan al (senkron okuma).

**4b. `[IMG:]` parse'ı kırılgan.** `contentFilter.ts:115` regex'i `\[IMG:(https?:\/\/[^\]\s]+)\]` — **yalnız mutlak http(s)** eşliyor. Sunucu çıplak S3 key veya relatif yol dönerse kullanıcı baloncukta ham `[IMG:dev/messages/x.jpg]` metnini görür; `formatMessagePreview` de "📷 Fotoğraf" yerine ham metin basar. Regex'i şemasız değerleri de kabul edecek şekilde genişlet ve çözümü `resolveImageUrl`'e bırak (o iki şekli de çözüyor).

⚠️ **Uzunluk sınırı işaretçiler dâhil** uygulanır (`09` §1) — ek, karakter bütçesinden yer yer. Mevcut davranışı bozma.

- [ ] **Step 1: Testi yaz** — auth'lu yükleyicinin `Authorization` başlığı geçirdiği; `[IMG:]` regex'inin hem mutlak URL hem çıplak key'i yakaladığı.
- [ ] **Step 2: Kırmızı** — `npx jest app/messages/ src/utils/ --ci --silent --forceExit`
- [ ] **Step 3: Uygula**
- [ ] **Step 4: Yeşil**
- [ ] **Step 5: Commit**

```bash
git commit -m "fix(messaging): load message attachments with a bearer token

Message uploads now return an API redirect endpoint that requires JWT and
302s to a short-lived presigned URL, but RN Image sends no auth header, so
both sender and recipient saw an empty bubble. Pass the token through
expo-image's headers for this one case, and widen the [IMG:] parser so a
bare storage key does not leak into the message body as raw text."
```

---

## Self-Review

**Spec coverage.** Brief §4'ün dört P0 işi: #1+#3 → Task 1 · #2 → Task 2 · #4 → Task 4. Task 3 brief'te **yok** — canlı doğrulamada bulundu, aynı sınıftan (kayıt 400) ve aynı aciliyette, o yüzden P0'a alındı.

**Placeholder taraması.** Test kodları tam yazılmadı — kasıtlı. Dördünün de assertion'ları mevcut hook imzalarına ve `@/ui/form` kurulumuna bağlı; uydurma bir imza uygulayıcıyı yanlış yola sokar. Davranış sözleşmeleri ve **canlı doğrulanmış alan adları** tam yazıldı — asıl gereksinim o.

**Tip tutarlılığı.** Task 1 ve 2 ikisi de `src/lib/api/auth.ts`/`orders.ts`'e dokunuyor ama farklı fonksiyonlara — çakışmıyor. Task 2 ve 3 ikisi de `(auth)/` altında, farklı rotalar.

**Bilinen risk.** Ödeme akışının uçtan uca doğrulaması **staging'de elle** yapılmalı — PayTR production'da `test_mode` başarı callback'ini reddediyor (`00-README`, `04` §8). Jest yalnız payload şeklini kanıtlar, tahsilatı değil.

**Bu plana ALINMAYANLAR** (P1, sıradaki plan):
- Sipariş para dökümü: `taxAmount` satırını kaldır, iki hizmet-KDV satırı ekle (matris #5)
- Paket boyutu — doküman 14'ün tamamı, hiç uygulanmamış (matris #6)
- Satıcı iade gelen kutusu (matris #7) — ekran hiç yok
- `EMAIL_NOT_VERIFIED` + IP-engel 403 ayrımı (matris #9, #10) — ikisi de `client.ts`, küçük
- **`buyerFeeRate` 10, statik sayfa "%3" diyor** (matris #21) — matris P2 demiş; kullanıcıya hizmet bedelini üçte bir gösterdiğimiz için bence P1
- `isProductTradeOpen` beş kart bileşeni tarafından atlanıyor → aynı ürün ana sayfada rozetsiz, aramada rozetli (denetimde bulundu, matriste yok)
