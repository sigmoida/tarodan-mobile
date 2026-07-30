# Mobil Parite — Plan 1: Faz 0 (Ortam) + Faz 1 (P0) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil uygulamanın canlı kullanımını bozan beş P0 boşluğunu kapat (kart ödemesi kaldırılmış uca gidiyor, 2FA kullanıcısı giremiyor, derin bağlantı yok, kurumsal davet aktive edilemiyor, kurumsal başvuru tamamlanamıyor) ve app'i gerçekten çalışan API domain'ine bağla.

**Architecture:** Ödeme, PayTR'ye giden imzalı form alanlarını `POST /payments/direct-form`'dan alıp kart alanlarını istemcide ekleyen ve auto-submit HTML'i mevcut WebView'de gösteren saf bir yardımcı katman (`src/lib/payment/paytrDirectForm.ts`) üzerine kurulur; kart verisi kendi API'mize hiç gitmez. Derin bağlantı, push bildirimlerinin zaten kullandığı `toMobileRoute` eşlemesini paylaşır — ikinci bir kopya tutulmaz. Kurumsal başvuru, `CLAUDE.md`'nin ince-ekran/`_hooks`/`_modals` disiplinine göre üç sekmeli tek bir route klasörü olarak kurulur.

**Tech Stack:** Expo SDK 54 · expo-router · TanStack Query · zustand · react-hook-form + zod (`@/ui/form`) · axios (`src/lib/api/client.ts`) · react-native-webview · expo-linking · expo-document-picker · Jest (jest-expo) + React Native Testing Library

**Spec:** `docs/superpowers/specs/2026-07-30-mobil-web-islev-paritesi-design.md`

---

## Global Constraints

- **Kart verisi kendi API'mize hiçbir koşulda gönderilmez.** `POST /payments/direct-form` gövdesi yalnız `{ paymentId? | orderId? | checkoutGroupId? | tradeId?, savedCardId?, saveCard? }` içerir. Backend `assertNoRawCardData` ile gövdenin her seviyesinde `card`, `card_number`, `cc_owner`, `cvv`, `expiry_month`, `expiry_year` alan adlarını arar ve **400** döner.
- **PayTR action'ı tam olarak `https://www.paytr.com/odeme`** olmalı (şema + host + path). Farklıysa akış iptal edilir.
- **`payment_amount` sunucudan geldiği gibi gönderilir** (ondalıklı TL, ör. `"462.81"`), yeniden hesaplanmaz.
- **`Authorization: Bearer <accessToken>`** — cookie yok. `X-CSRF-Token` **asla** gönderilmez. Cookie kavanozu kapalı kalır.
- **`X-Payment-Capability`**: `paymentAccessToken` (2 saat ömürlü) güvenli depoda tutulur ve `status`, `verify`, `confirm-failed`, `direct-form` çağrılarında gönderilir.
- **Tasarım token'ları zorunlu:** `@/theme` → `theme.colors.*`, `theme.spacing.*`, `theme.radius.*`. **Hardcoded hex/rgba yasak.** `src/theme/colors.ts` (`TarodanColors`) **banned** — import edilmez.
- **Primitive'ler `@/ui`'dan:** `Input`, `Button`, `Card`, `Badge`, `Alert`, `Modal`, `Spinner`, `EmptyState`, `ErrorState`, `ScreenHeader`, `appAlert`, `Text`. Yeni primitive icat edilmez.
- **Formlar `@/ui/form`:** `useZodForm` + `Form`/`FormInput`/`FormError`. Manuel `useState`-per-field form yazılmaz. Zod şeması route'un `_lib/schema.ts`'inde.
- **Sorgu anahtarları `@/lib/query`** merkezî kayıttan (`src/lib/query/keys.ts`). Inline `['x', id]` yazılmaz.
- **İnce ekran:** `index.tsx` < ~150 satır, yalnız kompozisyon. Veri/mutation `_hooks/`'ta, mantık `_lib/`'te.
- **iOS donma tuzağı:** mutation'ın `appAlert`'i `ui-native` Modal açıkken çalışırsa iOS donuyor — **modal mutation'dan ÖNCE kapatılır**.
- **Dosya yükleme sınırları:** tüm uçlarda ≤10 MB. Kurumsal belge: `application/pdf`, jpeg, png, webp. Görsel yüklemeleri AI moderasyonundan geçer; red durumunda **sunucunun Türkçe mesajı olduğu gibi** gösterilir.
- **Doğrulama her task sonunda:** `npx tsc --noEmit` yeni hata üretmez, `npx eslint <dokunulan dosyalar>` temiz, dokunulan testler yeşil.
- **Türkçe kullanıcı metinleri** mevcut ekranların stiline uyar (i18n'e taşıma Plan 3'ün işi — bu planda yeni metinler mevcut ekranlardaki gibi yazılır).

---

## Dosya Yapısı

**Faz 0**
- Modify: `.env` · `.env.example` · `eas.json` (`preview`, `production`, `staging` profilleri)
- Create: `src/config/__tests__/apiUrl.test.ts` — ölü domain regresyon testi

**Ödeme (P0 #1)**
- Create: `src/lib/payment/paytrDirectForm.ts` — saf yardımcılar: `assertSafePaytrForm`, `buildPaytrFormHtml`, `PAYTR_ACTION`, tipler
- Create: `src/lib/payment/__tests__/paytrDirectForm.test.ts`
- Modify: `src/lib/api/checkout.ts` — `processDirect` → `directForm`
- Modify: `src/components/CardPaymentForm.tsx` — `submit()` + WebView kaynağı
- Create: `src/components/__tests__/CardPaymentForm.directForm.test.tsx`

**2FA (P0 #2)**
- Modify: `app/(auth)/login/_lib/schema.ts` — `twoFactorCode` alanı
- Modify: `src/lib/api/auth.ts` — `login` imzası
- Modify: `app/(auth)/login/_hooks/useLogin.ts` — `requires2FA` dalı
- Modify: `app/(auth)/login/index.tsx` — kod alanı (dosya adı Task 4'te doğrulanır)
- Create: `app/(auth)/__tests__/login-2fa.test.tsx`

**Derin bağlantı (P0 #3)**
- Modify: `src/utils/notificationRoute.ts` — yeni yollar
- Modify: `src/utils/__tests__/notificationRoute.test.ts` (yoksa create)
- Create: `src/services/deepLinks.ts` — `setupDeepLinkRouting()`
- Create: `src/services/__tests__/deepLinks.test.ts`
- Modify: `app/_layout.tsx` — routing'i kur
- Modify: `app.json` — `ios.associatedDomains`, `android.intentFilters`

**Kurumsal davet (P0 #4)**
- Modify: `src/lib/api/auth.ts` — `getCorporateInvitation`, `activateCorporateInvitation`
- Create: `app/(auth)/corporate-invite/index.tsx` · `_lib/schema.ts` · `_hooks/useCorporateInvite.ts`
- Create: `app/(auth)/corporate-invite/__tests__/corporate-invite.test.tsx`

**Kurumsal başvuru (P0 #5)**
- Modify: `src/lib/api/user.ts` — `sellerDocumentsApi` genişletme
- Modify: `src/lib/query/keys.ts` — `sellerDocuments` anahtarları
- Create: `app/settings/business-application/index.tsx` (ince ekran, sekme kompozisyonu)
- Create: `app/settings/business-application/_lib/{types.ts,schema.ts,documents.ts}`
- Create: `app/settings/business-application/_hooks/{useBusinessApplication.ts,useDocumentUpload.ts}`
- Create: `app/settings/business-application/_sections/{DetailsTab.tsx,StakeholdersTab.tsx,DocumentsTab.tsx}`
- Create: `app/settings/business-application/_modals/AppealModal.tsx`
- Create: `app/settings/business-application/__tests__/*.test.tsx`
- Modify: `app/settings/index.tsx` — menü girişi (dosya Task 12'de doğrulanır)

---

## Task 1: Faz 0 — Ortam domain düzeltmesi

App şu an `api.staging.tarodan.shop`'a bağlı; bu domain **NXDOMAIN** (DNS'te yok), yani hiçbir API'ye ulaşamıyor. Canlı olan `staging.tarodan.com.tr/api`.

**Files:**
- Modify: `.env`
- Modify: `.env.example`
- Modify: `eas.json` (`build.preview.env`, `build.production.env`, `build.staging.env`)
- Create: `src/config/__tests__/apiUrl.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `EXPO_PUBLIC_API_URL` çalışır değeri; sonraki tüm task'lar bunu varsayar

- [ ] **Step 1: Ölü domain regresyon testini yaz**

Create `src/config/__tests__/apiUrl.test.ts`:

```ts
/**
 * Ortam yapılandırması regresyonu: `tarodan.shop` domain ailesi NXDOMAIN
 * (2026-07-30 doğrulandı) — hiçbir profil bu adrese dönmemeli. Canlı staging
 * API'si `staging.tarodan.com.tr/api`.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('ortam API adresleri', () => {
  it('hiçbir yapılandırma dosyasında ölü tarodan.shop domaini kalmadı', () => {
    for (const file of ['.env', '.env.example', 'eas.json']) {
      expect(read(file)).not.toContain('tarodan.shop');
    }
  });

  it('eas.json preview ve staging profilleri canlı staging API adresini kullanır', () => {
    const eas = JSON.parse(read('eas.json'));
    expect(eas.build.preview.env.EXPO_PUBLIC_API_URL).toBe(
      'https://staging.tarodan.com.tr/api',
    );
    expect(eas.build.staging.env.EXPO_PUBLIC_API_URL).toBe(
      'https://staging.tarodan.com.tr/api',
    );
  });

  it('eas.json production profili hedef production API adresini kullanır', () => {
    const eas = JSON.parse(read('eas.json'));
    expect(eas.build.production.env.EXPO_PUBLIC_API_URL).toBe(
      'https://tarodan.com.tr/api',
    );
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/config/__tests__/apiUrl.test.ts`
Expected: FAIL — `.env` içinde `tarodan.shop` bulunuyor.

- [ ] **Step 3: `.env` ve `.env.example`'ı düzelt**

`.env` içindeki satırı değiştir:

```
EXPO_PUBLIC_API_URL=https://staging.tarodan.com.tr/api
```

`.env.example` içindeki boş satırı örnekle ve yorumla:

```
# Staging (canlı): https://staging.tarodan.com.tr/api
# Production (master CI deploy'u sonrası): https://tarodan.com.tr/api
# Lokal iOS sim: http://localhost:3001/api · Android emu: http://10.0.2.2:3001/api
EXPO_PUBLIC_API_URL=https://staging.tarodan.com.tr/api
```

- [ ] **Step 4: `eas.json`'daki üç profili düzelt**

`build.preview.env` ve `build.staging.env` içinde:

```json
"EXPO_PUBLIC_API_URL": "https://staging.tarodan.com.tr/api",
```

`build.production.env` içinde:

```json
"EXPO_PUBLIC_API_URL": "https://tarodan.com.tr/api",
```

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/config/__tests__/apiUrl.test.ts`
Expected: PASS (3 test)

- [ ] **Step 6: Commit**

```bash
git add .env .env.example eas.json src/config/__tests__/apiUrl.test.ts
git commit -m "fix(env): ölü tarodan.shop domainini canlı tarodan.com.tr ile değiştir

api.staging.tarodan.shop NXDOMAIN — app hiçbir API'ye ulaşamıyordu.
Canlı staging: staging.tarodan.com.tr/api (app-config 200, products 200).
Production adresi hedef değere ayarlandı; master CI deploy'u sonrası
doğrulanacak (şu an 500 dönüyor, beklenen).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: PayTR direct-form saf yardımcıları

Kart verisinin API'mize gitmesini yapısal olarak imkânsız kılan ve iki güvenlik kontrolünü uygulayan saf katman. Bu task'ta UI'a dokunulmaz.

**Files:**
- Create: `src/lib/payment/paytrDirectForm.ts`
- Create: `src/lib/payment/__tests__/paytrDirectForm.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `PAYTR_ACTION: 'https://www.paytr.com/odeme'`
  - `type PaytrField = { name: string; value: string }`
  - `type DirectFormResponse = { paymentId: string; action: string; method?: string; fields: PaytrField[]; requireCvv?: boolean; savedCard?: boolean; status?: string }`
  - `type NewCardInput = { holder: string; number: string; expMonth: string; expYear: string; cvc: string }`
  - `assertSafePaytrForm(res: DirectFormResponse): void` — güvenli değilse `Error` fırlatır, `err.code` `'PAYTR_BAD_ACTION' | 'PAYTR_RAW_CARD_FIELD' | 'PAYTR_NO_FIELDS'`
  - `cardFieldsForNewCard(card: NewCardInput): PaytrField[]`
  - `cardFieldsForSavedCard(cvv?: string): PaytrField[]`
  - `buildPaytrFormHtml(action: string, fields: PaytrField[]): string`

- [ ] **Step 1: Failing testleri yaz**

Create `src/lib/payment/__tests__/paytrDirectForm.test.ts`:

```ts
/**
 * PayTR direct-form saf katmanı. Kart verisi yalnız PayTR'ye gider; bu modül
 * sunucudan gelen imzalı alanları doğrular ve auto-submit HTML üretir.
 */
import {
  PAYTR_ACTION,
  assertSafePaytrForm,
  cardFieldsForNewCard,
  cardFieldsForSavedCard,
  buildPaytrFormHtml,
  type DirectFormResponse,
} from '../paytrDirectForm';

const ok = (over: Partial<DirectFormResponse> = {}): DirectFormResponse => ({
  paymentId: 'pay-1',
  action: PAYTR_ACTION,
  method: 'POST',
  fields: [
    { name: 'merchant_id', value: '12345' },
    { name: 'payment_amount', value: '462.81' },
    { name: 'non_3d', value: '0' },
  ],
  ...over,
});

describe('assertSafePaytrForm', () => {
  it('geçerli yanıtta hata fırlatmaz', () => {
    expect(() => assertSafePaytrForm(ok())).not.toThrow();
  });

  it('action farklı host ise reddeder', () => {
    expect(() => assertSafePaytrForm(ok({ action: 'https://evil.example/odeme' })))
      .toThrow(expect.objectContaining({ code: 'PAYTR_BAD_ACTION' }));
  });

  it('action http ise reddeder', () => {
    expect(() => assertSafePaytrForm(ok({ action: 'http://www.paytr.com/odeme' })))
      .toThrow(expect.objectContaining({ code: 'PAYTR_BAD_ACTION' }));
  });

  it('action path farklı ise reddeder', () => {
    expect(() => assertSafePaytrForm(ok({ action: 'https://www.paytr.com/baska' })))
      .toThrow(expect.objectContaining({ code: 'PAYTR_BAD_ACTION' }));
  });

  it('sondaki eğik çizgiyi tolere eder', () => {
    expect(() => assertSafePaytrForm(ok({ action: PAYTR_ACTION + '/' }))).not.toThrow();
  });

  it('sunucudan ham kart alanı gelirse reddeder', () => {
    const withCard = ok({
      fields: [...ok().fields, { name: 'card_number', value: '4111111111111111' }],
    });
    expect(() => assertSafePaytrForm(withCard))
      .toThrow(expect.objectContaining({ code: 'PAYTR_RAW_CARD_FIELD' }));
  });

  it('ham kart alanı kontrolü büyük/küçük harf duyarsızdır', () => {
    const withCard = ok({ fields: [{ name: 'CVV', value: '123' }] });
    expect(() => assertSafePaytrForm(withCard))
      .toThrow(expect.objectContaining({ code: 'PAYTR_RAW_CARD_FIELD' }));
  });

  it('fields boşsa reddeder', () => {
    expect(() => assertSafePaytrForm(ok({ fields: [] })))
      .toThrow(expect.objectContaining({ code: 'PAYTR_NO_FIELDS' }));
  });
});

describe('cardFieldsForNewCard', () => {
  it('PayTR alan adlarıyla kart alanlarını üretir', () => {
    const fields = cardFieldsForNewCard({
      holder: ' Ahmet Yılmaz ',
      number: '4111 1111 1111 1111',
      expMonth: '07',
      expYear: '2028',
      cvc: '123',
    });
    expect(fields).toEqual([
      { name: 'cc_owner', value: 'Ahmet Yılmaz' },
      { name: 'card_number', value: '4111111111111111' },
      { name: 'expiry_month', value: '07' },
      { name: 'expiry_year', value: '28' },
      { name: 'cvv', value: '123' },
    ]);
  });

  it('iki haneli yılı olduğu gibi bırakır', () => {
    const fields = cardFieldsForNewCard({
      holder: 'A B', number: '4111111111111111', expMonth: '1', expYear: '28', cvc: '123',
    });
    expect(fields).toContainEqual({ name: 'expiry_month', value: '01' });
    expect(fields).toContainEqual({ name: 'expiry_year', value: '28' });
  });
});

describe('cardFieldsForSavedCard', () => {
  it('cvv verildiyse tek alan üretir', () => {
    expect(cardFieldsForSavedCard('123')).toEqual([{ name: 'cvv', value: '123' }]);
  });

  it('cvv gerekmiyorsa boş dizi döner', () => {
    expect(cardFieldsForSavedCard()).toEqual([]);
    expect(cardFieldsForSavedCard('')).toEqual([]);
  });
});

describe('buildPaytrFormHtml', () => {
  const html = buildPaytrFormHtml(PAYTR_ACTION, [
    { name: 'merchant_id', value: '12345' },
    { name: 'user_name', value: 'Ali "Veli" <b>' },
  ]);

  it('action ve POST metoduyla form üretir', () => {
    expect(html).toContain(`action="${PAYTR_ACTION}"`);
    expect(html).toContain('method="POST"');
  });

  it('her alan için hidden input üretir', () => {
    expect(html).toContain('name="merchant_id"');
    expect(html).toContain('value="12345"');
  });

  it('alan değerlerini HTML-escape eder', () => {
    expect(html).toContain('value="Ali &quot;Veli&quot; &lt;b&gt;"');
    expect(html).not.toContain('<b>');
  });

  it('formu otomatik gönderir', () => {
    expect(html).toMatch(/\.submit\(\)/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/lib/payment/__tests__/paytrDirectForm.test.ts`
Expected: FAIL — `Cannot find module '../paytrDirectForm'`

- [ ] **Step 3: Modülü yaz**

Create `src/lib/payment/paytrDirectForm.ts`:

```ts
/**
 * PayTR Direct API — imzalı form katmanı (saf, UI'sız).
 *
 * Kart verisi KENDİ API'MİZE ASLA gönderilmez: backend `assertNoRawCardData` ile
 * gövdedeki kart alan adlarını arayıp 400 döner. Akış: `POST /payments/direct-form`
 * imzalı sunucu alanlarını verir, kart alanlarını İSTEMCİ ekler ve tarayıcı
 * (WebView) doğrudan PayTR'ye POST eder.
 *
 * 3DS zorunludur (`non_3d: "0"`), bu yüzden banka sayfası WebView'de render edilir.
 */

/** PayTR'nin tek geçerli ödeme hedefi. Başka bir action gelirse akış iptal edilir. */
export const PAYTR_ACTION = 'https://www.paytr.com/odeme';

export type PaytrField = { name: string; value: string };

export type DirectFormResponse = {
  paymentId: string;
  action: string;
  method?: string;
  fields: PaytrField[];
  requireCvv?: boolean;
  savedCard?: boolean;
  status?: string;
};

export type NewCardInput = {
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
};

type CodedError = Error & { code: string };

const codedError = (code: string, message: string): CodedError => {
  const err = new Error(message) as CodedError;
  err.code = code;
  return err;
};

/**
 * Sunucudan ham kart alanı GELMEMELİ. Geliyorsa ya sunucu sözleşmesi bozulmuş ya
 * araya giren var — her iki durumda akış iptal edilir.
 */
const RAW_CARD_FIELD_NAMES = new Set([
  'card',
  'card_number',
  'cardnumber',
  'cc_owner',
  'cvv',
  'cvc',
  'expiry_month',
  'expiry_year',
]);

/** Karşılaştırma için sondaki eğik çizgiyi at (PayTR ikisini de kabul ediyor). */
const normalizeAction = (action: string) => action.trim().replace(/\/+$/, '');

export function assertSafePaytrForm(res: DirectFormResponse): void {
  if (normalizeAction(res.action ?? '') !== PAYTR_ACTION) {
    throw codedError(
      'PAYTR_BAD_ACTION',
      'Ödeme hedefi beklenmedik bir adres. Güvenliğiniz için işlem durduruldu.',
    );
  }
  if (!Array.isArray(res.fields) || res.fields.length === 0) {
    throw codedError('PAYTR_NO_FIELDS', 'Ödeme formu eksik geldi. Lütfen tekrar deneyin.');
  }
  for (const field of res.fields) {
    if (RAW_CARD_FIELD_NAMES.has(String(field?.name ?? '').toLowerCase())) {
      throw codedError(
        'PAYTR_RAW_CARD_FIELD',
        'Ödeme formu beklenmedik alan içeriyor. Güvenliğiniz için işlem durduruldu.',
      );
    }
  }
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export function cardFieldsForNewCard(card: NewCardInput): PaytrField[] {
  const month = digitsOnly(card.expMonth).padStart(2, '0').slice(-2);
  const year = digitsOnly(card.expYear).slice(-2);
  return [
    { name: 'cc_owner', value: card.holder.trim() },
    { name: 'card_number', value: digitsOnly(card.number) },
    { name: 'expiry_month', value: month },
    { name: 'expiry_year', value: year },
    { name: 'cvv', value: digitsOnly(card.cvc) },
  ];
}

export function cardFieldsForSavedCard(cvv?: string): PaytrField[] {
  return cvv ? [{ name: 'cvv', value: digitsOnly(cvv) }] : [];
}

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * WebView'e verilecek auto-submit dokümanı. RN'de DOM yok; POST'u WebView içinde
 * kendini gönderen bir formla yapıyoruz (platformun postUrl API'sine bağımlı kalmadan
 * iOS/Android'de aynı davranış).
 */
export function buildPaytrFormHtml(action: string, fields: PaytrField[]): string {
  const inputs = fields
    .map(
      (f) =>
        `<input type="hidden" name="${escapeHtml(f.name)}" value="${escapeHtml(f.value)}" />`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><form id="paytr" action="${escapeHtml(action)}" method="POST" accept-charset="UTF-8">${inputs}</form><script>document.getElementById("paytr").submit();</script></body></html>`;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/lib/payment/__tests__/paytrDirectForm.test.ts`
Expected: PASS (15 test)

- [ ] **Step 5: Tip ve lint kontrolü**

Run: `npx tsc --noEmit && npx eslint src/lib/payment`
Expected: yeni hata yok, lint temiz

- [ ] **Step 6: Commit**

```bash
git add src/lib/payment
git commit -m "feat(payment): PayTR direct-form saf katmanı (action + ham kart alanı doğrulaması)

Sunucudan gelen imzalı alanları doğrular (action tam olarak
https://www.paytr.com/odeme, fields içinde ham kart alanı yok), kart
alanlarını istemcide üretir ve auto-submit HTML dokümanı hazırlar.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Kart ödemesini `direct-form`'a bağla

`src/lib/api/checkout.ts:99` API'de **olmayan** `POST /payments/process-direct`'i çağırıyor (kart-verisi sınırı sertleştirmesinde kaldırıldı; backend testi varlığını yasaklıyor). Bu, mobilde kart ödemesinin çalışmadığı anlamına gelir.

**Files:**
- Modify: `src/lib/api/checkout.ts` (`paymentsApi.processDirect` → `directForm`)
- Modify: `src/components/CardPaymentForm.tsx` (`submit()` ve WebView kaynağı)
- Create: `src/components/__tests__/CardPaymentForm.directForm.test.tsx`

**Interfaces:**
- Consumes: Task 2'nin `assertSafePaytrForm`, `cardFieldsForNewCard`, `cardFieldsForSavedCard`, `buildPaytrFormHtml`, `DirectFormResponse`
- Produces: `paymentsApi.directForm(body: { paymentId?: string; orderId?: string; checkoutGroupId?: string; tradeId?: string; savedCardId?: string; saveCard?: boolean }): Promise<{ data: DirectFormResponse }>`

- [ ] **Step 1: Failing testi yaz**

Create `src/components/__tests__/CardPaymentForm.directForm.test.tsx`:

```tsx
/**
 * CardPaymentForm — direct-form akışı. Kart verisi KENDİ API'mize gitmez:
 * directForm gövdesinde kart alanı olmamalı; kart alanları yalnız WebView'e
 * verilen HTML içinde bulunur.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PAYTR_ACTION } from '@/lib/payment/paytrDirectForm';

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    directForm: jest.fn(),
    verify: jest.fn(() => Promise.resolve({})),
    getStatusLight: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
    getStatusLightGuest: jest.fn(() => Promise.resolve({ data: { status: 'pending' } })),
  },
  membershipApi: { listCards: jest.fn(() => Promise.resolve({ data: [] })) },
}));
import { paymentsApi } from '@/lib/api';

let lastWebViewSource: any = null;
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props: any) => {
      lastWebViewSource = props.source;
      return React.createElement(View, { testID: 'paytr-webview' });
    },
    WebViewNavigation: {},
  };
});

const mockAlert = jest.fn();
jest.mock('@/ui', () => ({ ...jest.requireActual('@/ui'), appAlert: (...a: any[]) => mockAlert(...a) }));

import CardPaymentForm from '../CardPaymentForm';

const signedResponse = {
  paymentId: 'pay-9',
  action: PAYTR_ACTION,
  method: 'POST',
  fields: [
    { name: 'merchant_id', value: '12345' },
    { name: 'payment_amount', value: '462.81' },
    { name: 'non_3d', value: '0' },
  ],
};

async function fillCardAndSubmit() {
  fireEvent.changeText(screen.getByTestId('card-holder'), 'Ahmet Yılmaz');
  fireEvent.changeText(screen.getByTestId('card-number'), '4111111111111111');
  fireEvent.changeText(screen.getByTestId('card-exp-month'), '07');
  fireEvent.changeText(screen.getByTestId('card-exp-year'), '28');
  fireEvent.changeText(screen.getByTestId('card-cvc'), '123');
  fireEvent.press(screen.getByTestId('card-submit'));
}

beforeEach(() => {
  jest.clearAllMocks();
  lastWebViewSource = null;
});

it('directForm gövdesine kart verisi KOYMAZ', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({ data: signedResponse });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />,
  );
  await fillCardAndSubmit();

  await waitFor(() => expect(paymentsApi.directForm).toHaveBeenCalled());
  const body = (paymentsApi.directForm as jest.Mock).mock.calls[0][0];
  const serialized = JSON.stringify(body).toLowerCase();
  for (const forbidden of ['card_number', 'cc_owner', 'cvv', 'cvc', 'expiry_month', '4111']) {
    expect(serialized).not.toContain(forbidden);
  }
  expect(body).toEqual({ orderId: 'order-1', saveCard: false });
});

it('imzalı alanları ve kart alanlarını içeren HTML ile WebView açar', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({ data: signedResponse });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />,
  );
  await fillCardAndSubmit();

  await waitFor(() => expect(screen.getByTestId('paytr-webview')).toBeTruthy());
  const html = lastWebViewSource?.html as string;
  expect(html).toContain(`action="${PAYTR_ACTION}"`);
  expect(html).toContain('name="merchant_id"');
  expect(html).toContain('value="462.81"');
  expect(html).toContain('name="card_number"');
  expect(html).toContain('value="4111111111111111"');
});

it('action beklenmedikse WebView açmaz ve kullanıcıyı uyarır', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({
    data: { ...signedResponse, action: 'https://evil.example/odeme' },
  });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />,
  );
  await fillCardAndSubmit();

  await waitFor(() => expect(mockAlert).toHaveBeenCalled());
  expect(screen.queryByTestId('paytr-webview')).toBeNull();
});

it('sunucudan ham kart alanı gelirse akışı iptal eder', async () => {
  (paymentsApi.directForm as jest.Mock).mockResolvedValue({
    data: { ...signedResponse, fields: [{ name: 'card_number', value: 'x' }] },
  });
  renderWithProviders(
    <CardPaymentForm target={{ orderId: 'order-1' }} onSuccess={jest.fn()} />,
  );
  await fillCardAndSubmit();

  await waitFor(() => expect(mockAlert).toHaveBeenCalled());
  expect(screen.queryByTestId('paytr-webview')).toBeNull();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/components/__tests__/CardPaymentForm.directForm.test.tsx`
Expected: FAIL — `paymentsApi.directForm is not a function` ve `card-holder` testID'si bulunamıyor

- [ ] **Step 3: API katmanını değiştir**

`src/lib/api/checkout.ts` içinde `processDirect` bloğunun **tamamını** (yorumu dâhil, dosyanın ~93-99 satırları) şununla değiştir:

```ts
  /**
   * Direct API (TEK ödeme yolu; misafir + üye). Sunucu İMZALI form alanlarını döner;
   * kart alanlarını İSTEMCİ ekler ve WebView doğrudan PayTR'ye POST eder.
   *
   * Gövdeye kart verisi KOYULAMAZ: backend `assertNoRawCardData` ile gövdenin her
   * seviyesinde kart alan adlarını arar ve 400 döner. (Eski `POST /payments/process-direct`
   * API'den kaldırıldı; kart-verisi sınırı testi varlığını yasaklıyor.)
   */
  directForm: (body: {
    paymentId?: string;
    orderId?: string;
    checkoutGroupId?: string;
    tradeId?: string;
    savedCardId?: string;
    saveCard?: boolean;
  }) => api.post<DirectFormResponse>('/payments/direct-form', body),
```

Dosyanın en üstündeki import'a ekle:

```ts
import type { DirectFormResponse } from '@/lib/payment/paytrDirectForm';
```

- [ ] **Step 4: `CardPaymentForm`'un submit'ini değiştir**

`src/components/CardPaymentForm.tsx` import bloğuna ekle:

```ts
import {
  assertSafePaytrForm,
  buildPaytrFormHtml,
  cardFieldsForNewCard,
  cardFieldsForSavedCard,
} from '@/lib/payment/paytrDirectForm';
```

`submit()` içinde `body` kurulumunu değiştir — kart alanları artık gövdeye **girmez**, ayrı tutulur:

```ts
    let body: {
      orderId?: string;
      checkoutGroupId?: string;
      tradeId?: string;
      savedCardId?: string;
      saveCard?: boolean;
    };
    let cardFields: { name: string; value: string }[];

    if (selected === NEW_CARD) {
      const err = validateNewCard();
      if (err) {
        appAlert('Eksik bilgi', err);
        return;
      }
      body = { ...target, saveCard: recurringEnabled && saveCard };
      cardFields = cardFieldsForNewCard({
        holder,
        number,
        expMonth,
        expYear,
        cvc,
      });
    } else {
      if (selectedCard?.requireCvv && !/^\d{3,4}$/.test(savedCvv)) {
        appAlert('CVV gerekli', 'Bu kart için CVV girin');
        return;
      }
      body = { ...target, savedCardId: selected };
      cardFields = cardFieldsForSavedCard(selectedCard?.requireCvv ? savedCvv : undefined);
    }
```

`try` bloğunun içindeki `processDirect` çağrısını ve `threeDSHtml` dallanmasını şununla değiştir:

```ts
      const res = await paymentsApi.directForm(body);
      const data = res.data;
      setPaymentId(data.paymentId);

      // İki güvenlik kontrolü: hedef tam olarak PayTR mı, sunucu ham kart alanı
      // gönderiyor mu. Başarısızsa akış İPTAL edilir (kart bilgisi hiçbir yere gitmez).
      assertSafePaytrForm(data);

      const savedCardCvvRequired = data.savedCard === true && data.requireCvv === false;
      const fields = savedCardCvvRequired ? data.fields : [...data.fields, ...cardFields];
      setThreeDSHtml(buildPaytrFormHtml(data.action, fields));
      setProcessing(false);
      return;
```

`catch` bloğunda, ağ/timeout ayrımından **önce** güvenlik hatalarını ele al:

```ts
      // Güvenlik doğrulaması reddi — tekrar denemek çözmez, kullanıcıya net söyle.
      if (e?.code === 'PAYTR_BAD_ACTION' || e?.code === 'PAYTR_RAW_CARD_FIELD' || e?.code === 'PAYTR_NO_FIELDS') {
        appAlert('Ödeme durduruldu', e.message);
        setProcessing(false);
        return;
      }
```

- [ ] **Step 5: Kart girdilerine testID ekle**

`CardPaymentForm.tsx`'in yeni-kart formundaki `Input` bileşenlerine sırasıyla `testID="card-holder"`, `testID="card-number"`, `testID="card-exp-month"`, `testID="card-exp-year"`, `testID="card-cvc"`; gönder butonuna `testID="card-submit"` ekle. (Mevcut prop'lara dokunma, yalnız `testID` ekle.)

- [ ] **Step 6: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/components/__tests__/CardPaymentForm.directForm.test.tsx`
Expected: PASS (4 test)

- [ ] **Step 7: `process-direct` referansının kalmadığını doğrula**

Run: `grep -rn "process-direct\|processDirect" src app`
Expected: **hiç sonuç yok**

- [ ] **Step 8: Etkilenen tüm testleri ve tipleri çalıştır**

Run: `npx jest src/components app/payment && npx tsc --noEmit`
Expected: PASS, yeni tip hatası yok

- [ ] **Step 9: Commit**

```bash
git add src/lib/api/checkout.ts src/components/CardPaymentForm.tsx src/components/__tests__/CardPaymentForm.directForm.test.tsx
git commit -m "fix(payment): kaldırılmış process-direct ucunu direct-form ile değiştir

POST /payments/process-direct API'de yok (kart-verisi sınırı sertleştirmesinde
kaldırıldı) — mobilde kart ödemesi çalışmıyordu. Yeni akış: direct-form imzalı
alanları döner, kart alanları istemcide eklenir, WebView doğrudan PayTR'ye POST
eder. Kart verisi kendi API'mize hiç gitmez (test bunu doğruluyor).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 2FA girişi

`POST /auth/login` **200 + `{ requires2FA: true }}`** döndüğünde token verilmemiştir. Bu bir hata değil, akış adımıdır. Mobilde bu dal hiç yok → 2FA açan kullanıcı uygulamaya bir daha giremiyor.

**Files:**
- Modify: `app/(auth)/login/_lib/schema.ts`
- Modify: `src/lib/api/auth.ts`
- Modify: `app/(auth)/login/_hooks/useLogin.ts`
- Modify: `app/(auth)/login/index.tsx`
- Create: `app/(auth)/login/__tests__/login-2fa.test.tsx`

**Interfaces:**
- Consumes: —
- Produces: `useLogin()` dönüşüne eklenen `requires2FA: boolean` ve `twoFactorError: string | null`; `authApi.login(email: string, password: string, twoFactorCode?: string)`

- [ ] **Step 1: Failing testi yaz**

Create `app/(auth)/login/__tests__/login-2fa.test.tsx`:

```tsx
/**
 * Login 2FA dalı: sunucu 200 + { requires2FA: true } döndüğünde bu bir HATA değil,
 * akış adımıdır — kod alanı gösterilir ve aynı kimlik bilgileri twoFactorCode ile
 * tekrar gönderilir. Kod formatı: 6 hane TOTP veya XXXX-XXXX yedek kod.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    getProfile: jest.fn(() => Promise.resolve({ data: { user: {} } })),
    resendVerification: jest.fn(),
  },
}));
import { authApi } from '@/lib/api';

jest.mock('@/services/googleSignin', () => ({ signInWithGoogle: jest.fn() }));
jest.mock('@/services/appleSignin', () => ({
  signInWithApple: jest.fn(),
  isAppleAvailable: () => Promise.resolve(false),
}));

const mockLogin = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ login: mockLogin }),
}));

import LoginScreen from '../index';

const fillCredentials = () => {
  fireEvent.changeText(screen.getByTestId('login-email'), 'a@b.com');
  fireEvent.changeText(screen.getByTestId('login-password'), 'Password1');
};

beforeEach(() => jest.clearAllMocks());

it('requires2FA yanıtında oturum açmaz, kod alanını gösterir', async () => {
  (authApi.login as jest.Mock).mockResolvedValue({ data: { requires2FA: true } });
  renderWithProviders(<LoginScreen />);
  fillCredentials();
  fireEvent.press(screen.getByTestId('login-submit'));

  await waitFor(() => expect(screen.getByTestId('login-2fa-code')).toBeTruthy());
  expect(mockLogin).not.toHaveBeenCalled();
});

it('kodu aynı kimlik bilgileriyle birlikte gönderir', async () => {
  (authApi.login as jest.Mock).mockResolvedValueOnce({ data: { requires2FA: true } });
  renderWithProviders(<LoginScreen />);
  fillCredentials();
  fireEvent.press(screen.getByTestId('login-submit'));
  await waitFor(() => expect(screen.getByTestId('login-2fa-code')).toBeTruthy());

  (authApi.login as jest.Mock).mockResolvedValueOnce({
    data: { tokens: { accessToken: 'at', refreshToken: 'rt' }, user: { email: 'a@b.com' } },
  });
  fireEvent.changeText(screen.getByTestId('login-2fa-code'), '123456');
  fireEvent.press(screen.getByTestId('login-submit'));

  await waitFor(() => expect(authApi.login).toHaveBeenLastCalledWith('a@b.com', 'Password1', '123456'));
  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('at', expect.anything(), 'rt'));
});

it('yedek kod biçimini (XXXX-XXXX) kabul eder', async () => {
  (authApi.login as jest.Mock).mockResolvedValueOnce({ data: { requires2FA: true } });
  renderWithProviders(<LoginScreen />);
  fillCredentials();
  fireEvent.press(screen.getByTestId('login-submit'));
  await waitFor(() => expect(screen.getByTestId('login-2fa-code')).toBeTruthy());

  (authApi.login as jest.Mock).mockResolvedValueOnce({
    data: { tokens: { accessToken: 'at' }, user: {} },
  });
  fireEvent.changeText(screen.getByTestId('login-2fa-code'), 'A1B2-C3D4');
  fireEvent.press(screen.getByTestId('login-submit'));

  await waitFor(() => expect(authApi.login).toHaveBeenLastCalledWith('a@b.com', 'Password1', 'A1B2-C3D4'));
});

it('geçersiz biçimde kodu göndermez', async () => {
  (authApi.login as jest.Mock).mockResolvedValueOnce({ data: { requires2FA: true } });
  renderWithProviders(<LoginScreen />);
  fillCredentials();
  fireEvent.press(screen.getByTestId('login-submit'));
  await waitFor(() => expect(screen.getByTestId('login-2fa-code')).toBeTruthy());

  (authApi.login as jest.Mock).mockClear();
  fireEvent.changeText(screen.getByTestId('login-2fa-code'), '12');
  fireEvent.press(screen.getByTestId('login-submit'));

  await waitFor(() => expect(screen.getByText(/6 haneli kod/i)).toBeTruthy());
  expect(authApi.login).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest "app/(auth)/login/__tests__/login-2fa.test.tsx"`
Expected: FAIL — `login-2fa-code` bulunamıyor (ve testID'ler eksikse `login-email` de)

- [ ] **Step 3: Şemayı genişlet**

`app/(auth)/login/_lib/schema.ts` içindeki `loginSchema`'yı değiştir:

```ts
/**
 * 2FA kodu: 6 haneli TOTP **veya** `XXXX-XXXX` biçiminde tek kullanımlık yedek kod.
 * Alan yalnız sunucu `requires2FA: true` dediğinde gösterilir; o yüzden opsiyonel.
 */
export const TWO_FACTOR_CODE_PATTERN = /^(?:\d{6}|[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4})$/;

export const loginSchema = z.object({
  email: z.string().email('Geçerli e-posta girin'),
  password: z.string().min(1, 'Şifre boş olamaz'),
  twoFactorCode: z
    .string()
    .trim()
    .regex(TWO_FACTOR_CODE_PATTERN, '6 haneli kod veya XXXX-XXXX yedek kod girin')
    .optional()
    .or(z.literal('')),
});
```

- [ ] **Step 4: API imzasını genişlet**

`src/lib/api/auth.ts` içindeki `login`'i değiştir:

```ts
  /**
   * Başarılı parola sonrası 2FA etkinse yanıt **200 + { requires2FA: true }** olur
   * (token YOK). Aynı istek `twoFactorCode` ile tekrarlanmalıdır.
   */
  login: (email: string, password: string, twoFactorCode?: string) =>
    api.post('/auth/login', {
      email,
      password,
      ...(twoFactorCode ? { twoFactorCode } : {}),
    }),
```

- [ ] **Step 5: `useLogin`'e requires2FA dalını ekle**

`app/(auth)/login/_hooks/useLogin.ts` içinde state ekle (diğer `useState`'lerin yanına):

```ts
  const [requires2FA, setRequires2FA] = useState(false);
```

`loginMutation`'ın `mutationFn`'ini değiştir:

```ts
    mutationFn: (data: LoginForm) =>
      authApi.login(data.email, data.password, data.twoFactorCode || undefined),
```

`onSuccess`'in **en başına** (mevcut `const data = ...` satırından hemen sonra) dalı ekle:

```ts
      // 200 + requires2FA: token verilmemiştir — hata değil, akış adımı.
      if ((data as { requires2FA?: boolean }).requires2FA === true) {
        setRequires2FA(true);
        setErrorMessage(null);
        return;
      }
```

`onError`'da 2FA modundayken hatayı kod alanının yanında göster: `setErrorMessage(msg)` zaten bunu yapıyor, ek değişiklik gerekmez.

Hook'un `return` nesnesine ekle: `requires2FA,`

- [ ] **Step 6: Login ekranına kod alanını ekle**

`app/(auth)/login/index.tsx` içinde, e-posta/şifre alanlarına sırasıyla `testID="login-email"`, `testID="login-password"`, gönder butonuna `testID="login-submit"` ekle. `requires2FA` true iken şifre alanından **sonra** kod alanını render et (mevcut `FormInput` desenine uyarak):

```tsx
      {f.requires2FA && (
        <FormInput
          testID="login-2fa-code"
          control={f.form.control}
          name="twoFactorCode"
          label="Doğrulama kodu"
          placeholder="123456 veya XXXX-XXXX"
          autoCapitalize="characters"
          autoCorrect={false}
          helperText="Kimlik doğrulama uygulamanızdaki 6 haneli kodu ya da yedek kodunuzu girin."
        />
      )}
```

> Ekran `FormInput` yerine başka bir desen kullanıyorsa **o desene uy** — yeni desen icat etme. `f` değişkeninin adı ekranda ne ise onu kullan.

- [ ] **Step 7: Testi çalıştır, geçtiğini gör**

Run: `npx jest "app/(auth)/login"`
Expected: PASS (4 yeni test + mevcut login testleri)

- [ ] **Step 8: Tip ve lint kontrolü**

Run: `npx tsc --noEmit && npx eslint "app/(auth)/login" src/lib/api/auth.ts`
Expected: yeni hata yok

- [ ] **Step 9: Commit**

```bash
git add "app/(auth)/login" src/lib/api/auth.ts
git commit -m "feat(auth): 2FA giriş dalı (200 + requires2FA akış adımı)

2FA açan kullanıcı mobile giremiyordu: login 200 + { requires2FA: true }
yanıtı ele alınmıyordu. Artık kod alanı gösterilip aynı kimlik bilgileri
twoFactorCode ile tekrar gönderiliyor (6 hane TOTP veya XXXX-XXXX yedek kod).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Derin bağlantı yol eşlemesini genişlet

`toMobileRoute` push bildirimleri için var ama e-posta/davet/takip yollarını bilmiyor. Derin bağlantı **aynı eşlemeyi paylaşır** — ikinci kopya tutulmaz.

**Files:**
- Modify: `src/utils/notificationRoute.ts`
- Create veya modify: `src/utils/__tests__/notificationRoute.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `toMobileRoute(link: string): string | null` — yeni desteklenen yollar: `/verify-email?token=`, `/reset-password?token=`, `/corporate/invite?token=`, `/track-order?orderNumber=&email=`, `/forgot-password`, `/profile/orders/:id`, `/profile/trades/:id`, `/profile/refund-requests/:id`, `/listings/:id/edit`; `/payment/*` → `null`

- [ ] **Step 1: Failing testleri yaz**

`src/utils/__tests__/notificationRoute.test.ts` dosyası varsa aşağıdaki `describe` bloğunu **sonuna ekle**; yoksa dosyayı bu içerikle oluştur:

```ts
/**
 * Derin bağlantı yol eşlemesi. Push bildirimleri ve universal link AYNI
 * fonksiyonu kullanır (DRY) — bu yüzden e-posta/davet/takip yolları da burada.
 */
import { toMobileRoute } from '../notificationRoute';

describe('toMobileRoute — derin bağlantı yolları', () => {
  it('e-posta doğrulama token\'ını korur', () => {
    expect(toMobileRoute('/verify-email?token=abc123')).toBe('/verify-email?token=abc123');
  });

  it('şifre sıfırlama token\'ını korur', () => {
    expect(toMobileRoute('/reset-password?token=xyz')).toBe('/reset-password?token=xyz');
  });

  it('şifremi unuttum ekranına gider', () => {
    expect(toMobileRoute('/forgot-password')).toBe('/forgot-password');
  });

  it('kurumsal daveti aktivasyon ekranına yönlendirir', () => {
    expect(toMobileRoute('/corporate/invite?token=inv-1')).toBe(
      '/corporate-invite?token=inv-1',
    );
  });

  it('token olmayan kurumsal davet bağlantısını da ekrana yönlendirir', () => {
    expect(toMobileRoute('/corporate/invite')).toBe('/corporate-invite');
  });

  it('misafir sipariş takibi parametrelerini korur', () => {
    expect(toMobileRoute('/track-order?orderNumber=ORD-1&email=a%40b.com')).toBe(
      '/order-track?orderNumber=ORD-1&email=a%40b.com',
    );
  });

  it('web profil altındaki sipariş detayını mobil sipariş detayına eşler', () => {
    expect(toMobileRoute('/profile/orders/ord-1')).toBe('/orders/ord-1');
  });

  it('web profil altındaki takas detayını mobil takas detayına eşler', () => {
    expect(toMobileRoute('/profile/trades/tr-1')).toBe('/trade/tr-1');
  });

  it('web profil altındaki iade detayını eşler', () => {
    expect(toMobileRoute('/profile/refund-requests/rr-1')).toBe('/refund-requests/rr-1');
  });

  it('ilan düzenleme bağlantısını mobil ilan düzenlemeye eşler', () => {
    expect(toMobileRoute('/listings/p-1/edit')).toBe('/listing/p-1/edit');
  });

  it('ödeme dönüş URL\'lerini eşlemez (WebView içinde yakalanır)', () => {
    expect(toMobileRoute('/payment/success?paymentId=p1')).toBeNull();
    expect(toMobileRoute('/payment/fail')).toBeNull();
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/utils/__tests__/notificationRoute.test.ts`
Expected: FAIL — `/verify-email?token=abc123` için `null` dönüyor

- [ ] **Step 3: Eşlemeyi genişlet**

`src/utils/notificationRoute.ts` içinde, `const seg = path.split('/')...` satırından **önce** şu blokları ekle:

```ts
  // Sorgu parametresini koruyarak aynı yola geçir (token/e-posta taşıyan yollar).
  const withQuery = (route: string) => (rawQuery ? `${route}?${rawQuery}` : route);

  // Ödeme dönüş URL'leri BİLİNÇLİ olarak eşlenmez: PayTR turu WebView içinde
  // yakalanır (bkz. docs/mobile-parity/04 §5). Uygulama dışına çıkarsa akış kopar.
  if (path === '/payment/success' || path === '/payment/fail' || path === '/payment/failure') {
    return null;
  }

  // Token taşıyan kimlik yolları — mobil rota adı web ile aynı.
  if (path === '/verify-email' || path === '/reset-password' || path === '/forgot-password') {
    return withQuery(path);
  }

  // Kurumsal davet: web /corporate/invite → mobil /corporate-invite
  if (path === '/corporate/invite') return withQuery('/corporate-invite');

  // Misafir sipariş takibi: web /track-order → mobil /order-track
  if (path === '/track-order') return withQuery('/order-track');
```

`switch (head)` içindeki `case 'profile':` bloğunu şununla değiştir (üçüncü segmenti de oku):

```ts
    case 'profile': {
      const [, section, sectionId] = seg;
      if (section === 'listings') return '/settings/my-listings';
      if (section === 'earnings') return '/settings/payments';
      // web /profile/<bölüm>/:id → mobil detay rotaları
      if (section === 'orders' && sectionId) return `/orders/${sectionId}`;
      if (section === 'trades' && sectionId) return `/trade/${sectionId}`;
      if (section === 'refund-requests' && sectionId) return `/refund-requests/${sectionId}`;
      return '/(tabs)/profile';
    }
```

`case 'listings':` bloğunu düzenleme yolunu da tanıyacak şekilde değiştir:

```ts
    case 'listings': {
      // web: ürün detayı /listings/:id → mobil /product/:id; /listings/:id/edit →
      // mobil ilan düzenleme; liste → arama
      if (!id) return '/(tabs)/search';
      return seg[2] === 'edit' ? `/listing/${id}/edit` : `/product/${id}`;
    }
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/utils/__tests__/notificationRoute.test.ts`
Expected: PASS (12 yeni test + mevcutlar)

- [ ] **Step 5: Mobil rotaların gerçekten var olduğunu doğrula**

Run: `ls app/\(auth\)/verify-email.tsx app/\(auth\)/reset-password.tsx app/\(auth\)/forgot-password.tsx app/order-track app/orders app/trade app/refund-requests`
Expected: hepsi mevcut. `app/listing/[id]/edit` yoksa `case 'listings'` düzenleme dalını **kaldır** ve ilgili testi sil (var olmayan rotaya yönlendirme boş ekran demektir).

- [ ] **Step 6: Commit**

```bash
git add src/utils/notificationRoute.ts src/utils/__tests__/notificationRoute.test.ts
git commit -m "feat(deeplink): yol eşlemesini e-posta/davet/takip yollarıyla genişlet

toMobileRoute artık verify-email, reset-password, forgot-password,
corporate/invite, track-order ve /profile/<bölüm>/:id yollarını da biliyor.
Ödeme dönüş URL'leri bilinçli olarak eşlenmiyor (WebView içinde yakalanır).
Push ve derin bağlantı aynı eşlemeyi paylaşır.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Derin bağlantı yönlendirmesi ve app.json yapılandırması

**Files:**
- Create: `src/services/deepLinks.ts`
- Create: `src/services/__tests__/deepLinks.test.ts`
- Modify: `app/_layout.tsx`
- Modify: `app.json`

**Interfaces:**
- Consumes: Task 5'in `toMobileRoute`
- Produces: `setupDeepLinkRouting(): () => void` (aboneliği iptal eden temizleyici döner); `pathFromUrl(url: string): string | null`

- [ ] **Step 1: `expo-linking` bağımlılığını doğrula/kur**

Run: `node -e "console.log(require('./package.json').dependencies['expo-linking'] ?? 'YOK')"`
Kurulu değilse: `npx expo install expo-linking`

- [ ] **Step 2: Failing testi yaz**

Create `src/services/__tests__/deepLinks.test.ts`:

```ts
/**
 * Derin bağlantı yönlendirmesi: soğuk başlatma (getInitialURL) ve uygulama açıkken
 * (url olayı) gelen bağlantıyı toMobileRoute ile mobil rotaya çevirip yönlendirir.
 * Eşlenmeyen yol sessizce yok sayılır (ör. ödeme dönüş URL'leri).
 */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (r: string) => mockPush(r) } }));

let urlListener: ((e: { url: string }) => void) | null = null;
const mockGetInitialURL = jest.fn();
jest.mock('expo-linking', () => ({
  getInitialURL: () => mockGetInitialURL(),
  addEventListener: (_evt: string, cb: (e: { url: string }) => void) => {
    urlListener = cb;
    return { remove: jest.fn() };
  },
}));

import { pathFromUrl, setupDeepLinkRouting } from '../deepLinks';

beforeEach(() => {
  jest.clearAllMocks();
  urlListener = null;
  mockGetInitialURL.mockResolvedValue(null);
});

describe('pathFromUrl', () => {
  it('https universal link\'ten yol + sorguyu çıkarır', () => {
    expect(pathFromUrl('https://tarodan.com.tr/verify-email?token=abc')).toBe(
      '/verify-email?token=abc',
    );
  });

  it('custom scheme bağlantısından yol çıkarır', () => {
    expect(pathFromUrl('tarodan://product/p-1')).toBe('/product/p-1');
  });

  it('yol yoksa null döner', () => {
    expect(pathFromUrl('https://tarodan.com.tr')).toBeNull();
    expect(pathFromUrl('')).toBeNull();
  });
});

describe('setupDeepLinkRouting', () => {
  it('soğuk başlatmada gelen bağlantıyı yönlendirir', async () => {
    mockGetInitialURL.mockResolvedValue('https://tarodan.com.tr/product/p-1');
    setupDeepLinkRouting();
    await new Promise((r) => setImmediate(r));
    expect(mockPush).toHaveBeenCalledWith('/product/p-1');
  });

  it('uygulama açıkken gelen bağlantıyı yönlendirir', async () => {
    setupDeepLinkRouting();
    await new Promise((r) => setImmediate(r));
    urlListener!({ url: 'https://tarodan.com.tr/orders/ord-1' });
    expect(mockPush).toHaveBeenCalledWith('/orders/ord-1');
  });

  it('ödeme dönüş URL\'ini yönlendirmez', async () => {
    setupDeepLinkRouting();
    await new Promise((r) => setImmediate(r));
    urlListener!({ url: 'https://tarodan.com.tr/payment/success?paymentId=p1' });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('temizleyici döner', async () => {
    const cleanup = setupDeepLinkRouting();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/services/__tests__/deepLinks.test.ts`
Expected: FAIL — `Cannot find module '../deepLinks'`

- [ ] **Step 4: Servisi yaz**

Create `src/services/deepLinks.ts`:

```ts
/**
 * Derin bağlantı yönlendirmesi (universal link + custom scheme).
 *
 * Yol → mobil rota eşlemesi push bildirimleriyle PAYLAŞILIR (`toMobileRoute`);
 * ikinci bir kopya tutulmaz. Ödeme dönüş URL'leri (`/payment/success|fail`)
 * bilinçli olarak eşlenmez — o tur ödeme WebView'i içinde yakalanır; uygulama
 * dışına çıkarsa akış kopar.
 */
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { toMobileRoute } from '@/utils/notificationRoute';

/** URL'den yol + sorgu dizesini çıkar (şema/host'u atarak). */
export function pathFromUrl(url: string): string | null {
  if (!url) return null;
  // Şema ve host'u kaldır: https://host/yol?q  |  tarodan://yol?q
  const withoutScheme = url.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const slash = withoutScheme.indexOf('/');
  const rest = slash === -1 ? withoutScheme.slice(withoutScheme.indexOf('?')) : withoutScheme.slice(slash);
  // custom scheme'de host segmenti yol gibi davranır: tarodan://product/p-1
  const candidate = slash === -1 && !withoutScheme.startsWith('?') ? `/${withoutScheme}` : rest;
  const path = candidate.startsWith('/') ? candidate : `/${candidate}`;
  return path === '/' || path === '/?' ? null : path;
}

function handle(url: string | null | undefined) {
  if (!url) return;
  const path = pathFromUrl(url);
  if (!path) return;
  const route = toMobileRoute(path);
  if (!route) return; // eşlenmeyen yol (ör. ödeme dönüşü) sessizce yok sayılır
  router.push(route as never);
}

/** Kök layout'ta bir kez çağrılır; aboneliği iptal eden temizleyiciyi döner. */
export function setupDeepLinkRouting(): () => void {
  // Soğuk başlatma: uygulama bağlantıyla açıldı.
  Linking.getInitialURL()
    .then(handle)
    .catch(() => {});
  // Uygulama açıkken gelen bağlantı.
  const sub = Linking.addEventListener('url', ({ url }) => handle(url));
  return () => sub.remove();
}
```

- [ ] **Step 5: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/services/__tests__/deepLinks.test.ts`
Expected: PASS (7 test)

- [ ] **Step 6: Kök layout'a bağla**

`app/_layout.tsx` import bloğuna ekle:

```ts
import { setupDeepLinkRouting } from "@/services/deepLinks";
```

`setupPushNotificationRouting`'in çağrıldığı `useEffect`'in yanına (veya kendi `useEffect`'inde) ekle:

```ts
  useEffect(() => setupDeepLinkRouting(), []);
```

> Push routing hangi `useEffect` içinde kuruluyorsa aynı yaşam döngüsünü izle. Temizleyiciyi döndürmek zorunlu — aksi halde Fast Refresh'te birden fazla dinleyici birikir.

- [ ] **Step 7: `app.json`'a universal link yapılandırmasını ekle**

`expo.ios` nesnesine ekle:

```json
      "associatedDomains": [
        "applinks:tarodan.com.tr",
        "applinks:staging.tarodan.com.tr"
      ],
```

`expo.android` nesnesine ekle:

```json
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            { "scheme": "https", "host": "tarodan.com.tr" },
            { "scheme": "https", "host": "staging.tarodan.com.tr" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ],
```

> `scheme: "tarodan"` **yedek olarak korunur** — silinmez.

- [ ] **Step 8: Yapılandırmanın geçerli olduğunu doğrula**

Run: `node -e "const a=require('./app.json').expo; if(!a.ios.associatedDomains?.length) throw new Error('ios eksik'); if(!a.android.intentFilters?.length) throw new Error('android eksik'); if(a.scheme!=='tarodan') throw new Error('scheme kayboldu'); console.log('ok')"`
Expected: `ok`

- [ ] **Step 9: Tip ve lint kontrolü**

Run: `npx tsc --noEmit && npx eslint src/services/deepLinks.ts app/_layout.tsx`
Expected: yeni hata yok

- [ ] **Step 10: Commit**

```bash
git add src/services/deepLinks.ts src/services/__tests__/deepLinks.test.ts app/_layout.tsx app.json
git commit -m "feat(deeplink): universal link + custom scheme yönlendirmesi

app.json'a ios.associatedDomains ve android.intentFilters (autoVerify)
eklendi; setupDeepLinkRouting soğuk başlatma ve açık uygulama bağlantılarını
toMobileRoute ile mobil rotaya çeviriyor. Ödeme dönüş URL'leri eşlenmiyor.

ÖNKOŞUL (ops): tarodan.com.tr ve staging.tarodan.com.tr üzerinde
.well-known/apple-app-site-association + assetlinks.json yayınlanmalı;
yapılmadan universal link çalışmaz (custom scheme çalışır).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Kurumsal davet aktivasyonu

Davet edilen kurumsal alt hesap mobilde hesabını **hiç** açamıyor. Akış: davet e-postasındaki bağlantı → daveti doğrula → kullanıcı adı + ilk şifreyi belirle → giriş.

**Files:**
- Modify: `src/lib/api/auth.ts`
- Create: `app/(auth)/corporate-invite/index.tsx`
- Create: `app/(auth)/corporate-invite/_lib/schema.ts`
- Create: `app/(auth)/corporate-invite/_hooks/useCorporateInvite.ts`
- Create: `app/(auth)/corporate-invite/__tests__/corporate-invite.test.tsx`
- Modify: `src/lib/query/keys.ts`

**Interfaces:**
- Consumes: Task 5/6'nın `/corporate-invite?token=` rotası
- Produces:
  - `authApi.getCorporateInvitation(token: string): Promise<{ data: { companyTitle: string; companyEmail: string; expiresAt: string } }>`
  - `authApi.activateCorporateInvitation(data: { token: string; username: string; password: string })`
  - `qk.auth.corporateInvitation(token: string)`
  - `useCorporateInvite()` → `{ token, invitation, isLoading, isInvalid, form, onSubmit, isSubmitting }`

- [ ] **Step 1: Failing testi yaz**

Create `app/(auth)/corporate-invite/__tests__/corporate-invite.test.tsx`:

```tsx
/**
 * Kurumsal davet aktivasyonu. Token geçersiz/eksikse form GÖSTERİLMEZ.
 * Kullanıcı adı bir kez belirlenir ve değiştirilemez — formda açıkça yazılır.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { token: 'inv-1' };
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (r: string) => mockReplace(r), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    getCorporateInvitation: jest.fn(),
    activateCorporateInvitation: jest.fn(),
  },
}));
import { authApi } from '@/lib/api';

const mockAlert = jest.fn();
jest.mock('@/ui', () => ({ ...jest.requireActual('@/ui'), appAlert: (...a: any[]) => mockAlert(...a) }));

import CorporateInviteScreen from '../index';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { token: 'inv-1' };
});

it('geçerli davette şirket bilgisini ve formu gösterir', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockResolvedValue({
    data: { companyTitle: 'Tarodan Otomotiv', companyEmail: 'k@firma.com', expiresAt: '2026-08-10' },
  });
  renderWithProviders(<CorporateInviteScreen />);

  await waitFor(() => expect(screen.getByText('Tarodan Otomotiv')).toBeTruthy());
  expect(screen.getByTestId('invite-username')).toBeTruthy();
  expect(screen.getByTestId('invite-password')).toBeTruthy();
});

it('token yoksa formu göstermez, geçersiz bağlantı ekranı çıkar', async () => {
  mockParams = {};
  renderWithProviders(<CorporateInviteScreen />);

  await waitFor(() => expect(screen.getByTestId('invite-invalid')).toBeTruthy());
  expect(screen.queryByTestId('invite-username')).toBeNull();
  expect(authApi.getCorporateInvitation).not.toHaveBeenCalled();
});

it('davet geçersiz/süresi dolmuşsa (400) formu göstermez', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockRejectedValue({
    response: { status: 400, data: { message: 'Davet süresi dolmuş' } },
  });
  renderWithProviders(<CorporateInviteScreen />);

  await waitFor(() => expect(screen.getByTestId('invite-invalid')).toBeTruthy());
  expect(screen.queryByTestId('invite-username')).toBeNull();
});

it('aktivasyon başarılı olduğunda girişe yönlendirir', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockResolvedValue({
    data: { companyTitle: 'Tarodan Otomotiv', companyEmail: 'k@firma.com', expiresAt: '2026-08-10' },
  });
  (authApi.activateCorporateInvitation as jest.Mock).mockResolvedValue({ data: {} });
  renderWithProviders(<CorporateInviteScreen />);
  await waitFor(() => expect(screen.getByTestId('invite-username')).toBeTruthy());

  fireEvent.changeText(screen.getByTestId('invite-username'), 'tarodan.kurumsal');
  fireEvent.changeText(screen.getByTestId('invite-password'), 'SecurePass1');
  fireEvent.changeText(screen.getByTestId('invite-password-confirm'), 'SecurePass1');
  fireEvent.press(screen.getByTestId('invite-submit'));

  await waitFor(() =>
    expect(authApi.activateCorporateInvitation).toHaveBeenCalledWith({
      token: 'inv-1',
      username: 'tarodan.kurumsal',
      password: 'SecurePass1',
    }),
  );
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'));
});

it('geçersiz kullanıcı adını göndermez', async () => {
  (authApi.getCorporateInvitation as jest.Mock).mockResolvedValue({
    data: { companyTitle: 'X', companyEmail: 'k@firma.com', expiresAt: '2026-08-10' },
  });
  renderWithProviders(<CorporateInviteScreen />);
  await waitFor(() => expect(screen.getByTestId('invite-username')).toBeTruthy());

  fireEvent.changeText(screen.getByTestId('invite-username'), 'Büyük Harf');
  fireEvent.changeText(screen.getByTestId('invite-password'), 'SecurePass1');
  fireEvent.changeText(screen.getByTestId('invite-password-confirm'), 'SecurePass1');
  fireEvent.press(screen.getByTestId('invite-submit'));

  await waitFor(() => expect(screen.getByText(/küçük harf/i)).toBeTruthy());
  expect(authApi.activateCorporateInvitation).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest "app/(auth)/corporate-invite"`
Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: API uçlarını ekle**

`src/lib/api/auth.ts` içine (`resendVerification`'ın altına) ekle:

```ts
  /**
   * Kurumsal davet doğrulama (public, throttle 20/dk). Geçersiz/süresi dolmuş
   * davette **400** döner — bu durumda form gösterilmez.
   */
  getCorporateInvitation: (token: string) =>
    guestApi.get<{ companyTitle: string; companyEmail: string; expiresAt: string }>(
      '/auth/corporate-invitation',
      { params: { token } },
    ),
  /**
   * Kurumsal hesabın kullanıcı adı + ilk şifresini belirle (public, throttle 5/dk).
   * Kullanıcı adı BİR KEZ belirlenir, değiştirilemez.
   */
  activateCorporateInvitation: (data: {
    token: string;
    username: string;
    password: string;
  }) => guestApi.post('/auth/corporate-invitation/activate', data),
```

- [ ] **Step 4: Sorgu anahtarını ekle**

`src/lib/query/keys.ts` içindeki `qk` nesnesine ekle (mevcut domain nesnelerinin stiline uyarak):

```ts
  auth: {
    corporateInvitation: (token: string) => ['auth', 'corporate-invitation', token] as const,
  },
```

> `qk.auth` zaten varsa yalnız `corporateInvitation` satırını mevcut nesneye ekle.

- [ ] **Step 5: Şemayı yaz**

Create `app/(auth)/corporate-invite/_lib/schema.ts`:

```ts
import { z } from 'zod';

/**
 * Kullanıcı adı web ile birebir: küçük harf, boşluksuz, 3-30,
 * `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$` ve **bir kez belirlenince değiştirilemez**.
 * Şifre kuralı her yerde aynı: min 8 + küçük + büyük + rakam (backend max 72).
 */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

export const corporateInviteSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'En az 3 karakter')
      .max(30, 'En fazla 30 karakter')
      .regex(USERNAME_PATTERN, 'Yalnız küçük harf, rakam, nokta ve alt çizgi kullanın'),
    password: z
      .string()
      .min(8, 'En az 8 karakter')
      .max(72, 'En fazla 72 karakter')
      .regex(/[a-z]/, 'En az bir küçük harf içermeli')
      .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
      .regex(/[0-9]/, 'En az bir rakam içermeli'),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Şifreler eşleşmiyor',
  });

export type CorporateInviteForm = z.infer<typeof corporateInviteSchema>;
```

- [ ] **Step 6: Controller hook'unu yaz**

Create `app/(auth)/corporate-invite/_hooks/useCorporateInvite.ts`:

```ts
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { corporateInviteSchema, type CorporateInviteForm } from '../_lib/schema';

/**
 * Kurumsal davet aktivasyonu controller'ı: daveti doğrulayan sorgu ve aktivasyon
 * mutation'ını sahiplenir. Token yoksa sorgu HİÇ çalışmaz (form da gösterilmez).
 */
export function useCorporateInvite() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : undefined;

  const invitationQuery = useQuery({
    queryKey: qk.auth.corporateInvitation(token ?? ''),
    queryFn: async () => (await authApi.getCorporateInvitation(token!)).data,
    enabled: !!token,
    retry: false,
  });

  const form = useZodForm(corporateInviteSchema);

  const activateMutation = useMutation({
    mutationFn: (values: CorporateInviteForm) =>
      authApi.activateCorporateInvitation({
        token: token!,
        username: values.username.trim(),
        password: values.password,
      }),
    onSuccess: () => {
      appAlert('Hesabınız hazır', 'Kullanıcı adınız ve şifreniz belirlendi. Şimdi giriş yapabilirsiniz.');
      router.replace('/(auth)/login' as never);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const raw = err?.response?.data?.message;
      appAlert('Hata', Array.isArray(raw) ? raw.join('\n') : raw || 'Aktivasyon tamamlanamadı.');
    },
  });

  return {
    token,
    invitation: invitationQuery.data,
    isLoading: !!token && invitationQuery.isLoading,
    /** Token yok VEYA davet doğrulanamadı (400) — form gösterilmez. */
    isInvalid: !token || invitationQuery.isError,
    form,
    isSubmitting: activateMutation.isPending,
    onSubmit: form.handleSubmit((values) => activateMutation.mutate(values)),
  };
}
```

- [ ] **Step 7: Ekranı yaz**

Create `app/(auth)/corporate-invite/index.tsx`:

```tsx
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import {
  Text,
  Button,
  Card,
  Alert,
  ScreenHeader,
  ScreenLoader,
  theme,
} from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useCorporateInvite } from './_hooks/useCorporateInvite';

/**
 * Kurumsal davet aktivasyonu — THIN ekran. Davet e-postasındaki bağlantı
 * (universal link / tarodan://corporate-invite?token=) buraya düşer.
 * Kullanıcı adı BİR KEZ belirlenir ve değiştirilemez.
 */
export default function CorporateInviteScreen() {
  const f = useCorporateInvite();

  if (f.isLoading) return <ScreenLoader />;

  if (f.isInvalid) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenHeader title="Kurumsal Davet" onBack={() => router.replace('/(auth)/login' as never)} />
        <View testID="invite-invalid" style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
          <Alert variant="error" title="Bağlantı geçersiz">
            Davet bağlantısı geçersiz veya süresi dolmuş. Lütfen şirket yöneticinizden
            yeni bir davet isteyin.
          </Alert>
          <Button onPress={() => router.replace('/(auth)/login' as never)}>Girişe dön</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Kurumsal Hesabı Etkinleştir" onBack={() => router.replace('/(auth)/login' as never)} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text variant="h3">{f.invitation?.companyTitle}</Text>
          <Text variant="caption" style={{ color: theme.colors.text.muted }}>
            {f.invitation?.companyEmail}
          </Text>
        </Card>

        <Alert variant="info" title="Kullanıcı adı kalıcıdır">
          Belirlediğiniz kullanıcı adı sonradan değiştirilemez.
        </Alert>

        <Form>
          <FormInput
            testID="invite-username"
            control={f.form.control}
            name="username"
            label="Kullanıcı adı"
            placeholder="tarodan.kurumsal"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FormInput
            testID="invite-password"
            control={f.form.control}
            name="password"
            label="Şifre"
            secureTextEntry
            helperText="En az 8 karakter; bir küçük harf, bir büyük harf ve bir rakam."
          />
          <FormInput
            testID="invite-password-confirm"
            control={f.form.control}
            name="passwordConfirm"
            label="Şifre (tekrar)"
            secureTextEntry
          />
        </Form>

        <Button testID="invite-submit" onPress={f.onSubmit} loading={f.isSubmitting}>
          Hesabı etkinleştir
        </Button>
      </ScrollView>
    </View>
  );
}
```

> `Alert`, `Card`, `ScreenLoader`, `Button` prop adları mevcut ekranlarda nasıl kullanılıyorsa **ona uy** (ör. `variant` yerine başka bir ad olabilir). Bir primitive yoksa `@/ui`'ya ekle, yerel kopya yazma.

- [ ] **Step 8: Testi çalıştır, geçtiğini gör**

Run: `npx jest "app/(auth)/corporate-invite"`
Expected: PASS (5 test)

- [ ] **Step 9: Tip ve lint kontrolü**

Run: `npx tsc --noEmit && npx eslint "app/(auth)/corporate-invite" src/lib/api/auth.ts src/lib/query/keys.ts`
Expected: yeni hata yok

- [ ] **Step 10: Commit**

```bash
git add "app/(auth)/corporate-invite" src/lib/api/auth.ts src/lib/query/keys.ts
git commit -m "feat(auth): kurumsal davet aktivasyonu ekranı

Davet edilen kurumsal alt hesap mobilde hesabını hiç açamıyordu.
GET /auth/corporate-invitation ile davet doğrulanır (400'de form gösterilmez),
POST .../activate ile kullanıcı adı + ilk şifre belirlenir. Derin bağlantı
/corporate-invite?token= rotasına düşer.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Kurumsal başvuru API katmanı

`sellerDocumentsApi` yalnız `list` + `upload` biliyor. Başvuru, paydaş, gönderme ve itiraz uçları eksik.

**Files:**
- Modify: `src/lib/api/user.ts`
- Modify: `src/lib/query/keys.ts`
- Create: `app/settings/business-application/_lib/types.ts`
- Create: `app/settings/business-application/_lib/documents.ts`
- Create: `src/lib/api/__tests__/sellerDocuments.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `sellerDocumentsApi.list()` (mevcut, dönüş tipi genişletildi)
  - `sellerDocumentsApi.upload(documentType: string, file: { uri: string; name: string; type: string }, stakeholderId?: string)`
  - `sellerDocumentsApi.getApplication()`
  - `sellerDocumentsApi.updateApplication(data: CorporateApplicationInput)`
  - `sellerDocumentsApi.addStakeholder(data: StakeholderInput)`
  - `sellerDocumentsApi.submit()`
  - `sellerDocumentsApi.appeal(documentId: string, note: string)`
  - `qk.sellerDocuments.list` / `qk.sellerDocuments.application`
  - `_lib/types.ts`: `SellerDocumentStatus`, `SellerDocument`, `CorporateApplication`, `CorporateStakeholder`, `CorporateApplicationInput`, `StakeholderInput`
  - `_lib/documents.ts`: `DOCUMENT_TYPES`, `IDENTITY_DOCUMENT_TYPES`, `DOCUMENT_STATUS_CONFIG`, `ACCEPTED_DOCUMENT_MIME`, `MAX_DOCUMENT_BYTES`

- [ ] **Step 1: Failing testi yaz**

Create `src/lib/api/__tests__/sellerDocuments.test.ts`:

```ts
/**
 * Kurumsal başvuru API katmanı. Belge yüklemesi multipart (`file` + `documentType`,
 * paydaş kimliğinde `stakeholderId`); itiraz notu gövdede `note`.
 */
const mockPost = jest.fn(() => Promise.resolve({ data: {} }));
const mockGet = jest.fn(() => Promise.resolve({ data: {} }));
const mockPatch = jest.fn(() => Promise.resolve({ data: {} }));
jest.mock('../client', () => ({
  api: { post: mockPost, get: mockGet, patch: mockPatch, delete: jest.fn() },
  guestApi: { post: jest.fn(), get: jest.fn() },
}));

import { sellerDocumentsApi } from '../user';

beforeEach(() => jest.clearAllMocks());

it('başvuruyu doğru uçtan okur', async () => {
  await sellerDocumentsApi.getApplication();
  expect(mockGet).toHaveBeenCalledWith('/users/me/seller-documents/application');
});

it('başvuru bilgilerini PATCH ile günceller', async () => {
  await sellerDocumentsApi.updateApplication({ taxId: '1234567890' });
  expect(mockPatch).toHaveBeenCalledWith('/users/me/seller-documents/application', {
    taxId: '1234567890',
  });
});

it('paydaş ekler', async () => {
  await sellerDocumentsApi.addStakeholder({ fullName: 'Ayşe Yılmaz', identityType: 'tckn', identityNumber: '12345678901' });
  expect(mockPost).toHaveBeenCalledWith(
    '/users/me/seller-documents/application/stakeholders',
    { fullName: 'Ayşe Yılmaz', identityType: 'tckn', identityNumber: '12345678901' },
  );
});

it('başvuruyu incelemeye gönderir', async () => {
  await sellerDocumentsApi.submit();
  expect(mockPost).toHaveBeenCalledWith('/users/me/seller-documents/application/submit');
});

it('belge kararına itiraz eder', async () => {
  await sellerDocumentsApi.appeal('doc-1', 'Belge güncel, tekrar inceleyin.');
  expect(mockPost).toHaveBeenCalledWith('/users/me/seller-documents/doc-1/appeal', {
    note: 'Belge güncel, tekrar inceleyin.',
  });
});

it('belge yüklerken documentType ve file alanlarını multipart gönderir', async () => {
  await sellerDocumentsApi.upload('tax_plate', { uri: 'file:///a.pdf', name: 'a.pdf', type: 'application/pdf' });
  const [url, body, config] = mockPost.mock.calls[0] as any[];
  expect(url).toBe('/users/me/seller-documents');
  expect(config.headers['Content-Type']).toBe('multipart/form-data');
  expect(body).toBeInstanceOf(FormData);
});

it('paydaş kimlik belgesinde stakeholderId ekler', async () => {
  const appendSpy = jest.spyOn(FormData.prototype, 'append');
  await sellerDocumentsApi.upload(
    'identity_front',
    { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' },
    'sh-1',
  );
  expect(appendSpy).toHaveBeenCalledWith('stakeholderId', 'sh-1');
  appendSpy.mockRestore();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/lib/api/__tests__/sellerDocuments.test.ts`
Expected: FAIL — `sellerDocumentsApi.getApplication is not a function`

- [ ] **Step 3: Tipleri yaz**

Create `app/settings/business-application/_lib/types.ts`:

```ts
/** Backend `SellerDocumentStatus` + UI'a özgü "eksik" durumu. */
export type SellerDocumentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'appealed';

export type SellerDocument = {
  id: string;
  documentType: string;
  fileName: string;
  status: SellerDocumentStatus;
  uploadedAt: string;
  version?: number;
  reviewNote?: string | null;
  stakeholderId?: string | null;
  url?: string | null;
};

export type CorporateStakeholder = {
  id: string;
  fullName: string;
  identityType: 'tckn' | 'passport';
  identityNumber?: string | null;
};

export type CorporateApplication = {
  id: string;
  status: 'draft' | 'under_review' | 'approved' | 'rejected' | string;
  companyType?: string | null;
  taxId?: string | null;
  taxOffice?: string | null;
  companyCity?: string | null;
  companyDistrict?: string | null;
  bankAccountHolder?: string | null;
  iban?: string | null;
  stakeholders?: CorporateStakeholder[];
};

export type CorporateApplicationInput = {
  companyType?: string;
  taxId?: string;
  taxOffice?: string;
  companyCity?: string;
  companyDistrict?: string;
  bankAccountHolder?: string;
  iban?: string;
};

export type StakeholderInput = {
  fullName: string;
  identityType: 'tckn' | 'passport';
  identityNumber?: string;
};
```

- [ ] **Step 4: Belge sabitlerini yaz**

Create `app/settings/business-application/_lib/documents.ts`:

```ts
import { theme } from '@/theme';
import type { SellerDocumentStatus } from './types';

/** Zengin akışın 7 belge türü (web /profile/business ile birebir). */
export const DOCUMENT_TYPES = [
  { type: 'tax_plate', label: 'Vergi levhası' },
  { type: 'residence_or_invoice', label: 'İkametgâh veya fatura' },
  { type: 'signature_circular', label: 'İmza sirküleri' },
  { type: 'trade_registry_gazette', label: 'Ticaret sicil gazetesi' },
  { type: 'activity_certificate', label: 'Faaliyet belgesi' },
  { type: 'bank_account_info', label: 'Banka hesap bilgisi' },
  { type: 'contract', label: 'Sözleşme' },
] as const;

/** Paydaş başına ön/arka kimlik belgesi türleri. */
export const IDENTITY_DOCUMENT_TYPES = {
  tckn: [
    { type: 'identity_front', label: 'Kimlik ön yüz' },
    { type: 'identity_back', label: 'Kimlik arka yüz' },
  ],
  passport: [
    { type: 'passport_front', label: 'Pasaport ön yüz' },
    { type: 'passport_back', label: 'Pasaport arka yüz' },
  ],
} as const;

export const DOCUMENT_STATUS_CONFIG: Record<
  SellerDocumentStatus,
  { label: string; color: string }
> = {
  pending: { label: 'İncelemede', color: theme.colors.warning[600]! },
  approved: { label: 'Onaylandı', color: theme.colors.success[600]! },
  rejected: { label: 'Reddedildi', color: theme.colors.danger[600]! },
  revision_requested: { label: 'Düzeltme istendi', color: theme.colors.warning[600]! },
  appealed: { label: 'İtiraz edildi', color: theme.colors.info[600]! },
};

/** Backend: application/pdf + jpeg/png/webp, ≤10 MB. */
export const ACCEPTED_DOCUMENT_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Yükleme yalnız bu durumlarda AÇIK kalır (başvuru under_review olsa bile). */
export const REUPLOADABLE_STATUSES: SellerDocumentStatus[] = ['rejected', 'revision_requested'];
```

> `theme.colors.info` / `warning` / `success` / `danger` tonlarının gerçek adlarını `src/theme` içinden doğrula; yoksa var olan en yakın semantik tonu kullan. **Hardcoded hex yazma.**

- [ ] **Step 5: API katmanını genişlet**

`src/lib/api/user.ts` içindeki `sellerDocumentsApi`'nin **tamamını** şununla değiştir:

```ts
/** Kurumsal satıcı başvurusu ve belgeleri — backend: /users/me/seller-documents* */
export const sellerDocumentsApi = {
  /** Belge slotları (presigned URL'lerle). */
  list: () =>
    api.get<
      Array<{
        id: string;
        documentType: string;
        fileName: string;
        status: 'pending' | 'approved' | 'rejected' | 'revision_requested' | 'appealed';
        uploadedAt: string;
        version?: number;
        reviewNote?: string | null;
        stakeholderId?: string | null;
        url?: string | null;
      }>
    >('/users/me/seller-documents'),
  /**
   * multipart/form-data: `file` + `documentType` (+ paydaş kimlik belgelerinde
   * `stakeholderId`). Kabul: application/pdf, jpeg, png, webp; ≤10 MB.
   */
  upload: (
    documentType: string,
    file: { uri: string; name: string; type: string },
    stakeholderId?: string,
  ) => {
    const formData = new FormData();
    formData.append('documentType', documentType);
    if (stakeholderId) formData.append('stakeholderId', stakeholderId);
    formData.append('file', file as unknown as Blob);
    return api.post('/users/me/seller-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  /** Başvuru yoksa backend 400/404 döner — çağıran taraf "başvuru yok" olarak ele alır. */
  getApplication: () => api.get('/users/me/seller-documents/application'),
  updateApplication: (data: Record<string, string | undefined>) =>
    api.patch('/users/me/seller-documents/application', data),
  addStakeholder: (data: {
    fullName: string;
    identityType: 'tckn' | 'passport';
    identityNumber?: string;
  }) => api.post('/users/me/seller-documents/application/stakeholders', data),
  submit: () => api.post('/users/me/seller-documents/application/submit'),
  /** Belge kararına itiraz. */
  appeal: (documentId: string, note: string) =>
    api.post(`/users/me/seller-documents/${documentId}/appeal`, { note }),
};
```

- [ ] **Step 6: Sorgu anahtarlarını ekle**

`src/lib/query/keys.ts` içindeki `qk` nesnesine ekle:

```ts
  sellerDocuments: {
    list: ['seller-documents'] as const,
    application: ['seller-documents', 'application'] as const,
  },
```

- [ ] **Step 7: Testi çalıştır, geçtiğini gör**

Run: `npx jest src/lib/api/__tests__/sellerDocuments.test.ts`
Expected: PASS (7 test)

- [ ] **Step 8: Tip ve lint kontrolü**

Run: `npx tsc --noEmit && npx eslint src/lib/api/user.ts src/lib/query/keys.ts app/settings/business-application`
Expected: yeni hata yok

- [ ] **Step 9: Commit**

```bash
git add src/lib/api/user.ts src/lib/query/keys.ts app/settings/business-application src/lib/api/__tests__/sellerDocuments.test.ts
git commit -m "feat(corporate): kurumsal başvuru API katmanı + tipler/sabitler

sellerDocumentsApi'ye getApplication, updateApplication, addStakeholder,
submit ve appeal eklendi; upload artık paydaş kimlik belgeleri için
stakeholderId gönderiyor. 7 belge türü, kimlik türleri, durum yapılandırması
ve dosya sınırları _lib altında tek kaynak.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Kurumsal başvuru controller hook'u

**Files:**
- Create: `app/settings/business-application/_hooks/useBusinessApplication.ts`
- Create: `app/settings/business-application/_hooks/useDocumentUpload.ts`
- Create: `app/settings/business-application/_lib/schema.ts`
- Create: `app/settings/business-application/__tests__/useBusinessApplication.test.tsx`

**Interfaces:**
- Consumes: Task 8'in `sellerDocumentsApi`, `qk.sellerDocuments`, `_lib/types.ts`, `_lib/documents.ts`
- Produces:
  - `useBusinessApplication()` → `{ application, documents, stakeholders, isLoading, isMissing, isLocked, tab, setTab, detailsForm, saveDetails, isSavingDetails, stakeholderForm, addStakeholder, isAddingStakeholder, submitApplication, isSubmitting, documentFor(type, stakeholderId?), canUpload(doc) }`
  - `useDocumentUpload()` → `{ pickAndUpload(documentType: string, stakeholderId?: string): Promise<void>, uploadingType: string | null }`
  - `_lib/schema.ts`: `applicationDetailsSchema`, `stakeholderSchema`, `appealSchema` + form tipleri

- [ ] **Step 1: Failing testi yaz**

Create `app/settings/business-application/__tests__/useBusinessApplication.test.tsx`:

```tsx
/**
 * Kurumsal başvuru controller'ı. Kilit kuralı: application.status === 'under_review'
 * iken detay/paydaş formları ve gönder butonu devre dışı; ancak rejected /
 * revision_requested belgeler için yükleme AÇIK kalır.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  sellerDocumentsApi: {
    list: jest.fn(),
    getApplication: jest.fn(),
    updateApplication: jest.fn(() => Promise.resolve({ data: {} })),
    addStakeholder: jest.fn(() => Promise.resolve({ data: {} })),
    submit: jest.fn(() => Promise.resolve({ data: {} })),
    appeal: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));
import { sellerDocumentsApi } from '@/lib/api';

jest.mock('@/ui', () => ({ ...jest.requireActual('@/ui'), appAlert: jest.fn() }));

import { useBusinessApplication } from '../_hooks/useBusinessApplication';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  jest.clearAllMocks();
  (sellerDocumentsApi.list as jest.Mock).mockResolvedValue({ data: [] });
  (sellerDocumentsApi.getApplication as jest.Mock).mockResolvedValue({
    data: { id: 'app-1', status: 'draft', stakeholders: [] },
  });
});

it('başvuru yoksa isMissing true olur', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockRejectedValue({
    response: { status: 404 },
  });
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.isMissing).toBe(true);
});

it('under_review iken kilitlidir', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockResolvedValue({
    data: { id: 'app-1', status: 'under_review', stakeholders: [] },
  });
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLocked).toBe(true));
});

it('kilitli olsa bile reddedilen belge yeniden yüklenebilir', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockResolvedValue({
    data: { id: 'app-1', status: 'under_review', stakeholders: [] },
  });
  (sellerDocumentsApi.list as jest.Mock).mockResolvedValue({
    data: [
      { id: 'd1', documentType: 'tax_plate', fileName: 'a.pdf', status: 'rejected', uploadedAt: '' },
      { id: 'd2', documentType: 'contract', fileName: 'b.pdf', status: 'pending', uploadedAt: '' },
    ],
  });
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLocked).toBe(true));

  expect(result.current.canUpload(result.current.documentFor('tax_plate'))).toBe(true);
  expect(result.current.canUpload(result.current.documentFor('contract'))).toBe(false);
});

it('kilitli değilken yüklenmemiş belge yüklenebilir', async () => {
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.canUpload(result.current.documentFor('tax_plate'))).toBe(true);
});

it('başvuruyu incelemeye gönderir', async () => {
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => { result.current.submitApplication(); });
  await waitFor(() => expect(sellerDocumentsApi.submit).toHaveBeenCalled());
});

it('belge listesinde paydaş kimliğini stakeholderId ile ayırır', async () => {
  (sellerDocumentsApi.list as jest.Mock).mockResolvedValue({
    data: [
      { id: 'd1', documentType: 'identity_front', fileName: 'a.jpg', status: 'approved', uploadedAt: '', stakeholderId: 'sh-1' },
    ],
  });
  const { result } = renderHook(() => useBusinessApplication(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(result.current.documentFor('identity_front', 'sh-1')?.id).toBe('d1');
  expect(result.current.documentFor('identity_front', 'sh-2')).toBeUndefined();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/settings/business-application`
Expected: FAIL — `Cannot find module '../_hooks/useBusinessApplication'`

- [ ] **Step 3: Şemaları yaz**

Create `app/settings/business-application/_lib/schema.ts`:

```ts
import { z } from 'zod';

/** IBAN: TR + 24 rakam (backend `^TR\d{24}$`). Girişte büyük harfe çevrilir. */
export const applicationDetailsSchema = z.object({
  companyType: z.string().trim().optional().or(z.literal('')),
  taxId: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Vergi numarası 10 hane olmalı')
    .optional()
    .or(z.literal('')),
  taxOffice: z.string().trim().max(100, 'En fazla 100 karakter').optional().or(z.literal('')),
  companyCity: z.string().trim().optional().or(z.literal('')),
  companyDistrict: z.string().trim().optional().or(z.literal('')),
  bankAccountHolder: z
    .string()
    .trim()
    .min(2, 'En az 2 karakter')
    .optional()
    .or(z.literal('')),
  iban: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, '').toUpperCase())
    .refine((v) => v === '' || /^TR\d{24}$/.test(v), 'IBAN TR ile başlayıp 24 rakam içermeli')
    .optional(),
});

export type ApplicationDetailsForm = z.infer<typeof applicationDetailsSchema>;

export const stakeholderSchema = z
  .object({
    fullName: z.string().trim().min(2, 'En az 2 karakter'),
    identityType: z.enum(['tckn', 'passport']),
    identityNumber: z.string().trim().optional().or(z.literal('')),
  })
  .refine(
    (v) => v.identityType !== 'tckn' || /^\d{11}$/.test(v.identityNumber ?? ''),
    { path: ['identityNumber'], message: 'TC Kimlik No 11 hane olmalı' },
  );

export type StakeholderForm = z.infer<typeof stakeholderSchema>;

export const appealSchema = z.object({
  note: z.string().trim().min(10, 'En az 10 karakter yazın').max(1000, 'En fazla 1000 karakter'),
});

export type AppealForm = z.infer<typeof appealSchema>;
```

- [ ] **Step 4: Controller hook'unu yaz**

Create `app/settings/business-application/_hooks/useBusinessApplication.ts`:

```ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { REUPLOADABLE_STATUSES } from '../_lib/documents';
import {
  applicationDetailsSchema,
  stakeholderSchema,
  type ApplicationDetailsForm,
  type StakeholderForm,
} from '../_lib/schema';
import type { CorporateApplication, SellerDocument } from '../_lib/types';

export type BusinessApplicationTab = 'details' | 'stakeholders' | 'documents';

/** Sunucu hata mesajı string veya string[] olabilir (NestJS doğrulama dizisi). */
const errorText = (e: unknown, fallback: string) => {
  const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  return Array.isArray(raw) ? raw.join('\n') : raw || fallback;
};

/**
 * Kurumsal başvuru controller'ı — başvuru + belge sorgularını, üç mutation'ı
 * (detay kaydet, paydaş ekle, incelemeye gönder) ve sekme durumunu sahiplenir.
 *
 * Kilit kuralı: `under_review` iken formlar ve gönder devre dışı; `rejected` /
 * `revision_requested` belgeler için yükleme AÇIK kalır.
 */
export function useBusinessApplication() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<BusinessApplicationTab>('details');

  const applicationQuery = useQuery({
    queryKey: qk.sellerDocuments.application,
    queryFn: async () =>
      (await sellerDocumentsApi.getApplication()).data as CorporateApplication,
    retry: false,
  });

  const documentsQuery = useQuery({
    queryKey: qk.sellerDocuments.list,
    queryFn: async () => (await sellerDocumentsApi.list()).data as SellerDocument[],
  });

  const application = applicationQuery.data;
  const documents = documentsQuery.data ?? [];
  const stakeholders = application?.stakeholders ?? [];
  const isLocked = application?.status === 'under_review';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.application });
    queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.list });
  };

  const detailsForm = useZodForm(applicationDetailsSchema, {
    values: {
      companyType: application?.companyType ?? '',
      taxId: application?.taxId ?? '',
      taxOffice: application?.taxOffice ?? '',
      companyCity: application?.companyCity ?? '',
      companyDistrict: application?.companyDistrict ?? '',
      bankAccountHolder: application?.bankAccountHolder ?? '',
      iban: application?.iban ?? '',
    },
  });

  const detailsMutation = useMutation({
    mutationFn: (values: ApplicationDetailsForm) =>
      // Boş alanları gönderme — backend kısmi güncelleme yapıyor.
      sellerDocumentsApi.updateApplication(
        Object.fromEntries(
          Object.entries(values).filter(([, v]) => typeof v === 'string' && v !== ''),
        ) as Record<string, string>,
      ),
    onSuccess: () => {
      invalidate();
      appAlert('Kaydedildi', 'Şirket bilgileri güncellendi.');
    },
    onError: (e) => appAlert('Hata', errorText(e, 'Bilgiler kaydedilemedi.')),
  });

  const stakeholderForm = useZodForm(stakeholderSchema, {
    defaultValues: { fullName: '', identityType: 'tckn', identityNumber: '' },
  });

  const stakeholderMutation = useMutation({
    mutationFn: (values: StakeholderForm) =>
      sellerDocumentsApi.addStakeholder({
        fullName: values.fullName,
        identityType: values.identityType,
        ...(values.identityNumber ? { identityNumber: values.identityNumber } : {}),
      }),
    onSuccess: () => {
      invalidate();
      stakeholderForm.reset({ fullName: '', identityType: 'tckn', identityNumber: '' });
      appAlert('Eklendi', 'Şirket sahibi/ortağı eklendi.');
    },
    onError: (e) => appAlert('Hata', errorText(e, 'Paydaş eklenemedi.')),
  });

  const submitMutation = useMutation({
    mutationFn: () => sellerDocumentsApi.submit(),
    onSuccess: () => {
      invalidate();
      appAlert('Gönderildi', 'Başvurunuz incelemeye alındı.');
    },
    onError: (e) => appAlert('Gönderilemedi', errorText(e, 'Başvuru gönderilemedi.')),
  });

  /** Bir belge türünün (paydaş kimliğinde stakeholderId ile) yüklenmiş kaydı. */
  const documentFor = (documentType: string, stakeholderId?: string) =>
    documents.find(
      (d) =>
        d.documentType === documentType &&
        (stakeholderId ? d.stakeholderId === stakeholderId : !d.stakeholderId),
    );

  /**
   * Yükleme açık mı? Henüz yüklenmemiş belge yalnız başvuru kilitli DEĞİLKEN
   * yüklenebilir; yüklenmiş belge ise reddedilmiş/düzeltme istenmiş olduğunda
   * (başvuru kilitli olsa bile) yeniden yüklenebilir.
   */
  const canUpload = (doc?: SellerDocument) =>
    doc ? REUPLOADABLE_STATUSES.includes(doc.status) : !isLocked;

  return {
    application,
    documents,
    stakeholders,
    isLoading: applicationQuery.isLoading || documentsQuery.isLoading,
    /** Backend 400/404 → henüz başvuru oluşmamış. */
    isMissing: applicationQuery.isError,
    isLocked,
    tab,
    setTab,
    detailsForm,
    saveDetails: detailsForm.handleSubmit((v) => detailsMutation.mutate(v)),
    isSavingDetails: detailsMutation.isPending,
    stakeholderForm,
    addStakeholder: stakeholderForm.handleSubmit((v) => stakeholderMutation.mutate(v)),
    isAddingStakeholder: stakeholderMutation.isPending,
    submitApplication: () => submitMutation.mutate(),
    isSubmitting: submitMutation.isPending,
    documentFor,
    canUpload,
  };
}
```

> `useZodForm`'un ikinci parametresi (`values` / `defaultValues`) `src/ui/lib/use-zod-form.ts`'in
> imzasına göre uyarlanmalı — react-hook-form'un `values` desteği yoksa `useEffect` +
> `form.reset(...)` ile başvuru verisi geldiğinde formu doldur.

- [ ] **Step 5: Belge yükleme hook'unu yaz**

Önce bağımlılığı doğrula: `node -e "console.log(require('./package.json').dependencies['expo-document-picker'] ?? 'YOK')"` — yoksa `npx expo install expo-document-picker`.

Create `app/settings/business-application/_hooks/useDocumentUpload.ts`:

```ts
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { ACCEPTED_DOCUMENT_MIME, MAX_DOCUMENT_BYTES } from '../_lib/documents';

/**
 * Kurumsal belge yükleme. PDF gerektiği için görsel seçici DEĞİL belge seçici
 * kullanılır. Sunucu AI moderasyon reddinde Türkçe mesajı olduğu gibi gösterir.
 */
export function useDocumentUpload() {
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  async function pickAndUpload(documentType: string, stakeholderId?: string) {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_DOCUMENT_MIME,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return;
    const asset = picked.assets?.[0];
    if (!asset) return;

    if (typeof asset.size === 'number' && asset.size > MAX_DOCUMENT_BYTES) {
      appAlert('Dosya çok büyük', 'En fazla 10 MB boyutunda bir dosya seçin.');
      return;
    }

    setUploadingType(documentType + (stakeholderId ?? ''));
    try {
      await sellerDocumentsApi.upload(
        documentType,
        {
          uri: asset.uri,
          name: asset.name ?? 'belge',
          type: asset.mimeType ?? 'application/octet-stream',
        },
        stakeholderId,
      );
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.list });
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.application });
      appAlert('Yüklendi', 'Belge yüklendi ve incelemeye alındı.');
    } catch (e) {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      appAlert('Yüklenemedi', Array.isArray(raw) ? raw.join('\n') : raw || 'Belge yüklenemedi.');
    } finally {
      setUploadingType(null);
    }
  }

  return { pickAndUpload, uploadingType };
}
```

- [ ] **Step 6: Testi çalıştır, geçtiğini gör**

Run: `npx jest app/settings/business-application`
Expected: PASS (6 test)

- [ ] **Step 7: Tip ve lint kontrolü**

Run: `npx tsc --noEmit && npx eslint app/settings/business-application`
Expected: yeni hata yok

- [ ] **Step 8: Commit**

```bash
git add app/settings/business-application
git commit -m "feat(corporate): başvuru controller hook'u + belge yükleme

useBusinessApplication başvuru/belge sorgularını, detay-kaydet, paydaş-ekle
ve incelemeye-gönder mutation'larını sahiplenir; kilit kuralı under_review
iken formları kapatır ama reddedilen belgelerin yeniden yüklenmesine izin
verir. useDocumentUpload PDF için belge seçici kullanır (10 MB sınırı).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Kurumsal başvuru sekmeleri ve ekranı

**Files:**
- Create: `app/settings/business-application/_sections/DetailsTab.tsx`
- Create: `app/settings/business-application/_sections/StakeholdersTab.tsx`
- Create: `app/settings/business-application/_sections/DocumentsTab.tsx`
- Create: `app/settings/business-application/_modals/AppealModal.tsx`
- Create: `app/settings/business-application/index.tsx`
- Create: `app/settings/business-application/__tests__/screen.test.tsx`

**Interfaces:**
- Consumes: Task 9'un `useBusinessApplication()`, `useDocumentUpload()`, `_lib/*`
- Produces: `/settings/business-application` rotası

- [ ] **Step 1: Failing testi yaz**

Create `app/settings/business-application/__tests__/screen.test.tsx`:

```tsx
/**
 * Kurumsal başvuru ekranı — üç sekme kompozisyonu. under_review iken detay/paydaş
 * formları ve gönder devre dışı; reddedilen belge yeniden yüklenebilir.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

jest.mock('@/lib/api', () => ({
  sellerDocumentsApi: {
    list: jest.fn(() => Promise.resolve({ data: [] })),
    getApplication: jest.fn(() =>
      Promise.resolve({ data: { id: 'app-1', status: 'draft', stakeholders: [] } }),
    ),
    updateApplication: jest.fn(() => Promise.resolve({ data: {} })),
    addStakeholder: jest.fn(() => Promise.resolve({ data: {} })),
    submit: jest.fn(() => Promise.resolve({ data: {} })),
    appeal: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));
import { sellerDocumentsApi } from '@/lib/api';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true })) }));
jest.mock('@/ui', () => ({ ...jest.requireActual('@/ui'), appAlert: jest.fn() }));

import BusinessApplicationScreen from '../index';

beforeEach(() => jest.clearAllMocks());

it('üç sekmeyi gösterir ve detay sekmesiyle açılır', async () => {
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('tab-details')).toBeTruthy());
  expect(screen.getByTestId('tab-stakeholders')).toBeTruthy();
  expect(screen.getByTestId('tab-documents')).toBeTruthy();
  expect(screen.getByTestId('details-taxId')).toBeTruthy();
});

it('detay bilgilerini kaydeder', async () => {
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('details-taxId')).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('details-taxId'), '1234567890');
  fireEvent.press(screen.getByTestId('details-save'));
  await waitFor(() =>
    expect(sellerDocumentsApi.updateApplication).toHaveBeenCalledWith(
      expect.objectContaining({ taxId: '1234567890' }),
    ),
  );
});

it('belgeler sekmesinde 7 belge türünü listeler', async () => {
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('tab-documents')).toBeTruthy());
  fireEvent.press(screen.getByTestId('tab-documents'));
  await waitFor(() => expect(screen.getByTestId('doc-row-tax_plate')).toBeTruthy());
  for (const type of [
    'tax_plate', 'residence_or_invoice', 'signature_circular',
    'trade_registry_gazette', 'activity_certificate', 'bank_account_info', 'contract',
  ]) {
    expect(screen.getByTestId(`doc-row-${type}`)).toBeTruthy();
  }
});

it('under_review iken gönder butonu devre dışı', async () => {
  (sellerDocumentsApi.getApplication as jest.Mock).mockResolvedValue({
    data: { id: 'app-1', status: 'under_review', stakeholders: [] },
  });
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('application-submit')).toBeTruthy());
  expect(screen.getByTestId('application-submit').props.accessibilityState?.disabled).toBe(true);
});

it('reddedilen belgede itiraz aksiyonu sunar', async () => {
  (sellerDocumentsApi.list as jest.Mock).mockResolvedValue({
    data: [{ id: 'd1', documentType: 'tax_plate', fileName: 'a.pdf', status: 'rejected', uploadedAt: '', reviewNote: 'Okunmuyor' }],
  });
  renderWithProviders(<BusinessApplicationScreen />);
  await waitFor(() => expect(screen.getByTestId('tab-documents')).toBeTruthy());
  fireEvent.press(screen.getByTestId('tab-documents'));
  await waitFor(() => expect(screen.getByTestId('doc-appeal-tax_plate')).toBeTruthy());
  expect(screen.getByText('Okunmuyor')).toBeTruthy();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/settings/business-application/__tests__/screen.test.tsx`
Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: `DetailsTab`'ı yaz**

Create `app/settings/business-application/_sections/DetailsTab.tsx`:

```tsx
import { View } from 'react-native';
import { Button, Alert, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import type { useBusinessApplication } from '../_hooks/useBusinessApplication';

type Props = { f: ReturnType<typeof useBusinessApplication> };

/** Şirket ve banka bilgileri. `under_review` iken tüm alanlar devre dışı. */
export function DetailsTab({ f }: Props) {
  if (f.tab !== 'details') return null;
  const disabled = f.isLocked;

  return (
    <View style={{ gap: theme.spacing.md }}>
      {disabled && (
        <Alert variant="info" title="Başvuru incelemede">
          Bilgiler inceleme sürerken değiştirilemez. Reddedilen belgeleri yeniden
          yükleyebilirsiniz.
        </Alert>
      )}
      <Form>
        <FormInput testID="details-companyType" control={f.detailsForm.control} name="companyType" label="Şirket türü" editable={!disabled} />
        <FormInput testID="details-taxId" control={f.detailsForm.control} name="taxId" label="Vergi numarası" keyboardType="number-pad" editable={!disabled} />
        <FormInput testID="details-taxOffice" control={f.detailsForm.control} name="taxOffice" label="Vergi dairesi" editable={!disabled} />
        <FormInput testID="details-companyCity" control={f.detailsForm.control} name="companyCity" label="İl" editable={!disabled} />
        <FormInput testID="details-companyDistrict" control={f.detailsForm.control} name="companyDistrict" label="İlçe" editable={!disabled} />
        <FormInput testID="details-bankAccountHolder" control={f.detailsForm.control} name="bankAccountHolder" label="Hesap sahibi" editable={!disabled} />
        <FormInput testID="details-iban" control={f.detailsForm.control} name="iban" label="IBAN" placeholder="TR..." autoCapitalize="characters" editable={!disabled} />
      </Form>
      <Button testID="details-save" onPress={f.saveDetails} loading={f.isSavingDetails} disabled={disabled}>
        Bilgileri kaydet
      </Button>
    </View>
  );
}
```

- [ ] **Step 4: `StakeholdersTab`'ı yaz**

Create `app/settings/business-application/_sections/StakeholdersTab.tsx`:

```tsx
import { View, Pressable } from 'react-native';
import { Text, Button, Card, EmptyState, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { IDENTITY_DOCUMENT_TYPES, DOCUMENT_STATUS_CONFIG } from '../_lib/documents';
import type { useBusinessApplication } from '../_hooks/useBusinessApplication';
import type { useDocumentUpload } from '../_hooks/useDocumentUpload';

type Props = {
  f: ReturnType<typeof useBusinessApplication>;
  upload: ReturnType<typeof useDocumentUpload>;
};

/** Şirket sahipleri/ortakları + paydaş başına ön/arka kimlik yüklemesi. */
export function StakeholdersTab({ f, upload }: Props) {
  if (f.tab !== 'stakeholders') return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      {f.stakeholders.length === 0 ? (
        <EmptyState title="Paydaş yok" description="Şirket sahibi veya ortaklarını ekleyin." />
      ) : (
        f.stakeholders.map((s) => (
          <Card key={s.id} testID={`stakeholder-${s.id}`}>
            <Text variant="body" style={{ fontWeight: '600' }}>{s.fullName}</Text>
            <Text variant="caption" style={{ color: theme.colors.text.muted }}>
              {s.identityType === 'tckn' ? 'TC Kimlik' : 'Pasaport'}
              {s.identityNumber ? ` · ${s.identityNumber}` : ''}
            </Text>
            <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
              {IDENTITY_DOCUMENT_TYPES[s.identityType].map((d) => {
                const doc = f.documentFor(d.type, s.id);
                const busy = upload.uploadingType === d.type + s.id;
                return (
                  <Pressable
                    key={d.type}
                    testID={`stakeholder-doc-${s.id}-${d.type}`}
                    disabled={busy || !f.canUpload(doc)}
                    onPress={() => upload.pickAndUpload(d.type, s.id)}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: theme.spacing.sm,
                    }}
                  >
                    <Text variant="body">{d.label}</Text>
                    <Text
                      variant="caption"
                      style={{ color: doc ? DOCUMENT_STATUS_CONFIG[doc.status].color : theme.colors.text.muted }}
                    >
                      {busy ? 'Yükleniyor…' : doc ? DOCUMENT_STATUS_CONFIG[doc.status].label : 'Yükle'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ))
      )}

      <Card>
        <Text variant="h3">Paydaş ekle</Text>
        <Form>
          <FormInput testID="stakeholder-fullName" control={f.stakeholderForm.control} name="fullName" label="Ad soyad" editable={!f.isLocked} />
          <FormInput testID="stakeholder-identityNumber" control={f.stakeholderForm.control} name="identityNumber" label="TC Kimlik No" keyboardType="number-pad" editable={!f.isLocked} />
        </Form>
        <Button testID="stakeholder-add" onPress={f.addStakeholder} loading={f.isAddingStakeholder} disabled={f.isLocked}>
          Ekle
        </Button>
      </Card>
    </View>
  );
}
```

> `identityType` seçici için `@/ui`'da mevcut bir segmented/radio primitive'i varsa onu kullan; yoksa şimdilik `tckn` varsayılanıyla ilerle ve pasaport desteğini `@/ui`'a primitive eklendiğinde bağla — bunu commit mesajında bilinen açık olarak yaz.
>
> **Prop adı uyarlaması (tüm bölümler için):** `Card`, `Alert`, `Modal`, `EmptyState`,
> `Button`, `ScreenLoader`, `FormInput` prop adlarını (`variant`, `title`, `visible`,
> `onClose`, `helperText`, `editable`, `loading`, `disabled`) `src/ui` içindeki gerçek
> imzalarla doğrula ve mevcut ekranların kullandığı biçime uy. Eksik bir yetenek varsa
> **`@/ui`'ya ekle** — yerel kopya yazma (`CLAUDE.md` §1).

- [ ] **Step 5: `DocumentsTab`'ı ve `AppealModal`'ı yaz**

Create `app/settings/business-application/_modals/AppealModal.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Text, appAlert, theme } from '@/ui';
import { Form, FormInput, useZodForm } from '@/ui/form';
import { sellerDocumentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { appealSchema, type AppealForm } from '../_lib/schema';

type Props = { documentId: string | null; onClose: () => void };

/**
 * Belge kararına itiraz. Kendi form + mutation'ını sahiplenir.
 * ⚠️ appAlert modal AÇIKKEN çalışırsa iOS donuyor → modal mutation'dan ÖNCE kapanır.
 */
export function AppealModal({ documentId, onClose }: Props) {
  const queryClient = useQueryClient();
  const form = useZodForm(appealSchema);

  const mutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      sellerDocumentsApi.appeal(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.sellerDocuments.list });
      appAlert('İtiraz gönderildi', 'İtirazınız incelemeye alındı.');
    },
    onError: (e: unknown) => {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      appAlert('Hata', Array.isArray(raw) ? raw.join('\n') : raw || 'İtiraz gönderilemedi.');
    },
  });

  const onSubmit = form.handleSubmit((values: AppealForm) => {
    const id = documentId;
    if (!id) return;
    // Modal'ı mutation'dan ÖNCE kapat (iOS donma tuzağı).
    onClose();
    form.reset();
    mutation.mutate({ id, note: values.note });
  });

  return (
    <Modal visible={!!documentId} onClose={onClose} title="Karara itiraz et">
      <Text variant="caption" style={{ color: theme.colors.text.muted }}>
        Belgenin neden geçerli olduğunu kısaca açıklayın.
      </Text>
      <Form>
        <FormInput
          testID="appeal-note"
          control={form.control}
          name="note"
          label="İtiraz notu"
          multiline
          numberOfLines={4}
        />
      </Form>
      <Button testID="appeal-submit" onPress={onSubmit}>Gönder</Button>
    </Modal>
  );
}
```

Create `app/settings/business-application/_sections/DocumentsTab.tsx`:

```tsx
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text, Card, Button, theme } from '@/ui';
import { DOCUMENT_TYPES, DOCUMENT_STATUS_CONFIG, REUPLOADABLE_STATUSES } from '../_lib/documents';
import { AppealModal } from '../_modals/AppealModal';
import type { useBusinessApplication } from '../_hooks/useBusinessApplication';
import type { useDocumentUpload } from '../_hooks/useDocumentUpload';

type Props = {
  f: ReturnType<typeof useBusinessApplication>;
  upload: ReturnType<typeof useDocumentUpload>;
};

/** 7 belge türü; durum, sürüm, inceleme notu ve itiraz aksiyonu. */
export function DocumentsTab({ f, upload }: Props) {
  const [appealDocumentId, setAppealDocumentId] = useState<string | null>(null);
  if (f.tab !== 'documents') return null;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {DOCUMENT_TYPES.map((d) => {
        const doc = f.documentFor(d.type);
        const busy = upload.uploadingType === d.type;
        const status = doc ? DOCUMENT_STATUS_CONFIG[doc.status] : null;
        return (
          <Card key={d.type} testID={`doc-row-${d.type}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600' }}>{d.label}</Text>
                <Text variant="caption" style={{ color: status?.color ?? theme.colors.text.muted }}>
                  {busy
                    ? 'Yükleniyor…'
                    : status
                      ? `${status.label}${doc?.version ? ` · v${doc.version}` : ''}`
                      : 'Yüklenmedi'}
                </Text>
              </View>
              <Pressable
                testID={`doc-upload-${d.type}`}
                disabled={busy || !f.canUpload(doc)}
                onPress={() => upload.pickAndUpload(d.type)}
              >
                <Text variant="body" style={{ color: theme.colors.primary[600]!, fontWeight: '600' }}>
                  {doc ? 'Değiştir' : 'Yükle'}
                </Text>
              </Pressable>
            </View>

            {doc?.reviewNote ? (
              <Text variant="caption" style={{ color: theme.colors.danger[600]!, marginTop: theme.spacing.xs }}>
                {doc.reviewNote}
              </Text>
            ) : null}

            {doc && REUPLOADABLE_STATUSES.includes(doc.status) ? (
              <Pressable
                testID={`doc-appeal-${d.type}`}
                onPress={() => setAppealDocumentId(doc.id)}
                style={{ marginTop: theme.spacing.xs }}
              >
                <Text variant="caption" style={{ color: theme.colors.primary[600]! }}>
                  Karara itiraz et
                </Text>
              </Pressable>
            ) : null}
          </Card>
        );
      })}

      <Button
        testID="application-submit"
        onPress={f.submitApplication}
        loading={f.isSubmitting}
        disabled={f.isLocked}
      >
        Başvuruyu incelemeye gönder
      </Button>

      <AppealModal documentId={appealDocumentId} onClose={() => setAppealDocumentId(null)} />
    </View>
  );
}
```

- [ ] **Step 6: Ekranı yaz**

Create `app/settings/business-application/index.tsx`:

```tsx
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text, ScreenHeader, ScreenLoader, Alert, theme } from '@/ui';
import { useBusinessApplication, type BusinessApplicationTab } from './_hooks/useBusinessApplication';
import { useDocumentUpload } from './_hooks/useDocumentUpload';
import { DetailsTab } from './_sections/DetailsTab';
import { StakeholdersTab } from './_sections/StakeholdersTab';
import { DocumentsTab } from './_sections/DocumentsTab';

const TABS: { key: BusinessApplicationTab; label: string }[] = [
  { key: 'details', label: 'Detaylar' },
  { key: 'stakeholders', label: 'Paydaşlar' },
  { key: 'documents', label: 'Belgeler' },
];

/**
 * Kurumsal başvuru tamamlama — THIN ekran. Üç sekme; her sekme kendi
 * bölümünde self-gate eder. Veri/mutation `_hooks/useBusinessApplication`'da.
 */
export default function BusinessApplicationScreen() {
  const f = useBusinessApplication();
  const upload = useDocumentUpload();

  if (f.isLoading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader
        title="Kurumsal Başvuru"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings' as never))}
      />

      <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            testID={`tab-${t.key}`}
            onPress={() => f.setTab(t.key)}
            style={{
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.md,
              backgroundColor: f.tab === t.key ? theme.colors.primary[50]! : 'transparent',
            }}
          >
            <Text
              variant="body"
              style={{
                color: f.tab === t.key ? theme.colors.primary[600]! : theme.colors.text.muted,
                fontWeight: f.tab === t.key ? '600' : '400',
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {f.isMissing && (
          <Alert variant="warning" title="Başvuru bulunamadı">
            Kurumsal başvurunuz henüz oluşturulmamış. Kurumsal ön başvuruyu tamamladıktan
            sonra bu ekrandan devam edebilirsiniz.
          </Alert>
        )}
        <DetailsTab f={f} />
        <StakeholdersTab f={f} upload={upload} />
        <DocumentsTab f={f} upload={upload} />
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 7: Testi çalıştır, geçtiğini gör**

Run: `npx jest app/settings/business-application`
Expected: PASS (Task 9'un 6 testi + bu 5 test)

- [ ] **Step 8: Ekran satır sayısını ve tipleri doğrula**

Run: `wc -l app/settings/business-application/index.tsx && npx tsc --noEmit && npx eslint app/settings/business-application`
Expected: `index.tsx` < 150 satır; yeni tip/lint hatası yok

- [ ] **Step 9: Commit**

```bash
git add app/settings/business-application
git commit -m "feat(corporate): kurumsal başvuru ekranı (detaylar/paydaşlar/belgeler)

Üç sekmeli ince ekran: şirket-banka bilgileri, paydaşlar + ön/arka kimlik
yüklemesi, 7 belge türü + inceleme notu + itiraz modalı + incelemeye gönder.
under_review iken formlar kilitli, reddedilen belgeler yeniden yüklenebilir.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Kurumsal başvuruyu erişilebilir yap

Ekran menüden erişilemiyorsa yok sayılır. `BusinessMembershipGuard` kullanıcıyı `/business-pending`'e kilitliyor ve çıkış yolu yok — oradan da başvuruya bir bağlantı olmalı.

**Files:**
- Modify: `app/settings/index.tsx`
- Modify: `app/business-pending.tsx`
- Modify: `app/seller/register.tsx`
- Create: `app/settings/__tests__/business-application-link.test.tsx`

**Interfaces:**
- Consumes: Task 10'un `/settings/business-application` rotası
- Produces: menü ve durum ekranlarından giriş noktaları

- [ ] **Step 1: Failing testi yaz**

Create `app/settings/__tests__/business-application-link.test.tsx`:

```tsx
/**
 * Kurumsal başvuru ekranına erişim. Menüde giriş yoksa ekran "yok" sayılır;
 * ayrıca business-pending ekranında çıkış yolu bulunmalı.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

it('ayarlar menüsü kurumsal başvuru ekranına bağlanır', () => {
  expect(read('app/settings/index.tsx')).toContain('/settings/business-application');
});

it('business-pending ekranı başvuruya devam yolu sunar', () => {
  expect(read('app/business-pending.tsx')).toContain('/settings/business-application');
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/settings/__tests__/business-application-link.test.tsx`
Expected: FAIL — rota dizesi bulunamıyor

- [ ] **Step 3: Ayarlar menüsüne girişi ekle**

`app/settings/index.tsx` içinde, mevcut menü satırı desenini (aynı bileşen/prop adları) izleyerek işletme bölümüne bir satır ekle:

- Etiket: `Kurumsal Başvuru`
- Açıklama/alt metin: `Belgeler, paydaşlar ve başvuru durumu`
- Hedef: `/settings/business-application`
- İkon: mevcut satırların kullandığı `Ionicons` setinden `document-text-outline`

- [ ] **Step 4: `business-pending` ekranına çıkış yolu ekle**

`app/business-pending.tsx` içindeki mevcut aksiyon alanına bir buton ekle:

- Etiket: `Başvurumu tamamla`
- Aksiyon: `router.push('/settings/business-application')`

Ekranda hâlihazırda **çıkış yap** ve **destek** aksiyonları yoksa onları da ekle (`docs/mobile-parity/01` §10 üç durum ekranı için ikisini de şart koşuyor).

- [ ] **Step 5: `seller/register` bilgilendirmesini bağla**

`app/seller/register.tsx` sadece bilgilendirme yapıyor; "devam et" aksiyonunu `/settings/business-application`'a yönlendir.

- [ ] **Step 6: Testi çalıştır, geçtiğini gör**

Run: `npx jest app/settings/__tests__/business-application-link.test.tsx`
Expected: PASS (2 test)

- [ ] **Step 7: Dokunulan ekranların testlerini çalıştır**

Run: `npx jest app/settings app/__tests__ && npx tsc --noEmit`
Expected: PASS, yeni tip hatası yok

- [ ] **Step 8: Commit**

```bash
git add app/settings app/business-pending.tsx app/seller/register.tsx
git commit -m "feat(corporate): kurumsal başvuruya menü ve durum ekranı girişleri

Ayarlar menüsü, business-pending (kullanıcı buraya kilitleniyordu, çıkış yolu
yoktu) ve seller/register bilgilendirmesi artık /settings/business-application
ekranına bağlıyor.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Plan 1 bütünsel doğrulama

**Files:**
- Modify: `docs/superpowers/specs/2026-07-30-mobil-web-islev-paritesi-design.md` (bilinen açıklar bölümü)

**Interfaces:**
- Consumes: Task 1–11
- Produces: teslim raporu

- [ ] **Step 1: Tüm test paketini çalıştır**

Run: `npx jest`
Expected: tüm testler yeşil. Kırmızı varsa **düzelt**, atlama.

- [ ] **Step 2: Tip kontrolü**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: bu planın dokunduğu dosyalarda **yeni** hata yok (tracked baseline dışına çıkma)

- [ ] **Step 3: Lint**

Run: `npx eslint app src --ext .ts,.tsx 2>&1 | tail -20`
Expected: yeni ihlal yok (özellikle hardcoded hex/rgba ve `src/theme/colors` importu)

- [ ] **Step 4: Kaldırılmış uçların kalmadığını doğrula**

Run: `grep -rn "process-direct\|products/my-listings\|tarodan\.shop" src app eas.json .env`
Expected: **hiç sonuç yok**

- [ ] **Step 5: P0 kapsamını doğrula**

Run:
```bash
grep -rn "requires2FA" "app/(auth)/login" | head -3
grep -n "associatedDomains" app.json
grep -rn "corporate-invitation" src/lib/api/auth.ts | head -2
grep -rn "seller-documents/application" src/lib/api/user.ts | head -3
grep -rn "direct-form" src/lib/api/checkout.ts
```
Expected: her biri sonuç döner (beş P0 maddesi bağlandı)

- [ ] **Step 6: Spec'in bilinen açıklar bölümünü güncelle**

`docs/superpowers/specs/2026-07-30-mobil-web-islev-paritesi-design.md` §12'ye ekle:

```markdown
- **Plan 1 tamamlandı (P0).** Kalan ops önkoşulu: `tarodan.com.tr` ve
  `staging.tarodan.com.tr` üzerinde `.well-known/apple-app-site-association` +
  `assetlinks.json` yayını — yapılmadan universal link çalışmaz.
- Paydaş kimlik türü seçicisi (`tckn` / `passport`) `@/ui`'da segmented primitive
  eklenene kadar `tckn` varsayılanıyla çalışır.
```

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs
git commit -m "docs(spec): Plan 1 (P0) tamamlandı, kalan ops önkoşulları

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 8: Elle doğrulama raporunu hazırla**

Kullanıcıya teslim ederken şunları **açıkça** yaz:

1. **Staging'de test edilmesi gerekenler:** kart ödemesi uçtan uca (3DS WebView + dönüş), 2FA girişi (gerçek TOTP), kurumsal davet bağlantısı, belge yükleme (PDF).
2. **Ops önkoşulu:** AASA + assetlinks yayını yapılmadan universal link çalışmaz; custom scheme (`tarodan://`) çalışır.
3. **Production API henüz yok** — `eas.json` production profili hedef adrese ayarlandı, master CI deploy'u sonrası doğrulanmalı.
4. **Ürün kararı bekleyen sabitler:** `src/constants/legalFacts.ts` içindeki `@tarodan.com` e-postaları ve `SECRETS_SETUP.md`'deki `api.tarodan.com` — `.com` mı `.com.tr` mi?

---

## Kendi Kendine Gözden Geçirme Notları

**Spec kapsamı (§3, §4.1–4.5) → task eşlemesi:** §3 Faz 0 → Task 1 · §4.1 ödeme → Task 2+3 · §4.2 2FA → Task 4 · §4.3 derin bağlantı → Task 5+6 · §4.4 kurumsal davet → Task 7 · §4.5 kurumsal başvuru → Task 8+9+10, erişilebilirlik Task 11 · doğrulama (§8) → Task 12 ve her task'ın son adımları.

**Tip tutarlılığı:** `DirectFormResponse` Task 2'de tanımlanır, Task 3'te `checkout.ts` ve `CardPaymentForm` tarafından tüketilir. `SellerDocument` / `CorporateApplication` Task 8'de tanımlanır, Task 9–10'da kullanılır. `qk.sellerDocuments.list` / `.application` Task 8'de eklenir, Task 9–10'da aynı adla okunur. `qk.auth.corporateInvitation` Task 7'de eklenir ve yalnız orada kullanılır. `useBusinessApplication`'ın döndürdüğü `documentFor` / `canUpload` / `tab` / `setTab` adları Task 9'da tanımlanıp Task 10'un üç bölümünde aynı adla tüketilir.

**Kapsam dışı bırakılanlar (bilinçli):** P1 ve P2 maddeleri Plan 2 ve 3'e, layout denetimi Plan 4'e ait.
