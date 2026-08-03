# Parite P1/P2 — doküman iddialarının bugünkü kodla çapraz denetimi (2026-08-03)

Kaynak dokümanlar: `~/Downloads/mobile-parity 2/` (`00`–`16`).
Denetlenen kod: `feat/parite-p0` @ `e43aab2` (matrisin temel aldığı `e0230f5`'ten **36 commit** sonra).
Canlı ölçüm: `https://staging.tarodan.com.tr/api`, 2026-08-03, yalnız okuma/geçersiz-payload.

Önceki kayıtlar (mükerrer üretilmedi): `2026-08-02-parite-p0-bulgular.md`,
`plans/2026-08-03-parite-plan5-p1.md`.

---

## 1. Özet — matris ne kadar güvenilir çıktı

Matris **P1/P2 tarafında kayda değer ölçüde doğru**: 13'teki 18 P1/P2 maddesinin
**15'i bugün de birebir geçerli**, kanıt satırları hâlâ yerinde. Ama matris üç ayrı
biçimde yanılıyor: (a) **yanlış negatif** — `tradeAvailable`'ı ✅ işaretlemiş, oysa
rozeti basan **dört kart bileşeninin dördü de** tek kaynağı kullanmıyor; (b) **bayat
talimat** — doküman 14 "mevcut desi input'unu üç kartla değiştir" diyor, mobilde
**hiç desi input'u yoktu**, dolayısıyla iş "değiştirme" değil "sıfırdan ekleme";
(c) **ölçü hatası** — i18n kapsamını "271 dosyanın ~71'i" diye vermiş, gerçek sayı
`react-i18next` import eden **47/271**. Buna P0 turunda çıkan kurumsal kayıt kaçağı
eklenince tablo şu: **matris iş listesi olarak kullanılabilir, kabul kriteri olarak
kullanılamaz.** Her satır açılıp kod üzerinden doğrulanmalı — nitekim bu denetimde
her satır açıldı.

Ayrıca üç madde (`EMAIL_NOT_VERIFIED` gövdesi, IP-blok 403 gövdesi, ürün DTO'sunun
`shippingPackageTier` sözleşmesi) **kimlikli erişim olmadan doğrulanamıyor**; §4'te
tam olarak neyin eksik olduğu yazıldı.

---

## 2. `HÂLÂ GEÇERLİ` — fiyat/performans sırasıyla

### G1. Paket boyutu kademesi hiç uygulanmamış — her ilan `small` gidiyor
**(matris P1 #6 · doküman 14 tamamı · delta §14 satırı)**

- **Doküman iddiası** — `14-shipping-package-tiers.md` §2 P0: "Mevcut desi girdisi
  (sayı input'u) **üç radyo/seçim kartıyla** değiştirilecek… Ürün payload'ı
  `shippingPackageTier` gönderiyor". Matris #6: "`src/components/listing/_lib/schema.ts`
  — `shippingPackageTier` de `shippingDesi` de yok".
- **Bugünkü kod** — doğrulandı, üstelik daha kapsamlı:
  - `src/components/listing/_lib/schema.ts:15-35` — 18 alanlık şemada **hiçbir kargo
    alanı yok** (ne `shippingDesi` ne `shippingPackageTier`).
  - `src/components/listing/_hooks/useListingForm.ts:632` — submit payload'ında kargo
    alanı üretilmiyor.
  - `src/components/listing/_hooks/useListingForm.ts:336` — `GET /orders/commission-preview`
    yalnız `{ amount, categoryId }` ile çağrılıyor; `packageTier` yok → sunucu `small`
    varsayıyor, satıcıya **yanlış net kazanç** gösteriliyor.
  - `GET /shipping/package-tiers` reponun **hiçbir yerinde** çağrılmıyor
    (`src/lib/api/orders.ts` içinde tanımı bile yok).
  - Tek iz: `src/lib/api/orders.ts:71-72` — quote yanıt tipinde `billableDesi?` +
    `packageTier?` alanları **tipli ama hiçbir ekranda okunmuyor**.
- **Verdikt** — `HÂLÂ GEÇERLİ` (bulgu), talimat kısmı `DOKÜMAN BAYAT`: mobilde
  kaldırılacak bir desi input'u yok, bu bir **sıfırdan ekleme** işi.
- **Kanıt seviyesi** — canlı ölçüm + repo içi kanıt.
- **Maliyet: M–L.** Yeni bir query hook (`/shipping/package-tiers`), üç kartlık
  seçim bileşeni, şema + payload alanı, `commission-preview`'a `packageTier`
  parametresi, 503 fail-closed dalı, düzenlemede mevcut değerin seçili gelmesi.
  L'e iten kısım: düzenleme yolunun sunucudan mevcut kademeyi okuyabildiğini
  doğrulamak (bkz. §4 D3).
- **Neden en üstte:** para kaçağı. Canlı tarife `small=100 / medium=130 / large=160`;
  büyük bir ürün `small` olarak gidince paket başına **60 TL** eksik tahsil ediliyor.

### G2. Sipariş detayındaki para dökümü toplamı tutturmuyor — 22,40 TL açık
**(matris P1 #5 · delta §1b)**

- **Doküman iddiası** — matris #5: "`OrderAddressPrice.tsx:41-75` `taxAmount`
  (artık hep 0) satırı basıyor; `buyerServiceTaxAmount`/`sellerServiceTaxAmount`
  hiç okunmuyor → satırlar `totalAmount`'a toplanmıyor."
- **Bugünkü kod** — `app/orders/[id]/_components/OrderAddressPrice.tsx:36-82`:
  - `:45` KDV satırı `(p?.taxAmount ?? 0) > 0` ile kapılı → sunucu artık hep `0`
    döndüğü için satır **hiç render olmuyor** (yanlış değil, **ölü**).
  - Basılan satırlar: `subtotal` (`:43`), `Kargo` (`:54`), `Platform ücreti`
    (`:60`), toplam `order.totalAmount` (`:78`).
  - `buyerServiceTaxAmount` / `sellerServiceTaxAmount` / `serviceVatRate`
    dosyanın hiçbir yerinde yok (`rg` ile `app/orders/` genelinde de yok).
- **Canlı doğrulama** (`POST /orders/quote`, 2026-08-03):
  `619.92 + 50 + 62 = 731.92`, ekranda basılan toplam `754.32` →
  **22,40 TL'lik satırsız fark** = `pricing.buyerServiceTaxAmount`.
- **Verdikt** — `HÂLÂ GEÇERLİ`. Matrisin "KDV satırı yanlış basılıyor" nüansı
  hatalı (satır ölü); asıl kusur eksik hizmet-KDV satırı.
- **Kanıt seviyesi** — canlı ölçüm + repo içi kanıt.
- **Maliyet: S.** Tek dosya, dört satır: ölü KDV satırını sil, hizmet-KDV satırını
  ekle. **İstemcide hesap yok** — sunucu alanı aynen basılacak (Plan 4 kısıtı).
- Not: checkout/sepet bu işi zaten `pricing.summary`'den doğru yapıyor
  (`app/checkout/_hooks/useCheckout.ts:278-290`, `_components/OrderSummary.tsx:59-67`);
  sipariş detayı bu turdan **arta kalan tek ekran**.

### G3. Platform Hizmet Bedeli sayfası gerçeğin ~1/4'ünü yazıyor
**(matris P2 #21 · doküman 14 §2 "P1 — Hizmet bedeli oranı" · Plan 5 T1)**

- **Doküman iddiası** — 14: "Checkout özetinde 'Platform Hizmet Bedeli (%3)' gibi
  **sabit oran yazmayın** — bu alandan okuyun." Matris #21: "`app/platform-hizmet-bedeli.tsx:26,34`;
  … `pricing.buyerFeeRate` hiç okunmuyor."
- **Bugünkü kod** — `app/platform-hizmet-bedeli.tsx`:
  - `:26` "ürün bedelinin **%3**'ü oranında"
  - `:34` "Yürürlükteki oran **%3**'tür"
  - `:39` "Örnek: 500 TL'lik bir ürün satın alırsanız Platform Hizmet Bedeli **15 TL** olur"
  - `:38` "KDV: Tutara KDV dahildir; ayrıca KDV eklenmez." — bu da yanlış (aşağı bak)
  - `buyerFeeRate` / `serviceVatRate` yalnız `src/lib/api/orders.ts:33,39`'da **tip**
    olarak var; hiçbir ekran okumuyor.
- **Canlı ölçüm** — `pricing.buyerFeeRate = 10`, `serviceVatRate = 20`.
  500 TL'lik ürün → hizmet bedeli **50 TL**, üstüne hizmet KDV'si → kullanıcıya
  yansıyan ~**70 TL** (50 TL kargo payı varsayımıyla). Sayfa **15 TL** diyor.
- **Verdikt** — `HÂLÂ GEÇERLİ`. Plan 5 T1'de zaten planlanmış; doküman tarafındaki
  karşılığı matris #21.
- **Kanıt seviyesi** — canlı ölçüm.
- **Maliyet: S.** Tek statik ekran. Kalıcı çözüm oranı sunucudan beslemek; asgari
  çözüm metni düzeltip oranı tek yerde tutmak.
- **Neden yukarıda:** tüketiciye açık bir **şeffaflık/hukuk** metni ve 4,7 kat yanlış.

### G4. `/order-track?orderNumber=` parametresi okunmuyor (saf bug)
**(matris P1 #13)**

- **Doküman iddiası** — "`OrderCard.tsx:65` parametreyle push ediyor;
  `useOrderTrack.ts`'te `useLocalSearchParams` yok → form boş açılıyor."
- **Bugünkü kod** — birebir doğrulandı:
  `app/orders/_components/OrderCard.tsx:65` → `router.push(\`/order-track?orderNumber=${order.orderNumber}\`)`;
  `app/order-track/_hooks/useOrderTrack.ts:1-10` → import listesinde
  `useLocalSearchParams` **yok**, `orderNumber` `useState('')` ile boş başlıyor.
- **Verdikt** — `HÂLÂ GEÇERLİ`.
- **Kanıt seviyesi** — repo içi kanıt.
- **Maliyet: S.** Tek hook, üç satır. En yüksek fiyat/performans oranlı madde.

### G5. `client.ts` yalnız `USER_BANNED`'i ayırıyor — `EMAIL_NOT_VERIFIED` ve IP-blok 403 sessiz
**(matris P1 #9 + #10 · delta §9 · Plan 5 T8)**

- **Doküman iddiası** — matris #9: "her refresh hatasında `handleAuthFailure()` →
  açıklamasız login'e atar"; #10: "yalnız `USER_BANNED` özel; IP engeli … ekran
  başına rastgele hata metnine düşüyor".
- **Bugünkü kod** — `src/lib/api/client.ts`:
  - `:178-192` — tek özel dal: `status === 403 && errData?.errorCode === "USER_BANNED"`.
  - `:194-206` — **her** 401'de refresh denenir; başarısızsa koşulsuz
    `handleAuthFailure()` → `logout()` + `router.replace("/(auth)/login")`.
    Hata kodu/gövdesi hiç incelenmiyor.
  - `EMAIL_NOT_VERIFIED` string'i repoda **hiç geçmiyor** (`rg` ile `src/` + `app/`).
- **Verdikt** — `HÂLÂ GEÇERLİ`, ama **uygulanabilirliği §4 D1'e bağlı**.
- **Kanıt seviyesi** — repo içi kanıt kesin; ayrım için gereken sunucu gövdesi
  `DOĞRULANAMADI`.
- **Maliyet: S** (kod), **M** (gövdeyi üretmek için staging hesabı gerekiyor).

### G6. İade nedeni listesi 6/11 — ve etiket sözlüğü **dört yere** dağılmış
**(matris P1 #12 · delta §15)**

- **Doküman iddiası** — "`app/orders/[id]/_lib/status.ts:9-16`; `delivery_delayed`,
  `counterfeit`, `defective`, `lost_in_transit` yok".
- **Bugünkü kod** — `app/orders/[id]/_lib/status.ts:9-16` seçicide 6 neden:
  `changed_mind, damaged, not_as_described, wrong_item, missing_parts, other`.
  Eksik: `counterfeit`, `defective`, `buyer_damaged`, `lost_in_transit`, `delivery_delayed`.
  `src/lib/api/orders.ts:272-273` yorumundaki enum listesi de **bayat** (6 neden yazıyor).
- **Denetimde ek olarak bulunan (matriste yok):** aynı `reason → etiket` haritası
  **dört ayrı yerde** yeniden yazılmış ve **birbirinden farklı**:
  | Dosya | Kapsam / etiket örneği |
  |---|---|
  | `app/orders/[id]/_lib/status.ts:9` | 6 neden, "Fikrim değişti / vazgeçtim" |
  | `app/refund-requests/index.tsx:39` | "Vazgeçtim" |
  | `app/refund-requests/[id].tsx:37` | "Vazgeçtim" |
  | `src/lib/shared/status-configs.ts:157-163` | **en geniş** (counterfeit + lost_in_transit dahil), "Fikrimi Değiştirdim" |
  CLAUDE.md §5 ihlali; başka yerde oluşturulmuş bir talep listede etiketsiz kalıyor.
- **Verdikt** — `HÂLÂ GEÇERLİ` (+ matrisin görmediği DRY bulgusu).
- **Kanıt seviyesi** — repo içi kanıt.
- **Maliyet: S.** `status-configs.ts`'i tek kaynak yapıp diğer üçünü ona bağla,
  eksik 5 nedeni ekle.

### G7. Satıcı iade gelen kutusu yok
**(matris P1 #7 · doküman 07 §3)**

- **Doküman iddiası** — 07 §3: "`GET /refund-requests/seller` … **her iki
  platformda da ekran YOK**"; 07 "Yapma": "Satıcı gelen kutusunu 'web'de var'
  varsayarak yazma — yok; **eklemek ürün kararıdır**."
- **Bugünkü kod** — `src/lib/api/orders.ts:287-294` `refundsApi` beş fonksiyon:
  `getById`, `getMine`, `getSeller`, `cancel`, `create`. **`getSeller` hiçbir
  yerden çağrılmıyor** (`rg 'getSeller'` → yalnız tanım satırı; `getSellerEarnings`
  ayrı bir fonksiyon). `app/refund-requests/index.tsx:70` yalnız `getMine()`
  çağırıyor, başlık `:119` "İadelerim". Sekme/filtre yok. Onay/ret için **API
  fonksiyonu bile yok**.
- **Verdikt** — `HÂLÂ GEÇERLİ` ama **ürün kararı bekliyor**, teknik borç değil.
- **Kanıt seviyesi** — repo içi kanıt; onay/ret uçlarının varlığı `DOĞRULANAMADI` (§4 D4).
- **Maliyet: L.** Yeni sekme + liste + detay aksiyonları + mutation hook'ları.
  Web'de de yok → parite **açığı değil**, yeni özellik.

### G8. Misafir takip: üç kod biçimi kabul ediliyor, ekran tek biçim gösteriyor
**(matris P1 #14 · delta §2)**

- **Doküman iddiası** — "placeholder yalnız `ORD-XXXXXX`; yanıt tipinde
  `groupNumber`/`packageNumber` yok".
- **Bugünkü kod** — `app/order-track/index.tsx:41` `placeholder="ORD-XXXXXX"`
  (6 karakter — gerçek biçim **10** karakter); `app/order-track/_lib/status.ts:5-20`
  `OrderStatus` tipinde `groupNumber`/`packageNumber` **yok**.
- **Canlı doğrulama** — `POST /orders/guest/track`, üç biçim de DTO'yu geçiyor
  (üçü de `404 server.order.notFound`, **400 doğrulama hatası değil**) →
  sunucu gerçekten `ORD-`/`GRP-`/`PKG-` çözüyor.
- **Verdikt** — `HÂLÂ GEÇERLİ`.
- **Kanıt seviyesi** — canlı ölçüm + repo içi kanıt.
- **Maliyet: S.** Placeholder + iki opsiyonel tip alanı + sonuç kartında iki satır.

### G9. `packageNumber` ("Teslimat No") ve `productCode` hiçbir yerde gösterilmiyor
**(matris P2 #17 · delta §2, §3)**

- **Bugünkü kod** — `rg 'packageNumber|productCode'` → `src/` + `app/` içinde
  **sıfır** eşleşme.
- **Canlı doğrulama** — `GET /products/:id` gövdesinde `productCode: "U010000"`
  gerçekten var (anahtar listesi doğrulandı). `packageNumber` kimlikli uçta
  (doğrulanamadı, bkz. §4 D5).
- **Verdikt** — `HÂLÂ GEÇERLİ` (additive).
- **Kanıt seviyesi** — `productCode` canlı; `packageNumber` yalnız doküman iddiası.
- **Maliyet: S.** İki metin satırı (ilan detayı + sipariş detayı).

### G10. `X-Request-Id` loglanmıyor
**(matris P2 #18 · delta §10)**

- **Canlı doğrulama** — `GET /shipping/package-tiers` yanıt başlığı:
  `x-request-id: 60481328-d123-4c61-a3df-7c126d614d38`. Başlık **gerçekten var**.
- **Bugünkü kod** — `rg 'X-Request-Id|requestId'` → yalnız `src/i18n/.../keys.ts`
  içinde admin arayüzü anahtarları. `src/lib/api/errorText.ts` ve `client.ts`
  başlığı okumuyor.
- **Verdikt** — `HÂLÂ GEÇERLİ`.
- **Kanıt seviyesi** — canlı ölçüm + repo içi kanıt.
- **Maliyet: S.** Response interceptor'da tek satır + hata metnine/Sentry'ye iliştirme.

### G11. `GET /orders/:id/my-review` tanımlı ama çağrılmıyor
**(matris P2 #19)**

- **Bugünkü kod** — `src/lib/api/orders.ts:190` `getMyReview` tanımlı;
  `rg 'getMyReview'` → **tek eşleşme, tanım satırı**. Ölü export.
- **Verdikt** — `HÂLÂ GEÇERLİ`.
- **Maliyet: S.** Ya bağla ya sil (`noDeadShowcase.test.ts` kalıbıyla regresyon testi).

### G12. Üyelik limitlerinin çoğu hâlâ istemci-sabit
**(matris P1 #11 · delta §13)**

- **Bugünkü kod** — `src/stores/authStore.ts:101-108` `ServerLimitsOverride` yalnız
  **5 alan**: `maxListings`, `maxImagesPerListing`, `canCreateCollections`,
  `canTrade`, `isAdFree`. `MembershipLimits` (`:80-98`) toplam **15 alan**;
  kalan 10'u `TIER_LIMITS` (`:136+`) sabit tablosundan.
- **Verdikt** — `HÂLÂ GEÇERLİ`, ama düşük risk: bindirme deseni
  (`{ ...TIER_LIMITS[tier], ...override }`) testli ve doğru; delta §13'ün asıl
  kırıcı kısmı (**`/admin/settings/public`'ten limit okuma**) **zaten kapatılmış**
  (`app/membership/_hooks/useMembership.ts:52`, `_lib/membershipTiers.ts:85-86`
  limitleri `membership/tiers`'tan türetiyor).
- **Kanıt seviyesi** — repo içi kanıt; sunucunun kaç alan döndürdüğü `DOĞRULANAMADI` (§4 D6).
- **Maliyet: S** (kararı yaz) veya **M** (sunucu alanlarını genişlet).

### G13. Çekirdek ticaret ekranlarında i18n yok — ve kapsam matrisin dediğinden dar
**(matris P1 #8)**

- **Doküman iddiası** — "`useTranslation` 271 ekran dosyasının **~71'inde**".
- **Ölçüm (bugün)** — `app/` altında test dışı **271** `.tsx`; `react-i18next`
  import eden **47**; `useTranslation` çağıran **37**. Yani matrisin sayısı
  **yüksek**, kapsam daha dar.
- Çekirdek dördü doğrulandı: `app/cart/index.tsx`, `app/checkout/index.tsx`,
  `app/orders/index.tsx`, `app/product/[id]/index.tsx` — dördünde de
  `useTranslation` **sıfır**, gömülü Türkçe.
- **Verdikt** — `HÂLÂ GEÇERLİ` (matrisin sayısı `DOKÜMAN BAYAT`).
- **Maliyet: L.** Dört ağır ekran + section/component ağaçları. Katalog hazır
  (`src/i18n/lib/generated/keys.ts`), iş anahtar taşıma işi.

### G14. Menüsüz/ölü statik ekranlar — kesin liste
**(matris P2 #16)**

- **Doküman iddiası** — "~20 statik sayfa + `/checkout/success` hâlâ menüsüz/ölü".
- **Ölçüm** — `router.push('/<route>')` referansı **hiç olmayan** ekranlar:
  `guides`, `cookies`, `size-guide`, `payment-options`, `security-features`,
  `shipping-delivery`, `distance-sales`, `seller-agreement`,
  `intellectual-property`, `guvenli-takas`, `faq`, `buyer-protection`.
  (`buyer-protection` ölü, ama `returns-exchanges` ve `refund-policy`'ye **tek
  giriş** o sayfadan — `app/buyer-protection.tsx:94,105` → o ikisi de fiilen ölü.)
- Menüde **olanlar**: `about`, `authenticity`, `collectors-guide`,
  `platform-hizmet-bedeli` (`app/(tabs)/_components/ProfileSections.tsx:407,418,423,428`).
- `newsletter` bir **klasör** (`app/newsletter/index.tsx` + `unsubscribe.tsx`),
  referansı yok.
- Yasal sayfa ikiliği doğrulandı: `ProfileSections.tsx:436` CMS'e
  (`/sayfa/${p.slug}`) gidiyor, statik `terms`/`privacy` ekranları ayrıca duruyor.
- **Verdikt** — `HÂLÂ GEÇERLİ`; "~20" sayısı doğru büyüklükte (12 + 2 dolaylı).
- **Maliyet: S–M.** Karar işi (menüye ekle / CMS'e taşı / sil), kod işi küçük.

### G15. Test fixture'larında bayat önekler
**(matris P2 #22 · delta §14)**

- **Bugünkü kod** — `TRD-` fixture'ları: `app/orders/__tests__/index.test.tsx:46`,
  `detail.test.tsx:36`, `app/sales/__tests__/index.test.tsx:44`,
  `detail.test.tsx:29`, `app/payment/__tests__/{success,fail}.test.tsx:36-37`.
  `TRK` fixture'ları: `app/sales/_hooks/__tests__/useUpdateOrderStatus.test.tsx:61,83`.
  Üretim kodunda tek önek ayrıştırma `MEM-` (`app/orders/[id]/_lib/derive.ts:6`) —
  **hâlâ doğru**. `TKS-` zaten güncel (`app/trade/__tests__/detail.test.tsx:69`).
- **Verdikt** — `HÂLÂ GEÇERLİ`, kozmetik. Üretim davranışını etkilemiyor.
- **Maliyet: S.**

### G16. Satıcı takip numarası serbest metin
**(matris P2 #20)**

- **Bugünkü kod** — `app/sales/_hooks/useSaleActions.ts:74-86` `handleShip`
  elle girilen `trackingNumber`'ı gönderiyor; `src/lib/api/orders.ts:261`
  `PATCH /shipping/:id/tracking`. `app/sales/_modals/ShipDialog.tsx:22` serbest input.
- Delta §2 "`shipment.trackingNumber` artık `PKG-…`" ile kavramsal çatışma **duruyor**,
  ama gösterim tarafı **güvenli**: `app/order-track/_components/OrderTrackResult.tsx:62`
  etiket "Takip Numarası" (sipariş no olarak sunulmuyor),
  `app/orders/[id]/_components/OrderInfoCards.tsx:100-111` "Kargo Takip".
- **Verdikt** — `HÂLÂ GEÇERLİ` ama **ürün/backend kararı**; mobil tek başına çözemez.
- **Maliyet: S** (mobil) / kararı vermek dışsal.

### G17. iOS universal link kapalı
**(matris P1 #15 — bilinçli)**

- **Bugünkü kod** — `app.json` içinde `ios.associatedDomains` yok; `:44`
  Android `intentFilters` var.
- **Verdikt** — `HÂLÂ GEÇERLİ` ama **bloklu**: AASA yayını + Apple capability
  önkoşulu mobil reponun dışında. 16 §6'da bilinçli karar olarak da işaretli.
- **Maliyet: S** (kod) — önkoşul dışsal.

---

## 3. `ZATEN YAPILMIŞ` / `DOKÜMAN BAYAT` — tek satırlık gerekçeyle

| Doküman maddesi | Verdikt | Gerekçe (kanıt) |
|---|---|---|
| Matris P0 #1/#3 (checkout hash + `pricing.summary`) | ZATEN YAPILMIŞ | `useCheckout.ts:278-290, 492, 526-527`; `OrderSummary.tsx:59-67` sunucu alanlarını aynen basıyor |
| Matris P0 #2 (`register` `username`) | ZATEN YAPILMIŞ | `feat/parite-p0` @ `a96bcb0`, `efd7b14`, `3eb48d6` |
| Matris P0 #4 (mesaj görselleri bearer) | ZATEN YAPILMIŞ | `3045e12`, `3d80d17`, `71bf900` |
| Delta §5 (kupon kapsam reddi) | ZATEN YAPILMIŞ | `62b16ff`; matris zaten ✅ demişti |
| Delta §6 (medya `folder` beyaz listesi) | ZATEN YAPILMIŞ | Yalnız `messages`/`reviews` gönderiliyor |
| Delta §7 (logo mutlak URL / `null`) | ZATEN YAPILMIŞ | Matris ✅; `null` fallback yerinde |
| Delta §11 (IBAN mod-97) | ZATEN YAPILMIŞ | `src/utils/iban.ts` |
| Delta §13 (limitleri `/admin/settings/public`'ten okuma) | ZATEN YAPILMIŞ | `app/membership/_hooks/useMembership.ts:52` yorumu + `_lib/membershipTiers.ts:85-86` `membership/tiers`'tan türetiyor |
| Delta "endpoint tablosu": `onboarding/home-tour` → `onboarding/tour` | DOKÜMAN BAYAT (mobil için) | `rg 'onboarding'` → `src/` + `app/` içinde **sıfır**; mobil bu ucu hiç çağırmıyor, yapılacak iş yok |
| Delta §12 (erken erişim kodu) | ZATEN KARAR VERİLMİŞ | 16 §6: mobili bağlamıyor; canlı `POST /site-access/verify` yalnız web kilidi için |
| Delta §14 (önek ayrıştırma) — **üretim kodu** | ZATEN YAPILMIŞ | Tek parse `MEM-` (`derive.ts:6`), o değişmedi; yalnız fixture'lar bayat (G15) |
| Doküman 14 "desi input'unu üç kartla **değiştir**" | DOKÜMAN BAYAT | Mobilde hiç desi input'u olmadı (`schema.ts:15-35`); iş sıfırdan ekleme (G1) |
| Matris "i18n ~71/271" | DOKÜMAN BAYAT | Ölçüldü: `react-i18next` **47/271**, `useTranslation` **37/271** (G13) |
| Matris #5 "`taxAmount` satırı basılıyor" | DOKÜMAN BAYAT (nüans) | `OrderAddressPrice.tsx:45` `> 0` kapısı var, satır **ölü** — kusur eksik hizmet-KDV satırı (G2) |

### ⚠️ Matrisin yanlış negatifi: `tradeAvailable`

Matris (`13`, ✅ tablosu) ve delta (`15`, §4 satırı) `tradeAvailable`'ı **✅ uyumlu**
işaretlemiş: "Toleranslı çözücü (`src/utils/isProductTradeOpen.ts`) yeni alanı zaten
okuyor." Çözücü gerçekten doğru (`:26-28`) ve `app/product/[id]/_components/ProductInfo.tsx:39`
ile `ProductBottomBar.tsx:84` onu kullanıyor — **ama rozeti basan kartların hiçbiri kullanmıyor**:

| Dosya:satır | Kural |
|---|---|
| `app/(tabs)/_components/ProductCard.tsx:23` | `item.isTradeEnabled \|\| item.trade_available` (`tradeAvailable` **yok**) |
| `app/(tabs)/_components/SearchResultCard.tsx:47` | `item.tradeAvailable \|\| item.isTradeEnabled` |
| `app/listings/_components/ListingCard.tsx:17` | üç alan, ama string coercion yok |
| `src/components/product/ProductCard.tsx:198` | **yalnız** `product.isTradeEnabled` |

Delta §4 açıkça "rozeti `tradeAvailable`'a bağla; `isTradeEnabled` yalnız satıcının
kendi düzenleme formunda" diyor. Bugün üyeliği düşmüş bir satıcının ilanı ana sayfada
ve listelerde **hâlâ "Takasa Açık"** görünüyor. Verdikt: **`KISMEN`** — matris burada
yanlış pozitif verdi. (Plan 5 T4'te üç kart yakalanmış; **dördüncüsü
`src/components/product/ProductCard.tsx:198` orada da yok.**) Maliyet: **S**.

---

## 4. `DOĞRULANAMADI` — ve tam olarak neyin eksik olduğu

Ortak engel: **`apps/api` kaynağı bu repoda yok** ve elimde **kimlikli staging
oturumu yok**. Aşağıdakiler yalnız okuma isteğiyle üretilemedi.

**D1 — `EMAIL_NOT_VERIFIED` refresh 401'inin gerçek gövdesi.**
Gereken: doğrulanmamış e-postalı bir staging hesabı **ve** ona ait geçerli bir
`refreshToken`. `POST /auth/refresh` yalnız login'den gelen token kabul ediyor, login
de doğrulama istiyor → hesap oluşturmadan (yazma) üretilemez.
**Bugün ölçebildiğim yakınsama:** bu API'de **en az üç ayrı hata gövdesi biçimi** var —

| Biçim | Örnek (canlı, 2026-08-03) | Ayırt edici alan |
|---|---|---|
| Servis/guard `HttpException` | `{"statusCode":401,"message":"Geçersiz refresh token","error":"Unauthorized","i18nKey":"server.auth.invalidRefreshToken"}` | **`i18nKey`** |
| NestJS `ValidationPipe` 400 | `{"message":[...13 madde...],"error":"Bad Request","statusCode":400}` | **hiçbiri** (`message` dizi) |
| Middleware/özel guard | `POST /site-access/verify` → `{"message":"Geçersiz erişim kodu","error":"Unauthorized","statusCode":401}` | **hiçbiri** |
| Ban guard (mobil koda göre) | `errorCode: "USER_BANNED"` + `bannedReason` | **`errorCode`** (canlı üretilemedi) |

`src/i18n/lib/generated/keys.ts` (sunucudan üretilmiş katalog) taraması: refresh
tarafında yalnız `server.auth.invalidRefreshToken` / `refreshTokenExpired` /
`refreshTokenRevoked` var; **e-posta doğrulama için refresh'e özel anahtar yok** —
yalnız `server.auth.emailNotVerifiedLogin` (`:3988`). Bu, `EMAIL_NOT_VERIFIED`'in
`i18nKey` değil bir **`errorCode`** olduğuna işaret ediyor, ama **kanıt değil**.
→ **Kod yazmadan önce D1 kapatılmalı**, yoksa yanlış alana bağlanır.

**D2 — IP-blok 403'ünün gerçek gövdesi.** Üretmek için istemcinin engellenmesi
gerekiyor; kısıtlar gereği denenmedi. Delta §9 gövdeyi `403 "Erişim engellendi"`
diye tarif ediyor, **yapısal alandan söz etmiyor**. D1'deki biçim tablosuna göre
middleware kaynaklı 403'lerin `i18nKey` taşımaması **muhtemel** → ayrım büyük olasılıkla
`status === 403 && message === "Erişim engellendi"` gibi **metne bağlı** olacak.
Bu, `isCouponRejection` ile aynı sınıf bir taviz; gerekçelendirilmeli.

**D3 — Ürün oluştur/güncelle DTO'sunun `shippingPackageTier` sözleşmesi.**
`POST /products` kimliksiz `401`. `GET /products/:id` **public** gövdesinde hiçbir
kargo/kademe alanı yok (44 anahtar tarandı: `productCode`, `modelCode`,
`isTradeEnabled`, `tradeAvailable` var; `shipping*`/`tier`/`desi` **yok**).
Eksik: (a) alan **zorunlu mu opsiyonel mi**, (b) düzenleme için satıcının kendi
ürün okumasında **geri dönüyor mu** — doküman 14 kabul kriteri "Düzenlemede ürünün
mevcut boyutu seçili geliyor" bunu şart koşuyor. Satıcı JWT'si gerekiyor.

**D4 — Satıcı iade onay/ret uçları.** Doküman 07 §3 tablosu **yalnız** `GET
/refund-requests/seller`'ı listeliyor; onay/ret için **uç adı vermiyor** ve mobil
API katmanında da yok. Gerçek uçlar bilinmeden ekran planlanamaz.

**D5 — `packageNumber` alanının canlı varlığı.** `GET /orders` ve `GET /orders/:id`
kimlik istiyor. Delta §2 alanın kökte olduğunu ve eski siparişlerde `null` olabileceğini
söylüyor — **yalnız doküman iddiası**. (`productCode` canlı doğrulandı, o sağlam.)

**D6 — `GET /membership/me/limits` yanıtındaki alan sayısı.** Kimlik gerekiyor.
G12'nin "5 alan yeterli mi" kararı buna bağlı.

**D7 — `SHIPPING_PACKAGE_TIERS_NOT_CONFIGURED` 503 gövdesi.** Staging'de tarife
**aktif** (`tariffVersion: 3`, üç kademe dolu) → 503 üretilemedi. Doküman 14'ün
fail-closed dalı test edilemez; kodda savunmacı yazılmalı.

---

## 5. Üç netleştirme sorusunun cevabı

### 5.1 `14-shipping-package-tiers.md` — kapsam nedir?

**Uç canlı ve dokümanla birebir uyumlu.** `GET /shipping/package-tiers` (public, 200):

```json
{"tariffVersion":3,"tiers":[
 {"code":"small", "label":"Küçük Paket","amount":100,"billableDesi":2, "minDesi":0,"maxDesi":2,   "sampleWidth":null,"sampleHeight":null,"sampleLength":null},
 {"code":"medium","label":"Orta Paket", "amount":130,"billableDesi":5, "minDesi":2,"maxDesi":5,   "sampleWidth":null,...},
 {"code":"large", "label":"Büyük Paket","amount":160,"billableDesi":10,"minDesi":5,"maxDesi":null,"sampleWidth":null,...}]}
```

**Satıcı seçiyor mu, türetiliyor mu? — İkisi de, iki farklı seviyede:**

1. **Ürün seviyesi = SEÇİM.** Satıcı ilan başına bir kademe seçer
   (`shippingPackageTier: "small"|"medium"|"large"`, doküman 14 §2). Bu, kaldırılan
   `shippingDesi` sayısının yerine geçiyor.
2. **Paket seviyesi = TÜRETME.** Sunucu, o satıcının sepetteki satırlarının
   `billableDesi × adet` toplamını alır ve **kademe aralığından** paketin kademesini
   çözer.

Canlı kanıt, tek `small` ürünlü quote:
`shippingBySeller: [{ shippingCost: 50, sellerShippingCost: 50, billableDesi: 2, packageTier: "small" }]`
→ `billableDesi 2` `small` aralığına (`minDesi 0, maxDesi 2`) düşüyor.
Doküman 14 §4'ün "2 küçük ürün = 4 desi → Orta kademe" örneği bu aritmetikle
**tutarlı** (2×2 = 4 ∈ medium `2–5`). Yani ürünün seçilen kademesi bir **desi
katsayısına** çevriliyor, toplam desi paketin kademesini belirliyor.

Ayrıca ölçülen, dokümanda **olmayan** bir detay: kart üzerindeki `amount` **tam**
kargo bedeli (small 100), alıcının ödediği pay **50** ve `sellerShippingCost` da
**50** → bu kategoride pay **50/50**. Doküman 14 §1 tablosu örnek olarak
"Küçük 100/0" yazıyor; **paylar kategori/kademe başına adminden geliyor, sabit
değil** — mobil bunları asla hesaplamamalı.

**Etkilenen ekranlar (üçü zorunlu, biri opsiyonel):**

| Ekran | Ne değişir |
|---|---|
| `src/components/listing/_lib/schema.ts` + `_hooks/useListingForm.ts` (`:632` payload) + `_components/ListingSections.tsx` | **Zorunlu.** Üç kartlı seçim; `label` + `amount` (₺) + örnek ölçü. Staging'de üç `sample*` alanı da `null` → **ölçü satırı bugün hiç çizilmiyor**, kod bunu tolere etmeli |
| `useListingForm.ts:336` net kazanç önizlemesi | **Zorunlu.** `/orders/commission-preview`'a `packageTier` eklenmeli; seçim değişince canlı yenilenmeli. Bugün gönderilmiyor → satıcıya **her zaman `small` net'i** gösteriliyor |
| İlan düzenleme (`useListingForm.ts:227` prefill) | **Zorunlu ama bloklu** — sunucunun mevcut kademeyi geri döndürdüğü doğrulanamadı (§4 D3) |
| Sepet / checkout | **Opsiyonel.** Doküman 14 §2 P1: "**Alıcıya paket boyutu gösterilmemesi kararlaştırıldı**". `packageTier`/`billableDesi` bilgi amaçlı. **Dokunma.** |

**Bağlayıcı kural:** doküman 14 §1 — "Mobil arayüzde desi **hiç görünmemelidir**".
`billableDesi`, `minDesi`, `maxDesi` **asla** render edilmeyecek.

### 5.2 Satıcı iade kutusu — hangi uçlar, hangi ekranlar var/yok?

**Mobil API katmanında tanımlı (`src/lib/api/orders.ts:276-294`, `refundsApi`):**

| Uç | Satır | Çağrılıyor mu? |
|---|---|---|
| `POST /orders/:orderId/refund-requests` | `:286` | ✅ `app/orders/[id]/_hooks/useOrderActions.ts` |
| `GET /refund-requests/:id` | `:288` | ✅ `app/refund-requests/[id].tsx` |
| `GET /refund-requests/me` | `:290` | ✅ `app/refund-requests/index.tsx:70` |
| `GET /refund-requests/seller` | `:292` | ❌ **hiçbir yerde** |
| `POST /refund-requests/:id/cancel` | `:294` | ✅ (alıcı iptali) |

**Mevcut ekranlar:** `app/refund-requests/index.tsx` (başlık `:119` **"İadelerim"**,
yalnız `getMine()`, sekme/filtre yok) ve `app/refund-requests/[id].tsx` (detay).
`app/sales/` altında iade ile ilgili **hiçbir ekran/aksiyon yok** (`rg 'refund' app/sales/`
→ yalnız test dosyalarında `cancellationType` eşleşmeleri).

**Eksik olan:** (a) satıcı sekmesi/liste, (b) onay/ret aksiyonları — **bunların
uçları ne dokümanda ne mobil API katmanında var** (§4 D4).

**Karar önerisi:** doküman 07 "Yapma" bölümü net — *"Satıcı gelen kutusunu 'web'de
var' varsayarak yazma — yok; **eklemek ürün kararıdır**."* Web'de de olmadığı için
bu bir **parite açığı değil, yeni özellik**. Matrisin "Açık sorular" bölümünde de
soru olarak duruyor. **Öneri: P1'den düşür, ürün kararına bağla.** Karar "evet"
çıkarsa önce onay/ret uçları `apps/api`'den çıkarılmalı.

### 5.3 `client.ts` hata ayrımı — gerçek gövdeler

Canlı üretilen gövdeler (staging, 2026-08-03) §4 D1'deki tabloda. Özet:

- **`i18nKey` taşıyan** (servis/guard `HttpException`) — güvenilir ayrım noktası:
  `POST /auth/refresh` (bogus) → `server.auth.invalidRefreshToken` ·
  `POST /auth/login` (yok) → `server.auth.invalidCredentials` ·
  `GET /orders` (kimliksiz) → `server.auth.loginRequired` ·
  `POST /orders/quote` (yok ürün) → `server.order.productNotFoundById` ·
  `POST /orders/guest/track` → `server.order.notFound`
- **`i18nKey` taşımayan**: NestJS `ValidationPipe` 400'leri (`message` **dizi**)
  ve middleware/özel guard hataları (`POST /site-access/verify` 401). Plan 4'te
  ölçülen geçersiz kupon 400'ü de bu sınıfta.
- **`errorCode` taşıyan**: yalnız ban guard (`client.ts:180`) — canlı üretilemedi.

**Sonuç:** API'de **tek tip ayırt edici alan yok**; üç şema bir arada. `client.ts`
ayrımı şu sırayla yazılmalı:
`errorCode` → `i18nKey` → (son çare) `status` + `message` metni.
**Ama ikisi de bugün yazılamaz:** `EMAIL_NOT_VERIFIED` (D1) ve IP-blok 403 (D2)
gövdeleri üretilemedi; hangi alana bağlanacağı **bilinmiyor**. Kör bağlama, sessiz
logout'u sessiz bir "yanlış ekran"a çevirir. **Önce D1/D2 kapatılmalı.**

**Bugün risksiz yapılabilecek hazırlık (maliyet S):** `client.ts:194-206`
refresh-başarısız dalını `handleAuthFailure()`'dan önce bir **ayrıştırıcıya**
uğrat (`errorCode ?? i18nKey ?? message`), sonucu logla/Sentry'ye gönder ve
`X-Request-Id` (G10) ile eşle. Gerçek gövde bir kez görüldüğünde ayrım tek satırda
takılır.

---

## 6. Sürprizler (matriste hiç yok)

1. **`tradeAvailable` ✅ değil.** Matris ve delta ikisi de uyumlu demiş; rozeti basan
   **dört kartın dördü de** tek kaynağı atlıyor (bkz. §3 sonu). Bir kartı
   (`src/components/product/ProductCard.tsx:198`) Plan 5 T4 de kaçırmış.
2. **İade nedeni etiketleri dört ayrı dosyada, üç farklı sözlükle.** Matris yalnız
   "liste 6/11" demiş; asıl sorun DRY ihlali (G6).
3. **`x-request-id` canlı doğrulandı** — başlık gerçekten dönüyor (UUID). Delta §10
   iddia değil, ölçülmüş gerçek. Maliyeti en düşük, faydası en yüksek P2.
4. **`onboarding/tour` yeniden adlandırması mobil için hiç iş değil** — mobil bu ucu
   hiç çağırmıyor. Delta'nın "yapılacaklar" listesindeki 10. madde geçersiz.
5. **`sample*` ölçü alanları staging'de üçü de `null`** → doküman 14'ün "kart üzerinde
   örnek ölçü göster" kriteri bugün hiçbir kademede karşılanamıyor; kod bunu
   tolere etmeli, kriter "varsa göster" diye okunmalı.
6. **Kargo payı 50/50, doküman 14 §1 "Küçük 100/0" diyor.** Örnek olduğu belli ama
   yanıltıcı; paylar admin tarafından kademe **ve** kategori bazlı belirleniyor.
7. **`rg` bir zsh shell fonksiyonu, bash alt-kabuğunda yok.** Bu denetimde bir
   betik sessizce her satıra `0` döndürdü ve tüm statik sayfalar "menüde var" gibi
   göründü. Plan 5'in 3. çalışma kuralının bash-betik varyantı: **betik içinden
   `rg` çağırma**, `grep -rn --include` kullan (veya `--no-heading` ile üst kabukta kal).
