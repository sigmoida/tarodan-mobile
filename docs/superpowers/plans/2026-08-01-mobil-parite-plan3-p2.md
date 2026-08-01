# Plan 3 — P2: Erişim, Typing, Layout Denetimi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Yazılmış ama erişilemeyen ekranları kullanıcıya aç, mesajlaşmada "yazıyor" göstergesini bağla, ve ekranlardaki layout kaymalarını sistematik olarak tespit edip raporla.

**Architecture:** Üç bağımsız iş kolu. (1) Erişim: `ProfileSections` menüsüne satır ekleme ve `SaleCard`'a navigasyon — saf kompozisyon, yeni mantık yok. (2) Typing: mevcut soket köprüsüne iki `emit` + bir dinleyici; tipler `src/types/websocket.ts`'te zaten tanımlı. (3) Layout: yalnız **denetim** — bulgular uygulanmadan rapor edilir (spec §7 şartı).

**Tech Stack:** Expo SDK 54, expo-router, React Native, TypeScript, TanStack Query, zustand, socket.io-client, Jest + React Native Testing Library.

## Global Constraints

Bunlar `CLAUDE.md`'den gelir ve **her task için bağlayıcıdır**:

- Tasarım token'ları zorunlu: `theme.colors.*`, `theme.spacing[n]` (sayısal anahtar). **Hardcoded hex/rgba YASAK.**
- `src/theme/colors.ts` (`TarodanColors`) **yasak** — import edilmeyecek.
- Primitive'ler `@/ui`'den gelir; var olan bir primitive yeniden yazılmaz.
- Ekranlar ince (<~150 satır); mantık `_hooks/`, sabitler `_lib/`.
- Query anahtarları **yalnız** `@/lib/query` (`qk.*`) merkezî kayıttan. Satır içi `['x', id]` yasak.
- Mutation hook'ları snackbar + `invalidateQueries` sahibidir; manuel `refetch()` yok.
- Import'lar `@/…` alias'ı ile; derin göreli yol (`../../../src/…`) yok.
- **iOS donma tuzağı:** mutation'ın `appAlert`'i `ui-native` Modal açıkken çalışırsa iOS donar — modal mutation'dan **önce** kapatılır.
- Doğrulama her task sonunda: `npx tsc --noEmit` (tracked baseline üzerine yeni hata yok), `npx eslint .` temiz, `npx jest <dokunulan yollar>` yeşil.
- **Hiçbir koşulda EAS build alınmayacak** (`eas build`, `gh workflow run` yasak). Aylık kota 15 iOS build ve yalnız kullanıcı komutuyla harcanır.
- Commit mesajları **İngilizce**, conventional-commit formatında.
- Branch: `feat/parite-p2` (`main`'den açılır).

## Doğrulanmış Başlangıç Durumu

2026-08-01 denetimiyle koda karşı teyit edildi:

| Gerçek | Kanıt |
|---|---|
| P1'in altı maddesi de **kapalı** | telefon doğrulama `app/settings/security/_hooks/useSecurity.ts:78,100`; popular ray `app/(tabs)/_hooks/useHomeData.ts:40` |
| Erişilemeyen ekran sayısı **8** (spec "~22" diyor — yanlış) | aşağıdaki tablo |
| `typing:start`/`typing:stop` tipleri **zaten tanımlı** | `src/types/websocket.ts:59-64` |
| `app/page/[slug].tsx` **yok** (kod yorumu bayat referans veriyor) | `app/sayfa/[slug].tsx:11` |
| `GET /pages` liste ucu **var**, 5 slug döner: `about`, `faq`, `privacy`, `terms`, `cookie-policy` | staging'de doğrulandı; liste öğeleri yalnız `{slug, updatedAt}` içerir — **başlık yok** |
| `about` ve `faq` için uygulamada **zaten** sabit ekran var (`/about`, `/help`) | `ProfileSections.tsx:359,369` |

**Bundan çıkan tasarım kararı (Task 3):** CMS liste ucu başlık döndürmediği için menüde başlıklar sabit bir etiket haritasından gelir. `about`/`faq` CMS sürümleri **bağlanmaz** (mevcut sabit ekranları çiftler); yalnız hukuki üçlü bağlanır: `privacy`, `terms`, `cookie-policy`. Bunlar App Store incelemesi için de gereklidir.

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|---|---|---|
| `app/sales/_components/SaleCard.tsx` | satış kartı → detaya navigasyon | Değiştir |
| `app/(tabs)/_components/ProfileSections.tsx` | profil menüsü satırları | Değiştir |
| `app/(tabs)/_lib/legalPages.ts` | CMS hukuki sayfa slug→etiket haritası (tek kaynak) | Oluştur |
| `app/messages/[threadId]/_hooks/useTypingIndicator.ts` | typing emit (debounce) + karşı taraf durumu | Oluştur |
| `app/messages/[threadId]/_components/TypingIndicator.tsx` | "yazıyor…" göstergesi | Oluştur |
| `app/messages/[threadId]/_hooks/useMessageThread.ts` | typing controller'ı bağla | Değiştir |
| `app/messages/[threadId]/_components/MessageInputBar.tsx` | yazarken emit tetikle | Değiştir |
| `app/messages/[threadId]/_components/MessageList.tsx` | göstergeyi listenin altına bas | Değiştir |
| `docs/superpowers/reports/2026-08-01-layout-denetimi.md` | layout bulgu raporu | Oluştur |
| `docs/WEB_MOBILE_PARITY.md`, `docs/WEB_MOBILE_GAP_ANALYSIS.md`, spec §2/§6 | bayat içerik düzeltmesi | Değiştir |

---

### Task 1: Satış detayına navigasyon

`app/sales/index.tsx` satış listesini basıyor ama `app/sales/[id]/index.tsx` ekranına hiçbir yerden gidilmiyor — ekran tamamen ölü.

**Files:**
- Modify: `app/sales/_components/SaleCard.tsx`
- Test: `app/sales/__tests__/saleCardNav.test.tsx` (Create)

**Interfaces:**
- Consumes: `Sale` DTO (`app/sales/_lib/types.ts`), `SaleActionsController` (`app/sales/_hooks/useSaleActions.ts`)
- Produces: yok (yaprak değişiklik)

- [x] **Step 1: Write the failing test**

`app/sales/__tests__/saleCardNav.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SaleCard } from '../_components/SaleCard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const sale: any = {
  id: 'sale-1',
  orderNumber: 'ORD-1',
  status: 'paid',
  totalAmount: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
  product: { title: 'Test Ürün', images: [] },
  buyer: { displayName: 'Alıcı' },
  shippingAddress: { city: 'İstanbul' },
};

const actions: any = {
  updateStatusMutation: { isPending: false, variables: undefined },
  handleMarkAsProcessing: jest.fn(),
  setShipDialog: jest.fn(),
};

describe('SaleCard navigasyonu', () => {
  beforeEach(() => jest.clearAllMocks());

  it('karta basınca satış detayına gider', () => {
    const { getByTestId } = render(<SaleCard sale={sale} actions={actions} />);
    fireEvent.press(getByTestId('sale-card-sale-1'));
    expect(router.push).toHaveBeenCalledWith('/sales/sale-1');
  });

  it('aksiyon butonu navigasyonu TETİKLEMEZ', () => {
    const { getByText } = render(<SaleCard sale={sale} actions={actions} />);
    fireEvent.press(getByText('Hazırlanıyor Olarak İşaretle'));
    expect(actions.handleMarkAsProcessing).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest app/sales/__tests__/saleCardNav.test.tsx`
Expected: FAIL — `Unable to find an element with testID: sale-card-sale-1`

- [x] **Step 3: Implement**

`SaleCard.tsx` içinde: `Card`'ın **içeriğini** saran bir `TouchableOpacity` eklenir — aksiyon butonları bu sarmalayıcının **dışında** kalmalı, yoksa buton basışı navigasyonu da tetikler.

`import { View } from 'react-native';` satırını şununla değiştir:

```tsx
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
```

`saleHeader` + `saleContent` bloklarını saran sarmalayıcı ekle (aksiyon butonları dışarıda kalır):

```tsx
      <TouchableOpacity
        testID={`sale-card-${sale.id}`}
        activeOpacity={0.7}
        onPress={() => router.push(`/sales/${sale.id}`)}
      >
        <View style={styles.saleHeader}>
          {/* ...mevcut header içeriği aynen... */}
        </View>
        <View style={styles.saleContent}>
          {/* ...mevcut content içeriği aynen... */}
        </View>
      </TouchableOpacity>
```

Not: `{/* Action Buttons */}` yorumundan sonraki tüm bloklar `TouchableOpacity`'nin **dışında** kalır.

- [x] **Step 4: Run tests**

Run: `npx jest app/sales/`
Expected: PASS (yeni dosya + mevcut sales testleri)

- [x] **Step 5: Verify + commit**

```bash
npx tsc --noEmit && npx eslint app/sales/
git add app/sales/
git commit -m "feat(sales): open sale detail from the sales list

The sale detail screen existed but nothing navigated to it. Wrap the card
header/content in a pressable that pushes /sales/:id, leaving the action
buttons outside so they do not trigger navigation."
```

---

### Task 2: Altı ayar ekranını profil menüsüne bağla

Şu altı ekran `app/settings/` altında yazılı ama menüden erişilemiyor: `payment-methods`, `payment-history`, `payments`, `subscription`, `saved-searches`, `discounts`.

**Files:**
- Modify: `app/(tabs)/_components/ProfileSections.tsx`
- Test: `app/(tabs)/__tests__/profileMenuLinks.test.tsx` (Create)

**Interfaces:**
- Consumes: yerel `MenuItem` bileşeni — imzası `{ icon, label, onPress, tone?, rightSlot?, testID? }` (`ProfileSections.tsx:272-279`)
- Produces: yeni `testID`'ler — `profile-payment-methods-link`, `profile-payment-history-link`, `profile-payments-link`, `profile-subscription-link`, `profile-saved-searches-link`, `profile-discounts-link`

- [x] **Step 1: Write the failing test**

`app/(tabs)/__tests__/profileMenuLinks.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ProfileMenuSections } from '../_components/ProfileSections';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const f: any = {
  isPaidTier: false,
  tierLabel: 'Free',
  effectiveTier: 'free',
  handleLogout: jest.fn(),
};

const CASES: [string, string][] = [
  ['profile-payment-methods-link', '/settings/payment-methods'],
  ['profile-payment-history-link', '/settings/payment-history'],
  ['profile-payments-link', '/settings/payments'],
  ['profile-subscription-link', '/settings/subscription'],
  ['profile-saved-searches-link', '/settings/saved-searches'],
  ['profile-discounts-link', '/settings/discounts'],
];

describe('profil menüsü — daha önce erişilemeyen ekranlar', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(CASES)('%s -> %s', (testID, route) => {
    const { getByTestId } = render(<ProfileMenuSections f={f} />);
    fireEvent.press(getByTestId(testID));
    expect(router.push).toHaveBeenCalledWith(route);
  });
});
```

**Not:** Menü bölümünü render eden dışa aktarılmış bileşenin gerçek adını `ProfileSections.tsx`'ten teyit et (yaklaşık satır 295'te başlayan "Hesap Ayarları" bölümünü içeren export). Yukarıdaki `ProfileMenuSections` adı tahmindir — dosyadaki gerçek export adıyla ve gerçek prop şekliyle (`SectionProps`) değiştir. `f` nesnesini o bileşenin okuduğu alanlarla doldur.

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest 'app/(tabs)/__tests__/profileMenuLinks.test.tsx'`
Expected: FAIL — `Unable to find an element with testID: profile-payment-methods-link`

- [x] **Step 3: Implement**

"Hesap Ayarları" bölümünde, mevcut `Banka Hesabı / IBAN` satırından **sonra** ödeme üçlüsünü ekle:

```tsx
        <MenuItem
          testID="profile-payment-methods-link"
          icon="wallet-outline"
          label="Ödeme Yöntemlerim"
          onPress={() => router.push('/settings/payment-methods')}
        />
        <MenuItem
          testID="profile-payment-history-link"
          icon="time-outline"
          label="Ödeme Geçmişi"
          onPress={() => router.push('/settings/payment-history')}
        />
        <MenuItem
          testID="profile-payments-link"
          icon="cash-outline"
          label="Ödemelerim"
          onPress={() => router.push('/settings/payments')}
        />
```

`Üyelik Planı` satırından **sonra** abonelik satırını ekle:

```tsx
        <MenuItem
          testID="profile-subscription-link"
          icon="repeat-outline"
          label="Aboneliğim"
          onPress={() => router.push('/settings/subscription')}
        />
```

`İstatistikler` satırından **sonra** kalan ikiliyi ekle:

```tsx
        <MenuItem
          testID="profile-saved-searches-link"
          icon="bookmark-outline"
          label="Kayıtlı Aramalarım"
          onPress={() => router.push('/settings/saved-searches')}
        />
        <MenuItem
          testID="profile-discounts-link"
          icon="pricetag-outline"
          label="İndirim Kuponlarım"
          onPress={() => router.push('/settings/discounts')}
        />
```

- [x] **Step 4: Run tests**

Run: `npx jest 'app/(tabs)/'`
Expected: PASS

- [x] **Step 5: Verify + commit**

```bash
npx tsc --noEmit && npx eslint 'app/(tabs)/'
git add 'app/(tabs)/'
git commit -m "feat(profile): surface six previously unreachable settings screens

payment-methods, payment-history, payments, subscription, saved-searches
and discounts were implemented but had no entry point in the app. Link
them from the profile menu next to related items."
```

---

### Task 3: CMS hukuki sayfalarını bağla (`sayfa/[slug]`)

`app/sayfa/[slug].tsx` çalışır durumda ama hiçbir yerden çağrılmıyor. `GET /pages` beş slug döner; `about` ve `faq` için uygulamada zaten sabit ekran var, o yüzden yalnız hukuki üçlü bağlanır.

**Files:**
- Create: `app/(tabs)/_lib/legalPages.ts`
- Modify: `app/(tabs)/_components/ProfileSections.tsx`
- Test: `app/(tabs)/__tests__/legalPagesMenu.test.tsx` (Create)

**Interfaces:**
- Produces: `LEGAL_PAGES: ReadonlyArray<{ slug: string; label: string; icon: string }>` — Task 5 dokümantasyonu buna atıf yapar.

- [x] **Step 1: Write the failing test**

`app/(tabs)/__tests__/legalPagesMenu.test.tsx`:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { LEGAL_PAGES } from '../_lib/legalPages';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('LEGAL_PAGES kataloğu', () => {
  it('yalnız hukuki üçlüyü içerir — about/faq sabit ekranları çiftlemez', () => {
    expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(['privacy', 'terms', 'cookie-policy']);
  });

  it('her sayfanın etiketi vardır (liste ucu başlık döndürmüyor)', () => {
    LEGAL_PAGES.forEach((p) => expect(p.label.length).toBeGreaterThan(0));
  });
});
```

Ayrıca menü testini `profileMenuLinks.test.tsx`'e ekle (Task 2'deki dosya, aynı render kurulumuyla):

```tsx
  it('hukuki sayfalar CMS ekranına yönlendirir', () => {
    const { getByTestId } = render(<ProfileMenuSections f={f} />);
    fireEvent.press(getByTestId('profile-legal-privacy-link'));
    expect(router.push).toHaveBeenCalledWith('/sayfa/privacy');
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest 'app/(tabs)/__tests__/legalPagesMenu.test.tsx'`
Expected: FAIL — `Cannot find module '../_lib/legalPages'`

- [x] **Step 3: Implement**

`app/(tabs)/_lib/legalPages.ts`:

```ts
import type { Ionicons } from '@expo/vector-icons';

/**
 * CMS'te (`GET /pages`) yayınlanan hukuki sayfalar.
 *
 * Liste ucu yalnız `{ slug, updatedAt }` döndürür — başlık içermez — bu yüzden
 * etiketler burada tutulur; menü başlıkları için ayrıca istek atmaya gerek kalmaz.
 *
 * `about` ve `faq` bilinçli olarak DIŞARIDA: ikisinin de uygulamada sabit
 * ekranı var (`/about`, `/help`); CMS sürümlerini bağlamak aynı içeriği
 * kullanıcıya iki ayrı yerden gösterirdi.
 */
export const LEGAL_PAGES: ReadonlyArray<{
  slug: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { slug: 'privacy', label: 'Gizlilik Politikası', icon: 'lock-closed-outline' },
  { slug: 'terms', label: 'Kullanım Koşulları', icon: 'document-text-outline' },
  { slug: 'cookie-policy', label: 'Çerez Politikası', icon: 'shield-outline' },
] as const;
```

`ProfileSections.tsx`'te "Bilgi" bölümünün sonuna (Platform Hizmet Bedeli satırından sonra) ekle:

```tsx
        {LEGAL_PAGES.map((p) => (
          <MenuItem
            key={p.slug}
            testID={`profile-legal-${p.slug}-link`}
            icon={p.icon}
            label={p.label}
            onPress={() => router.push(`/sayfa/${p.slug}`)}
          />
        ))}
```

Import ekle: `import { LEGAL_PAGES } from '../_lib/legalPages';`

- [x] **Step 4: Run tests**

Run: `npx jest 'app/(tabs)/' app/sayfa/`
Expected: PASS

- [x] **Step 5: Bayat yorumu düzelt**

`app/sayfa/[slug].tsx:11` "page/[slug].tsx ile aynı ... desenini kullanarak" diyor ama `app/page/[slug].tsx` **yok**. Yorumu şununla değiştir:

```
// API page.content bir HTML string'idir; düz <Text> ile basıldığında etiketler ham
// görünür. Bu yüzden WebView + htmlWrapper ile tasarım token'larına uygun render edilir.
```

- [x] **Step 6: Verify + commit**

```bash
npx tsc --noEmit && npx eslint 'app/(tabs)/' app/sayfa/
git add 'app/(tabs)/' app/sayfa/
git commit -m "feat(profile): link CMS legal pages from the profile menu

The sayfa/[slug] CMS screen worked but had no entry point. Link the three
legal pages (privacy, terms, cookie-policy) from the profile menu. about
and faq are deliberately excluded because both already ship as dedicated
screens. Labels live in a local catalog since GET /pages returns no title."
```

---

### Task 4: `typing:start` / `typing:stop` yayını ve göstergesi

Sunucu sözleşmesi `src/types/websocket.ts`'te **zaten tanımlı** (`ClientToServerEvents` 62-63, `ServerToClientEvents` 53-54) ama hiçbir tarafı bağlı değil.

**Files:**
- Create: `app/messages/[threadId]/_hooks/useTypingIndicator.ts`
- Create: `app/messages/[threadId]/_components/TypingIndicator.tsx`
- Modify: `app/messages/[threadId]/_hooks/useMessageThread.ts`
- Modify: `app/messages/[threadId]/_components/MessageInputBar.tsx`
- Modify: `app/messages/[threadId]/_components/MessageList.tsx`
- Test: `app/messages/[threadId]/__tests__/typingIndicator.test.tsx` (Create)

**Interfaces:**
- Consumes: `getSocket()` (`@/services/socket` — gerçek yolu `useMessageThread.ts`'teki mevcut import'tan al), `TypingEvent` (`src/types/websocket.ts`)
- Produces: `useTypingIndicator(threadId: string | undefined): { isPeerTyping: boolean; notifyTyping: () => void }` — `notifyTyping` her tuş vuruşunda çağrılabilir; debounce'u kendi içinde yapar.

**Davranış sözleşmesi:**
- İlk tuş vuruşunda **bir kez** `typing:start` yayınlanır.
- Yazmaya devam edildikçe tekrar `typing:start` yayınlanmaz (gereksiz trafik).
- Son tuş vuruşundan **3 sn** sonra `typing:stop` yayınlanır.
- Mesaj gönderilince veya ekrandan çıkılınca derhal `typing:stop`.
- Karşı taraftan `typing:started` gelince gösterge açılır; `typing:stopped` gelince veya **5 sn** içinde yenilenmezse kapanır (sunucu `stop` göndermezse gösterge takılı kalmasın).

- [x] **Step 1: Write the failing test**

`app/messages/[threadId]/__tests__/typingIndicator.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react-native';
import { useTypingIndicator } from '../_hooks/useTypingIndicator';

const emit = jest.fn();
const handlers: Record<string, (p: any) => void> = {};
const socket = {
  emit,
  on: jest.fn((e: string, h: (p: any) => void) => { handlers[e] = h; }),
  off: jest.fn(),
};

jest.mock('@/services/socket', () => ({ getSocket: () => socket }));

describe('useTypingIndicator', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('ilk tuş vuruşunda typing:start yayınlar, tekrarında yayınlamaz', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    act(() => { result.current.notifyTyping(); });
    act(() => { result.current.notifyTyping(); });
    const starts = emit.mock.calls.filter(([e]) => e === 'typing:start');
    expect(starts).toHaveLength(1);
    expect(starts[0][1]).toEqual({ threadId: 't1' });
  });

  it('3 sn sessizlikten sonra typing:stop yayınlar', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    act(() => { result.current.notifyTyping(); });
    expect(emit).not.toHaveBeenCalledWith('typing:stop', expect.anything());
    act(() => { jest.advanceTimersByTime(3000); });
    expect(emit).toHaveBeenCalledWith('typing:stop', { threadId: 't1' });
  });

  it('karşı taraf yazınca gösterge açılır, stop gelince kapanır', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    expect(result.current.isPeerTyping).toBe(false);
    act(() => { handlers['typing:started']({ threadId: 't1' }); });
    expect(result.current.isPeerTyping).toBe(true);
    act(() => { handlers['typing:stopped']({ threadId: 't1' }); });
    expect(result.current.isPeerTyping).toBe(false);
  });

  it('başka thread’in typing olayı göstergeyi açmaz', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    act(() => { handlers['typing:started']({ threadId: 'BASKA' }); });
    expect(result.current.isPeerTyping).toBe(false);
  });

  it('stop hiç gelmezse gösterge 5 sn sonra kendiliğinden kapanır', () => {
    const { result } = renderHook(() => useTypingIndicator('t1'));
    act(() => { handlers['typing:started']({ threadId: 't1' }); });
    act(() => { jest.advanceTimersByTime(5000); });
    expect(result.current.isPeerTyping).toBe(false);
  });

  it('unmount olurken typing:stop yayınlar', () => {
    const { result, unmount } = renderHook(() => useTypingIndicator('t1'));
    act(() => { result.current.notifyTyping(); });
    emit.mockClear();
    unmount();
    expect(emit).toHaveBeenCalledWith('typing:stop', { threadId: 't1' });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest 'app/messages/\[threadId\]/__tests__/typingIndicator.test.tsx'`
Expected: FAIL — `Cannot find module '../_hooks/useTypingIndicator'`

**Not:** `@/services/socket` mock yolu tahmindir. `useMessageThread.ts`'teki gerçek `getSocket` import yolunu teyit et ve mock'u ona göre düzelt.

- [x] **Step 3: Implement the hook**

`app/messages/[threadId]/_hooks/useTypingIndicator.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';

/** Son tuş vuruşundan sonra typing:stop'a kadar beklenen süre. */
const STOP_AFTER_MS = 3000;
/** Sunucu stop göndermezse göstergenin kendiliğinden kapanma süresi. */
const PEER_TIMEOUT_MS = 5000;

/**
 * Mesaj thread'i için "yazıyor" köprüsü.
 *
 * Yayın tarafı debounce'ludur: `typing:start` yalnız yazmaya BAŞLARKEN bir kez
 * gider, `typing:stop` ise son tuş vuruşundan STOP_AFTER_MS sonra. Alım tarafında
 * kendi kendine sönen bir zamanlayıcı var — sunucu `typing:stopped` göndermezse
 * gösterge sonsuza dek takılı kalmaz.
 */
export function useTypingIndicator(threadId: string | undefined) {
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const isTypingRef = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitStop = useCallback(() => {
    if (!threadId || !isTypingRef.current) return;
    isTypingRef.current = false;
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    getSocket()?.emit('typing:stop', { threadId });
  }, [threadId]);

  const notifyTyping = useCallback(() => {
    if (!threadId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket()?.emit('typing:start', { threadId });
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(emitStop, STOP_AFTER_MS);
  }, [threadId, emitStop]);

  // Karşı tarafın typing olaylarını dinle
  useEffect(() => {
    if (!threadId) return;
    const socket = getSocket();
    if (!socket) return;

    const onStarted = (p: { threadId: string }) => {
      if (p.threadId !== threadId) return;
      setIsPeerTyping(true);
      if (peerTimer.current) clearTimeout(peerTimer.current);
      peerTimer.current = setTimeout(() => setIsPeerTyping(false), PEER_TIMEOUT_MS);
    };
    const onStopped = (p: { threadId: string }) => {
      if (p.threadId !== threadId) return;
      if (peerTimer.current) clearTimeout(peerTimer.current);
      setIsPeerTyping(false);
    };

    socket.on('typing:started', onStarted);
    socket.on('typing:stopped', onStopped);
    return () => {
      socket.off('typing:started', onStarted);
      socket.off('typing:stopped', onStopped);
      if (peerTimer.current) clearTimeout(peerTimer.current);
      setIsPeerTyping(false);
    };
  }, [threadId]);

  // Ekrandan çıkarken karşı tarafı "yazıyor" halinde bırakma
  useEffect(() => emitStop, [emitStop]);

  return { isPeerTyping, notifyTyping, stopTyping: emitStop };
}
```

- [x] **Step 4: Run hook tests**

Run: `npx jest 'app/messages/\[threadId\]/__tests__/typingIndicator.test.tsx'`
Expected: PASS (6 test)

- [x] **Step 5: Commit the hook**

```bash
npx tsc --noEmit && npx eslint 'app/messages/'
git add 'app/messages/[threadId]/_hooks/useTypingIndicator.ts' 'app/messages/[threadId]/__tests__/typingIndicator.test.tsx'
git commit -m "feat(messaging): add typing indicator socket bridge

The typing:start/typing:stop contract was declared in the socket types but
neither side was wired. Add a debounced hook: start fires once when typing
begins, stop after 3s of silence or on unmount. The receiving side has a 5s
self-expiry so a missing typing:stopped cannot leave the indicator stuck."
```

- [x] **Step 6: Wire the controller**

`useMessageThread.ts`:
- `import { useTypingIndicator } from './useTypingIndicator';`
- Gövdede: `const typing = useTypingIndicator(threadId);`
- Dönen controller nesnesine ekle: `isPeerTyping: typing.isPeerTyping`, `notifyTyping: typing.notifyTyping`
- Mesaj gönderme handler'ının **başında** `typing.stopTyping();` çağır (gönderirken "yazıyor" asılı kalmasın).
- `MessageThreadController` tipini bu üç alanla genişlet.

- [x] **Step 7: Wire the input**

`MessageInputBar.tsx` içindeki `RNTextInput`'un `onChangeText`'ini sar — mevcut handler korunur:

```tsx
            onChangeText={(t) => {
              f.setMessageText(t);   // ← mevcut handler adını dosyadan teyit et
              f.notifyTyping();
            }}
```

- [x] **Step 8: Add the indicator component**

`app/messages/[threadId]/_components/TypingIndicator.tsx`:

```tsx
import { View } from 'react-native';
import { Text, theme } from '@/ui';

const { colors, spacing } = theme;

/** Karşı taraf yazarken mesaj listesinin altında görünen ipucu. */
export function TypingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      testID="typing-indicator"
      style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}
    >
      <Text variant="caption" style={{ color: colors.text.muted }}>
        yazıyor…
      </Text>
    </View>
  );
}
```

`MessageList.tsx`'te listenin altına bas — `FlatList` `inverted` ise `ListHeaderComponent`, değilse `ListFooterComponent` kullan (dosyadan teyit et):

```tsx
        ListFooterComponent={<TypingIndicator visible={f.isPeerTyping} />}
```

- [x] **Step 9: Run full messaging tests**

Run: `npx jest app/messages/ src/hooks/messaging/`
Expected: PASS

- [x] **Step 10: Verify + commit**

```bash
npx tsc --noEmit && npx eslint 'app/messages/'
git add 'app/messages/'
git commit -m "feat(messaging): show and broadcast typing state in the thread

Wire the typing hook into the thread controller: keystrokes broadcast
typing:start/stop, sending a message clears it immediately, and the peer's
state renders as a caption under the message list."
```

---

### Task 5: Layout / kayma denetimi (YALNIZ RAPOR)

Spec §7 bulguların **uygulanmadan önce raporlanmasını** şart koşar. Bu task hiçbir ekranı düzeltmez — yalnız tespit eder.

**Files:**
- Create: `docs/superpowers/reports/2026-08-01-layout-denetimi.md`

**Interfaces:** yok (rapor).

- [x] **Step 1: Safe area taraması**

```bash
cd /Users/gorkemsubas/dev/tarodan-mobile
rg -l "useSafeAreaInsets|SafeAreaView" -g '*.tsx' app/ | sort > /tmp/has_safe.txt
rg -l "" -g 'index.tsx' -g '*.tsx' app/ | sort > /tmp/all_screens.txt
comm -13 /tmp/has_safe.txt /tmp/all_screens.txt
```

Her ekran için: insets hiç uygulanmıyor mu, yoksa `Stack.Screen` header'ı zaten karşılıyor mu — ikisini ayır. Yalnız gerçekten üst/alt kesime giren ekranları raporla.

- [x] **Step 2: Header çakışması**

```bash
rg -n "headerShown" -g '*.tsx' app/ | rg -v "headerShown: false" | head -40
rg -ln "ScreenHeader" -g '*.tsx' app/
```

Aranan hata: özel `ScreenHeader` **ve** görünür `Stack.Screen` header'ı aynı ekranda → çift üst boşluk.

- [x] **Step 3: Tab bar alt boşluğu**

```bash
rg -n "contentContainerStyle" -g '*.tsx' 'app/(tabs)/'
```

Aranan hata: tab içi listelerde alt padding yok → son öğe tab bar altında kalıyor. `AppTabBar` yüksekliğini teyit et ve padding ile karşılaştır.

- [x] **Step 4: Klavye davranışı**

```bash
rg -ln "TextInput|useZodForm" -g '*.tsx' app/ | sort > /tmp/forms.txt
rg -ln "KeyboardAvoidingView" -g '*.tsx' app/ | sort > /tmp/kav.txt
comm -13 /tmp/kav.txt /tmp/forms.txt
rg -n "behavior=" -g '*.tsx' app/
```

Aranan hata: form ekranında `KeyboardAvoidingView` yok; ya da `behavior` platform ayrımı yapılmamış (iOS `padding`, Android `height`/undefined).

- [x] **Step 5: Liste ve görsel zıplaması — KAYMANIN ANA KAYNAĞI**

Kullanıcının bildirdiği "kayma" en olası burada:

```bash
rg -n "height: *[0-9]" -g '*.tsx' app/ src/components/ | head -40
rg -n "<AppImage|<Image" -A3 -g '*.tsx' app/ src/components/ | rg -B1 -A3 "source=" | head -60
rg -n "ListFooterComponent|ListHeaderComponent" -g '*.tsx' app/ | head -20
```

Aranan hatalar:
1. Ölçüsü bilinmeyen görsel — yüklenince yükseklik değişir, altındaki içerik zıplar. `AppImage`'ın sabit boyut alıp almadığını teyit et.
2. `isLoading` durumunda farklı yükseklikte bir Spinner/EmptyState basılması → veri gelince liste sıçrar.
3. Sabit `height` yerine `flex` kullanılması gereken yerler.
4. `getItemLayout` verilmemiş sabit yükseklikli listeler.

Özellikle şu ekranları elle incele (en çok görsel + koşullu blok içerenler): `app/(tabs)/index.tsx`, `app/product/[id]/index.tsx`, `app/orders/[id]/index.tsx`, `app/trade/[id]/index.tsx`.

- [x] **Step 6: Modal + insets**

```bash
rg -n "<Modal" -g '*.tsx' app/ src/ui/ | head -20
```

`ui-native` Modal'ın insets'i kendi mi uyguluyor, yoksa çağıran mı — tutarsızlık varsa raporla.

- [x] **Step 7: Raporu yaz**

`docs/superpowers/reports/2026-08-01-layout-denetimi.md` şu yapıda:

```markdown
# Layout / Kayma Denetimi — 2026-08-01

## Özet
[Kaç bulgu, kaç ekran, tekrarlayan kök nedenler]

## Bulgular

### B1: [Başlık]
- **Belirti:** [kullanıcının gördüğü]
- **Kök neden:** [teknik]
- **Etkilenen:** `dosya:satır` (liste)
- **Önerilen düzeltme:** [somut]
- **Şiddet:** Yüksek / Orta / Düşük

## Tekrarlayan kök nedenler
[Paylaşılan bir yardımcı gerektirenler — @/ui'de varsa onu kullan, yeni primitive icat etme]

## Önerilen uygulama sırası
[Şiddet × efor]
```

**Her bulgu `dosya:satır` ile kanıtlanmalı.** Kanıtsız "şurada sorun olabilir" yazma.

⚠️ **Arama tuzağı:** Bu repoda daha önce üç kez, `grep --include=*.tsx` zsh'de glob hatası verdiği için boş dönen arama "kod yok" sanıldı ve yanlış bulgu raporlandı. Yalnız `rg` kullan; boş çıktıyı "yok" saymadan önce en az iki farklı terimle tekrar ara.

- [x] **Step 8: Commit**

```bash
git add docs/superpowers/reports/
git commit -m "docs: add layout and content-shift audit findings

Systematic sweep of safe-area handling, header collisions, tab-bar padding,
keyboard avoidance, list/image shift and modal insets. Report only — per the
design spec, findings are reviewed before any fix is applied."
```

---

### Task 6: Bayat dökümanları gerçekle hizala

Üç döküman P1'lerin hiçbirini kapanmış göstermiyor ve spec §6 "~22 ekran" diyor — gerçek sayı 8. Düzeltilmezse bir sonraki oturum yine yanlış yola girer.

**Files:**
- Modify: `docs/WEB_MOBILE_PARITY.md`
- Modify: `docs/WEB_MOBILE_GAP_ANALYSIS.md`
- Modify: `docs/superpowers/specs/2026-07-30-mobil-web-islev-paritesi-design.md` (§2 ve §6)

**Interfaces:** yok.

- [x] **Step 1: Spec §2 "Hâlâ açık" tablosunu düzelt**

Şu satırlar **kapanmıştır**, tablodan çıkar veya "Kapandı (2026-08-01)" işaretle:
- "Üyelik hakları istemcide sabit `TIER_LIMITS`" → kapandı (`src/hooks/useMembershipLimits.ts`)
- "`products/:id/click`, `products/popular` çağrılmıyor" → kapandı (`src/lib/api/products.ts:32`, `app/(tabs)/_hooks/useHomeData.ts:40`)

- [x] **Step 2: Spec §6'yı gerçek kapsamla değiştir**

"~22 ekran" ifadesini şununla değiştir: erişilemeyen **8** ekran, Task 1–3'te kapatıldı. Kalan tek P2 kalemi **i18n taşıma**.

- [x] **Step 3: §5 (P1) tablosuna kapanış notu ekle**

Altı maddenin de kapandığını, kupon UI'ının `POST /cart/coupon` yerine `discounts/validate` ile **bilinçli** olarak yapıldığını (`src/lib/api/cart.ts:53`) yaz.

- [x] **Step 4: İki bayat dökümanın başına uyarı koy**

`WEB_MOBILE_PARITY.md` ve `WEB_MOBILE_GAP_ANALYSIS.md` en üstüne:

```markdown
> ⚠️ **BAYAT (2026-08-01 itibarıyla).** Bu döküman P0 ve P1 işleri tamamlanmadan
> önce yazıldı ve kapanmış maddeleri hâlâ açık gösteriyor. Güncel durum için
> `docs/superpowers/specs/2026-07-30-mobil-web-islev-paritesi-design.md` §2/§5/§6
> ve `docs/superpowers/plans/2026-08-01-mobil-parite-plan3-p2.md` bakılmalı.
```

- [x] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: align parity documents with verified implementation state

A code-level audit found the parity documents listed several completed items
as still open (membership limits, product click, popular rail, email change,
username claim, phone verification) and overstated the unreachable-screen
count as ~22 when it is 8. Correct the spec and mark the two superseded
documents as stale."
```

---

## Self-Review

**1. Spec coverage.** Spec §6'nın dört maddesi: erişilemeyen ekranlar → Task 1–3; i18n → **kapsam dışı bırakıldı** (aşağıya bak); `my-review` → **bilinçli olarak atlandı**, işlevi `hasProductRating`/`hasSellerRating` ile zaten karşılanıyor (`OrderActionCards.tsx:62,67`), bağlamak çift kaynak yaratır; `typing` → Task 4. Spec §7 (layout) → Task 5.

**i18n neden kapsam dışı:** ~270 dosyalık mekanik taşıma (L). Diğer beş task'la aynı oturuma sıkıştırılırsa yarıda kalır ve yarısı çevrilmiş, tutarsız bir arayüz bırakır. Kendi planını hak ediyor. Task 6 bunu tek kalan P2 kalemi olarak kayda geçirir.

**2. Placeholder taraması.** Kod adımlarının hepsinde gerçek kod var. Üç yerde bilinçli "dosyadan teyit et" notu bıraktım (Task 2 export adı, Task 4 socket import yolu ve `setMessageText` handler adı, Task 5 `inverted` FlatList) — bunlar placeholder değil, doğrulama talimatı: uydurulmuş bir ad yazmaktansa uygulayıcıyı gerçek ada bakmaya yönlendirmek daha güvenli.

**3. Tip tutarlılığı.** `useTypingIndicator` üç alan döndürür (`isPeerTyping`, `notifyTyping`, `stopTyping`); üçü de Task 4 Step 6–8'de aynı adlarla kullanılıyor. `LEGAL_PAGES` Task 3'te tanımlanıp aynı şekilde tüketiliyor. `sale.id` alanı Task 1 testinde ve implementasyonunda aynı.

**Bilinen risk:** Task 4'ün sunucu tarafı doğrulanmadı — `typing:start` yayınının sunucuda gerçekten karşı tarafa `typing:started` olarak iletildiği staging'de test edilmedi. Tipler sözleşmeyi tanımlıyor ama uygulama teyidi yok. Gösterge sunucu yayınlamıyorsa sessizce hiç görünmez (bozulma yaratmaz). Staging'de iki cihazla elle doğrulanmalı.
