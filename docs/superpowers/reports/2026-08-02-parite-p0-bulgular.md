# Parite P0 — canlı ölçüm bulguları (2026-08-02)

Plan: `docs/superpowers/plans/2026-08-02-parite-plan4-p0.md` · Branch: `feat/parite-p0` · Temel: `9d82641`

Bu rapor, parite matrisine (ekli `13-parity-matrix.md`, repoda değil) **geri yazılması gereken**
düzeltmeleri ve staging'e karşı canlı ölçülmüş sözleşme gerçeklerini kaydeder. Matris yaşayan bir
doküman; aşağıdaki maddeler onu günceller.

---

## 1. Matrisin kaçırdığı P0: kurumsal kayıt tamamen kırıktı

Matris yalnız **bireysel** kaydı görmüş. Kurumsal (işletme) ön başvurusu da 400 dönüyordu ve
sebebi farklıydı: mobil form **yanlış alanları** topluyor, API'nin kabul etmediği bir `password`
gönderiyor, `BusinessRegisterDto`'nun **beş zorunlu alanını** hiç göndermiyordu.

Canlı kanıt (staging, `POST /auth/register-business`):
- eski payload → `400`, eksik sayılan alanlar: `authorizedFullName`, `companyLegalName`,
  `companyTitle`, `companyAddress` (min **10**), `companyEmail`
- doğru 8 alanlı payload → `201` `{applicationId, status, email, message}`
- `kepAddress` ve `contactPhone` gerçekten opsiyonel
- uç **5/dk** rate-limit'li

Ayrıca bu adımda **hesap oluşmuyor** — ön başvurudur, admin onayı sonrası davet e-postasıyla şifre
belirlenir. Formdaki şifre adımı kaldırıldı; başarı ekranı artık "hesabınız açıldı" demiyor.

---

## 2. `POST /orders/quote` — gerçek yanıt şekli

```
kök:     pricingHash, shippingTariffVersion, couponDiscount, itemsSubtotal,
         totalAmount, shippingAmount, buyerFeeAmount, taxAmount, commissionAmount,
         sellerFeeAmount, sellerNetAmount, shippingBySeller, items, pricing
pricing: subtotal, summary, buyerFeeRate, buyerServiceTaxAmount, sellerServiceTaxAmount,
         serviceVatRate, commissionAmount, sellerFeeAmount, sellerNetAmount,
         shippingAmount, taxAmount, totalAmount
```

- ⚠️ **`pricingHash` ve `shippingTariffVersion` KÖKTE**, `pricing` içinde değil. Mobil kod
  yanıtı `res.data?.pricing ?? res.data` ile daraltıp ikisini de çöpe atıyordu → dört satın alma
  yolu da 400.
- `pricing.summary` = `{productAmount, shippingAmount, serviceFeeAmount, total}` ve
  **üç satırın toplamı total'a birebir eşit** (ölçüm: 619.92 + 50 + 84.4 = 754.32).
- `items[]` **satır bazlı tutar içeriyor**: `unitPrice`, `subtotal`, `buyerFeeAmount`,
  `sellerFeeAmount`, `sellerNetAmount`, `taxAmount`, `title`.
- `buyerFeeRate` = **10** (statik sayfa %3 diyor — ayrı bir parite bulgusu), `serviceVatRate` = 20.
- Quote gövdesi **yalnız `items` alıyor**, adres/şehir almıyor → kargo şehirden **bağımsız**
  (`shippingBySeller` desi/tier tabanlı: `billableDesi`, `packageTier`). Mobildeki
  `/shipping/rates` çağrısı ve 34.9/49.9 sabit tarifesi tamamen gereksizdi, silindi.
- Geçersiz `couponCode` → `400` `{"message":"Kupon kodu bulunamadı","error":"Bad Request","statusCode":400}`
  — **`i18nKey` de `code` da YOK**. `null`/`""`/omitted → 201.
- `409 PRICING_CHANGED`'in ayırt edicisi `i18nKey === "server.shipping.pricingChanged"`;
  o hatada `code`/`errorCode` alanları yok.
- Kökte `data` adlı bir alan **yok** → zarf (envelope) toleransı bugün yanlış açmıyor.

**Staging'de aktif kupon yok** (`GET /discounts/active` → `[]`, `POST /discounts/validate` → 401),
bu yüzden kuponlu akış canlı doğrulanamadı. Ekran bu belirsizliğe **varsayım yapmadan** kuruldu:
özet yalnız dört sunucu alanını basıyor, indirim kupon rozetinde ve kaynağı kökteki `couponDiscount`.

---

## 3. `POST /auth/register` — username

- `username` **zorunlu**; eksikse 400.
- Başarı → `201` `{user, message}` — **token DÖNMÜYOR**, kayıt oturum açmaz.
- Kural: 3–30 karakter, `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$`, **bir kez belirlenince değiştirilemez**.
- ⚠️ **`GET /auth/username-availability` regex doğrulamıyor**, yalnız "alınmış mı" bakıyor:
  `?username=Gorkem` → `{"available":true}` ama kayıt → `400`. Uygunluk ucuna güvenip yeşil tik
  göstermek kullanıcıyı kayıt anında 400'e düşürür — istemci regex'i **kendi** zorlamak zorunda.
- Uygunluk ucu throttle **30/dk**.

---

## 4. Uygulama tarafında ortaya çıkan, sözleşmeden bağımsız hatalar

Bunlar parite matrisinde yoktu; düzeltme turlarında bulundu.

1. **Sessiz refresh auth store'u güncellemiyordu.** `performTokenRefresh` yenilenen access
   token'ı yalnız SecureStore'a yazıyordu. Axios etkilenmiyor (interceptor SecureStore'dan okuyor),
   ama `useAuthStore.getState().token`'ı okuyan her yer bir token ömrü sonra bayat kalıyordu.
2. **`loadToken` soğuk açılışta aynı sınıftan hata taşıyordu** — token profil çağrısından önce
   okunup sonra yazılıyordu.
3. **Telefon normalizasyonu sessizce kırpıyordu.** `formatPhoneNumber` tanımadığı önekleri kırpıp
   `^\+90[0-9]{10}$`'a *uyduruyor*: `00905321234567` → `+900905321234`, `+1 415 555 0100` →
   `+901415555010`, `05321234567890` → `+905321234567`. Kullanıcı hata görmüyor, backend regex'i
   geçiyor. Kurumsal kayıtta kapatıldı; **paylaşılan `PhoneInput` yolunda (checkout adresi,
   `settings/addresses`, `edit-profile`) hâlâ açık** → takip.
4. **`username` zorunlu olunca Maestro kayıt akışları kırılmıştı** (`run-journey-1.sh` Segment A).
   Ayrıca `F-01`'deki `${maestro.timestamp}` Maestro'da tanımlı bir sabit değil (kurulu jar'ın
   `Env` sınıfında yalnız `MAESTRO_FILENAME`, `MAESTRO_DEVICE_UDID`, `MAESTRO_SHARD_ID`,
   `MAESTRO_SHARD_INDEX` var) — her koşumda aynı değere çözülüyordu, yani ikinci koşumda kilitli buton.
5. **`via.placeholder.com` ölü** (DNS çözülüyor, SSL başarısız). 6 dosyada kullanılıyordu;
   yerel data URI ile değiştirildi.

---

## 5. Bilinen açık maddeler

**Takip (ayrı iş):**
- `logout()` uçuştaki refresh'i geçersizleştirmiyor → A çıkıp B girerse B'nin istekleri A'nın
  token'ıyla gidebilir (`client.ts` SecureStore yazımı). Refresh'e oturum kuşağı (epoch) gerekli.
- Paylaşılan `formatPhoneNumber` kırpma hatası (yukarıda #3) — adres/kargo telefonunu etkiliyor.
- `src/utils/validation.ts` `trPhoneSchema` **ölü export** ve `0532 123 45 67`'yi reddediyor.
- `resolveImageUrl` `file:`/`ph:`/`content:` şemalarını genel olarak geçiriyor; beyaz liste yalnız
  `[IMG:]` sınırında.
- `EXPO_PUBLIC_S3_PUBLIC_BASE_URL` hiçbir profilde tanımlı değil → çıplak S3 key placeholder'a düşüyor.
- `use-zod-form.ts` `UseFormReturn<z.input<Schema>>` döndürüyor ama runtime'da zodResolver'ın
  **output**'unu veriyor → transform'lu alanların normalize edildiği tip düzeyinde garanti değil.
- Sunucunun İngilizce doğrulama mesajları kullanıcıya birebir çıkabiliyor.

**Cihazda doğrulanacak (Jest kanıtlayamaz):**
- iOS: OTP modalı kapandıktan sonra ertelenen checkout uyarısının gerçekten çıkması
- `expo-image` 302 → S3 yönlendirmesinde `Authorization` header'ının davranışı
- `expo-image`'ın başarısız URL'leri oturum boyunca kara listeye alması (SDWebImage)
- Maestro akışları (YAML/bash/regex programatik doğrulandı, cihazda koşulmadı)
