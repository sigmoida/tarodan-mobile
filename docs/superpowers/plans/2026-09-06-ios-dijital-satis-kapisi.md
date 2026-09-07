# iOS Dijital Satış Kapısı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iOS uygulamasından üyelik aboneliği ve ilan boost satın alma yüzeylerini ve bunlara giden tüm çağrıları kaldırmak; fiziksel ticarete hiç dokunmamak.

**Architecture:** Tek bir `CAN_BUY_DIGITAL` sabiti (`Platform.OS !== 'ios'`) tüm kararı taşır. Render edilen upsell'ler `<UpgradeCta>` sarmalayıcısıyla, `appAlert` tabanlı olanlar `limitAlert()` yardımcısıyla tek satırda kapanır. Üstüne emniyet kilidi: satın alma rotaları iOS'ta baştan reddeder, böylece gözden kaçan bir çağrı ödemeye ulaşamaz.

**Tech Stack:** React Native (Expo SDK 54), expo-router, TypeScript, jest + @testing-library/react-native, i18next (ICU tek süslü interpolasyon).

**Spec:** `docs/superpowers/specs/2026-09-06-ios-dijital-satis-kapisi-design.md`

## Global Constraints

- **Kapı yalnız iOS.** `Platform.OS !== 'ios'` → Android ve web bugünkü davranışı **birebir** korur. Hiçbir görsel/işlevsel değişiklik Android'e sızmamalı.
- **Fiziksel ticarete dokunma.** `payments/initiate`, `payments/direct-form`, `payments/initiate-trade-cash`, sepet/sipariş/takas checkout'u, kargo/komisyon, adresler ve **kayıtlı kartlar** (`membershipApi.listCards/deleteCard` — `CardPaymentForm` de kullanıyor) kapsam DIŞI. Apple `3.1.3(e)` bunların IAP dışında kalmasını zorunlu kılıyor.
- **Metin çizgisi.** iOS'ta ücretli bir kademeyi işaret eden hiçbir ifade olamaz: paket adı (kullanıcının KENDİ paketi hariç), fiyat, "yükseltin", "geçin", "Premium'da var". Yalnız hesabın mevcut durumuna dair olgu yazılabilir.
- **Yeni i18n metinleri:** `membership.featureUnavailableOnAccount` = "Bu özellik hesabınızda kullanılamıyor." / "This feature isn't available on your account."; `listing.limitReachedInfo` = "{count} ilan hakkının tamamını kullandın. Yeni ilan eklemek için mevcut ilanlarından birini kaldırabilirsin." / "You've used all {count} of your listing slots. Remove one of your existing listings to add a new one."
- **Mevcut anahtarlar silinmez** (`address.goPremium`, `membership.upgradeToPremium`, `membership.freePlanPromo`, `collection.becomePremiumCta`) — Android ve web kullanıyor.
- **Katalog interpolasyonu tek süslü** (`{count}`), çift değil. Değişiklikten sonra `pnpm i18n:codegen`.
- **⚠️ `jest-expo` testlerde `Platform.OS`'u varsayılan olarak `ios` yapıyor.** (Doğrulandı: geçici bir testte `PLATFORM_OS = ios`.) Yani kapı iner inmez **tüm mevcut süit "satış kapalı" modunda koşar**. Upsell davranışını doğrulayan mevcut testler Android/web davranışını test ediyor; bu yüzden onlara `Platform.OS = 'android'` sabitlenir — silinmez, iOS tarafını yeni regresyon süiti (Task 9) doğrular. Hangi testin hangi görevde kırılacağı ilgili görevde adıyla yazılı.
- **Her görev sonunda:** `npx tsc --noEmit` temiz, `pnpm test` yeşil (taban: 216 süit / 1713 test).

---

### Task 1: Kapı sabiti ve `limitAlert()` yardımcısı

**Files:**
- Create: `src/lib/purchases.ts`
- Test: `src/lib/__tests__/purchases.test.ts`

**Interfaces:**
- Consumes: `appAlert` (`@/ui`), `Platform` (react-native)
- Produces:
  - `CAN_BUY_DIGITAL: boolean`
  - `limitAlert(opts: { title: string; message: string; cancelLabel: string; upgradeLabel: string; onUpgrade: () => void }): void`

- [ ] **Step 1: Write the failing test**

```ts
/**
 * iOS'ta uygulama içi dijital satış Apple IAP'siz yapılamaz (App Store
 * Guideline 3.1.1 / 3.1.3(g)). Kapı TEK bir sabitte durur; ekranlar doğrudan
 * `Platform`'a bakmaz. Bu test hem sabiti hem de `limitAlert`'in yükseltme
 * düğmesini iOS'ta EKLEMEDİĞİNİ sabitler.
 */
import { Platform } from 'react-native';

jest.mock('@/ui', () => ({ appAlert: jest.fn() }));
import { appAlert } from '@/ui';

const mockAlert = appAlert as unknown as jest.Mock;

const loadModule = () => {
  let mod: typeof import('../purchases');
  jest.isolateModules(() => {
    mod = require('../purchases');
  });
  return mod!;
};

const opts = {
  title: 'Limit',
  message: 'Doldu',
  cancelLabel: 'İptal',
  upgradeLabel: 'Premium',
  onUpgrade: jest.fn(),
};

beforeEach(() => {
  mockAlert.mockReset();
});

describe('CAN_BUY_DIGITAL', () => {
  it('iOS ise kapalı', () => {
    Platform.OS = 'ios';
    expect(loadModule().CAN_BUY_DIGITAL).toBe(false);
  });

  it('Android ise açık', () => {
    Platform.OS = 'android';
    expect(loadModule().CAN_BUY_DIGITAL).toBe(true);
  });
});

describe('limitAlert', () => {
  it('iOS: yalnız bilgi, yükseltme düğmesi YOK', () => {
    Platform.OS = 'ios';
    loadModule().limitAlert(opts);
    const buttons = mockAlert.mock.calls[0][2];
    expect(buttons).toHaveLength(1);
    expect(buttons[0].text).toBe('İptal');
    expect(JSON.stringify(buttons)).not.toContain('Premium');
  });

  it('Android: yükseltme düğmesi var ve çalışıyor', () => {
    Platform.OS = 'android';
    loadModule().limitAlert(opts);
    const buttons = mockAlert.mock.calls[0][2];
    expect(buttons).toHaveLength(2);
    expect(buttons[1].text).toBe('Premium');
    buttons[1].onPress();
    expect(opts.onUpgrade).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/__tests__/purchases.test.ts`
Expected: FAIL — `Cannot find module '../purchases'`

- [ ] **Step 3: Write minimal implementation**

```ts
import { Platform } from 'react-native';
import { appAlert } from '@/ui';

/**
 * Uygulama içi DİJİTAL satın alma bu platformda mümkün mü?
 *
 * iOS'ta değil: Apple, uygulama içinde özellik açan abonelikleri ve aynı
 * uygulamada gösterilen tanıtımı (boost) yalnız kendi in-app purchase
 * sistemiyle satmaya izin veriyor (App Store Review Guideline 3.1.1 ve
 * 3.1.3(g)); web'e yönlendirmek de 3.1.3 anti-steering kapsamında yasak.
 * Uygulamada IAP entegrasyonu YOK, bu yüzden iOS'ta satış ve satışa çağıran
 * her yüzey kapalı.
 *
 * FİZİKSEL ticaret bunun DIŞINDA: 3.1.3(e) fiziksel malın IAP ile satılmasını
 * yasaklıyor, yani sipariş/sepet/takas ödemesi PayTR'de kalmak ZORUNDA.
 *
 * Ekranlar `Platform`'a doğrudan bakmaz; kural buradan okunur. Android'i de
 * kapatmak ya da sunucu bayrağına taşımak gerekirse tek değişiklik burada.
 */
export const CAN_BUY_DIGITAL = Platform.OS !== 'ios';

/**
 * Limit uyarısı. Yükseltme düğmesi yalnız satın almanın mümkün olduğu
 * platformlarda eklenir; iOS'ta uyarı yalnız durumu anlatır.
 */
export function limitAlert(opts: {
  title: string;
  message: string;
  cancelLabel: string;
  upgradeLabel: string;
  onUpgrade: () => void;
}): void {
  const buttons: Array<{ text: string; style?: 'cancel'; onPress?: () => void }> = [
    { text: opts.cancelLabel, style: 'cancel' },
  ];
  if (CAN_BUY_DIGITAL) {
    buttons.push({ text: opts.upgradeLabel, onPress: opts.onUpgrade });
  }
  appAlert(opts.title, opts.message, buttons);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/lib/__tests__/purchases.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/purchases.ts src/lib/__tests__/purchases.test.ts
git commit -m "feat(mobile): iOS dijital satış kapısı için tek kaynak"
```

---

### Task 2: `<UpgradeCta>` sarmalayıcısı

Sarmalayıcı seçildi, yeniden yazım değil: her çağrı yeri kendi stilini (`styles.upgradeLink` gibi route-local sheet'ler) koruyor, Android'de render birebir aynı kalıyor ve migrasyon "iki satır ekle" işine iniyor.

**Files:**
- Create: `src/components/UpgradeCta.tsx`
- Test: `src/components/__tests__/UpgradeCta.test.tsx`

**Interfaces:**
- Consumes: `CAN_BUY_DIGITAL` (Task 1)
- Produces: `export default function UpgradeCta({ children }: { children: React.ReactNode }): React.ReactElement | null`

- [ ] **Step 1: Write the failing test**

```tsx
/**
 * Yükseltme çağrıları iOS'ta hiç render edilmemeli (Guideline 2.1(b):
 * "references to subscriptions"). Sarmalayıcı, çağrı yerlerinin stilini
 * değiştirmeden onları tek noktadan gizler.
 */
import React from 'react';
import { Text } from 'react-native';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';

const renderCta = () => {
  let UpgradeCta: any;
  jest.isolateModules(() => {
    UpgradeCta = require('../UpgradeCta').default;
  });
  render(
    <UpgradeCta>
      <Text>Premium'a Geç</Text>
    </UpgradeCta>,
  );
};

it('iOS: hiçbir şey render etmez', () => {
  Platform.OS = 'ios';
  renderCta();
  expect(screen.queryByText("Premium'a Geç")).toBeNull();
});

it('Android: çocukları aynen render eder', () => {
  Platform.OS = 'android';
  renderCta();
  expect(screen.getByText("Premium'a Geç")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/__tests__/UpgradeCta.test.tsx`
Expected: FAIL — `Cannot find module '../UpgradeCta'`

- [ ] **Step 3: Write minimal implementation**

```tsx
import React from 'react';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

/**
 * Yükseltmeye çağıran her yüzeyi tek noktadan gizler.
 *
 * SARMALAYICI olması bilinçli: çağrı yerleri kendi stillerini ve metinlerini
 * korur, Android'de render birebir aynı kalır. Yeniden yazsaydık 12 ayrı
 * stil dosyasını taşımamız gerekirdi — regresyon yüzeyi büyürdü.
 */
export default function UpgradeCta({ children }: { children: React.ReactNode }) {
  if (!CAN_BUY_DIGITAL) return null;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/__tests__/UpgradeCta.test.tsx`
Expected: PASS (2 test)

- [ ] **Step 5: Commit**

```bash
git add src/components/UpgradeCta.tsx src/components/__tests__/UpgradeCta.test.tsx
git commit -m "feat(mobile): yükseltme çağrılarını tek noktadan gizleyen sarmalayıcı"
```

---

### Task 3: Emniyet kilidi — satın alma rotaları

Bir çağrı gözden kaçsa bile ödemeye ulaşılamamalı. **Kritik:** `payment/[id]` ekranı SİLİNMEZ; yalnız `type=membership` reddedilir, fiziksel ödeme aynı ekrandan geçmeye devam eder.

**Files:**
- Modify: `app/membership/checkout/index.tsx:14-18`
- Modify: `src/components/product/BoostModal.tsx` (bileşenin ilk satırları)
- Modify: `app/payment/[id].tsx:55` civarı (`isMembership` tanımının hemen ardı)
- Modify: `app/settings/my-listings/_components/MyListingsModals.tsx:38-42` ("Öne çıkar" menü satırı)
- Test: `app/__tests__/ios-purchase-locks.test.tsx`

**Interfaces:**
- Consumes: `CAN_BUY_DIGITAL` (Task 1)
- Produces: yok (davranış değişikliği)

- [ ] **Step 1: Write the failing test**

```tsx
/**
 * Emniyet kilidi: bir upsell çağrısı gözden kaçsa bile iOS'ta satın alma
 * ekranlarına ULAŞILAMAZ. Aynı test fiziksel ödemenin AÇIK kaldığını da
 * doğrular — 3.1.3(e) gereği o yolun IAP dışında çalışması ZORUNLU.
 */
import React from 'react';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>REDIRECT:{href}</Text>;
  },
  useLocalSearchParams: () => require('./__params').current,
}));

it('iOS: üyelik checkout ekranı /membership e yönlendirir', () => {
  Platform.OS = 'ios';
  let Screen: any;
  jest.isolateModules(() => {
    Screen = require('../membership/checkout/index').default;
  });
  render(<Screen />);
  expect(screen.getByText('REDIRECT:/membership')).toBeTruthy();
});

it('iOS: BoostModal görünür=true olsa bile render etmez', () => {
  Platform.OS = 'ios';
  let BoostModal: any;
  jest.isolateModules(() => {
    BoostModal = require('@/components/product/BoostModal').BoostModal;
  });
  const { toJSON } = render(
    <BoostModal visible onDismiss={() => {}} listingId="p1" listingTitle="X" boostedUntil={null} />,
  );
  expect(toJSON()).toBeNull();
});
```

> **Not:** `app/payment/[id].tsx`'in `type=membership` reddi ile fiziksel yolun
> açık kalması, ekranın ağır bağımlılıkları nedeniyle burada değil **Task 9'un
> regresyon süitinde** doğrulanır (orada mevcut `app/payment/__tests__/webview.test.tsx`
> altyapısı hazır). Bu adımda yalnız iki kilit test edilir.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- app/__tests__/ios-purchase-locks.test.tsx`
Expected: FAIL — checkout ekranı `Redirect` render etmiyor; `BoostModal` null dönmüyor

- [ ] **Step 3: Write minimal implementation**

`app/membership/checkout/index.tsx` — mevcut `if (!f.isAuthenticated) return null;` satırının ÜSTÜNE:

```tsx
import { Redirect } from 'expo-router';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

// ...
export default function MembershipCheckoutScreen() {
  const f = useMembershipCheckout();

  // Emniyet kilidi: iOS'ta uygulama içi dijital satış yok (Guideline 3.1.1).
  // Bir upsell çağrısı gözden kaçarsa bile ödeme akışı açılmasın.
  if (!CAN_BUY_DIGITAL) return <Redirect href="/membership" />;

  if (!f.isAuthenticated) return null;
```

`src/components/product/BoostModal.tsx` — bileşen gövdesinin ilk satırı:

```tsx
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

// bileşenin içinde, hook'lardan ÖNCE erken çıkış YOK — hook sırası bozulmasın.
// Bunun yerine render sonunda:
if (!CAN_BUY_DIGITAL) return null;
```

> Hook sırası kuralı (CLAUDE.md §12): erken `return null` tüm hook çağrılarından
> SONRA gelmeli. `BoostModal`'daki mevcut hook'ların altına, JSX döndürülmeden
> hemen önce yerleştirin.

`app/payment/[id].tsx` — `const isMembership = params.type === 'membership';` satırının ardına.
**Dikkat:** `Redirect`'i `expo-router`'dan import edeceğiniz için
`app/payment/__tests__/webview.test.tsx`'teki `expo-router` mock'una da
`Redirect` eklenmeli, yoksa o süit `undefined` bileşen render eder:

```tsx
// iOS'ta üyelik ödemesi kabul edilmez (Guideline 3.1.1). Fiziksel sipariş,
// sepet ve takas ödemesi bu ekrandan geçmeye DEVAM eder — 3.1.3(e) gereği
// onların IAP dışında kalması zorunlu.
if (isMembership && !CAN_BUY_DIGITAL) return <Redirect href="/membership" />;
```

> Bu satır da diğer hook'lardan sonra gelmeli. Dosyadaki mevcut erken çıkışların
> yanına koyun.

`app/settings/my-listings/_components/MyListingsModals.tsx` — "Öne çıkar" satırını sarın:

```tsx
<UpgradeCta>
  <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('boost', menu)}>
    <Ionicons name="rocket" size={20} color={colors.warning[700]!} />
    <Text style={[styles.menuItemText, { color: colors.warning[700]! }]}>{t('listing.boostAction')}</Text>
  </Pressable>
</UpgradeCta>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- app/__tests__/ios-purchase-locks.test.tsx && npx tsc --noEmit`
Expected: PASS, tsc temiz

- [ ] **Step 5: Commit**

```bash
git add app/membership/checkout/index.tsx src/components/product/BoostModal.tsx app/payment/\[id\].tsx app/settings/my-listings/_components/MyListingsModals.tsx app/__tests__/ios-purchase-locks.test.tsx
git commit -m "feat(mobile): iOS'ta satın alma rotalarına emniyet kilidi"
```

---

### Task 4: i18n — nötr metinler

**Files:**
- Modify: `src/i18n/lib/catalog/tr.json`
- Modify: `src/i18n/lib/catalog/en.json`
- Generated: `src/i18n/lib/generated/keys.ts` (`pnpm i18n:codegen`)

**Interfaces:**
- Produces: `membership.featureUnavailableOnAccount`, `listing.limitReachedInfo`

- [ ] **Step 1: Anahtarları ekle**

`tr.json` → `membership` nesnesine:
```json
"featureUnavailableOnAccount": "Bu özellik hesabınızda kullanılamıyor."
```
`tr.json` → `listing` nesnesine:
```json
"limitReachedInfo": "{count} ilan hakkının tamamını kullandın. Yeni ilan eklemek için mevcut ilanlarından birini kaldırabilirsin."
```
`en.json` → `membership`:
```json
"featureUnavailableOnAccount": "This feature isn't available on your account."
```
`en.json` → `listing`:
```json
"limitReachedInfo": "You've used all {count} of your listing slots. Remove one of your existing listings to add a new one."
```

> **Dikkat:** katalog **tek süslü** ICU interpolasyonu kullanıyor (`{count}`),
> i18next'in `{{count}}` biçimi DEĞİL. Ayrıca dosyada literal `{{...}}` içeren
> admin e-posta şablonu metinleri var — toplu regex ile dokunmayın.

- [ ] **Step 2: Anahtarları üret ve pariteyi doğrula**

Run:
```bash
pnpm i18n:codegen
node -e "
const tr=require('./src/i18n/lib/catalog/tr.json'), en=require('./src/i18n/lib/catalog/en.json');
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?flat(v,p+k+'.'):[p+k]);
const a=new Set(flat(tr)), b=new Set(flat(en));
const only=(x,y)=>[...x].filter(k=>!y.has(k));
console.log('tr-only:',only(a,b),'en-only:',only(b,a));
"
```
Expected: `tr-only: [] en-only: []` ve `keys.ts` yeni iki anahtarı içeriyor

- [ ] **Step 3: Commit**

```bash
git add src/i18n/lib/catalog/tr.json src/i18n/lib/catalog/en.json src/i18n/lib/generated/keys.ts
git commit -m "i18n: iOS kapısı için nötr durum metinleri"
```

---

### Task 5: Alert tabanlı çağrılar → `limitAlert()`

**Files:**
- Modify: `app/settings/addresses/_hooks/useAddresses.ts:163-171`
- Modify: `app/settings/my-listings/_hooks/useMyListings.ts:212-220`
- Modify: `app/settings/collections.tsx:70-79`
- Modify: `app/(auth)/login/_hooks/useLogin.ts:87-95`
- Test: `app/settings/__tests__/ios-limit-alerts.test.ts`

**Interfaces:**
- Consumes: `limitAlert`, `CAN_BUY_DIGITAL` (Task 1); `listing.limitReachedInfo` (Task 4)

- [ ] **Step 1: Write the failing test**

```ts
/**
 * Limit uyarıları iOS'ta yükseltmeye çağırmamalı. Adres limiti temsilî
 * seçildi: dördü de aynı `limitAlert` yardımcısından geçiyor.
 */
import { Platform } from 'react-native';

jest.mock('@/ui', () => ({ appAlert: jest.fn() }));
import { appAlert } from '@/ui';
const mockAlert = appAlert as unknown as jest.Mock;

it('iOS: adres limiti uyarısında yükseltme düğmesi yok', () => {
  Platform.OS = 'ios';
  let limitAlert: any;
  jest.isolateModules(() => {
    limitAlert = require('@/lib/purchases').limitAlert;
  });
  limitAlert({
    title: 'Adres limiti',
    message: 'En fazla 10 adres',
    cancelLabel: 'İptal',
    upgradeLabel: 'Premium ol',
    onUpgrade: jest.fn(),
  });
  expect(mockAlert.mock.calls[0][2]).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- app/settings/__tests__/ios-limit-alerts.test.ts`
Expected: PASS (Task 1 zaten uyguladı) — bu adım migrasyonun regresyon ağı, kırmızı beklenmiyor. Kırmızıysa Task 1 eksik.

- [ ] **Step 3: Çağrı yerlerini taşı**

`app/settings/addresses/_hooks/useAddresses.ts`:
```ts
import { limitAlert } from '@/lib/purchases';
// ...
    if (addresses.length >= maxAddresses) {
      limitAlert({
        title: t("address.limitTitle"),
        message: t("address.limitBody", { max: maxAddresses }),
        cancelLabel: t("common.cancel"),
        upgradeLabel: t("address.goPremium"),
        onUpgrade: () => router.push("/upgrade"),
      });
      return;
    }
```

`app/settings/my-listings/_hooks/useMyListings.ts` (`relist` dalı):
```ts
import { limitAlert } from '@/lib/purchases';
// ...
        if (quotaSummary?.canCreate === false) {
          limitAlert({
            title: t("listing.limitTitle"),
            message: t("listing.limitBody"),
            cancelLabel: t("common.cancel"),
            upgradeLabel: t("address.goPremium"),
            onUpgrade: () => router.push("/upgrade"),
          });
          return;
        }
```

`app/settings/collections.tsx` — snackbar + gecikmeli yönlendirme:
```ts
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
// ...
  const handleCreateCollection = () => {
    if (!canCreateCollections) {
      setSnackbar({
        visible: true,
        message: CAN_BUY_DIGITAL
          ? t("collection.premiumRequiredMsg")
          : t("membership.featureUnavailableOnAccount"),
      });
      // iOS'ta yükseltme ekranına yönlendirme yok (Guideline 3.1.3).
      if (CAN_BUY_DIGITAL) setTimeout(() => router.push("/upgrade"), 1500);
      return;
    }
    router.push("/collections/new");
  };
```

`app/(auth)/login/_hooks/useLogin.ts` — kurumsal yükseltme uyarısı:
```ts
import { limitAlert } from '@/lib/purchases';
// ...
        if (hasBusinessInfo && !isBusinessTier) {
          limitAlert({
            title: t('auth.corporateUpgradeTitle'),
            message: t('auth.corporateUpgradeBody'),
            cancelLabel: t('auth.corporateUpgradeLater'),
            upgradeLabel: t('auth.corporateUpgradeGo'),
            onUpgrade: () => router.replace('/membership' as never),
          });
          return;
        }
```

> **Davranış farkı — bilinçli:** eski kodda "Daha sonra" düğmesi
> `router.replace('/')` çağırıyordu. `limitAlert` iptal düğmesine `onPress`
> vermiyor. Girişten sonra kullanıcının ana sayfaya düşmesi zaten akışın
> doğal sonucu; ama davranışı korumak isterseniz `limitAlert`'e opsiyonel
> `onCancel?: () => void` ekleyin ve Task 1 testine bir vaka daha yazın.
> **Bu kararı uygulayan alır ve commit mesajında belirtir.**

- [ ] **Step 4: Testleri koştur ve düşen olursa Android'e sabitle**

Run: `pnpm test -- app/settings app/\(auth\) && npx tsc --noEmit`
Expected: PASS, tsc temiz.

Kırılan olursa: test upsell davranışını (yani Android/web tarafını) doğruluyor
demektir. Testin başına `Platform.OS = 'android'` ekleyin — **silmeyin**.
`app/settings/__tests__/addresses.test.tsx` `appAlert`'i mock'luyor ama düğme
sayısına bakmıyor; büyük olasılıkla etkilenmez.

- [ ] **Step 5: Commit**

```bash
git add app/settings/addresses/_hooks/useAddresses.ts app/settings/my-listings/_hooks/useMyListings.ts app/settings/collections.tsx app/\(auth\)/login/_hooks/useLogin.ts app/settings/__tests__/ios-limit-alerts.test.ts
git commit -m "refactor(mobile): limit uyarılarını tek yardımcıya topla"
```

---

### Task 6: Render edilen çağrılar → `<UpgradeCta>`

Her biri **saf sarma** işlemi: mevcut JSX'e dokunulmaz, etrafına `<UpgradeCta>` konur. Android'de render birebir aynı kalır.

**Files (11 dosya):**
- Modify: `app/(tabs)/messages/index.tsx:77-79`
- Modify: `app/messages/new/_components/NewMessageBody.tsx:108-110`
- Modify: `app/settings/saved-searches/index.tsx:69-71`
- Modify: `app/settings/my-listings/_components/MyListingsSections.tsx:38-40`
- Modify: `app/settings/analytics/_components/AnalyticsContent.tsx:174`
- Modify: `app/settings/collections.tsx:114-122` (premium notice kartı)
- Modify: `app/settings/subscription/_components/SubscriptionBody.tsx:73-87`
- Modify: `app/settings/edit-profile/_components/EditProfileSections.tsx:43-49`
- Modify: `app/collections/_components/CollectionsInfoCard.tsx:21-28`
- Modify: `app/collections/[id]/_components/CollectionDetailBody.tsx:220-227`
- Modify: `app/seller/register.tsx:69-77`
- Modify: `app/membership/manage/_components/ManageSections.tsx:131-137` ve `152-159`

**Interfaces:**
- Consumes: `UpgradeCta` (Task 2)

- [ ] **Step 1: Her dosyada sar**

Örnek — `app/(tabs)/messages/index.tsx`:
```tsx
import UpgradeCta from '@/components/UpgradeCta';
// ...
          {f.dailyMessageCount >= f.messageLimit && (
            <UpgradeCta>
              <TouchableOpacity onPress={() => router.push("/upgrade")}>
                <Text style={styles.upgradeLink}>{t("address.goPremium")}</Text>
              </TouchableOpacity>
            </UpgradeCta>
          )}
```

Aynı desen diğer on dosyada. Üç özel durum:

**a) `EditProfileSections.tsx`** — çağrı bir prop (`onUpgrade`), JSX değil. Kartın tamamını sarmak profil rozetini de gizler; onun yerine prop'u koşullayın:
```tsx
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
// ...
        <MembershipBadgeCard
          membershipTier={f.user?.membershipTier || "free"}
          isVerified={f.user?.isVerified}
          onUpgrade={CAN_BUY_DIGITAL ? () => router.push("/upgrade") : undefined}
        />
```
> `MembershipBadgeCard`'ın `onUpgrade` opsiyonel değilse opsiyonele çevirin ve
> tanımsızken yükseltme düğmesini render etmemesini sağlayın.

**b) `SubscriptionBody.tsx`** — `!isPremium` bloğunun TAMAMI (Divider + promo metni + düğme) sarılır:
```tsx
        <UpgradeCta>
          {!isPremium && (
            <>
              <Divider style={styles.divider} />
              <Text variant="body" style={styles.upgradePrompt}>{t('membership.freePlanPromo')}</Text>
              <Button variant="primary" title={t('membership.upgradeToPremium')} icon="diamond"
                onPress={() => router.push('/upgrade')} style={styles.upgradeButton} />
            </>
          )}
        </UpgradeCta>
```

**c) `ManageSections.tsx`** — iki düğme ayrı ayrı sarılır: `membership.changePlan` (paket değiştir) ve `membership.manageUpgradeButton`. **İptal düğmesi SARILMAZ** — iptal satın alma değil, iOS'ta kalmalı.

- [ ] **Step 2: Kaçak kalmadığını doğrula**

Run:
```bash
grep -rn "'/upgrade'\|\"/upgrade\"" app --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v "app/upgrade.tsx"
```
Expected: çıkan her satır ya `<UpgradeCta>` içinde ya `limitAlert`/`CAN_BUY_DIGITAL` koşulunda. Serbest kalan yoksa tamam.

- [ ] **Step 3: Kırılan mevcut testleri Android'e sabitle**

Bu görev iki mevcut testi kırar (ikisi de Android/web davranışını doğruluyor):

- `app/(tabs)/__tests__/messages.test.tsx:145` — `address.goPremium` düğmesine basıyor
- `app/settings/__tests__/subscription.test.tsx:80, 98, 121` — `membership.upgradeToPremium` bekliyor

İkisinin de en üstüne (import'lardan sonra) ekleyin:

```ts
import { Platform } from 'react-native';
// Bu süit Android/web davranışını doğruluyor: yükseltme çağrıları orada duruyor.
// jest-expo varsayılanı `ios` olduğu için açıkça sabitliyoruz; iOS tarafını
// app/__tests__/ios-no-digital-sales.test.tsx doğrular.
beforeAll(() => { Platform.OS = 'android'; });
```

- [ ] **Step 4: Testleri koştur**

Run: `pnpm test && npx tsc --noEmit`
Expected: mevcut süit yeşil (216 süit), tsc temiz

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(mobile): yükseltme çağrılarını iOS'ta gizle"
```

---

### Task 7: Üyelik ekranı — yalnız mevcut paket

**Files:**
- Modify: `app/membership/index.tsx:46-51`
- Modify: `app/membership/_components/MembershipSections.tsx:36-58` (bekleyen ödeme bandı)
- Test: `app/membership/__tests__/ios-membership-screen.test.tsx`

**Interfaces:**
- Consumes: `CAN_BUY_DIGITAL` (Task 1)

- [ ] **Step 1: Write the failing test**

```tsx
/**
 * iOS'ta üyelik ekranı yalnız kullanıcının KENDİ paketini gösterir.
 * Fiyat, aylık/yıllık geçişi, diğer paket kartları ve bekleyen ödeme bandı
 * (ödemeyi tamamlamaya çağırıyor) görünmez.
 */
import React from 'react';
import { Platform } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

it('iOS: fiyat tablosu ve dönem geçişi yok, mevcut paket var', async () => {
  Platform.OS = 'ios';
  let Screen: any;
  jest.isolateModules(() => {
    Screen = require('../index').default;
  });
  renderWithProviders(<Screen />);
  // Anahtarlar MembershipSections.tsx'ten doğrulandı:
  // currentPlan:72, monthly:114, yearly:120, mostPopular:146.
  expect(await screen.findByText('membership.currentPlan')).toBeTruthy();
  expect(screen.queryByText('membership.monthly')).toBeNull();
  expect(screen.queryByText('membership.yearly')).toBeNull();
  expect(screen.queryByText('membership.mostPopular')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- app/membership/__tests__/ios-membership-screen.test.tsx`
Expected: FAIL — dönem geçişi hâlâ render ediliyor

- [ ] **Step 3: Write minimal implementation**

`app/membership/index.tsx`:
```tsx
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
// ...
        <MembershipBanners f={f} />
        <MembershipCurrentPlan f={f} />
        {/* Fiyatlar ve paket kartları iOS'ta yok: uygulama içi dijital satış
            Apple IAP'siz yapılamıyor (Guideline 3.1.1) ve fiyat göstermek
            2.1(b)'nin "abonelik referansı" tanımına giriyor. */}
        {CAN_BUY_DIGITAL && (
          <>
            <MembershipBillingToggle f={f} />
            <MembershipTierList f={f} />
          </>
        )}
```

`app/membership/_components/MembershipSections.tsx` — bekleyen ödeme bandı yarım kalmış PayTR ödemesini tamamlamaya çağırıyor, iOS'ta kalkar:
```tsx
      {f.hasPendingPayment && CAN_BUY_DIGITAL && (
```
> Hata bandı (`f.error`) DOKUNULMAZ — satın almayla ilgisi yok.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- app/membership && npx tsc --noEmit`
Expected: PASS, tsc temiz

- [ ] **Step 5: Commit**

```bash
git add app/membership/index.tsx app/membership/_components/MembershipSections.tsx app/membership/__tests__/ios-membership-screen.test.tsx
git commit -m "feat(mobile): iOS üyelik ekranında yalnız mevcut paket"
```

---

### Task 8: Abonelik yeniden etkinleştirme + kapalı özellik metinleri

**Files:**
- Modify: `app/settings/subscription/_hooks/useSubscription.ts:100-106` (`setAutoRenew(true)`)
- Modify: `src/utils/membershipLimits.ts:153-175` (`getUpgradeMessage`)
- Test: `src/utils/__tests__/ios-upgrade-copy.test.ts`

**Interfaces:**
- Consumes: `CAN_BUY_DIGITAL` (Task 1); `membership.featureUnavailableOnAccount` (Task 4)

- [ ] **Step 1: Write the failing test**

```ts
/**
 * Kapalı özellik kapıları iOS'ta ücretli kademeden söz etmemeli: mesaj
 * yalnız hesabın durumunu bildirir. Giriş noktaları KALDIRILMAZ — kullanıcı
 * özelliğin var olduğunu görür, kapıda ne olduğunu öğrenir.
 */
import { Platform } from 'react-native';

const t = ((k: string) => k) as any;

it('iOS: kapı metni nötr', () => {
  Platform.OS = 'ios';
  let getUpgradeMessage: any;
  jest.isolateModules(() => {
    getUpgradeMessage = require('../membershipLimits').getUpgradeMessage;
  });
  const msg = getUpgradeMessage(t, 'tradeFeature');
  expect(msg.message).toBe('membership.featureUnavailableOnAccount');
});

it('Android: mevcut yükseltme metni korunur', () => {
  Platform.OS = 'android';
  let getUpgradeMessage: any;
  jest.isolateModules(() => {
    getUpgradeMessage = require('../membershipLimits').getUpgradeMessage;
  });
  expect(getUpgradeMessage(t, 'tradeFeature').message).toBe('upgradePrompt.tradeFeatureMessage');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/utils/__tests__/ios-upgrade-copy.test.ts`
Expected: FAIL — iOS'ta hâlâ `upgradePrompt.tradeFeatureMessage` dönüyor

- [ ] **Step 3: Write minimal implementation**

`src/utils/membershipLimits.ts` — `getUpgradeMessage`'ın başına:
```ts
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

export const getUpgradeMessage = (t: TFunction, promptType: UpgradePromptType) => {
  // iOS'ta ücretli kademeden söz edilemez (Guideline 3.1.3 anti-steering +
  // 2.1(b) "abonelik referansı"). Başlık korunur, mesaj nötrleşir: kullanıcı
  // özelliğin adını görür, ne yapması gerektiği söylenmez.
  if (!CAN_BUY_DIGITAL) {
    const neutral = t('membership.featureUnavailableOnAccount');
    switch (promptType) {
      case 'tradeFeature':
        return { title: t('trade.featureTitle'), message: neutral };
      case 'collectionFeature':
        return { title: t('membership.featureDigitalGarage'), message: neutral };
      default:
        return { title: t('upgradePrompt.listingLimitTitle'), message: neutral };
    }
  }
  // ...mevcut switch aynen kalır
```

`app/settings/subscription/_hooks/useSubscription.ts` — `setAutoRenew(true)` mutation'ını kullanan düğme iOS'ta gizlenir:
```tsx
// Ekranda ilgili düğme <UpgradeCta> ile sarılır: otomatik yenilemeyi yeniden
// AÇMAK, PayTR'de yinelenen tahsilatı yeniden başlatmak — yani uygulama içi
// satın alma. İPTAL düğmesi sarılmaz, iOS'ta kalır.
```

Sarılacak yer **`app/settings/subscription/_components/SubscriptionBody.tsx:185-193`**:
`onPress={f.handleReactivate}` olan `TouchableOpacity` (`membership.reactivateSubscriptionTitle` /
`membership.reactivateSubscriptionDesc` metinlerini taşıyor). Tamamı `<UpgradeCta>`
ile sarılır. Aynı dosyadaki **iptal** satırı (`membership.cancelTitle`, ~177) sarılmaz.

- [ ] **Step 4: Kırılan mevcut testi Android'e sabitle**

Bu görev `app/collections/__tests__/new.test.tsx:77`'i kırar — orada
`"Premium'a Yükselt"` metni bekleniyor, iOS'ta artık nötr metin geliyor. Aynı
`beforeAll(() => { Platform.OS = 'android'; })` kalıbını ekleyin.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- src/utils app/settings/subscription app/collections && npx tsc --noEmit`
Expected: PASS, tsc temiz

- [ ] **Step 6: Commit**

```bash
git add src/utils/membershipLimits.ts app/settings/subscription app/collections/__tests__/new.test.tsx src/utils/__tests__/ios-upgrade-copy.test.ts
git commit -m "feat(mobile): iOS'ta kapalı özellik metinleri nötr, yeniden etkinleştirme kapalı"
```

---

### Task 9: Regresyon süiti — kimse geri koyamasın

Bu görev planın **asıl koruması**. Tek tek gizlemeler unutulabilir; bu süit unutulduğunda kırmızı yanar.

**Files:**
- Create: `app/__tests__/ios-no-digital-sales.test.tsx`

**Interfaces:**
- Consumes: Task 1-8'in tamamı

- [ ] **Step 1: Write the test**

```tsx
/**
 * App Store Guideline 3.1.1 / 3.1.3(g) / 2.1(b) regresyon ağı.
 *
 * iOS'ta uygulama içinde ne dijital satın alma ne de ona ÇAĞIRAN bir yüzey
 * olabilir. Bu süit üç şeyi birden sabitler:
 *   1. iOS'ta kilit ekranlarda yükseltme çağrısı, BAŞKA paket adı ve fiyat yok
 *      (kullanıcının KENDİ paketinin adı görünmeye devam eder — kasıtlı),
 *   2. Android'de aynı çağrılar YERİNDE — kapı yalnız iOS,
 *   3. FİZİKSEL ödeme yolu iOS'ta AÇIK — 3.1.3(e) gereği IAP dışında kalması
 *      zorunlu; yanlışlıkla kapatmak uyum ihlali olur.
 */
import React from 'react';
import { Platform } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

const UPSELL_PATTERNS = [/Premium'a Geç/i, /Yükselt/i, /upgradeToPremium/i, /goPremium/i];

const SCREENS: Array<{ name: string; load: () => any }> = [
  { name: 'membership', load: () => require('../membership/index').default },
  { name: 'subscription', load: () => require('../settings/subscription/index').default },
  { name: 'saved-searches', load: () => require('../settings/saved-searches/index').default },
  { name: 'collections', load: () => require('../settings/collections').default },
];

describe('iOS: dijital satış çağrısı yok', () => {
  beforeEach(() => { Platform.OS = 'ios'; });

  it.each(SCREENS)('$name ekranında yükseltme çağrısı yok', async ({ load }) => {
    let Screen: any;
    jest.isolateModules(() => { Screen = load(); });
    renderWithProviders(<Screen />);
    for (const pattern of UPSELL_PATTERNS) {
      expect(screen.queryByText(pattern)).toBeNull();
    }
  });
});

describe('Android: çağrılar yerinde (kapı yalnız iOS)', () => {
  it('CAN_BUY_DIGITAL Android’de true', () => {
    Platform.OS = 'android';
    let mod: any;
    jest.isolateModules(() => { mod = require('@/lib/purchases'); });
    expect(mod.CAN_BUY_DIGITAL).toBe(true);
  });
});

```

**Ayrı dosya — `app/payment/__tests__/ios-physical-payment-open.test.tsx`.**
Planın en kritik regresyon testi: fiziksel ödemeyi bozmadığımızın kanıtı.
Mock kurulumu `app/payment/__tests__/webview.test.tsx`'ten alındı; tek fark
`expo-router` mock'una **`Redirect` eklenmesi** — `payment/[id].tsx` artık onu
import ediyor ve mock'ta yoksa `undefined` render edilir.

```tsx
/**
 * iOS'ta üyelik ödemesi reddedilir AMA fiziksel ödeme AÇIK kalır.
 * Guideline 3.1.3(e) fiziksel malın IAP ile satılmasını YASAKLIYOR; bu yolu
 * yanlışlıkla kapatmak da bir uyum ihlali olurdu.
 */
import React from 'react';
import { Platform } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { id: 'pay-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>REDIRECT:{href}</Text>;
  },
}));

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    getConfig: jest.fn(),
    getStatusLight: jest.fn(),
    getStatusLightGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
}));
import { paymentsApi } from '@/lib/api';

jest.mock('@/components/CardPaymentForm', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ target }: any) => React.createElement(Text, null, `FORM:${JSON.stringify(target)}`),
  };
});

import PaymentScreen from '../[id]';

beforeEach(() => {
  Platform.OS = 'ios';
  (paymentsApi.getStatusLight as jest.Mock).mockResolvedValue({
    data: { status: 'pending', orderId: 'order-1', amount: 100 },
  });
});

it('iOS: fiziksel sipariş ödemesi AÇILIR', async () => {
  mockParams = { id: 'pay-1', guest: '0' };
  renderWithProviders(<PaymentScreen />);
  await waitFor(() => expect(screen.getByText(/FORM:/)).toBeTruthy());
  expect(screen.queryByText('REDIRECT:/membership')).toBeNull();
});

it('iOS: üyelik ödemesi REDDEDİLİR', async () => {
  mockParams = { id: 'pay-1', guest: '0', type: 'membership' };
  renderWithProviders(<PaymentScreen />);
  expect(await screen.findByText('REDIRECT:/membership')).toBeTruthy();
});
```

> `getStatusLight` yanıtının şekli (`status`, `orderId`, `amount`) uygulamadan
> önce `webview.test.tsx`'teki mevcut mock'la karşılaştırılmalı; oradaki alan
> adları kanonik.

- [ ] **Step 2: Run and iterate**

Run: `pnpm test -- app/__tests__/ios-no-digital-sales.test.tsx`
Expected: Tüm vakalar PASS. Kırmızı çıkan ekran varsa Task 5-8'de gözden kaçan bir çağrı vardır — düzeltip tekrar koşun.

- [ ] **Step 3: Commit**

```bash
git add app/__tests__/ios-no-digital-sales.test.tsx
git commit -m "test(mobile): iOS dijital satış regresyon ağı"
```

---

### Task 10: Uçtan uca doğrulama ve belgeleme

**Files:**
- Modify: `docs/APP_REVIEW_CEVAP_1.2.md` (yeni bir bölüm)

- [ ] **Step 1: Tam doğrulama**

Run:
```bash
npx tsc --noEmit
pnpm lint
pnpm test
```
Expected: tsc temiz, lint 0 hata, süit yeşil (216+ süit, 1713+ test)

- [ ] **Step 2: iOS simülatöründe gez**

Metro'yu başlatıp iPhone simülatöründe kontrol edin:
- Profil → Üyelik Planı: yalnız mevcut paket, fiyat/dönem geçişi/paket kartı YOK
- Profil → Abonelik: yükseltme düğmesi YOK, iptal VAR
- İlanlarım: "Öne çıkar" menü satırı YOK, limit uyarısında yükseltme düğmesi YOK
- Koleksiyonlar → oluştur: nötr metin, yönlendirme YOK
- **Ürün satın alma:** sepete ekle → checkout → ödeme ekranı **AÇILIYOR** (bu bozulmamalı)

- [ ] **Step 3: Android'de bozulmadığını doğrula**

Android emülatöründe veya `Platform.OS` testleriyle: üyelik ekranında fiyatlar ve "Premium'a Geç" düğmeleri **duruyor**.

- [ ] **Step 4: Belgeye işle**

`docs/APP_REVIEW_CEVAP_1.2.md` içine "iOS'ta dijital satış kapatıldı" bölümü: hangi yüzeylerin kapandığı, fiziksel ticaretin neden dokunulmadığı (`3.1.3(e)`), ve Resolution Center cevabına eklenecek İngilizce paragraf:

```
The app no longer offers any digital purchase on iOS. Membership plans and
listing promotion ("boost") are not sold in the app, no prices are shown, and
there are no links or calls to action pointing to any external purchase
mechanism. Users see only their current plan and their account limits.

Physical goods — the collectible models that are the marketplace's purpose —
continue to be paid for with a payment method other than in-app purchase, as
required by Guideline 3.1.3(e).
```

- [ ] **Step 5: Commit**

```bash
git add docs/APP_REVIEW_CEVAP_1.2.md
git commit -m "docs: iOS dijital satış kapısını App Review cevabına işle"
```

---

## Sonraki adım (bu planın dışında)

Yeni bir build (`expo.version` → 1.0.4) ve Apple'a dönüş. Kalan üç madde
`docs/APP_REVIEW_CEVAP_1.2.md`'de: demo hesabını doldurmak (2.1), 1.2 cevabına
filtreleme anlatımını eklemek, ASC'de Privacy Policy ve EULA alanları.
