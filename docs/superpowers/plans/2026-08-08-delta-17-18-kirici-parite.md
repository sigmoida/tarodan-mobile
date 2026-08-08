# Delta 17/18 Kırıcı Parite Turu — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ana repoda 2–7 Ağustos arasında giren üç kırıcı sözleşme değişikliğini
(checkout komisyon snapshot'ı, kısmi quote, takas v2 ödeme modeli) mobil
istemciye uygulamak.

**Architecture:** Checkout tarafında dört sipariş payload'ının taşıdığı `expected*`
alanları tek bir `ExpectedPricingSnapshot` tipi ve `toExpectedPricing(quote)`
türeticisinde toplanır; alan sayısı büyüdükçe çağıran kod değişmez. Takas
tarafında `derive.ts` tek `isV2` bayrağı türetir, v1 ve v2 kartları kendi
koşullarında `null` dönerek birlikte yaşar. Hiçbir para değeri istemcide
hesaplanmaz — her tutar bir sunucu alanının aynısıdır.

**Tech Stack:** Expo SDK 54 + expo-router, TanStack Query, axios, zod +
react-hook-form (`@/ui/form`), Jest + @testing-library/react-native, i18next
(`src/i18n/lib/catalog/{tr,en}.json` + `pnpm i18n:codegen`).

**Spec:** `docs/superpowers/specs/2026-08-08-delta-17-18-kirici-parite-design.md`

## Global Constraints

- **Para asla istemcide hesaplanmaz.** Gösterilen her tutar bir sunucu alanının
  aynısıdır (`pricing.summary.*`, `cashPayments[].*`, `payment-quote` alanları).
  `amount + commission` gibi türetmeler v2 yolunda yasaktır.
- **Tasarım token'ları zorunlu** (CLAUDE.md §2): `theme.colors.*`,
  `theme.spacing[n]` (sayısal anahtar), `theme.radius.*`. Sabit hex/rgba yasak,
  `src/theme/colors` importu yasak.
- **Kullanıcıya görünen her metin i18n katalogundan** gelir
  (`src/i18n/lib/catalog/{tr,en}.json`), yeni anahtar eklendikten sonra
  `pnpm i18n:codegen` çalıştırılır. Yeni kodda gömülü Türkçe string yazılmaz.
- **Query key'ler `@/lib/query`'den** (`qk.checkout.quote(...)`,
  `qk.trades.detail(id)`). Elle `['trade', id]` yazılmaz.
- **Bileşenler kendi koşullarında `null` döner** (self-gating); ekran JSX'inde
  satır içi koşul yazılmaz.
- **`useCheckout` bu turda BÖLÜNMEZ.** 824 satırlık verbatim controller kasıtlıdır
  (CLAUDE.md §12, altıncı örnek); bu bir sözleşme turu, refactor turu değil.
- Test komutu: `npx jest <path> --forceExit`. Tip kontrolü: `npx tsc --noEmit`.
- Branch: `feat/parite-delta-17-18` (zaten oluşturuldu, spec commit'li).

---

## Dosya Yapısı

**Değiştirilecek:**

| Dosya | Sorumluluk (değişiklikten sonra) |
| --- | --- |
| `src/lib/api/orders.ts` | Quote/sipariş sözleşmesi + `ExpectedPricingSnapshot` + `toExpectedPricing` |
| `src/lib/api/trades.ts` | Takas uçları + `getPaymentQuote` / `previewPaymentQuote` |
| `app/checkout/_hooks/useCheckout.ts` | Checkout controller (snapshot geçişi, 409/503 dalları, kısmi quote ayrıştırma) |
| `app/checkout/_lib/status.ts` | `unavailableItems[].code` → i18n anahtarı sözlüğü |
| `app/trade/[id]/_lib/types.ts` | Takas DTO'ları (v2 alanları) |
| `app/trade/[id]/_lib/derive.ts` | Takasın TEK türetme yeri (`isV2`, ödeme satırları) |
| `app/trade/[id]/_components/TradeCashCard.tsx` | **Yalnız v1** nakit kartı (i18n'e taşınır) |
| `app/trade/[id]/_components/TradeActions.tsx` | Aksiyon CTA'ları (ödeme kapısı kendi satırıma bağlanır) |
| `app/trade/[id]/index.tsx` | Kompozisyon (yeni kart eklenir) |
| `app/trade/new/_hooks/useNewTrade.ts` | Teklif oluşturma controller'ı + canlı maliyet önizlemesi |
| `app/trade/new/_components/NewTradeSteps.tsx` | Teklif adımları (özet adımına döküm kartı eklenir) |
| `src/lib/query/keys.ts` | Merkezi query-key kaydı (`paymentQuote`, `previewQuote`) |
| `src/i18n/lib/catalog/{tr,en}.json` | Metin katalogu |

**Oluşturulacak:**

| Dosya | Sorumluluk |
| --- | --- |
| `app/checkout/_components/CheckoutUnavailableItems.tsx` | Ödemeden ayrılan satırları gerekçesiyle gösterir; liste boşsa `null` |
| `app/trade/[id]/_components/TradePaymentsCard.tsx` | **Yalnız v2** iki taraflı ödeme kartı; v1'de `null` |
| `app/trade/[id]/_components/TradeCostPreviewCard.tsx` | `payment-quote` dökümü; boş gövdede `null` |
| `docs/superpowers/reports/2026-08-08-delta-17-18-olcum.md` | Görev 0'ın staging ölçüm kanıtı |

**Test dosyaları:**

| Dosya | Kapsam |
| --- | --- |
| `src/lib/api/__tests__/orders.test.ts` (genişler) | Dört payload dört alanı aynen gönderiyor |
| `src/lib/api/__tests__/expectedPricing.test.ts` (yeni) | `toExpectedPricing` saf türetici |
| `app/checkout/__tests__/checkout-commission-changed.test.tsx` (yeni) | `409 COMMISSION_PRICING_CHANGED` + `503` |
| `app/checkout/__tests__/checkout-unavailable-items.test.tsx` (yeni) | Kısmi quote sunumu |
| `app/trade/__tests__/derive-v2.test.ts` (yeni) | `isV2` + ödeme satırı türetmeleri |
| `app/trade/__tests__/payments-card.test.tsx` (yeni) | v2 kartı toplamı, v1'de `null` |

**Not — üretim çağrısı olmayan uçlar:** `ordersApi.directBuy` ve
`ordersApi.createGuest` bugün yalnız testlerden çağrılıyor; buy-now akışı da
`ordersApi.checkout`'a gidiyor. İmzaları yine güncellenir (API yüzeyi ve delta
18 dört gövdeyi de sayıyor), ama bir ekran davranışı değişmez.

---

### Task 0: Staging ölçümü — KAPI

Kod yazılmadan önce sözleşmenin staging'e deploy edildiği kanıtlanır. Bu görev
kod üretmez, **kanıt** üretir ve sonraki görevlerin kapsamını belirler.

**Files:**
- Create: `docs/superpowers/reports/2026-08-08-delta-17-18-olcum.md`

**Interfaces:**
- Consumes: yok
- Produces: ölçülmüş gerçek gövdeler. Görev 1–3 `OrderQuoteResponse` alan
  adlarını, Görev 4–9 `cashPayments[]` ve `payment-quote` alan adlarını **bu
  rapordan** alır, delta dokümanından değil.

- [ ] **Step 1: Base URL'i çöz**

`eas.json` prod `https://tarodan.com.tr/api` gösteriyor, delta 17 §4
`api.tarodan.com.tr` diyor. İkisini de dene:

```bash
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -L https://staging.tarodan.com.tr/api/health/ready
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -L https://api.staging.tarodan.com.tr/health/ready
```

Cevap veren adresi rapora yaz. `eas.json`'daki değerle çelişiyorsa raporda
**açık uyarı** olarak işaretle (düzeltme Görev 1'e girer).

- [ ] **Step 2: Quote gövdesini ölç**

Staging'de bir hesapla giriş yapıp bearer token al, sonra:

```bash
curl -s -X POST "$BASE/orders/quote" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"<staging-urun-id>","quantity":1}]}' | tee /tmp/quote.json
```

Rapora **ham gövdeyi** yapıştır. Şu üç sorunun cevabını açıkça yaz:
`commissionRuleSetId` var mı? `commissionRuleSetVersion` var mı?
`unavailableItems` alanı yanıtın kökünde geçiyor mu (boş dizi olarak bile)?

- [ ] **Step 3: Takas gövdelerini ölç**

```bash
curl -s "$BASE/trades" -H "Authorization: Bearer $TOKEN" | tee /tmp/trades.json
curl -s "$BASE/trades/<id>" -H "Authorization: Bearer $TOKEN" | tee /tmp/trade.json
curl -s -o /tmp/pq.json -w "%{http_code}\n" "$BASE/trades/<id>/payment-quote" -H "Authorization: Bearer $TOKEN"
```

Rapora yaz: `cashPayments` dizisi geliyor mu, kaç satır, satırda `payerId` /
`tradeFeeAmount` / `shippingAmount` var mı; `payment-quote` HTTP kodu ve gövdesi
(boş gövde v1 demektir — bu da geçerli bir ölçüm sonucudur).

- [ ] **Step 4: Kapı kararını yaz**

Raporun sonuna tablo:

```markdown
| Madde | Staging'de var mı | Karar |
| --- | --- | --- |
| commissionRuleSetId/Version | evet/hayır | Görev 1–2 uygulanır / düşer |
| unavailableItems | evet/hayır | Görev 3 uygulanır / düşer |
| cashPayments[] (2 satır) | evet/hayır | Görev 4–7 uygulanır / düşer |
| payment-quote | dolu/boş/404 | Görev 8 uygulanır / düşer |
```

Düşen her madde için raporda "backend bekliyor" satırı yaz ve nedenini belirt.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reports/2026-08-08-delta-17-18-olcum.md
git commit -m "docs(report): measure the delta 17/18 contracts against staging"
```

---

### Task 1: `ExpectedPricingSnapshot` — snapshot tek kaynağa iner

**Files:**
- Modify: `src/lib/api/orders.ts`
- Test: `src/lib/api/__tests__/expectedPricing.test.ts` (yeni),
  `src/lib/api/__tests__/orders.test.ts` (genişler)

**Interfaces:**
- Consumes: Görev 0'ın ölçtüğü quote gövdesi.
- Produces:
  - `type ExpectedPricingSnapshot = { expectedPricingHash: string; expectedShippingTariffVersion: number; expectedCommissionRuleSetId: string; expectedCommissionRuleSetVersion: number }`
  - `function toExpectedPricing(q: OrderQuoteResponse): ExpectedPricingSnapshot | null`
    — quote'ta alanlardan biri eksik/tip dışıysa `null` döner (çağıran bunu
    "fiyat hazır değil" kapısı olarak kullanır).
  - Dört payload üreticisinin imzası artık `expectedPricing: ExpectedPricingSnapshot`
    alır (iki gevşek alan yerine).

- [ ] **Step 1: `toExpectedPricing` için başarısız test yaz**

`src/lib/api/__tests__/expectedPricing.test.ts`:

```ts
/**
 * `toExpectedPricing` — quote yanıtından sipariş gövdesine giden fiyat imzasının
 * TEK türeticisi. Delta 18 ile alan sayısı ikiden dörde çıktı; dört payload
 * üreticisine alan alan dağıtmak yerine burada toplanır.
 *
 * Eksik alan `null` döndürür: undefined/0 göndermek yalnız aynı 400'ü başka bir
 * şekilde üretirdi (mevcut `pricingHash` kapısıyla aynı gerekçe).
 */
import { toExpectedPricing, type OrderQuoteResponse } from '../orders';

const FULL = {
  pricingHash: '70a8bdadff29af70',
  shippingTariffVersion: 4,
  commissionRuleSetId: '11111111-2222-3333-4444-555555555555',
  commissionRuleSetVersion: 7,
} as OrderQuoteResponse;

describe('toExpectedPricing', () => {
  it('dört alanı da expected* adlarıyla taşır', () => {
    expect(toExpectedPricing(FULL)).toEqual({
      expectedPricingHash: '70a8bdadff29af70',
      expectedShippingTariffVersion: 4,
      expectedCommissionRuleSetId: '11111111-2222-3333-4444-555555555555',
      expectedCommissionRuleSetVersion: 7,
    });
  });

  it('komisyon seti eksikse null döner (yarım gövde göndermez)', () => {
    const { commissionRuleSetId, ...withoutId } = FULL as any;
    expect(toExpectedPricing(withoutId)).toBeNull();
  });

  it('sürüm sayı değilse null döner', () => {
    expect(toExpectedPricing({ ...FULL, commissionRuleSetVersion: null } as any)).toBeNull();
  });

  it('shippingTariffVersion 0 geçerli bir sürümdür — null DÖNMEZ', () => {
    expect(toExpectedPricing({ ...FULL, shippingTariffVersion: 0 })).not.toBeNull();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/lib/api/__tests__/expectedPricing.test.ts --forceExit`
Expected: FAIL — `toExpectedPricing is not a function`

- [ ] **Step 3: Tipi ve türeticiyi yaz**

`src/lib/api/orders.ts` içinde `OrderQuoteResponse` tanımının hemen ardına:

```ts
/**
 * Sipariş gövdesine AYNEN geri gidecek fiyat imzası. Delta 18 ile komisyon
 * rule-set kimliği/sürümü eklendi; alanlar dört payload üreticisine dağıtılmak
 * yerine burada toplanır — beşinci alan geldiğinde yalnız bu tip ve
 * `toExpectedPricing` değişir, çağıran hiç değişmez.
 */
export type ExpectedPricingSnapshot = {
  expectedPricingHash: string;
  expectedShippingTariffVersion: number;
  expectedCommissionRuleSetId: string;
  expectedCommissionRuleSetVersion: number;
};

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/**
 * Quote → imza. Alanlardan biri eksik/tip dışıysa `null`: yarım gövde göndermek
 * yalnız aynı 400'ü başka bir şekilde üretir, çağıran bunu "fiyat hazır değil"
 * kapısı olarak kullanır.
 */
export function toExpectedPricing(
  q: OrderQuoteResponse | undefined | null,
): ExpectedPricingSnapshot | null {
  if (!q) return null;
  if (typeof q.pricingHash !== 'string' || !q.pricingHash) return null;
  if (!isFiniteNumber(q.shippingTariffVersion)) return null;
  if (typeof q.commissionRuleSetId !== 'string' || !q.commissionRuleSetId) return null;
  if (!isFiniteNumber(q.commissionRuleSetVersion)) return null;
  return {
    expectedPricingHash: q.pricingHash,
    expectedShippingTariffVersion: q.shippingTariffVersion,
    expectedCommissionRuleSetId: q.commissionRuleSetId,
    expectedCommissionRuleSetVersion: q.commissionRuleSetVersion,
  };
}
```

`OrderQuoteResponse` tipine iki alan ekle (mevcut `pricingHash` satırlarının
yanına):

```ts
  /** Order-create payload'ına AYNEN geri gönderilecek komisyon seti (delta 18). */
  commissionRuleSetId: string;
  commissionRuleSetVersion: number;
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/lib/api/__tests__/expectedPricing.test.ts --forceExit`
Expected: PASS (4 test)

- [ ] **Step 5: Dört payload için başarısız test yaz**

`src/lib/api/__tests__/orders.test.ts` içindeki `PRICING_HASH` /
`SHIPPING_TARIFF_VERSION` sabitlerinin altına ekle:

```ts
const EXPECTED_PRICING = {
  expectedPricingHash: PRICING_HASH,
  expectedShippingTariffVersion: SHIPPING_TARIFF_VERSION,
  expectedCommissionRuleSetId: '11111111-2222-3333-4444-555555555555',
  expectedCommissionRuleSetVersion: 7,
};
```

Dört mevcut testi güncelle: her çağrıda iki gevşek alan yerine
`expectedPricing: EXPECTED_PRICING` geçir, beklentiyi
`expect.objectContaining(EXPECTED_PRICING)` yap. Örnek (`checkout`):

```ts
  it('checkout (üye): dört alanı da koşulsuz gönderir', async () => {
    await ordersApi.checkout({
      items: [{ productId: 'p1' }],
      idempotencyKey: 'idem-1',
      expectedPricing: EXPECTED_PRICING,
    });
    expect(mockApiPost).toHaveBeenCalledWith(
      '/orders/checkout',
      expect.objectContaining(EXPECTED_PRICING),
    );
  });
```

Aynı dönüşümü `checkoutGuest`, `directBuy`, `createGuest` testlerine uygula
(gövdelerin geri kalanı — email, adres, telefon — aynen kalır). Dosyanın baş
yorumunu delta 18'e göre güncelle: iki alan değil dört alan, ve gerekçe artık
"komisyon seti quote'tan aynen geri gönderilmezse DTO doğrulaması reddediyor".

- [ ] **Step 6: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/lib/api/__tests__/orders.test.ts --forceExit`
Expected: FAIL — gönderilen gövdede `expectedCommissionRuleSetId` yok

- [ ] **Step 7: Dört imzayı snapshot'a geçir**

`src/lib/api/orders.ts` içinde dört üreticide, şu iki satırı:

```ts
    /** Quote kökünden AYNEN — API DTO'sunda zorunlu. */
    expectedPricingHash: string;
    expectedShippingTariffVersion: number;
```

şununla değiştir:

```ts
    /** Quote'tan türetilmiş fiyat imzası — gövdeye düz alanlar olarak yayılır. */
    expectedPricing: ExpectedPricingSnapshot;
```

ve her fonksiyonun gövdesini imzayı yayacak şekilde yaz. Örnek (`checkout`):

```ts
  checkout: ({ expectedPricing, ...rest }: {
    items: Array<{ productId: string }>;
    idempotencyKey: string;
    shippingAddressId?: string;
    shippingAddress?: OrderAddressInput;
    billingAddressId?: string;
    billingAddress?: OrderAddressInput;
    couponCode?: string;
    expectedPricing: ExpectedPricingSnapshot;
  }) => api.post('/orders/checkout', { ...rest, ...expectedPricing }),
```

Aynı kalıbı `checkoutGuest` (→ `guestApi.post('/orders/checkout/guest', …)`),
`directBuy` (→ `api.post('/orders/buy', …)`), `createGuest`
(→ `guestApi.post('/orders/guest', …)`) için uygula. **Tel formatı düz kalır** —
sunucu dört alanı gövdenin kökünde bekler.

- [ ] **Step 8: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/lib/api/__tests__/orders.test.ts src/lib/api/__tests__/expectedPricing.test.ts --forceExit`
Expected: PASS

- [ ] **Step 9: Base URL düzeltmesi (yalnız Görev 0 çelişki bulduysa)**

Görev 0'ın raporu `eas.json`'daki `EXPO_PUBLIC_API_URL` değerlerinin yanlış
olduğunu gösterdiyse üç profili de (`preview`, `staging`, `production`) ölçülmüş
adrese güncelle ve `src/config/__tests__/apiUrl.test.ts`'teki beklentileri aynı
değerlere getir. Rapor çelişki bulmadıysa bu adımı atla ve neden atlandığını
commit mesajında belirt.

- [ ] **Step 10: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: `useCheckout.ts` içinde `expectedPricingHash` geçişinden kaynaklanan
hatalar görünür — bunlar Görev 2'de kapanır, başka yeni hata olmamalı.

- [ ] **Step 11: Commit**

```bash
git add src/lib/api/orders.ts src/lib/api/__tests__/
git commit -m "feat(api): carry the checkout pricing signature as one snapshot"
```

---

### Task 2: `useCheckout` — snapshot geçişi + `COMMISSION_PRICING_CHANGED` + `503`

**Files:**
- Modify: `app/checkout/_hooks/useCheckout.ts:509-560` (fiyat kapısı + payload),
  `app/checkout/_hooks/useCheckout.ts:660-676` (409 dalı)
- Modify: `src/i18n/lib/catalog/{tr,en}.json`
- Test: `app/checkout/__tests__/checkout-commission-changed.test.tsx` (yeni)

**Interfaces:**
- Consumes: `toExpectedPricing(quote)` ve `ExpectedPricingSnapshot` (Görev 1).
- Produces: `useCheckout` dönüşünde davranış değişikliği yok — dışa açık yüzey
  aynı kalır, yalnız payload ve hata dalları değişir.

- [ ] **Step 1: Yeni i18n anahtarlarını ekle**

`src/i18n/lib/catalog/tr.json` içindeki `checkout` bloğuna:

```json
"commissionChangedTitle": "Komisyon oranları güncellendi",
"commissionChangedBody": "Platform komisyon kuralları siz ödemeye geçerken güncellendi.\n\nÖnceki toplam: {oldTotal}\nYeni toplam: {newTotal}\n\nLütfen tutarı kontrol edip tekrar onaylayın.",
"pricingUnavailableTitle": "Ödeme şu an alınamıyor",
"pricingUnavailableBody": "Fiyatlandırma yapılandırması geçici olarak kullanılamıyor. Lütfen birazdan tekrar deneyin."
```

`en.json` içindeki aynı bloğa İngilizce karşılıkları ekle:

```json
"commissionChangedTitle": "Commission rates were updated",
"commissionChangedBody": "Platform commission rules changed while you were checking out.\n\nPrevious total: {oldTotal}\nNew total: {newTotal}\n\nPlease review the amount and confirm again.",
"pricingUnavailableTitle": "Payment is unavailable right now",
"pricingUnavailableBody": "Pricing configuration is temporarily unavailable. Please try again shortly."
```

Run: `pnpm i18n:codegen`

- [ ] **Step 2: Başarısız testi yaz**

`app/checkout/__tests__/checkout-commission-changed.test.tsx` — mock iskeletini
`checkout-pricing-changed.test.tsx`'ten **birebir kopyala** (aynı
`jest.mock('@/lib/api', …)`, `ONE_ADDRESS`, `renderWithProviders` kurulumu), yalnız
quote fixture'ını ve hata gövdesini değiştir:

```tsx
/**
 * checkout-commission-changed · 409 COMMISSION_PRICING_CHANGED ve 503 (delta 18 §1).
 *
 * `PRICING_CHANGED` i18nKey ile ayırt ediliyordu; komisyon çakışması ise
 * `response.data.code === 'COMMISSION_PRICING_CHANGED'` ile gelir. İkisi de aynı
 * dala iner: quote yenilenir, yeni toplam gösterilir, yeniden onay istenir —
 * sessiz otomatik retry YOK.
 *
 * `503` AYRI davranıştır: yeniden quote'la çözülmez, kullanıcı quote döngüsüne
 * sokulmaz.
 */
const QUOTE = {
  pricingHash: 'hash-old',
  shippingTariffVersion: 3,
  commissionRuleSetId: 'rs-1',
  commissionRuleSetVersion: 7,
  pricing: { summary: { productAmount: 100, shippingAmount: 30, serviceFeeAmount: 20, total: 150 } },
  items: [{ productId: 'p1', quantity: 1, subtotal: 100 }],
};

it('409 COMMISSION_PRICING_CHANGED: quote yenilenir ve yeniden onay istenir', async () => {
  jest.mocked(ordersApi.getQuote)
    .mockResolvedValueOnce({ data: QUOTE } as any)
    .mockResolvedValueOnce({
      data: { ...QUOTE, commissionRuleSetVersion: 8, pricing: { summary: { ...QUOTE.pricing.summary, total: 165 } } },
    } as any);
  jest.mocked(ordersApi.checkout).mockRejectedValueOnce({
    response: { status: 409, data: { code: 'COMMISSION_PRICING_CHANGED' } },
  });

  await payThroughCheckout();

  await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalledTimes(2));
  expect(appAlert).toHaveBeenCalled();
  // Sessiz retry YOK: checkout ikinci kez çağrılmadı.
  expect(ordersApi.checkout).toHaveBeenCalledTimes(1);
});

it('503: quote yenilenmez, ayrı mesaj basılır', async () => {
  jest.mocked(ordersApi.getQuote).mockReset().mockResolvedValue({ data: QUOTE } as any);
  jest.mocked(ordersApi.checkout).mockRejectedValueOnce({ response: { status: 503, data: {} } });

  await payThroughCheckout();

  await waitFor(() => expect(appAlert).toHaveBeenCalled());
  const [title] = jest.mocked(appAlert).mock.calls[0];
  expect(title).toBe('Ödeme şu an alınamıyor');
  // Kullanıcı sonsuz quote döngüsüne sokulmadı.
  expect(ordersApi.getQuote).toHaveBeenCalledTimes(1);
});
```

Üç adımı geçen ortak yardımcı (`checkout-pricing-changed.test.tsx`'teki
`fireEvent` dizisinin aynısı — ekran metinleri o dosyadan birebir alındı):

```tsx
async function payThroughCheckout() {
  renderWithProviders(<CheckoutScreen />);
  // Kayıtlı adres yüklenince satırı doğrudan seç — otomatik-seçim efektinin
  // zamanlamasına bağımlı kalmamak için (validateStep1 inline adres ister).
  await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Ali Veli'));
  fireEvent.press(screen.getByText('Devam Et')); // step1 → step2
  await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Devam Et')); // step2 → step3
  await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
  await act(async () => {
    fireEvent.press(screen.getByText(/Onayla ve Öde/));
  });
}
```

`beforeEach`'te sepeti tohumla ve mock'ları sıfırla (aynı dosyadan):

```tsx
beforeEach(() => {
  jest.mocked(appAlert).mockClear();
  jest.mocked(ordersApi.checkout).mockReset();
  jest.mocked(ordersApi.getQuote).mockReset();
  seedCart([SAMPLE_ITEM]);
});
afterEach(() => useCartStore.setState({ items: [] }));
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/checkout/__tests__/checkout-commission-changed.test.tsx --forceExit`
Expected: FAIL — 409 dalı `code`'a bakmıyor, quote yenilenmiyor

- [ ] **Step 4: Fiyat kapısını ve payload'ı snapshot'a geçir**

`useCheckout.ts` — importa `toExpectedPricing` ekle, sonra `proceedCheckout`
başındaki kapıyı (`if (!quote?.pricingHash || quote.shippingTariffVersion == null)`)
şununla değiştir:

```ts
    // Dört alanın DÖRDÜ de API DTO'sunda zorunlu — yarım gövde göndermek yalnız
    // aynı 400'ü başka bir şekilde üretir. Türetici tek kaynak (`@/lib/api`).
    const expectedPricing = toExpectedPricing(quote);
    if (!expectedPricing) {
```

Gövdenin geri kalanı (`alertInlineWhileOtpOpen(...)` + `return`) aynen kalır.

`checkoutPayload` içindeki iki satırı:

```ts
        expectedPricingHash: quote.pricingHash,
        expectedShippingTariffVersion: quote.shippingTariffVersion,
```

şununla değiştir:

```ts
        // Quote'tan türetilmiş imza — dört alan gövdeye burada yayılır.
        expectedPricing,
```

ve misafir dalındaki iki satırı:

```ts
              expectedPricingHash: checkoutPayload.expectedPricingHash,
              expectedShippingTariffVersion: checkoutPayload.expectedShippingTariffVersion,
```

şununla değiştir:

```ts
              expectedPricing,
```

- [ ] **Step 5: 409 dalını iki koda birden bağla, 503'ü ayır**

Mevcut 409 bloğunu (`if (status === 409 && error?.response?.data?.i18nKey === 'server.shipping.pricingChanged')`)
şununla değiştir:

```ts
      // İki ayrı çakışma, TEK dal: fiyat/kargo değişti (i18nKey ile gelir) veya
      // komisyon seti değişti (delta 18 — `code` ile gelir). İkisinde de quote
      // yenilenir, yeni toplam gösterilir, yeniden onay istenir. Sessiz retry YOK.
      const isPricingConflict =
        status === 409 && error?.response?.data?.i18nKey === 'server.shipping.pricingChanged';
      const isCommissionConflict =
        status === 409 && error?.response?.data?.code === 'COMMISSION_PRICING_CHANGED';
      if (isPricingConflict || isCommissionConflict) {
        const oldTotal = total;
        const refreshed = await quoteQuery.refetch();
        const newTotal = refreshed.data?.pricing?.summary?.total;
        alertAfterOtpClose(
          isCommissionConflict
            ? t('checkout.commissionChangedTitle')
            : t('checkout.pricesUpdatedTitle'),
          isCommissionConflict
            ? t('checkout.commissionChangedBody', {
                oldTotal: formatServerPrice(oldTotal),
                newTotal: formatServerPrice(newTotal),
              })
            : `Ürün veya kargo fiyatları güncellendi.\n\nÖnceki toplam: ${formatServerPrice(
                oldTotal,
              )}\nYeni toplam: ${formatServerPrice(newTotal)}\n\nLütfen tutarı kontrol edip tekrar onaylayın.`,
        );
        return;
      }
      // 503: aktif komisyon kuralı yok. Yeniden quote'la ÇÖZÜLMEZ — kullanıcıyı
      // quote döngüsüne sokma, geçici platform hatası olarak bildir.
      if (status === 503) {
        alertAfterOtpClose(
          t('checkout.pricingUnavailableTitle'),
          t('checkout.pricingUnavailableBody'),
        );
        return;
      }
```

- [ ] **Step 6: Testleri çalıştır**

Run: `npx jest app/checkout --forceExit`
Expected: PASS — yeni dosya geçer, mevcut on üç checkout testi de yeşil kalır
(özellikle `checkout-pricing-changed`, `checkout-member-payload`).

- [ ] **Step 7: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: Görev 1'de görülen `expectedPricingHash` hataları kapandı, yeni hata yok.

- [ ] **Step 8: Commit**

```bash
git add app/checkout src/i18n/lib
git commit -m "fix(checkout): send the commission snapshot and split the 503 path"
```

---

### Task 3: Kısmi quote — `unavailableItems`

**Files:**
- Modify: `src/lib/api/orders.ts` (tip), `app/checkout/_lib/status.ts` (sözlük),
  `app/checkout/_hooks/useCheckout.ts` (ayrıştırma + sepet invalidasyonu),
  `app/checkout/index.tsx` (kompozisyon), `src/i18n/lib/catalog/{tr,en}.json`
- Create: `app/checkout/_components/CheckoutUnavailableItems.tsx`
- Test: `app/checkout/__tests__/checkout-unavailable-items.test.tsx`

**Interfaces:**
- Consumes: `OrderQuoteResponse` (Görev 1'de genişletildi).
- Produces:
  - `type QuoteUnavailableItem = { productId: string; sellerId?: string; code: string; message: string }`
  - `useCheckout()` dönüşüne `unavailableItems: QuoteUnavailableItem[]` eklenir.
  - `<CheckoutUnavailableItems items={…} />` — liste boşsa `null`.

- [ ] **Step 1: Tipi ekle**

`src/lib/api/orders.ts`:

```ts
/**
 * Quote'un fiyatlayamadığı satırlar (delta 18 §1). Quote 200 ile KISMİ başarı
 * dönebilir: `items[]` yalnız fiyatlananlar, bunlar dışarıda bırakılanlardır.
 */
export type QuoteUnavailableItem = {
  productId: string;
  sellerId?: string;
  /** PRODUCT_NOT_FOUND | PRODUCT_NOT_ACTIVE | SELLER_SALES_SUSPENDED — kapalı liste DEĞİL. */
  code: string;
  message: string;
};
```

ve `OrderQuoteResponse` içine `unavailableItems?: QuoteUnavailableItem[];`.

- [ ] **Step 2: i18n anahtarlarını ekle**

`tr.json` `checkout` bloğuna:

```json
"unavailableTitle": "Bu ürünler ödemeye dahil edilmedi",
"unavailableProductNotFound": "Ürün artık mevcut değil.",
"unavailableProductNotActive": "İlan satışta değil.",
"unavailableSellerSuspended": "Satıcının satış yetkisi şu an geçerli değil."
```

`en.json` karşılıkları:

```json
"unavailableTitle": "These items were left out of the payment",
"unavailableProductNotFound": "This product is no longer available.",
"unavailableProductNotActive": "This listing is not on sale.",
"unavailableSellerSuspended": "The seller cannot sell right now."
```

Run: `pnpm i18n:codegen`

- [ ] **Step 3: Sözlüğü yaz**

`app/checkout/_lib/status.ts` (dosya yoksa oluştur):

```ts
import type { TFunction } from 'i18next';

/**
 * `unavailableItems[].code` → metin. Kod KAPALI bir liste değil: bilinmeyen kodda
 * sunucunun kendi `message`'ı basılır (ileri uyum — yeni bir kod eklendiğinde
 * kullanıcı boş satır görmez).
 */
const UNAVAILABLE_KEYS: Record<string, string> = {
  PRODUCT_NOT_FOUND: 'checkout.unavailableProductNotFound',
  PRODUCT_NOT_ACTIVE: 'checkout.unavailableProductNotActive',
  SELLER_SALES_SUSPENDED: 'checkout.unavailableSellerSuspended',
};

export function unavailableReason(
  item: { code: string; message?: string },
  t: TFunction,
): string {
  const key = UNAVAILABLE_KEYS[item.code];
  return key ? t(key as any) : (item.message || '');
}
```

- [ ] **Step 4: Başarısız testi yaz**

`app/checkout/__tests__/checkout-unavailable-items.test.tsx` — mock iskeleti yine
`checkout-pricing-changed.test.tsx`'ten kopyalanır:

```tsx
/**
 * checkout-unavailable-items · kısmi quote (delta 18 §1).
 *
 * Quote 200 ile fiyatlanan ve fiyatlanmayan satırları birlikte döndürebilir.
 * Ayrılan satır gerekçesiyle gösterilir; toplam YİNE `pricing.summary.total`'dır
 * — ayrılan satırlardan istemcide toplam türetilmez.
 */
const QUOTE_PARTIAL = {
  pricingHash: 'h1',
  shippingTariffVersion: 4,
  commissionRuleSetId: 'rs-1',
  commissionRuleSetVersion: 7,
  items: [{ productId: 'p1', quantity: 1, subtotal: 100 }],
  unavailableItems: [
    { productId: 'p2', sellerId: 's2', code: 'SELLER_SALES_SUSPENDED', message: 'Satıcı askıda' },
    { productId: 'p3', code: 'BRAND_NEW_CODE', message: 'Sunucudan gelen ham gerekçe' },
  ],
  pricing: { summary: { productAmount: 100, shippingAmount: 30, serviceFeeAmount: 20, total: 150 } },
};

// Kısmi quote ödeme YAPMADAN görünür — üçüncü adıma kadar ilerlemek yeterli.
async function openCheckout() {
  renderWithProviders(<CheckoutScreen />);
  await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Ali Veli'));
}

beforeEach(() => {
  jest.mocked(ordersApi.getQuote).mockReset();
  seedCart([SAMPLE_ITEM]);
});
afterEach(() => useCartStore.setState({ items: [] }));

it('ayrılan satırın gerekçesini gösterir ve toplamı summary.total olarak basar', async () => {
  jest.mocked(ordersApi.getQuote).mockResolvedValue({ data: QUOTE_PARTIAL } as any);

  await openCheckout();

  expect(await screen.findByText('Satıcının satış yetkisi şu an geçerli değil.')).toBeTruthy();
  // Bilinmeyen kodda sunucunun ham mesajı basılır (ileri uyum).
  expect(screen.getByText('Sunucudan gelen ham gerekçe')).toBeTruthy();
  // Toplam ayrılan satırlardan türetilmedi — summary.total aynen.
  expect(screen.getByText('₺150,00')).toBeTruthy();
});

it('unavailableItems boşsa hiçbir uyarı bölümü çizilmez', async () => {
  jest.mocked(ordersApi.getQuote).mockResolvedValue({
    data: { ...QUOTE_PARTIAL, unavailableItems: [] },
  } as any);

  await openCheckout();
  await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalled());

  expect(screen.queryByText('Bu ürünler ödemeye dahil edilmedi')).toBeNull();
});
```

- [ ] **Step 5: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/checkout/__tests__/checkout-unavailable-items.test.tsx --forceExit`
Expected: FAIL — gerekçe metni ekranda yok

- [ ] **Step 6: Bileşeni yaz**

`app/checkout/_components/CheckoutUnavailableItems.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import type { QuoteUnavailableItem } from '@/lib/api';
import { unavailableReason } from '../_lib/status';

/**
 * Ödemeye dahil EDİLMEYEN satırlar. Bu kart yalnız bilgilendirir — tutarların
 * hiçbiri buradan türetilmez, toplam `pricing.summary.total`'dır.
 */
export function CheckoutUnavailableItems({ items }: { items: QuoteUnavailableItem[] }) {
  const { t } = useTranslation();
  if (!items.length) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={18} color={theme.colors.warning[600]!} />
        <Text variant="body" style={styles.title}>{t('checkout.unavailableTitle')}</Text>
      </View>
      {items.map((item) => (
        <Text key={item.productId} variant="caption" tone="muted" style={styles.reason}>
          {unavailableReason(item, t)}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    backgroundColor: theme.colors.warning[50]!,
    borderWidth: 1,
    borderColor: theme.colors.warning[200]!,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
  title: { fontWeight: '600', flex: 1 },
  reason: { marginTop: theme.spacing[1] },
});
```

> `theme.colors.warning[50]` / `[200]` / `[600]` isimlerini `src/theme/` içinden
> doğrula; farklıysa oradaki gerçek anahtarları kullan, hex YAZMA.

- [ ] **Step 7: Controller'a bağla**

`useCheckout.ts` — `quote` türetmelerinin yanına ekle:

```ts
  /** Quote'un fiyatlayamadığı satırlar — bilgi amaçlı, tutar türetilmez. */
  const unavailableItems = quote?.unavailableItems ?? [];
```

ve dönüş nesnesine `unavailableItems` ekle. Ayrıca satır ayrıldıysa sunucu
sepeti değişmiş demektir — quote yüklendikten sonra sepeti tazele:

```ts
  // Sunucu satırı ayırdıysa sepetin yerel kopyası bayat: satır artık satın
  // alınamaz. Sepeti tazele (silme İSTEĞİ atma — sunucu zaten kendi kararını verdi).
  useEffect(() => {
    if (unavailableItems.length > 0) {
      void queryClient.invalidateQueries({ queryKey: qk.cart.all });
    }
  }, [unavailableItems.length, queryClient]);
```

> `qk.cart.all` anahtarının gerçek adını `src/lib/query/keys.ts`'ten doğrula.

- [ ] **Step 8: Ekrana ekle**

`app/checkout/index.tsx` — `OrderSummary`'nin hemen üstüne:

```tsx
<CheckoutUnavailableItems items={checkout.unavailableItems} />
```

Bileşen kendi kendine kapılıyor; ekranda satır içi koşul yazma.

- [ ] **Step 9: Testleri çalıştır**

Run: `npx jest app/checkout --forceExit`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add app/checkout src/lib/api/orders.ts src/i18n/lib
git commit -m "feat(checkout): surface the lines a partial quote left out"
```

---

### Task 4: Takas v2 tipleri + `derive.ts`

**Files:**
- Modify: `app/trade/[id]/_lib/types.ts`, `app/trade/[id]/_lib/derive.ts`
- Test: `app/trade/__tests__/derive-v2.test.ts` (yeni)

**Interfaces:**
- Consumes: Görev 0'ın ölçtüğü `cashPayments[]` gövdesi.
- Produces: `deriveTradeView(trade, user)` dönüşünde yeni alanlar —
  `isV2: boolean`, `myPaymentRow: TradeCashPayment | null`,
  `theirPaymentRow: TradeCashPayment | null`, `myPaymentPending: boolean`,
  `paidCount: number`, `totalCount: number`. Görev 6–8 yalnız bunları okur.

- [ ] **Step 1: Başarısız testi yaz**

`app/trade/__tests__/derive-v2.test.ts`:

```ts
/**
 * derive-v2 · takas v2 ödeme modeli (delta 17 §1).
 *
 * `pricingVersion` yanıt DTO'sunda YOK. İstemci v2'yi `cashPayments.length >= 2`
 * ile anlar. Eldeki v1 takaslar açıldıkları modelle biteceği için iki görünüm de
 * yaşar; ayrım BURADA, tek yerde yapılır.
 */
import { deriveTradeView } from '../[id]/_lib/derive';
import type { Trade } from '../[id]/_lib/types';

const ME = { id: 'u1' };

const BASE = {
  id: 't1',
  initiatorId: 'u1',
  receiverId: 'u2',
  initiatorName: 'Ben',
  receiverName: 'Karşı',
  status: 'awaiting_payment',
  items: [],
  shipments: [],
} as unknown as Trade;

const V2 = {
  ...BASE,
  cashPayments: [
    { id: 'c1', payerId: 'u1', recipientId: null, amount: 0, tradeFeeAmount: 120, shippingAmount: 190, commission: 0, totalAmount: 310, status: 'completed' },
    { id: 'c2', payerId: 'u2', recipientId: 'u1', amount: 500, tradeFeeAmount: 120, shippingAmount: 190, commission: 0, totalAmount: 810, status: 'pending' },
  ],
} as unknown as Trade;

const V1 = {
  ...BASE,
  cashPayment: { id: 'c1', amount: 500, commission: 50, totalAmount: 550, status: 'pending' },
} as unknown as Trade;

describe('deriveTradeView — v1/v2 ayrımı', () => {
  it('iki ödeme satırı varsa v2 sayar', () => {
    expect(deriveTradeView(V2, ME).isV2).toBe(true);
  });

  it('tekil cashPayment varsa v1 kalır', () => {
    expect(deriveTradeView(V1, ME).isV2).toBe(false);
  });

  it('cashPayments hiç yoksa v1 kalır (güvenli taraf)', () => {
    expect(deriveTradeView(BASE, ME).isV2).toBe(false);
  });
});

describe('deriveTradeView — ödeme satırları', () => {
  it('kendi satırımı payerId ile bulur', () => {
    const v = deriveTradeView(V2, ME);
    expect(v.myPaymentRow?.id).toBe('c1');
    expect(v.theirPaymentRow?.id).toBe('c2');
  });

  it('kendi satırım completed ise bekleyen saymaz', () => {
    expect(deriveTradeView(V2, ME).myPaymentPending).toBe(false);
  });

  it('karşı taraf öderken 1/2 sayar', () => {
    const v = deriveTradeView(V2, ME);
    expect(v.paidCount).toBe(1);
    expect(v.totalCount).toBe(2);
  });

  it('kullanıcı yoksa satır çözmez ama patlamaz', () => {
    const v = deriveTradeView(V2, null);
    expect(v.myPaymentRow).toBeNull();
    expect(v.isV2).toBe(true);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/trade/__tests__/derive-v2.test.ts --forceExit`
Expected: FAIL — `isV2` undefined

- [ ] **Step 3: Tipleri genişlet**

`app/trade/[id]/_lib/types.ts` — `TradeCashPayment`'ı değiştir:

```ts
export interface TradeCashPayment {
  id?: string;
  /** v2: bu satırı ödeyen taraf. v1 tekil kayıtta yok. */
  payerId?: string;
  /** v2'de string|null — yalnız nakit fark taşıyan satırda dolu. */
  recipientId?: string | null;
  /** Ham nakit fark; borçlu olmayan tarafın satırında 0. */
  amount?: number;
  /** v2: hizmet bedeli (KDV DAHİL). */
  tradeFeeAmount?: number;
  /** v2: bu tarafın 2 bacaklık kargo bedeli. */
  shippingAmount?: number;
  /** v1 kalıntısı — v2 satırlarında her zaman 0. */
  commission?: number;
  /** PayTR'nin çektiği tutar. v2'de amount + tradeFeeAmount + shippingAmount. */
  totalAmount?: number;
  status?: string;
  paidAt?: string | null;
}
```

ve `Trade` arayüzüne `cashPayment` satırının yanına:

```ts
  /** v2: her zaman var, kabulden önce []. İki satırlı olması v2 işaretidir. */
  cashPayments?: TradeCashPayment[];
```

- [ ] **Step 4: Türetmeleri yaz**

`app/trade/[id]/_lib/derive.ts` — mevcut `const cashPay = trade.cashPayment ?? null;`
satırının hemen altına:

```ts
  /**
   * v2 sinyali: `pricingVersion` yanıt DTO'sunda YOK, iki ödeme satırının
   * varlığı tek güvenilir işarettir (delta 17 §1). Emin olunamadığında v1'de
   * kalmak güvenli taraftır — kullanıcı eski ama tutarlı bir görünüm görür.
   */
  const cashPayments: TradeCashPayment[] = Array.isArray(trade.cashPayments)
    ? trade.cashPayments
    : [];
  const isV2 = cashPayments.length >= 2;
  const myPaymentRow = uid ? (cashPayments.find((p) => p.payerId === uid) ?? null) : null;
  const theirPaymentRow = uid
    ? (cashPayments.find((p) => p.payerId && p.payerId !== uid) ?? null)
    : null;
  const myPaymentPending = myPaymentRow != null && myPaymentRow.status !== 'completed';
  const paidCount = cashPayments.filter((p) => p.status === 'completed').length;
  const totalCount = cashPayments.length;
```

`TradeCashPayment`'ı dosyanın üst importuna ekle, ve dönüş nesnesine altı alanı
da koy (`isV2, myPaymentRow, theirPaymentRow, myPaymentPending, paidCount, totalCount`).

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `npx jest app/trade --forceExit`
Expected: PASS — yeni dosya geçer, mevcut `detail.test.tsx` de yeşil kalır.

- [ ] **Step 6: Commit**

```bash
git add app/trade/\[id\]/_lib app/trade/__tests__/derive-v2.test.ts
git commit -m "feat(trade): derive the v2 payment rows in one place"
```

---

### Task 5: Takas i18n anahtarları

Delta 17 §1g'nin saydığı `trade.*` anahtarları mobil katalogda yok (doğrulandı).
Ana repodaki paylaşılan katalogdan alınır — elle Türkçe yazılmaz, web ile aynı
metin kullanılır.

**Files:**
- Modify: `src/i18n/lib/catalog/tr.json`, `src/i18n/lib/catalog/en.json`
- Modify: `src/i18n/lib/generated/keys.ts` (codegen üretir, elle düzenlenmez)

**Interfaces:**
- Produces: `trade.paymentsTitle`, `paymentsDesc`, `paymentsProgress`,
  `yourPayment`, `theirPayment`, `serviceFee`, `shippingFee`,
  `cashDifferenceLine`, `paymentTotal`, `paymentPaid`, `paymentPending`,
  `paymentRefunded`, `waitingCounterpartyPayment`, `bothMustPay`,
  `shippingNotRefundable`, `costPreviewTitle`, `costPreviewYou`,
  `costPreviewThem`, `costPreviewHint`, `costPreviewFailed`,
  `paymentsSummaryTitle`, `commissionLine`. Görev 6–9 yalnız bunları kullanır.

- [ ] **Step 1: Anahtarları ana repodan çek**

```bash
gh api "repos/sigmoida/tarodan-app/contents/packages/shared/src/i18n/tr.json?ref=development" \
  --jq '.content' | base64 -d > /tmp/web-tr.json
```

Yol tutmazsa katalogun gerçek yerini bul:

```bash
gh api "repos/sigmoida/tarodan-app/git/trees/development?recursive=1" \
  --jq '.tree[].path | select(test("i18n.*(tr|en)\\.json$"))'
```

`trade` bloğundan yukarıdaki 22 anahtarı çıkar (`jq '.trade | {paymentsTitle, …}'`).

- [ ] **Step 2: Katalogları güncelle**

Çıkan Türkçe metinleri `src/i18n/lib/catalog/tr.json`'un `trade` bloğuna,
İngilizceleri `en.json`'un aynı bloğuna ekle. Anahtar adları **birebir** korunur —
web ile mobil arasında metin ayrışmasın.

`paymentsProgress` ICU değişkenli (`{paid}/{total}`); `i18next-icu` kurulu olduğu
için değişkenler olduğu gibi taşınır.

- [ ] **Step 3: Codegen çalıştır**

Run: `pnpm i18n:codegen`
Expected: `src/i18n/lib/generated/keys.ts` yeni `trade.*` anahtarlarını içerir.

- [ ] **Step 4: Doğrula**

```bash
grep -c '"paymentsTitle"\|"bothMustPay"\|"shippingNotRefundable"' src/i18n/lib/catalog/tr.json
grep -c '"trade.paymentsTitle"' src/i18n/lib/generated/keys.ts
```
Expected: ikisi de sıfırdan büyük.

- [ ] **Step 5: i18n testini çalıştır**

Run: `npx jest src/i18n app/checkout/__tests__/i18n.test.tsx --forceExit`
Expected: PASS — tr/en katalogları eşit anahtar kümesine sahip.

- [ ] **Step 6: Commit**

```bash
git add src/i18n
git commit -m "chore(i18n): add the trade v2 payment keys from the shared catalog"
```

---

### Task 6: `TradePaymentsCard` (v2) + `TradeCashCard` v1'e kapanır

**Files:**
- Create: `app/trade/[id]/_components/TradePaymentsCard.tsx`
- Modify: `app/trade/[id]/_components/TradeCashCard.tsx`, `app/trade/[id]/index.tsx`
- Test: `app/trade/__tests__/payments-card.test.tsx` (yeni)

**Interfaces:**
- Consumes: `deriveTradeView` dönüşündeki `isV2`, `myPaymentRow`,
  `theirPaymentRow`, `paidCount`, `totalCount` (Görev 4); Görev 5'in i18n anahtarları.
- Produces: `<TradePaymentsCard view={view} otherPartyName={string} />` —
  `view.isV2` false ise `null`.

- [ ] **Step 1: Başarısız testi yaz**

`app/trade/__tests__/payments-card.test.tsx`:

```tsx
/**
 * payments-card · v2 iki taraflı ödeme kartı (delta 17 §1a).
 *
 * Toplam SUNUCUDAN gelir: `tradeFeeAmount + shippingAmount + amount = totalAmount`.
 * `amount + commission` türetmesi v2'de YANLIŞ sonuç verir ve bu kartta hiç geçmez.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TradePaymentsCard } from '../[id]/_components/TradePaymentsCard';

const V2_VIEW = {
  isV2: true,
  myPaymentRow: { id: 'c1', payerId: 'u1', amount: 0, tradeFeeAmount: 120, shippingAmount: 190, totalAmount: 310, status: 'completed' },
  theirPaymentRow: { id: 'c2', payerId: 'u2', amount: 500, tradeFeeAmount: 120, shippingAmount: 190, totalAmount: 810, status: 'pending' },
  paidCount: 1,
  totalCount: 2,
} as any;

describe('TradePaymentsCard', () => {
  it('kendi satırımın toplamını sunucudan gelen totalAmount olarak basar', () => {
    render(<TradePaymentsCard view={V2_VIEW} otherPartyName="Karşı" />);
    expect(screen.getByText('₺310,00')).toBeTruthy();
    expect(screen.getByText('₺810,00')).toBeTruthy();
  });

  it('hizmet bedeli ve kargo satırlarını ayrı gösterir', () => {
    render(<TradePaymentsCard view={V2_VIEW} otherPartyName="Karşı" />);
    expect(screen.getAllByText('₺120,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₺190,00').length).toBeGreaterThan(0);
  });

  it('v1 takasta hiç çizmez', () => {
    const { toJSON } = render(
      <TradePaymentsCard view={{ ...V2_VIEW, isV2: false } as any} otherPartyName="Karşı" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('hizmet bedeli 0 olsa da satırı çizer (0 TL meşru konfigürasyon)', () => {
    const zeroFee = {
      ...V2_VIEW,
      myPaymentRow: { ...V2_VIEW.myPaymentRow, tradeFeeAmount: 0, totalAmount: 190 },
    };
    render(<TradePaymentsCard view={zeroFee as any} otherPartyName="Karşı" />);
    expect(screen.getAllByText('₺0,00').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/trade/__tests__/payments-card.test.tsx --forceExit`
Expected: FAIL — modül yok

- [ ] **Step 3: Kartı yaz**

`app/trade/[id]/_components/TradePaymentsCard.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { TradeCashPayment } from '../_lib/types';
import type { TradeView } from '../_lib/derive';

/**
 * Takas v2: İKİ TARAF DA öder. Her satır
 * `hizmet bedeli + kargo + nakit fark = toplam`. Komisyon satırı v2'de YOKTUR
 * (`commission` her zaman 0) ve `amount + commission` türetmesi burada hiç geçmez —
 * her tutar sunucu alanının aynısıdır.
 */
export function TradePaymentsCard({
  view,
  otherPartyName,
}: {
  view: TradeView;
  otherPartyName: string;
}) {
  const { t } = useTranslation();
  if (!view.isV2) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="body" style={styles.title}>{t('trade.paymentsTitle')}</Text>
        <Text variant="caption" tone="muted">
          {t('trade.paymentsProgress', { paid: view.paidCount, total: view.totalCount })}
        </Text>
      </View>
      <Text variant="caption" tone="muted" style={styles.desc}>{t('trade.bothMustPay')}</Text>

      <PaymentRow label={t('trade.yourPayment')} row={view.myPaymentRow} t={t} />
      <PaymentRow label={t('trade.theirPayment', { name: otherPartyName })} row={view.theirPaymentRow} t={t} />
    </Card>
  );
}

function PaymentRow({
  label,
  row,
  t,
}: {
  label: string;
  row: TradeCashPayment | null;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  if (!row) return null;
  const statusKey =
    row.status === 'completed' ? 'trade.paymentPaid'
    : row.status === 'refunded' ? 'trade.paymentRefunded'
    : 'trade.paymentPending';

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text variant="caption" style={styles.rowLabel}>{label}</Text>
        <Text variant="caption" tone="muted">{t(statusKey as any)}</Text>
      </View>
      <Line label={t('trade.serviceFee')} amount={row.tradeFeeAmount} />
      <Line label={t('trade.shippingFee')} amount={row.shippingAmount} />
      {/* Nakit fark yalnız borçlu tarafta anlamlı; 0 satırı gürültü olur. */}
      {Number(row.amount ?? 0) > 0 ? (
        <Line label={t('trade.cashDifferenceLine')} amount={row.amount} />
      ) : null}
      <View style={styles.totalLine}>
        <Text variant="caption" style={styles.rowLabel}>{t('trade.paymentTotal')}</Text>
        <Text variant="body" style={styles.totalValue}>{formatPrice(Number(row.totalAmount ?? 0))}</Text>
      </View>
    </View>
  );
}

/** Hizmet bedeli 0 olabilir (admin henüz girmemiş) — 0 TL meşru, satır yine çizilir. */
function Line({ label, amount }: { label: string; amount?: number }) {
  if (amount == null) return null;
  return (
    <View style={styles.line}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="caption">{formatPrice(Number(amount))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: theme.spacing[4], marginTop: theme.spacing[0], backgroundColor: theme.colors.surface.DEFAULT },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '600' },
  desc: { marginTop: theme.spacing[1] },
  row: { marginTop: theme.spacing[3], gap: theme.spacing[1] },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing[1] },
  rowLabel: { fontWeight: '600' },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing[1],
    paddingTop: theme.spacing[1],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.DEFAULT,
  },
  totalValue: { fontWeight: 'bold' },
});
```

- [ ] **Step 4: `TradeCashCard`'ı v1'e kapat ve i18n'e taşı**

Bileşenin imzasına `isV2: boolean` ekle ve ilk satıra kapıyı koy:

```tsx
  // v2'de ödeme dökümü TradePaymentsCard'ta; bu kart yalnız v1 takaslar içindir.
  if (isV2) return null;
  if (!(trade.cashAmount != null && Number(trade.cashAmount) > 0)) return null;
```

Gömülü Türkçe stringleri katalog anahtarlarıyla değiştir (dosya zaten
değiştiriliyor — CLAUDE.md §2/§11 gereği):
`'Nakit Fark'` → `t('trade.cashDifferenceLine')`,
`'Komisyon dahil toplam: …'` → `t('trade.commissionLine', { amount: formatPrice(cashTotal) })`,
`'Ödendi'` → `t('trade.paymentPaid')`.
Bileşen `useTranslation()` çağırır.

- [ ] **Step 5: Ekrana bağla**

`app/trade/[id]/index.tsx` — `TradeCashCard`'a `isV2={view.isV2}` geçir ve hemen
altına ekle:

```tsx
        <TradePaymentsCard view={view} otherPartyName={view.otherParty.displayName} />
```

- [ ] **Step 6: Testleri çalıştır**

Run: `npx jest app/trade --forceExit`
Expected: PASS — yeni kart testi ve mevcut `detail.test.tsx` yeşil.

- [ ] **Step 7: Commit**

```bash
git add app/trade
git commit -m "feat(trade): draw the two-sided v2 payment breakdown"
```

---

### Task 7: Ödeme CTA'sı kendi satırıma bağlanır

**Files:**
- Modify: `app/trade/[id]/_components/TradeActions.tsx:105-135`,
  `app/trade/[id]/index.tsx`
- Test: `app/trade/__tests__/payment-cta.test.tsx` (yeni)

**Interfaces:**
- Consumes: `view.isV2`, `view.myPaymentPending`, `view.paidCount`,
  `view.totalCount` (Görev 4); `actions.cashPay` / `actions.cashPayPending`
  (mevcut `useTradeActions`).
- Produces: davranış değişikliği — yeni dışa açık isim yok.

- [ ] **Step 1: Başarısız testi yaz**

`app/trade/__tests__/payment-cta.test.tsx`:

```tsx
/**
 * payment-cta · v2 ödeme kapısı (delta 17 §1b, §1e).
 *
 * v1: yalnız `cashPayerId` ödeyendi. v2: EŞİT takasta bile iki taraf da öder;
 * kapı "kendi cashPayments satırım pending mi?"dir. "1/2 ödendi" bir TAKILMA
 * DEĞİL, meşru ara durumdur ve öyle gösterilir.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TradeActions } from '../[id]/_components/TradeActions';

const NOOP = () => {};
const HANDLERS = {
  setTradeAddressId: NOOP, handleAccept: NOOP, acceptPending: false,
  openReject: NOOP, rejectPending: false, handleCancel: NOOP, cancelPending: false,
  cashPay: NOOP, cashPayPending: false, confirm: NOOP, confirmPending: false,
  openDispute: NOOP,
};

/** `t` gerçek katalogla değil kimlik fonksiyonuyla değil — anahtarın KARŞILIĞI
 *  beklendiği için react-i18next'in gerçek `t`'si kullanılır. */
function renderActions(trade: Record<string, unknown>, view: Record<string, unknown>) {
  const { t } = require('react-i18next').useTranslation
    ? { t: require('@/i18n/lib').t }
    : { t: (k: string) => k };
  return render(
    <TradeActions
      trade={{ id: 't1', initiatorId: 'u1', receiverId: 'u2', ...trade } as any}
      id="t1"
      t={t as any}
      isInitiator
      isReceiver={false}
      userId="u1"
      otherPartyId="u2"
      cashPaid={false}
      cashTotal={0}
      cashCommission={0}
      isV2={false}
      myPaymentPending={false}
      paidCount={0}
      totalCount={0}
      hasShippedLeg={false}
      actions={HANDLERS}
      {...(view as any)}
    />,
  );
}
```

> `t`'nin nasıl sağlanacağını yazmadan önce `app/trade/__tests__/detail.test.tsx`'in
> `TFn`'i nasıl verdiğine bak ve **aynı kalıbı kullan** — orada çalışan yöntem
> burada da çalışır, ikinci bir kalıp icat etme.

```tsx
it('eşit takasta (cashAmount 0) kendi satırım pending ise ödeme CTA çizilir', () => {
  // trade.cashPayerId YOK, cashAmount 0 — v1 kapısı bunu gizlerdi.
  renderActions({ status: 'awaiting_payment', cashAmount: 0 }, { isV2: true, myPaymentPending: true });
  expect(screen.getByText('Ödemeyi Yap')).toBeTruthy();
});

it('kendi satırım completed, karşı taraf pending ise bekleme durumu çizilir', () => {
  renderActions(
    { status: 'awaiting_payment' },
    { isV2: true, myPaymentPending: false, paidCount: 1, totalCount: 2 },
  );
  expect(screen.getByText('Karşı tarafın ödemesi bekleniyor')).toBeTruthy();
  expect(screen.queryByText('Ödemeyi Yap')).toBeNull();
});

it('v1 takasta eski cashPayerId kapısı korunur', () => {
  renderActions(
    { status: 'awaiting_payment', cashPayerId: 'u1', cashAmount: 500 },
    { isV2: false },
  );
  expect(screen.getByText('Ödemeyi Yap')).toBeTruthy();
});
```

> `'Ödemeyi Yap'` ve bekleme metni Görev 5'in kataloğundaki gerçek Türkçe
> karşılıklarla değiştirilir (`trade.waitingCounterpartyPayment`). Testi yazarken
> katalogdaki metni oku, uydurma.

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/trade/__tests__/payment-cta.test.tsx --forceExit`
Expected: FAIL — eşit takasta CTA çizilmiyor

- [ ] **Step 3: Kapıyı değiştir**

`TradeActions.tsx` — prop'lara `isV2: boolean`, `myPaymentPending: boolean`,
`paidCount: number`, `totalCount: number` ekle. Mevcut iki bloğu şununla değiştir:

```tsx
      {/*
        v2: kapı KENDİ satırımdır — eşit takasta bile iki taraf da öder, eski
        `cashPayerId === userId` kapısı v2'de yanlış (delta 17 §1e).
        v1: eski kapı aynen korunur, eldeki takaslar açıldıkları modelle biter.
      */}
      {(trade.status === 'accepted' || trade.status === 'awaiting_payment') &&
        (isV2 ? myPaymentPending : trade.cashPayerId === userId && !cashPaid) && (
          <Button
            onPress={actions.cashPay}
            isLoading={actions.cashPayPending}
            disabled={actions.cashPayPending}
            title={t('trade.paymentsTitle')}
          />
        )}

      {/*
        "1/2 ödendi" TAKILMA DEĞİL: kendi ödemem geçti, karşı tarafınki bekliyor.
        Takas `shipping_to_warehouse`'a ancak iki satır da completed olunca geçer.
      */}
      {(trade.status === 'accepted' || trade.status === 'awaiting_payment') &&
        (isV2
          ? !myPaymentPending && paidCount < totalCount
          : Boolean(trade.cashPayerId) && trade.cashPayerId !== userId && !cashPaid) && (
          <Text variant="caption" tone="muted">
            {t('trade.waitingCounterpartyPayment')}
          </Text>
        )}
```

> `Button` ve `Text` importları dosyada zaten var; CTA başlığı için katalogdaki
> gerçek anahtarı kullan (`trade.paymentsTitle` yer tutucu — Görev 5'in çektiği
> metinlerde "ödeme yap" karşılığı hangisiyse o).

- [ ] **Step 4: Ekrandan dört prop'u geçir**

`app/trade/[id]/index.tsx` — `<TradeActions …>` çağrısına ekle:

```tsx
          isV2={view.isV2}
          myPaymentPending={view.myPaymentPending}
          paidCount={view.paidCount}
          totalCount={view.totalCount}
```

- [ ] **Step 5: Testleri çalıştır**

Run: `npx jest app/trade --forceExit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/trade
git commit -m "fix(trade): gate the payment CTA on the caller's own payment row"
```

---

### Task 8: `payment-quote` + `preview` dökümü

**Files:**
- Modify: `src/lib/api/trades.ts`, `src/lib/query/keys.ts`,
  `app/trade/[id]/index.tsx`
- Create: `app/trade/[id]/_hooks/useTradePaymentQuote.ts`,
  `app/trade/[id]/_components/TradeCostPreviewCard.tsx`
- Test: `app/trade/__tests__/cost-preview.test.tsx` (yeni)

**Interfaces:**
- Consumes: Görev 0'ın `payment-quote` ölçümü; Görev 5'in `costPreview*` anahtarları.
- Produces:
  - `tradesApi.getPaymentQuote(id)`, `tradesApi.previewPaymentQuote(body)`
  - `type TradePaymentQuoteSide = { userId?: string; side?: string; serviceFee: number; shipping: number; cashDifference: number; total: number; feeLines?: Array<{ productId: string; role: string; amount: number }> }`
  - `useTradePaymentQuote(id)` → `{ quote, isLoading }`; v1'de `quote` `null`.
  - `qk.trades.paymentQuote(id)`

- [ ] **Step 1: API ve query key'i ekle**

`src/lib/api/trades.ts`:

```ts
/** Bir tarafın maliyeti. Hepsi TL ve KDV DAHİL; total = serviceFee + shipping + cashDifference. */
export type TradePaymentQuoteSide = {
  userId?: string;
  side?: 'initiator' | 'receiver';
  serviceFee: number;
  shipping: number;
  cashDifference: number;
  total: number;
  /** Denetim detayı — ekranda BASILMAZ, tek `serviceFee` satırı gösterilir. */
  feeLines?: Array<{ productId: string; role: string; amount: number }>;
};

export type TradePaymentQuote = {
  tradeId?: string;
  initiator: TradePaymentQuoteSide;
  receiver: TradePaymentQuoteSide;
};
```

`tradesApi`'ye:

```ts
  /**
   * Takas ödeme dökümü. v1 takasta `200` + BOŞ GÖVDE döner — bu hata değildir,
   * `isV2`'nin ikinci kaynağıdır. `503 server.shipping.noActiveTariff`: aktif
   * tarifede paket kademesi yok.
   */
  getPaymentQuote: (id: string | number) =>
    api.get<Partial<TradePaymentQuote>>(`/trades/${id}/payment-quote`),
  /** Kaydedilmemiş teklifin canlı fiyatı — teklif oluşturma ekranı için. */
  previewPaymentQuote: (body: {
    initiatorItems: Array<{ productId: string; quantity?: number }>;
    receiverItems: Array<{ productId: string; quantity?: number }>;
    cashAmount?: number;
    cashPayer?: 'initiator' | 'receiver';
  }) => api.post<Omit<TradePaymentQuote, 'tradeId'>>('/trades/payment-quote/preview', body),
```

`src/lib/query/keys.ts` — `trades` bloğuna:

```ts
    paymentQuote: (id: string) => ["trade", id, "payment-quote"] as const,
```

- [ ] **Step 2: Başarısız testi yaz**

`app/trade/__tests__/cost-preview.test.tsx`:

```tsx
/**
 * cost-preview · GET /trades/:id/payment-quote (delta 17 §1c).
 *
 * v1 takasta uç 200 + BOŞ gövde döner — kart çizilmez, hata gösterilmez.
 * `feeLines` denetim detayıdır; ekranda tek `serviceFee` satırı basılır.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TradeCostPreviewCard } from '../[id]/_components/TradeCostPreviewCard';

const SIDE = {
  serviceFee: 120,
  shipping: 190,
  cashDifference: 500,
  total: 810,
  feeLines: [{ productId: 'p1', role: 'seller', amount: 60 }],
};

it('kendi ve karşı tarafın toplamını basar', () => {
  render(<TradeCostPreviewCard mine={SIDE} theirs={{ ...SIDE, cashDifference: 0, total: 310 }} />);
  expect(screen.getByText('₺810,00')).toBeTruthy();
  expect(screen.getByText('₺310,00')).toBeTruthy();
});

it('feeLines detayını EKRANA basmaz', () => {
  render(<TradeCostPreviewCard mine={SIDE} theirs={SIDE} />);
  expect(screen.queryByText('₺60,00')).toBeNull();
});

it('taraf yoksa (v1 → boş gövde) hiç çizmez', () => {
  const { toJSON } = render(<TradeCostPreviewCard mine={null} theirs={null} />);
  expect(toJSON()).toBeNull();
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/trade/__tests__/cost-preview.test.tsx --forceExit`
Expected: FAIL — modül yok

- [ ] **Step 4: Query hook'unu yaz**

`app/trade/[id]/_hooks/useTradePaymentQuote.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { tradesApi, type TradePaymentQuote } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';

/**
 * Takas ödeme dökümü. v1 takasta uç 200 + boş gövde döndürür; bu HATA DEĞİL —
 * `quote` `null` kalır ve kart hiç çizilmez.
 */
export function useTradePaymentQuote(id: string) {
  const query = useQuery({
    queryKey: qk.trades.paymentQuote(id),
    queryFn: async () => {
      const res = await tradesApi.getPaymentQuote(id);
      const body = unwrapEnvelope<Partial<TradePaymentQuote>>(res);
      // Boş gövde → v1. Yarım gövdeyi de v1 say: tek taraflı döküm çizilemez.
      if (!body?.initiator || !body?.receiver) return null;
      return body as TradePaymentQuote;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: retryUnlessClientError,
  });
  return { quote: query.data ?? null, isLoading: query.isLoading };
}
```

- [ ] **Step 5: Kartı yaz**

`app/trade/[id]/_components/TradeCostPreviewCard.tsx` — `TradePaymentsCard`'ın
`Line` / `styles` kalıbını izler (aynı token'lar, aynı `formatPrice`):

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { TradePaymentQuoteSide } from '@/lib/api';

/**
 * Kabul ÖNCESİ canlı maliyet dökümü. Tutarlar tahminidir, kabul anında kilitlenir
 * (`cashPayments` snapshot'ı) — bunu `costPreviewHint` metni söyler.
 * `feeLines` denetim detayıdır ve BASILMAZ.
 */
export function TradeCostPreviewCard({
  mine,
  theirs,
}: {
  mine: TradePaymentQuoteSide | null;
  theirs: TradePaymentQuoteSide | null;
}) {
  const { t } = useTranslation();
  if (!mine || !theirs) return null;

  return (
    <Card style={styles.card}>
      <Text variant="body" style={styles.title}>{t('trade.costPreviewTitle')}</Text>
      <Side label={t('trade.costPreviewYou')} side={mine} t={t} />
      <Side label={t('trade.costPreviewThem')} side={theirs} t={t} />
      <Text variant="caption" tone="muted" style={styles.hint}>{t('trade.costPreviewHint')}</Text>
    </Card>
  );
}

function Side({
  label,
  side,
  t,
}: {
  label: string;
  side: TradePaymentQuoteSide;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <View style={styles.side}>
      <Text variant="caption" style={styles.sideLabel}>{label}</Text>
      <Row label={t('trade.serviceFee')} amount={side.serviceFee} />
      <Row label={t('trade.shippingFee')} amount={side.shipping} />
      {side.cashDifference > 0 ? (
        <Row label={t('trade.cashDifferenceLine')} amount={side.cashDifference} />
      ) : null}
      <View style={styles.totalRow}>
        <Text variant="caption" style={styles.sideLabel}>{t('trade.paymentTotal')}</Text>
        <Text variant="body" style={styles.totalValue}>{formatPrice(side.total)}</Text>
      </View>
    </View>
  );
}

function Row({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="caption">{formatPrice(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: theme.spacing[4], marginTop: theme.spacing[0], backgroundColor: theme.colors.surface.DEFAULT },
  title: { fontWeight: '600' },
  side: { marginTop: theme.spacing[3], gap: theme.spacing[1] },
  sideLabel: { fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing[1],
    paddingTop: theme.spacing[1],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.DEFAULT,
  },
  totalValue: { fontWeight: 'bold' },
  hint: { marginTop: theme.spacing[2] },
});
```

- [ ] **Step 6: Ekrana bağla**

`app/trade/[id]/index.tsx` — hook'u **koşulsuz**, `isLoading` / not-found erken
dönüşlerinden ÖNCE çağır (CLAUDE.md §12 hook sırası kuralı):

```tsx
  const { quote: paymentQuote } = useTradePaymentQuote(tradeId);
```

ve `TradePaymentsCard`'ın altına:

```tsx
        <TradeCostPreviewCard
          mine={view.isInitiator ? paymentQuote?.initiator ?? null : paymentQuote?.receiver ?? null}
          theirs={view.isInitiator ? paymentQuote?.receiver ?? null : paymentQuote?.initiator ?? null}
        />
```

- [ ] **Step 7: Teklif oluşturma ekranına canlı önizlemeyi bağla**

`preview` ucunun varlık sebebi bu ekran: kullanıcı takas teklifini **kaydetmeden**
iki tarafın maliyetini görmeli. `app/trade/new/_hooks/useNewTrade.ts`'e query ekle
(hook, ekranın 44 satırlık `index.tsx`'ini şişirmez):

```ts
  /**
   * Kaydedilmemiş teklifin canlı maliyeti. Ürün seçimi veya nakit fark her
   * değiştiğinde yeniden fiyatlanır; tutarlar TAHMİNİDİR, kabul anında kilitlenir.
   * Bilinmeyen/silinmiş productId sunucuda sessizce atlanır — istemci elemez.
   */
  const previewQuery = useQuery({
    queryKey: qk.trades.previewQuote(initiatorItems, receiverItems, cashAmount, cashPayer),
    queryFn: async () => {
      const res = await tradesApi.previewPaymentQuote({
        initiatorItems: initiatorItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        receiverItems: receiverItems.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        ...(cashAmount > 0 ? { cashAmount, cashPayer } : {}),
      });
      return unwrapEnvelope<{ initiator: TradePaymentQuoteSide; receiver: TradePaymentQuoteSide }>(res);
    },
    enabled: initiatorItems.length > 0 && receiverItems.length > 0,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
```

`src/lib/query/keys.ts` — `trades` bloğuna:

```ts
    previewQuote: (mine: unknown, theirs: unknown, cash: number, payer: string) =>
      ["trade", "preview-quote", mine, theirs, cash, payer] as const,
```

Hook'un dönüşüne `costPreview: previewQuery.data ?? null` ekle ve
`app/trade/new/_components/NewTradeSteps.tsx` içindeki özet adımına, Görev 8'de
yazdığın kartı **yeniden kullanarak** bas:

```tsx
<TradeCostPreviewCard
  mine={costPreview?.initiator ?? null}
  theirs={costPreview?.receiver ?? null}
/>
```

> Teklifi başlatan taraf her zaman `initiator`'dır — bu ekranda taraf çevirme
> gerekmez (detay ekranındaki `isInitiator` çevirmesi orada gerekli, burada değil).

`useNewTrade.ts` içindeki gerçek state adları (`initiatorItems`, `cashAmount`,
`cashPayer`) farklıysa oradaki adları kullan; yenisini uydurma.

- [ ] **Step 8: Testleri çalıştır**

Run: `npx jest app/trade --forceExit`
Expected: PASS — `counter.test.tsx` dahil mevcut takas testleri yeşil kalmalı.

- [ ] **Step 9: Commit**

```bash
git add app/trade src/lib/api/trades.ts src/lib/query/keys.ts
git commit -m "feat(trade): show the per-side payment breakdown from the server"
```

---

### Task 9: İade metni — kargo bedeli iade edilmez

**Files:**
- Modify: `app/trade/[id]/_components/TradeActions.tsx` (iptal onay metni)
- Test: `app/trade/__tests__/refund-notice.test.tsx` (yeni)

**Interfaces:**
- Consumes: `trade.firstWarehouseArrivalAt` / `view.myToWarehouseShipment`
  (mevcut), `trade.shippingNotRefundable` i18n anahtarı (Görev 5).
- Produces: davranış değişikliği — yeni dışa açık isim yok.

- [ ] **Step 1: Başarısız testi yaz**

`app/trade/__tests__/refund-notice.test.tsx`:

```tsx
/**
 * refund-notice · iade matrisi eşiği (delta 17 §1f).
 *
 * Hiçbir ürün kargoya verilmeden iptal → TAM iade. Herhangi bir bacak kargoya
 * verildikten sonra → `totalAmount − shippingAmount`: kargo İADE EDİLMEZ.
 * Eşik, kullanıcının iptal kilidiyle AYNIDIR.
 */
it('kargoya verilmemişken kargo uyarısı gösterilmez', () => {
  renderActions({ status: 'awaiting_payment' }, { isV2: true, myToWarehouseShipment: undefined });
  expect(screen.queryByText(/kargo bedeli iade edilmez/i)).toBeNull();
});

it('kargoya verildikten sonra kargo uyarısı gösterilir', () => {
  renderActions(
    { status: 'shipping_to_warehouse' },
    { isV2: true, myToWarehouseShipment: { status: 'in_transit' } },
  );
  expect(screen.getByText(/kargo bedeli iade edilmez/i)).toBeTruthy();
});
```

> Regex, Görev 5'in kataloğundaki `trade.shippingNotRefundable` metnine göre
> ayarlanır — katalogdaki gerçek cümleyi oku, uydurma.

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/trade/__tests__/refund-notice.test.tsx --forceExit`
Expected: FAIL — uyarı hiç çizilmiyor

- [ ] **Step 3: Uyarıyı ekle**

`TradeActions.tsx` — iptal butonunun yanına, v2 ve kargoya verilmiş koşulunda:

```tsx
      {/*
        Kargoya verildikten sonra iade `totalAmount − shippingAmount`'tır: nakit
        fark ve hizmet bedeli döner, KARGO DÖNMEZ (delta 17 §1f). Eşik, iptal
        kilidiyle aynı: "hâlâ iptal edebiliyorsan kargon da geri gelir."
      */}
      {isV2 && hasShippedLeg ? (
        <Text variant="caption" tone="muted">{t('trade.shippingNotRefundable')}</Text>
      ) : null}
```

`hasShippedLeg`'i prop olarak al ve `index.tsx`'ten geçir:

```tsx
          hasShippedLeg={Boolean(view.myToWarehouseShipment || trade.firstWarehouseArrivalAt)}
```

- [ ] **Step 4: Testleri çalıştır**

Run: `npx jest app/trade --forceExit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/trade
git commit -m "feat(trade): warn that shipping is not refunded once a leg ships"
```

---

### Task 10: Tam doğrulama

**Files:** yok (yalnız doğrulama)

- [ ] **Step 1: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: takip edilen temel dışında yeni hata YOK. Yeni hata varsa düzelt,
"zaten vardı" varsayma — çıktıyı `main`'dekiyle karşılaştır:

```bash
git stash && npx tsc --noEmit 2>&1 | tail -5 && git stash pop
```

- [ ] **Step 2: Lint**

Run: `pnpm --filter @tarodan/mobile lint`
Expected: temiz — sabit hex/rgba yok, `src/theme/colors` importu yok.

- [ ] **Step 3: Tüm test paketi**

Run: `npx jest --forceExit`
Expected: PASS. Bir test kırıldıysa **düzelt**, `--testPathIgnorePatterns` ile
saklama.

- [ ] **Step 4: Metro'da elle dene**

```bash
npx expo start -c
```

İki akış:
1. **Checkout** — sepete ürün ekle, ödemeye geç, toplamın `pricing.summary` ile
   aynı olduğunu ve siparişin 400 almadan oluştuğunu gör. Askıda satıcı ürünü
   varsa ayrılan satır gerekçesiyle görünmeli.
2. **Takas** — v2 takas detayında iki taraflı ödeme kartı, "1/2 ödendi" durumu ve
   ödeme CTA'sı. v1 takas (varsa) eski görünümde bozulmadan açılmalı.

- [ ] **Step 5: Kapanış raporu yaz**

`docs/superpowers/reports/2026-08-08-delta-17-18-kapanis.md` — hangi maddeler
kapandı, Görev 0'ın kapısında hangileri düştü, backend'den ne bekleniyor.
`mobile-parity docs/13-parity-matrix.md`'ye kapanan satırlar için `↳ ✅ 2026-08-08`
notu ekle (3 Ağustos turundaki kalıp).

- [ ] **Step 6: Commit**

```bash
git add docs "mobile-parity docs/13-parity-matrix.md"
git commit -m "docs(report): close out the delta 17/18 breaking-parity round"
```
