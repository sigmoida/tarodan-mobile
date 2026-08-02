# Plan 5 — P1 parite ve borç kapatma

Önceki: `2026-08-02-parite-plan4-p0.md` (P0, branch `feat/parite-p0`, 33 commit).
Bulgu kaydı: `docs/superpowers/reports/2026-08-02-parite-p0-bulgular.md`.

Bu plandaki her madde ya **canlı ölçümle** ya da **repo içi kanıtla** doğrulandı; hiçbiri
matristen körlemesine alınmadı. Sıralama fiyat/performans: önce kullanıcıya doğrudan zarar
verenler ve ucuz olanlar.

---

## T1 — Platform Hizmet Bedeli sayfası gerçek oranın üçte birini yazıyor ⚠️

**En yüksek öncelik.** Tüketiciye açık bir şeffaflık sayfası ve yanlış.

`app/platform-hizmet-bedeli.tsx:26,34,39` diyor ki:
> "ürün bedelinin **%3**'ü oranında" · "Yürürlükteki oran **%3**'tür" ·
> "Örnek: **500 TL**'lik bir ürün satın alırsanız Platform Hizmet Bedeli **15 TL** olur"

**Canlı ölçüm (staging, 2026-08-02), `POST /orders/quote`:**
```
subtotal              619.92
buyerFeeRate          10        ← sayfa %3 diyor
buyerFeeAmount        62        (= 619.92 × %10)
buyerServiceTaxAmount 22.4
summary.serviceFeeAmount 84.4   ← kullanıcının gerçekten ödediği
```
619,92 TL'lik bir sepette sayfa **18,60 TL** ima ediyor, kullanıcı **84,40 TL** ödüyor —
**4,5 kat**. 500 TL örneği de yanlış: 15 TL değil, 50 TL + KDV.

- [ ] Oranı ve örneği sunucudan besle ya da düzelt. **Sabit yazmak yerine** `pricing.buyerFeeRate`
      ve `serviceVatRate` üzerinden anlat — oran değişince sayfa yine yalan söylemesin.
- [ ] Sayfanın iade bölümü (`:55-65`) de doğrulanmalı: hizmet bedelinin hangi senaryoda iade
      edildiği API davranışıyla eşleşiyor mu?
- [ ] Web'deki karşılığı da aynı hatayı taşıyor mu — kontrol edilmeli (bu repoda değil).

---

## T2 — Hizmet KDV'si kargoyu da kapsıyor, ama satırlar bunu göstermiyor

**Formülü canlı çözdüm:**
```
buyerServiceTaxAmount 22.4 = %20 × (buyerFeeAmount 62 + shippingAmount 50)
                           = %20 × 112                    ✓ birebir
NOT: 22.4 / 62 = %36.1 — yani KDV yalnız hizmet bedeli üzerine DEĞİL.
```
Sonuç: `summary.serviceFeeAmount` (84,40) içinde **10 TL kargo KDV'si** var. Kullanıcı
"Kargo 50,00 TL" ve "Platform Hizmet Bedeli 84,40 TL" görüyor; kargonun KDV'si hizmet
bedeli satırına yazılmış durumda. Toplam **doğru** (619,92 + 50 + 84,40 = 754,32 ✓),
tartışmalı olan yalnız satırlar arası dağılım.

- [ ] Bu dağılımın **kasıtlı** olduğunu `apps/api` kaynağından doğrula (Swagger'a güvenme).
      Kasıtlıysa satır etiketleri/`helperText` bunu açıklasın; değilse sunucu tarafı bulgu.
- [ ] Sipariş detayındaki para dökümünün aynı formülü kullandığını doğrula.
- [ ] ⚠️ **İstemcide yeniden hesaplama yok** — Plan 4'ün bağlayıcı kısıtı geçerli. Yalnız
      **etiketleme/açıklama** değişir, sunucu alanları aynen basılmaya devam eder.

---

## T3 — `logout()` uçuştaki refresh'i geçersizleştirmiyor (oturum kuşağı)

Plan 4'te T4 incelemesinden çıktı, düzeltilmedi çünkü kapsam dışıydı ve daha eski.

`src/lib/api/client.ts` — A kullanıcısı çıkış yaparken uçuşta bir refresh varsa, refresh
tamamlanınca `SecureStore.setItemAsync("accessToken", …)` çalışıyor. Bu arada B giriş
yapmışsa **B'nin token'ı A'nınkiyle eziliyor** ve request interceptor SecureStore'dan
okuduğu için **B'nin tüm istekleri A'nın token'ıyla gidiyor**.

Plan 4'te eklenen store guard yalnız store yarısını kapatıyor; SecureStore yarısı açık.

- [ ] `performTokenRefresh`'e oturum kuşağı (epoch) ekle; `logout()` kuşağı ilerletsin.
- [ ] Refresh, yazımdan **önce** kuşağı kontrol etsin; eskiyse hiçbir şey yazmasın.
- [ ] `singleFlight`, iki yanıt şekli (`data.tokens.accessToken` / `data.accessToken`) ve
      rotated refresh kaydı **korunacak** — bunlar testli.
- [ ] Test: A çıkış + B giriş yarışı; uçuştaki refresh'in B'yi ezmediği.

---

## T4 — "Takas Açık" rozeti ekranlar arası tutarsız (üç ayrı inline kural)

Tek kaynak **var** (`src/utils/isProductTradeOpen.ts`: 4 üst düzey alan + 3 iç içe alan +
`tradeStatus`, ayrıca `"false"` string'ini doğru şekilde **yanlış** sayan `truthy()` yardımcısı)
ama yalnız üç dosya kullanıyor. Üç kart bileşeni kendi kuralını yazmış ve **her biri farklı bir
alt küme** kapsıyor:

| Dosya | Baktığı alanlar |
|---|---|
| `src/utils/isProductTradeOpen.ts` (tek kaynak) | 4 + `trade.*` 3 + `tradeStatus` |
| `app/(tabs)/_components/ProductCard.tsx:23` | `isTradeEnabled \|\| trade_available` |
| `app/(tabs)/_components/SearchResultCard.tsx:47` | `tradeAvailable \|\| isTradeEnabled` |
| `app/listings/_components/ListingCard.tsx:17` | `isTradeEnabled \|\| trade_available \|\| tradeAvailable` |

Aynı ürün ana sayfada rozetli, aramada rozetsiz görünebiliyor. Ayrıca inline sürümlerin
hiçbiri string coercion yapmadığı için API `"false"` **string**'i dönerse üçü de rozeti
**basar** (JS truthiness), tek kaynak basmaz.

- [ ] Üç kartı da `isProductTradeOpen`'a bağla (CLAUDE.md §5).
- [ ] Test: `"false"` string'i, `tradeStatus: 'open'`, `trade.available` — üç kartın da tek
      kaynakla aynı cevabı verdiği.

---

## T5 — `settings/security` telefonu hiçbir ayrıştırıcıdan geçirmiyor

`app/settings/security/_hooks/useSecurity.ts:49` düz `useState`; `PhoneInput` yok, ülke kodu
yok, `parseE164TrPhone` yok. `handleSendPhoneCode` (`:78`) girdiyi **ham** olarak
`POST /auth/phone/send-code`'a veriyor.

Başlangıç değeri kayıtlı `+905321234567` olduğu için mutlu yol çalışıyor; numarasını
değiştirmek isteyip `0532 123 45 67` yazan kullanıcı bu metni aynen gönderiyor ve sunucu
`^\+90[0-9]{10}$` beklediği için anlamsız bir "Kod gönderilemedi" alıyor.

Yanlış numara **kaydedilemiyor** (sunucu reddediyor) — bu bir veri bütünlüğü değil UX sorunu.

- [ ] `PhoneInput` + `requiredTrPhoneSchema`'ya bağla (Plan 4'te kuruldu).
- [ ] Test: `0532 123 45 67` → `+905321234567` gönderiliyor; geçersizde uç **hiç** çağrılmıyor.

---

## T6 — Paket boyutu kademeleri hiç uygulanmamış (doküman 14)

Canlı quote `shippingBySeller` içinde `billableDesi` ve `packageTier` (`"small"`) döndürüyor;
mobilde bu bilgiyi kullanan/gösteren hiçbir yer yok.

- [ ] Dokümanı ve `apps/api` kaynağını okuyup kapsamı **önce netleştir** — bu madde plan
      yazılırken en az doğrulanmış olanı, kör uygulama yapılmayacak.
- [ ] İlan verme akışında satıcının desi/kademe seçmesi mi gerekiyor, yoksa türetiliyor mu?

---

## T7 — Satıcı iade kutusu

- [ ] Uçları ve mevcut ekranları `rg` ile çıkar, eksik olanı belirle. **Önce sondaj, sonra plan.**

---

## T8 — `client.ts` hata ayrımı

`EMAIL_NOT_VERIFIED` ve IP-blok 403'ü diğer 403'lerden ayırmak. Plan 4'te `client.ts`'in
banlı-kullanıcı dalı (`:149-163`) görüldü; bu maddeler ayrı.

- [ ] Canlı olarak her iki hatayı üret ve **gerçek gövdeyi** kaydet (`i18nKey`/`code`/`errorCode`
      hangisi var?). Plan 4'te öğrenildi: bu API'de ayırt edici alan **her hatada yok**.
- [ ] Ayrımı yapısal alana bağla; yoksa metne bağlanmasını **açıkça** gerekçelendir.

---

## Küçük borçlar (tek satırlık, fırsat buldukça)

- [ ] `resolveImageUrl` (`src/utils/imageUrl.ts:33`) `file:`/`ph:`/`content:` şemalarını genel
      olarak geçiriyor; beyaz liste yalnız `[IMG:]` sınırında. Sunucudan gelen ürün/koleksiyon
      görsel alanları için de gerekli mi?
- [ ] `EXPO_PUBLIC_S3_PUBLIC_BASE_URL` hiçbir profilde tanımlı değil → çıplak S3 key
      placeholder'a düşüyor. **Değer bilinmiyor, uydurulmayacak.**
- [ ] `src/ui/lib/use-zod-form.ts:12` `UseFormReturn<z.input<Schema>>` döndürüyor ama runtime'da
      zodResolver'ın **output**'unu veriyor → transform'lu alanların normalize edildiği tip
      düzeyinde garanti değil.
- [ ] `app/sales/[id]/_components/SaleDetailBody.tsx:49` hâlâ `formatPrice(item.price * item.quantity)`
      — Plan 4'te checkout/sepette kapatılan istemci-çarpım sınıfının son kalıntısı.
- [ ] `app/checkout/_components/CheckoutSteps.tsx` — sunucu `subtotal`'ı yerel `x{item.quantity}`
      ile yan yana basılıyor; `items[].quantity` artık tipli ve elde, karşılaştırılmıyor.
- [ ] `AppImage` public örnekleri de token'a abone — `useAuthStore((s) => (authenticated ? s.token : null))`.
- [ ] Selector'süz `useAuthStore` mock'ları (40+ suite) — `authenticated` yayıldıkça sessizce
      `Bearer [object Object]` üretebilir.
- [ ] `%2e%2e` / `..\` traversal varyantları `[IMG:]` beyaz listesinde elenmiyor (bugün
      sömürülemez; `EXPO_PUBLIC_S3_PUBLIC_BASE_URL` tanımlanırsa yeniden bakılmalı).
- [ ] `isCouponRejection` sunucu mesaj **metnine** bağlı — canlı 400 gövdesinde `i18nKey`/`code`
      olmadığı için başka seçenek yoktu; backend yapısal alan eklerse oraya taşınmalı.
- [ ] TR dışı 24 ülke kodunda **hiçbir** telefon doğrulaması yok (`isValidPhoneInput('12','+1')`
      → `true`). Bilinçli: uydurma uzunluk kuralı koymamak için. Ürün kararı gerekiyor.

---

## Kapsam dışı / cihazda doğrulanacak

Jest'in kanıtlayamayacağı, TestFlight veya Metro gerektirenler:
- iOS: ertelenen checkout uyarısının OTP modalı kapandıktan sonra çıkması
- `expo-image` 302 → S3 yönlendirmesinde `Authorization` header davranışı
- `expo-image`'ın başarısız URL'leri oturum boyunca kara listeye alması (SDWebImage)
- Maestro akışları (YAML/bash/regex programatik doğrulandı, cihazda koşulmadı)

## Çalışma kuralları (Plan 4'ten öğrenilenler)

1. **`git stash` yasak** — paralel agent'lar paylaşılan ağaçta çalışıyor; bir stash döngüsü
   diğerlerinin dosyalarını ortadan kaldırdı ve bir koşum "No tests found" verdi.
2. **Doğrulama tam suite ile** — `app/cart/` koşmak `app/__tests__/cart.test.tsx`'i kaçırdı.
3. **`rg` kullan, `grep --include` değil** — zsh'de sessizce boş dönüyor ve var olan kodu
   yokmuş gibi gösteriyor. Bu tuzağa bu projede dört kez düşüldü.
4. **Sözleşme iddiaları canlı ölçülür** — matris ve Swagger ikinci sırada; `apps/api` kaynağı
   ve canlı yanıt birinci.
