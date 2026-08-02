# Plan 5 — P1 parite ve borç kapatma

Önceki: `2026-08-02-parite-plan4-p0.md` (P0, branch `feat/parite-p0`, 36 commit).
Kaynaklar: `docs/superpowers/reports/2026-08-02-parite-p0-bulgular.md` (P0 canlı ölçümleri) ve
`docs/superpowers/reports/2026-08-03-parite-p1-p2-denetim.md` (dokümanların bugünkü kodla
çapraz kontrolü).

**Matrisin durumu:** P1/P2 tarafında 18 maddenin 15'i bugün de geçerli — **iş listesi olarak
kullanılabilir, kabul kriteri olarak kullanılamaz.** Üç biçimde yanılıyor: yanlış pozitif
(`tradeAvailable` ✅ işaretlenmiş ama dört kart da tek kaynağı atlıyor), bayat talimat
(doküman 14 "desi input'unu değiştir" diyor — mobilde hiç desi input'u olmadı), ölçü hatası
(i18n kapsamı "~71/271" verilmiş, gerçek **47/271**).

Sıralama fiyat/performans: kritiklik × maliyet.

---

## Sıra 1 — Ucuz ve tamamen kanıtlı (S)

### T1. `/order-track?orderNumber=` parametresi okunmuyor
`app/order-track/_hooks/useOrderTrack.ts:10` — `useState('')`, `useLocalSearchParams` **yok**.
Sipariş e-postasındaki derin bağlantı formu doldurmuyor, kullanıcı numarayı elle yazıyor.
- [ ] `useLocalSearchParams` ile `orderNumber` (ve varsa `email`) ön-doldur.
- [ ] Test: parametreyle açılınca alan dolu; parametresiz açılınca boş.

### T2. Sipariş detayında 22,40 TL satırsız fark
`app/orders/[id]/_components/OrderAddressPrice.tsx` bugün şunu basıyor:
```
Ürün Tutarı 619,92 + KDV 0 + Kargo 50 + Platform ücreti 62 = 731,92
Toplam                                                     = 754,32
                                   açıklanmayan fark:        22,40   ← buyerServiceTaxAmount
```
Checkout'ta bu düzeltildi (`summary.serviceFeeAmount` hizmet bedeli + **tüm** alıcı hizmet
KDV'sini içeriyor); sipariş detayı arta kalan tek ekran.
- [ ] Aynı sözleşmeye geçir: satırlar toplama **eşit** olsun.
- [ ] ⚠️ İstemcide **hesaplama yok** — sunucu alanları aynen basılır (Plan 4 bağlayıcı kısıtı).
- [ ] Test: canlı fixture'la satır toplamı = `Toplam`.

### T3. Platform Hizmet Bedeli sayfası gerçek oranın üçte birini yazıyor ⚠️
Tüketiciye açık şeffaflık metni. `app/platform-hizmet-bedeli.tsx:26,34,39`:
> "ürün bedelinin **%3**'ü" · "Yürürlükteki oran **%3**'tür" · "**500 TL** → **15 TL**"

**Canlı:** `buyerFeeRate` = **10**. 619,92 TL sepette sayfa 18,60 TL ima ediyor, kullanıcı
**84,40 TL** ödüyor.
- [ ] Oranı ve örneği sabit yazmayı bırak — `pricing.buyerFeeRate` / `serviceVatRate`
      üzerinden anlat ki oran değişince sayfa yine yalan söylemesin.
- [ ] KDV'nin **kargoyu da kapsadığını** açıkla (aşağıda T4).
- [ ] Sayfanın iade bölümü (`:55-65`) API davranışıyla eşleşiyor mu — doğrula.

### T4. Hizmet KDV'si kargoyu da kapsıyor, satırlar bunu göstermiyor
**Canlı çözülen formül:**
```
buyerServiceTaxAmount 22.4 = %20 × (buyerFeeAmount 62 + shippingAmount 50) = %20 × 112 ✓
NOT: 22.4 / 62 = %36.1 — KDV yalnız hizmet bedeli üzerine DEĞİL.
```
Yani `serviceFeeAmount` (84,40) içinde **10 TL kargo KDV'si** var. Toplam doğru; tartışmalı
olan satırlar arası dağılım ve kullanıcının bunu anlayamaması.
- [ ] Dağılımın kasıtlı olduğunu `apps/api` kaynağından doğrula (Swagger'a güvenme).
- [ ] Kasıtlıysa etiket/`helperText` açıklasın; değilse sunucu tarafı bulgu.

### T5. "Takas Açık" rozeti ekranlar arası tutarsız
Tek kaynak var (`src/utils/isProductTradeOpen.ts`: 4 üst düzey + `trade.*` 3 + `tradeStatus`,
ayrıca `"false"` string'ini doğru şekilde **yanlış** sayan `truthy()`), ama kartlar atlıyor:

| Dosya | Baktığı alanlar |
|---|---|
| tek kaynak | 4 + `trade.*` 3 + `tradeStatus` |
| `app/(tabs)/_components/ProductCard.tsx:23` | `isTradeEnabled \|\| trade_available` |
| `app/(tabs)/_components/SearchResultCard.tsx:47` | `tradeAvailable \|\| isTradeEnabled` |
| `app/listings/_components/ListingCard.tsx:17` | üçü |

Aynı ürün ana sayfada rozetli, aramada rozetsiz. Ayrıca inline sürümlerin hiçbiri string
coercion yapmadığı için API `"false"` **string**'i dönerse üçü de rozeti basar.
> Matris bu satırı **✅ yapılmış** diye işaretlemiş — yanlış pozitif örneği.
- [ ] Üçünü de `isProductTradeOpen`'a bağla (§5). Test: `"false"`, `tradeStatus:'open'`, `trade.available`.

### T6. `settings/security` telefonu hiçbir ayrıştırıcıdan geçirmiyor
`app/settings/security/_hooks/useSecurity.ts:49` düz `useState`; `PhoneInput` yok, ülke kodu yok.
`handleSendPhoneCode` (`:78`) girdiyi **ham** `POST /auth/phone/send-code`'a veriyor. Yanlış numara
kaydedilemiyor (sunucu reddediyor) — UX sorunu, veri bütünlüğü değil.
- [ ] `PhoneInput` + `requiredTrPhoneSchema`'ya bağla (Plan 4'te kuruldu).

### T7. `x-request-id` log'lanmıyor
Canlı doğrulandı: sunucu UUID döndürüyor. Destek/hata ayıklama için en ucuz kazanç.
- [ ] Hata yollarında `X-Request-Id`'yi Sentry'ye ve `__DEV__` log'una taşı. **PII yok.**

---

## Sıra 2 — Kritik ama pahalı (M–L)

### T8. Paket kademesi hiç uygulanmamış — **gelir kaybı**
Uç canlı ve dokümanla birebir: `small/medium/large` = **100/130/160**, `tariffVersion: 3`.

**Nasıl çalışıyor (netleşti, ikisi de doğru):** satıcı *ilan başına* kademe seçer
(`shippingPackageTier`); sunucu *paket* kademesini `Σ billableDesi × adet`'ten **türetir**
(canlı kanıt: 1 adet small ürün → `billableDesi 2` → `packageTier "small"`).

**Bugünkü kod:** `app/listings/.../schema.ts:15-35`'te **hiçbir kargo alanı yok**,
`useListingForm.ts:336` `commission-preview`'e `packageTier` göndermiyor,
`/shipping/package-tiers` hiç çağrılmıyor. Büyük bir ürün `small` gidince **paket başına
60 TL eksik tahsil**.

- [ ] İlan formu: şema + payload + kademe seçim kartları (üç kart, desi **asla render edilmez**)
- [ ] Net kazanç önizlemesi: `commission-preview`'e `packageTier` geçir
- [ ] Düzenleme akışında prefill
- [ ] ⚠️ **Sepet/checkout'a DOKUNMA** — doküman alıcıya kademe gösterilmemesini kararlaştırmış.
- [ ] ⚠️ Staging'de `sample*` ölçüleri üçünde de `null` → ölçü satırı bugün çizilemiyor.
- [ ] ⚠️ Kargo payı canlıda **50/50**, doküman "100/0" örneği veriyor — hangisi doğru, doğrula.

### T9. `logout()` uçuştaki refresh'i geçersizleştirmiyor (oturum kuşağı)
`src/lib/api/client.ts` — A çıkarken uçuşta refresh varsa, tamamlanınca
`SecureStore.setItemAsync("accessToken", …)` çalışıyor. Bu arada B giriş yapmışsa **B'nin
token'ı A'nınkiyle eziliyor** ve request interceptor SecureStore'dan okuduğu için **B'nin tüm
istekleri A'nın token'ıyla gidiyor.** Plan 4'te eklenen store guard yalnız store yarısını kapatıyor.
- [ ] `performTokenRefresh`'e oturum kuşağı (epoch); `logout()` kuşağı ilerletsin.
- [ ] Refresh yazımdan **önce** kuşağı kontrol etsin.
- [ ] `singleFlight`, iki yanıt şekli, rotated refresh kaydı **korunacak** — testli.
- [ ] Test: A çıkış + B giriş yarışı.

---

## Sıra 3 — Bloklu / karar bekleyen

### T10. `client.ts` hata ayrımı — **kör bağlama yapılmayacak**
`client.ts:178-192` yalnız `USER_BANNED` ayırt ediyor; `EMAIL_NOT_VERIFIED` repoda **hiç geçmiyor**.

**Sorun:** API'de tek tip ayırt edici alan **yok**, üç şema bir arada:
- servis/guard `HttpException`'ları → `i18nKey` (5 uçta canlı doğrulandı)
- `ValidationPipe` 400'leri ve middleware hataları → **hiçbir** yapısal alan
  (kanıt: geçersiz kupon → `{"message":"Kupon kodu bulunamadı","error":"Bad Request","statusCode":400}`)
- ban guard → `errorCode`

`EMAIL_NOT_VERIFIED` ve IP-blok 403'ün **gerçek gövdeleri üretilemedi**: ilki doğrulanmamış hesap +
refreshToken ister (yazma işlemi), ikincisi kendimizi bloklatmayı gerektirir.
- [ ] **BLOKLU** — gövdeler üretilmeden ayrım yazılmayacak. Ya `apps/api` kaynağından oku,
      ya kontrollü bir test hesabıyla üret.
- [ ] Risksiz hazırlık: refresh-başarısız dalına bir ayrıştırıcı + `X-Request-Id` logu.

### T11. Satıcı iade kutusu — **P1'den düşürülmesi öneriliyor**
`refundsApi`'nin 5 fonksiyonundan yalnız `getSeller` (`src/lib/api/orders.ts:292`) hiç çağrılmıyor.
`app/refund-requests/` alıcıya sabit (`getMine()`), `app/sales/` altında iade ekranı yok.
**Onay/ret uçları ne dokümanda ne API katmanında var** ve doküman 07'nin "Yapma" bölümü zaten
"web'de de yok, eklemek ürün kararıdır" diyor.
- [ ] **Ürün kararı bekliyor.** Karar gelmeden kod yazılmayacak.

---

## Küçük borçlar (tek satırlık, fırsat buldukça)

- [ ] İade nedeni etiketleri **dört dosyada, üç farklı sözlükle** — matris "6/11" demiş ama asıl
      sorun DRY (§5), tek kaynağa çekilmeli.
- [ ] `app/sales/[id]/_components/SaleDetailBody.tsx:49` hâlâ `formatPrice(item.price * item.quantity)`
      — Plan 4'te kapatılan istemci-çarpım sınıfının son kalıntısı.
- [ ] `app/checkout/_components/CheckoutSteps.tsx` — sunucu `subtotal`'ı yerel `x{item.quantity}` ile
      yan yana; `items[].quantity` tipli ve elde, karşılaştırılmıyor.
- [ ] `resolveImageUrl` (`src/utils/imageUrl.ts:33`) `file:`/`ph:`/`content:` şemalarını genel olarak
      geçiriyor; beyaz liste yalnız `[IMG:]` sınırında.
- [ ] `EXPO_PUBLIC_S3_PUBLIC_BASE_URL` hiçbir profilde tanımlı değil. **Değer bilinmiyor, uydurulmayacak.**
- [ ] `src/ui/lib/use-zod-form.ts:12` `z.input` döndürüyor ama runtime `z.output` veriyor.
- [ ] `AppImage` public örnekleri de token'a abone — `useAuthStore((s) => (authenticated ? s.token : null))`.
- [ ] Selector'süz `useAuthStore` mock'ları (40+ suite) — `authenticated` yayıldıkça sessizce
      `Bearer [object Object]` üretebilir.
- [ ] `%2e%2e` / `..\` traversal varyantları `[IMG:]` beyaz listesinde elenmiyor (bugün sömürülemez).
- [ ] `isCouponRejection` sunucu mesaj **metnine** bağlı — canlı 400 gövdesinde yapısal alan olmadığı
      için başka seçenek yoktu; backend eklerse oraya taşınmalı.
- [ ] Fatura telefonu boşken iki katman farklı mesaj veriyor
      (`checkout/_lib/validation.ts:43` vs `useCheckout.ts:447`).
- [ ] `src/services/sentry.ts`'te `beforeSend`/scrub yok → `error.config.data` serileştirilmiş
      payload'ı (telefon dahil) Sentry'ye gidebiliyor.

## Geçersiz çıkanlar (yapma)

- **`onboarding/tour` yeniden adlandırması** — mobil bu ucu **hiç çağırmıyor**; delta'nın 10. maddesi
  mobil için iş değil.
- **Doküman 14'ün "desi input'unu üç kartla değiştir" talimatı** — mobilde hiç desi input'u olmadı,
  iş sıfırdan ekleme (T8).

---

## Cihazda doğrulanacak (Jest kanıtlayamaz)
- iOS: ertelenen checkout uyarısının OTP modalı kapandıktan sonra çıkması
- `expo-image` 302 → S3 yönlendirmesinde `Authorization` header davranışı
- `expo-image`'ın başarısız URL'leri oturum boyunca kara listeye alması (SDWebImage)
- Maestro akışları (YAML/bash/regex programatik doğrulandı, cihazda koşulmadı)

## Çalışma kuralları (Plan 4'ten ve bu denetimden)

1. **`git stash` yasak** — paralel agent'lar paylaşılan ağaçta; bir stash döngüsü diğerlerinin
   dosyalarını ortadan kaldırdı ve bir koşum "No tests found" verdi.
2. **Doğrulama tam suite ile** — `app/cart/` koşmak `app/__tests__/cart.test.tsx`'i kaçırdı.
3. **`rg` kullan, `grep --include` değil** — zsh'de sessizce boş dönüyor ve var olan kodu yokmuş
   gibi gösteriyor. Bu tuzağa dört kez düşüldü.
4. **⚠️ `rg` bir zsh shell fonksiyonu — bash alt-kabuğunda YOK.** Bir denetim betiği bu yüzden her
   satıra `0` döndürdü ve tüm ölü statik sayfalar "menüde var" gibi göründü. Betik içinde tam yol
   kullan ve çıkış kodunu kontrol et.
5. **Doküman iddiası kanıt değil** — matris hem yanlış pozitif (`tradeAvailable`) hem yanlış negatif
   (kurumsal kayıt P0'ını tamamen kaçırdı) üretiyor. Önce koda bak, sonra canlıya sor.
6. **Sözleşme iddiaları canlı ölçülür** — `apps/api` kaynağı ve canlı yanıt birinci, Swagger sonuncu.
