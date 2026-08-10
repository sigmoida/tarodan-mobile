# Delta 17/18 — Kırıcı Parite Turu (Tasarım)

**Tarih:** 2026-08-08
**Kaynak:** `mobile-parity docs/17-api-delta-2026-08-04.md`, `18-api-delta-2026-08-07.md`
**Ana repo:** `sigmoida/tarodan-app` `development` @ `cfc058da` (2026-08-07)

## Amaç

Ana repoda 2–7 Ağustos arasında giren, mobil istemciyi **fiilen kıran** üç
sözleşme değişikliğini kapatmak: checkout komisyon snapshot'ı, kısmi quote ve
takas v2 ödeme modeli. Bu üçü olmadan mobil uygulama ödeme alamaz.

## Kapsam

**İçinde:**

1. **Checkout komisyon snapshot'ı** — `commissionRuleSetId` + `commissionRuleSetVersion`
   quote'tan okunup dört sipariş gövdesine `expected*` olarak geri gönderilmesi;
   `409 COMMISSION_PRICING_CHANGED` ve `503` (komisyon kuralı yok) ayrımı.
2. **Kısmi quote** — `unavailableItems[]` ile satır ayıklama, gerekçe gösterimi,
   sepet invalidasyonu.
3. **Takas v2** — `cashPayments[]`, iki taraflı ödeme, `awaiting_payment` akışı,
   `GET /trades/:id/payment-quote` + `POST /trades/payment-quote/preview`,
   iade metinleri.

**Dışında (sonraki tur):** ilan formu `edit` projeksiyonu, `carModelId`/`modelCode`
opsiyonelliği, görsel key/sıra sözleşmesi, bildirim enum + `toMobileRoute`,
kargo `providerTrackingId` akışı, `distanceSalesAccepted`, sepette satır seçimi,
bülten formu, boş `scales` toleransı.

> **Ölçüm sonucu (2026-08-09):** kapı geçildi, dört sözleşme de staging'de canlı,
> hiçbir madde düşmedi. Ölçüm iki düzeltme üretti: `eas.json` doğru çıktı (base
> URL sorusu kapandı) ve `isV2` yalnız `cashPayments.length`'ten türetilemiyor —
> kabul edilmemiş v2 takas 0 satırlı olduğu için `payment-quote` ikinci sinyal
> olarak gerekli. Kanıt ve ham gövdeler:
> `docs/superpowers/reports/2026-08-09-delta-17-18-olcum.md`.

## 0. Doğrulama kapısı (kod yazmadan önce)

17/18 delta'ları **mobil repo taranmadan** yazıldı ve alanların staging'e deploy
edilip edilmediği belirsiz. Planın ilk adımı staging'e (`https://staging.tarodan.com.tr`)
gerçek istek atıp üç gövdeyi kaydetmektir:

- `POST /orders/quote` — `commissionRuleSetId`, `commissionRuleSetVersion`,
  `unavailableItems[]` geliyor mu?
- `GET /trades/:id/payment-quote` — dolu gövde mi, boş mu, 404 mü?
- `GET /trades/:id` — `cashPayments[]` var mı, kaç satır?

Ölçüm `docs/superpowers/reports/2026-08-08-delta-17-18-olcum.md`'ye yazılır.
**Tipler bu gövdelerden yazılır, delta dokümanından değil.**

**Kapı davranışı:** bir alan staging'de yoksa ilgili madde plandan düşer ve
backend bekleyen madde olarak raporlanır.

**Açık soru — aynı adımda çözülecek:** `eas.json` prod `EXPO_PUBLIC_API_URL`
`https://tarodan.com.tr/api` gösteriyor; delta 17 §4 API'yi `api.tarodan.com.tr`
diyor. Her ikisi denenip hangisinin cevap verdiği kayda geçer. Yanlışsa tek
satırlık düzeltme, fark edilmezse prod build sessizce ölür.

## 1. Checkout: snapshot tek kaynağa iner

Bugün `src/lib/api/orders.ts` dört payload üreticisinde (`directBuy`,
`createGuest`, `checkout`, `checkoutGuest`) `expectedPricingHash` +
`expectedShippingTariffVersion` alanlarını **ayrı ayrı** taşıyor. 18 ile alan
sayısı ikiden dörde çıkıyor; alanları dağınık tutmak drift üretir ve hata
canlıda "checkout 400" olarak çıkar.

```ts
export type ExpectedPricingSnapshot = {
  expectedPricingHash: string;
  expectedShippingTariffVersion: number;
  expectedCommissionRuleSetId: string;
  expectedCommissionRuleSetVersion: number;
};

export function toExpectedPricing(q: OrderQuoteResponse): ExpectedPricingSnapshot;
```

Dört üretici imzasında iki gevşek alan yerine tek `expectedPricing:
ExpectedPricingSnapshot` alır; gövdeye `...expectedPricing` olarak yayılır — tel
formatı düz kalır, çağıran tek nesne taşır. Beşinci alan geldiğinde tek tip +
tek türetici değişir, çağıran hiç değişmez.

`OrderQuoteResponse` genişler:

```ts
commissionRuleSetId: string;
commissionRuleSetVersion: number;
unavailableItems?: Array<{
  productId: string;
  sellerId?: string;
  code: string;      // PRODUCT_NOT_FOUND | PRODUCT_NOT_ACTIVE | SELLER_SALES_SUSPENDED
  message: string;
}>;
```

### Hata yolları — üçü ayrı davranış

| Durum                       | Davranış                                                                     |
| --------------------------- | ---------------------------------------------------------------------------- |
| `409 PRICING_CHANGED`       | Mevcut davranış korunur: yeniden quote + kullanıcı onayı                     |
| `409 COMMISSION_PRICING_CHANGED` | Aynı yol, ayrı mesaj — tek `handlePricingConflict` dalı                 |
| `503`                       | Yeniden quote'la çözülmez; geçici platform hatası mesajı, ödeme butonu kapalı |

Sessiz otomatik retry yoktur; bu `checkout-pricing-changed.test.tsx`'in koruduğu
davranıştır. `503`'ü 409 dalına karıştırmak kullanıcıyı sonsuz quote döngüsüne
sokar.

## 2. Kısmi quote

`useCheckout` quote'u ikiye ayrıştırır: `pricedItems` (ödenecek) ve
`unavailableItems` (ayrılan). Yeni sunum bileşeni
`app/checkout/_components/CheckoutUnavailableItems.tsx` üç kodu i18n anahtarına
eşleyip gerekçeyi gösterir; `code` bilinmiyorsa sunucunun `message`'ını basar
(ileri uyum). Eşleme sözlüğü `app/checkout/_lib/status.ts` — mevcut kalıp.

**Kural:** ayrılan satırlardan istemcide toplam yeniden türetilmez. Toplam yine
`pricing.summary`'den gelir; ayrılan satır yalnızca görsel bilgidir.
`unavailableItems` doluysa sepet invalidate edilir.

## 3. Takas v2

### Türetme tek yerde

`app/trade/[id]/_lib/derive.ts` genişler; JSX hiçbir yerde `cashPayments`
dizisine dokunmaz:

| Türetilen                    | Anlamı                                     |
| ---------------------------- | ------------------------------------------ |
| `isV2`                       | `cashPayments.length >= 2`                 |
| `myPaymentRow`               | `cashPayments.find(p => p.payerId === uid)` |
| `theirPaymentRow`            | karşı tarafın satırı                        |
| `myPaymentPending`           | kendi satırım `pending` mi                  |
| `paidCount` / `totalCount`   | "1/2 ödendi" göstergesi                    |

Tipler: `TradeCashPayment` yeni alanları alır (`payerId`, `recipientId: string | null`,
`tradeFeeAmount`, `shippingAmount`); `Trade` `cashPayments?: TradeCashPayment[]`
kazanır. `recipientId` nullable modellenir.

### v1/v2 birlikte yaşar

`pricingVersion` yanıt DTO'sunda yok; eldeki takaslar açıldıkları modelle biter.
Bu yüzden iki görünüm de çizilir:

- Mevcut `TradeCashCard` **v1 görünümü** olarak kalır (`isV2 === false` iken çizer,
  komisyon satırıyla).
- Yeni `TradePaymentsCard` **v2**'yi çizer: kendi satırım ve karşı tarafın satırı,
  her biri `hizmet bedeli + kargo + nakit fark = toplam`. `amount + commission`
  türetmesi v2 yolunda hiç geçmez.

Her iki kart da kendi koşulunda `null` döner — mevcut self-gating kalıbı.

### Akış

`useTradeActions` ödeme CTA'sını "kendi satırım `pending` mi?"ye bağlar; eşit
takasta da ödeme ister. Kabul sonrası `awaiting_payment` ilk sınıf durumdur: ben
ödediysem ve karşı taraf ödemediyse bu **takılma değil**, "karşı tarafın ödemesi
bekleniyor" durumudur. Ödeme uçları (`POST /trades/:id/cash-payment/initiate`,
`POST /payments/direct-form`) zaten mobilde mevcut; tutar sunucudan gelir,
istemcide hesaplanmaz.

### Döküm

`tradesApi`'ye `getPaymentQuote(id)` ve `previewPaymentQuote(body)` eklenir.
Detayda kabul öncesi canlı döküm, teklif oluşturmada iki tarafın maliyeti
gösterilir. `feeLines` değil tek `serviceFee` satırı basılır.

**v1 takasta bu uç `200` + boş gövde döner** — boş gövde hata değil, `isV2`
sinyalinin ikinci kaynağıdır.

### İade metni

Kargoya verildikten sonra iade `totalAmount − shippingAmount`'tır. İptal ve iade
metinlerine "kargo bedeli iade edilmez" uyarısı eklenir.

### i18n

Delta 17 §1g'nin saydığı ~20 `trade.*` anahtarı **mobil katalogda yok**
(doğrulandı: `paymentsTitle`, `yourPayment`, `bothMustPay`,
`shippingNotRefundable` … hiçbiri `src/i18n/lib/catalog/tr.json`'da geçmiyor).
Ana repodaki paylaşılan katalogdan çekilip `src/i18n/lib/catalog/{tr,en}.json`'a
eklenir, ardından `pnpm i18n:codegen`.

Ayrıca mevcut `TradeCashCard` gömülü Türkçe içeriyor ("Nakit Fark", "Komisyon
dahil toplam"); dokunulan dosya olduğu için katalog anahtarlarına taşınır.

## Test

Mevcut Jest kalıbı sürer (`app/checkout/__tests__/`, `app/trade/__tests__/`).
TDD: her davranış için önce başarısız test.

- `toExpectedPricing` saf fonksiyon — dört alanın da geçtiği birim test.
- Dört payload üreticisi dört alanı **aynen** gönderiyor (`orders.test.ts`).
- `COMMISSION_PRICING_CHANGED` → yeniden quote + kullanıcı onayı, sessiz retry yok.
- `503` → ayrı mesaj, quote döngüsü yok.
- `unavailableItems` → satır ödeme özetinden çıkıyor, gerekçe görünüyor, toplam
  yine `pricing.summary`'den okunuyor.
- `derive.ts` v1/v2 ayrımı — saf fonksiyon, iki fixture (tek satırlı v1, iki
  satırlı v2).
- `TradePaymentsCard` toplamı `tradeFee + shipping + amount` olarak basıyor; v1
  fixture'ında `null` dönüyor.

## Teslim sırası

Her adım kendi başına yeşil ve commit edilebilir:

| # | Adım                                                             |
| - | ---------------------------------------------------------------- |
| 0 | Staging ölçümü → rapor. **Kapı: alan yoksa o madde düşer**       |
| 1 | Snapshot türeticisi + dört payload + hata dalları                |
| 2 | `unavailableItems` + kısmi quote sunumu                          |
| 3 | Takas v2 tipleri + `derive.ts` + i18n anahtarları                 |
| 4 | `TradePaymentsCard` + `awaiting_payment` akışı + CTA             |
| 5 | `payment-quote` / `preview` dökümü                                |
| 6 | İade metinleri                                                    |

## Riskler

- **Ölçüm alanları bulamazsa** — 1 ve 2 düşer, backend bekleyen madde olarak
  raporlanır. Planın en olası sapması budur.
- **v2 takas canlıda yokken v2 kodu yazmak** — `isV2` yanlış `false` kalırsa
  kullanıcı v1 görünümü görür; bu güvenli taraftır ve seçilen dual-render bunu
  zaten karşılar.
- **Ödeme yolu 824 satırlık `useCheckout` içinde** — bu turda bölünmez.
  Checkout'un verbatim-controller disiplini (CLAUDE.md §12, altıncı örnek)
  kasıtlıdır; bu bir kırıcı sözleşme turu, refactor turu değil.
- **`api.tarodan.com.tr` belirsizliği** — 0. adımda çözülür; çözülmezse plan bunu
  açık soru olarak taşır.

## Doğrulama (CLAUDE.md §13)

- `npx tsc --noEmit` — takip edilen temel dışında yeni hata yok.
- Lint temiz — sabit hex/rgba yok, `src/theme/colors` importu yok.
- Dokunulan rotalarda Jest yeşil.
- Metro'da akış elle denenir: checkout ödeme yolu ve takas ödeme ekranı.
