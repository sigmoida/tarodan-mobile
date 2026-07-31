# Mobil Parite Plan 2 (P1 kalanı + bitişik P2) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** P1'de açık kalan iki maddeyi (#8 vitrin ölü kodu, #12 e-posta değişikliği + kullanıcı adı talebi) ve bitişik iki P2 maddesini (#16 üyelik hakları API'den, #17a ürün tıklama takibi) kapatmak.

**Architecture:** Beş bağımsız iş. İkisi mevcut kodu temizliyor/genişletiyor (ölü kod silme, tıklama takibi), biri bir refactor (istemci sabit tablosu → API sorgusu), ikisi yeni ekran (e-posta OTP, kullanıcı adı talebi). Yeni ekranlar `app/settings/` altında kendi rotalarını alır ve `edit-profile`'dan bağlanır — menüden erişilemeyen yeni ekran üretmemek şart.

**Tech Stack:** Expo SDK 54 · expo-router · TanStack Query · zustand · `@/ui` + `@/ui/form` (`useZodForm`) · Jest + React Native Testing Library

## Global Constraints

- **Tasarım token'ları:** `theme` **`@/ui`'dan** import edilir (`@/theme` bir `theme` nesnesi export etmez; ham token için `import { colors } from '@/theme'` kullanılır). **Hardcoded hex/rgba YASAK** — eslint `no-restricted-syntax` ile bloke. `theme.spacing` **sayısal** anahtarlı (`spacing[4]`=16pt, `[2]`=8pt); `spacing.md` YOKTUR. `theme.colors.background` YOKTUR → sayfa arkaplanı `surface.DEFAULT`, kart `surface.alt`.
- **Primitive'ler `@/ui`'dan.** Doğrulanmış prop adları: `Alert variant="danger"`, `Button isLoading`, `Modal isOpen`/`onClose`, `EmptyState subtitle`, `ScreenHeader title`+`onBack`.
- **Formlar `@/ui/form`:** `Form` `form` prop'u alır, **`FormInput` `control` prop'u ALMAZ** (context'ten çeker). Referans: `app/(auth)/corporate-invite/index.tsx`.
- **Sorgu anahtarları `@/lib/query`'den** (`qk.*`) — inline dizi yazılmaz. Yeni anahtar `src/lib/query/keys.ts`'e eklenir; mevcut nesneler bozulmaz, aynı adlı ikinci anahtar oluşturulmaz.
- **Store fetch etmez** (CLAUDE.md §8). Sunucu verisi React Query'dedir.
- **İnce ekran:** `index.tsx` < ~150 satır; mantık `_hooks`/`_lib`'te.
- ⚠️ **iOS donma tuzağı:** mutation'ın `appAlert`'i `@/ui` Modal AÇIKKEN çalışırsa iOS donuyor → modal mutation'dan ÖNCE kapatılır.
- **PII loglanmaz:** e-posta, tam adres, TCKN, kart verisi.
- **Sunucu hata mesajı `string` veya `string[]`** olabilir (NestJS doğrulama dizisi) — ikisi de ele alınır.
- Jest bu repoda process'i kapatmaz: `npx jest <desen> --forceExit 2>&1 | tail -25`.
- **Temel:** `npx tsc --noEmit` **0 hata**, `npx eslint .` **0 hata**, 87 suite / 547 test yeşil. Bu temel bozulmamalı.
- Commit mesajı sonunda: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

## Dosya haritası

| Dosya | Sorumluluk | İşlem |
|---|---|---|
| `src/components/FeaturedListingsModal.tsx` | (ölü vitrin kopyası) | **Sil** |
| `src/lib/api/products.ts` | ürün uçları | `recordClick` ekle |
| `src/components/product/ProductCard.tsx` | ürün kartı | `handlePress`'e tıklama takibi |
| `src/hooks/useMembershipLimits.ts` | sunucu haklarını çekip store'a yazar | **Oluştur** |
| `src/stores/authStore.ts` | `limits` alanı + sunucu bindirmesi | `serverLimits` + `mergeLimits` |
| `src/hooks/useAds.ts` | reklam görünürlüğü | Yeni hook'u kullan (kopya sorguyu kaldır) |
| `app/_layout.tsx` | uygulama kökü | Hook'u bir kez bağla |
| `src/utils/membershipLimits.ts` | hak hesapları | **DEĞİŞMEZ** — store'dan okuduğu için bindirmeyi otomatik görür |
| `src/lib/api/auth.ts` | kimlik uçları | e-posta değişikliği (2 uç) |
| `src/lib/api/user.ts` | kullanıcı uçları | `claimUsername` |
| `app/settings/email-change/` | e-posta değişikliği OTP ekranı | **Oluştur** |
| `app/settings/username/` | kullanıcı adı talebi ekranı | **Oluştur** |
| `app/settings/edit-profile/index.tsx` | profil formu | İki yeni ekrana bağlantı |

---

## Task 1: Vitrin ölü kodunu sil (#8)

**Files:**
- Delete: `src/components/FeaturedListingsModal.tsx`
- Test: `src/components/__tests__/noDeadShowcase.test.ts` (Create)

**Interfaces:**
- Consumes: —
- Produces: — (silme işi; sonraki task'lar buna dayanmaz)

**Bağlam:** `FeaturedListingsModal` vitrin/boost satın alma akışını uygulamış ama **hiçbir yerde render edilmiyor** ve API'de **olmayan** `GET /products/my-listings` ucunu çağırıyor. Aynı işi `src/components/product/BoostModal.tsx` doğru uçla (`GET /products/:id/boost/options`) yapıyor ve `app/settings/my-listings/index.tsx:79`'da canlı olarak render ediliyor. Yani bu dosya çalışan bir özelliğin bozuk kopyası.

- [ ] **Step 1: Silmeden önce referans olmadığını kanıtla**

Run:

```bash
grep -rn "FeaturedListingsModal" app src --exclude-dir=__tests__
```

Expected: yalnız `src/components/FeaturedListingsModal.tsx`'in kendi içindeki tanım satırı. Başka dosyadan referans çıkarsa **DUR ve bana sor** — silme kararı bu varsayıma dayanıyor.

- [ ] **Step 2: Regresyon testini yaz**

`src/components/__tests__/noDeadShowcase.test.ts` oluştur:

```ts
/**
 * Vitrin/boost akışının tek kaynağı `src/components/product/BoostModal.tsx`
 * (GET /products/:id/boost/options). Kaldırılan FeaturedListingsModal, API'de
 * olmayan /products/my-listings ucunu çağıran ölü bir kopyaydı; geri gelirse
 * yanlış uca giden ikinci bir akış oluşur.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

describe('vitrin akışı tek kaynak', () => {
  it('FeaturedListingsModal geri eklenmemiş', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/components/FeaturedListingsModal.tsx'))).toBe(false);
  });

  it('API'de olmayan /products/my-listings ucu hiçbir yerde çağrılmıyor', () => {
    const grep = (dir: string): string[] =>
      fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
        if (e.name === 'node_modules' || e.name.startsWith('.')) return [];
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) return grep(rel);
        if (!/\.(ts|tsx)$/.test(e.name)) return [];
        return fs.readFileSync(path.join(ROOT, rel), 'utf8').includes('products/my-listings') ? [rel] : [];
      });
    expect([...grep('src'), ...grep('app')]).toEqual([]);
  });
});
```

- [ ] **Step 3: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest noDeadShowcase --forceExit 2>&1 | tail -25`

Expected: FAIL — dosya hâlâ var, `/products/my-listings` hâlâ çağrılıyor (2 test kırmızı).

- [ ] **Step 4: Dosyayı sil**

Run:

```bash
git rm src/components/FeaturedListingsModal.tsx
```

- [ ] **Step 5: Test'i çalıştır, geçtiğini gör**

Run: `npx jest noDeadShowcase --forceExit 2>&1 | tail -25`

Expected: PASS — 2 test yeşil.

- [ ] **Step 6: Temeli doğrula**

Run: `npx tsc --noEmit 2>&1 | tail -5` → **çıktı boş** (0 hata)
Run: `npx jest --forceExit 2>&1 | grep -E "Suites|Tests:"` → 0 failed

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: ölü FeaturedListingsModal'ı sil

Hiçbir yerde render edilmiyordu ve API'de olmayan
GET /products/my-listings ucunu çağırıyordu. Aynı vitrin/boost akışını
BoostModal doğru uçla (products/:id/boost/options) yapıyor ve
settings/my-listings ekranında canlı. Geri gelmesini engelleyen
regresyon testi eklendi.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Ürün kartı tıklama takibi (#17a)

**Files:**
- Modify: `src/lib/api/products.ts`
- Modify: `src/components/product/ProductCard.tsx`
- Test: `src/components/product/__tests__/productCardClick.test.tsx` (Create)

**Interfaces:**
- Consumes: —
- Produces: `productsApi.recordClick(id: string | number)` — sonraki task'lar kullanmaz.

**Bağlam:** Web her ürün kartı tıklamasında `POST /products/:id/click` gönderiyor (fire-and-forget, sıralama sinyali). Mobilde yok. `ProductCard.handlePress` (`src/components/product/ProductCard.tsx:89-92`) tüm kart tıklamalarının tek geçiş noktası — 16 ekran bu bileşeni kullanıyor, tek yere eklemek hepsini kapsar.

Mevcut fire-and-forget deseni: `productsApi.incrementView` (`src/lib/api/products.ts:30`).

- [ ] **Step 1: Failing test'i yaz**

`src/components/product/__tests__/productCardClick.test.tsx` oluştur:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { productsApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  productsApi: { recordClick: jest.fn(() => Promise.resolve({ data: {} })) },
}));

// NOT: jest.mock fabrikası dış değişkene ancak adı `mock` ile başlıyorsa
// atıf yapabilir; aksi halde "not allowed to reference any out-of-scope
// variables" hatası alınır.
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockRouterPush(...a) } }));

const product = {
  id: 'p-1',
  title: 'Test Ürün',
  price: 100,
  images: [],
} as never;

describe('ProductCard tıklama takibi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('karta basınca tıklama kaydedilir', () => {
    const { getByText } = render(<ProductCard product={product} />);
    fireEvent.press(getByText('Test Ürün'));
    expect(productsApi.recordClick).toHaveBeenCalledWith('p-1');
  });

  it('takip başarısız olsa bile navigasyon çalışır', () => {
    (productsApi.recordClick as jest.Mock).mockRejectedValueOnce(new Error('ağ'));
    const { getByText } = render(<ProductCard product={product} />);
    fireEvent.press(getByText('Test Ürün'));
    expect(mockRouterPush).toHaveBeenCalledWith('/product/p-1');
  });

  it('onPress override edildiğinde de tıklama kaydedilir', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ProductCard product={product} onPress={onPress} />);
    fireEvent.press(getByText('Test Ürün'));
    expect(productsApi.recordClick).toHaveBeenCalledWith('p-1');
    expect(onPress).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest productCardClick --forceExit 2>&1 | tail -25`

Expected: FAIL — `productsApi.recordClick is not a function` veya çağrılmadı.

- [ ] **Step 3: API ucunu ekle**

`src/lib/api/products.ts`'te `incrementView` tanımının hemen altına ekle:

```ts
  /** İlan kartı tıklama sayacını artır — web ile parite (POST /products/:id/click).
   *  Fire-and-forget: hata navigasyonu engellememeli. */
  recordClick: (id: string | number) =>
    api.post(`/products/${id}/click`),
```

- [ ] **Step 4: ProductCard'a bağla**

`src/components/product/ProductCard.tsx`'te dosyanın API import'una `productsApi`'yi ekle (mevcut `@/lib/api` import'u varsa ona ekle, yoksa yeni satır):

```ts
import { productsApi } from '@/lib/api';
```

`handlePress`'i şununla değiştir:

```tsx
  const handlePress = () => {
    // Fire-and-forget sıralama sinyali; hata navigasyonu engellemez.
    void productsApi.recordClick(product.id).catch(() => {});
    if (onPress) return onPress();
    router.push(`/product/${product.id}`);
  };
```

- [ ] **Step 5: Test'i çalıştır, geçtiğini gör**

Run: `npx jest productCardClick --forceExit 2>&1 | tail -25`

Expected: PASS — 3 test yeşil.

- [ ] **Step 6: Temeli doğrula**

Run: `npx tsc --noEmit 2>&1 | tail -5` → boş
Run: `npx eslint src/components/product/ProductCard.tsx src/lib/api/products.ts` → 0 hata
Run: `npx jest --forceExit 2>&1 | grep -E "Suites|Tests:"` → 0 failed

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/products.ts src/components/product/ProductCard.tsx src/components/product/__tests__/productCardClick.test.tsx
git commit -m "$(cat <<'EOF'
feat(catalog): ürün kartı tıklama takibi (POST /products/:id/click)

Web paritesi. ProductCard.handlePress tüm kart tıklamalarının tek geçiş
noktası — 16 ekran bu bileşeni kullanıyor. Fire-and-forget: takip hatası
navigasyonu engellemiyor.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Üyelik haklarını API'den oku (#16)

**Files:**
- Create: `src/hooks/useMembershipLimits.ts`
- Create: `src/hooks/__tests__/useMembershipLimits.test.ts`
- Modify: `src/stores/authStore.ts`
- Modify: `src/hooks/useAds.ts`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `membershipApi.getLimits()` (`src/lib/api/membership.ts:8` — `GET /membership/me/limits`), `qk.membershipLimits.mine` (`src/lib/query/keys.ts:200`)
- Produces: `useMembershipLimits()` → `{ limits: MembershipLimits | null, isLoading: boolean }`, `mapServerLimits()`, ve `authStore.setServerLimits()`. Sonraki task'lar kullanmaz.

**Bağlam:** `src/stores/authStore.ts:118` içindeki `TIER_LIMITS` sabit tablosu üyelik haklarını istemcide sabitliyor; admin sunucudan limitleri değiştirdiğinde tablo sessizce bayatlıyor. `src/hooks/useAds.ts:22-34` **zaten** doğru deseni uyguluyor (API'den `isAdFree`, 5 dk `staleTime`, hata halinde `null`).

**Yaklaşım — neden store'a yazıyoruz:** Hakları okuyan üç fonksiyon (`canPerformAction:81`, `shouldShowUpgradePrompt:271`, `getRemainingCount:298`) **hook değil**, `useAuthStore.getState()` okuyan düz fonksiyonlar. Bunlara parametre eklemek her çağıranı değiştirmeyi gerektirir. Store'da **zaten** `limits: MembershipLimits | null` alanı var ve dört yerde `TIER_LIMITS[tier]`'den doldruluyor (`:329`, `:393`, `:466`, `:526`). Doğru hamle: sunucudan gelen değerleri store'a **yazmak** ve bu dört yerde `TIER_LIMITS` üzerine bindirmek. Böylece üç yardımcı fonksiyon **hiç değişmez** ama artık sunucu değerini okur.

Bu, "store fetch etmez" kuralını bozmaz: **fetch'i hook yapar**, store yalnız sonucu tutar.

**API'nin sağlamadığı iki alan `TIER_LIMITS`'ten gelmeye devam eder:** `maxAddresses` (10) ve `maxSavedSearches` (5). Gerekçe: adres üst sınırı `10-profile-settings.md` §6'da bir **arayüz kuralı**, kayıtlı aramalar ise `02-catalog-search.md` §5'e göre tamamen yerel (backend yok). Bunlar üyelik hakkı değil, istemci kapasitesi. Bindirme kısmi olduğu için bu alanlar korunur.

**Alan eşlemesi (API → yerel isim):**

| Yerel | API (`MembershipLimitsDto`) |
|---|---|
| `maxListings` | `maxTotalListings` |
| `maxImagesPerListing` | `maxImages` |
| `canCreateCollections` | `canCreateCollection` |
| `canTrade` | `canTrade` |
| `isAdFree` | `isAdFree` |

**API'nin sağlamadığı iki alan istemci sabiti olarak KALIR:** `maxAddresses` (10) ve `maxSavedSearches` (5). Gerekçe: adres üst sınırı `10-profile-settings.md` §6'da bir **arayüz kuralı** olarak tanımlı, kayıtlı aramalar ise `02-catalog-search.md` §5'e göre tamamen yerel (backend yok). Bunlar üyelik hakkı değil, istemci kapasitesi.

- [ ] **Step 1: Failing test'i yaz**

`src/hooks/__tests__/useMembershipLimits.test.ts` oluştur:

```ts
import { mapServerLimits } from '../useMembershipLimits';

describe('mapServerLimits', () => {
  it('API alan adlarını yerel isimlere çevirir', () => {
    const mapped = mapServerLimits({
      maxTotalListings: 200,
      maxImages: 10,
      canCreateCollection: true,
      canTrade: true,
      isAdFree: true,
    });
    expect(mapped).toEqual({
      maxListings: 200,
      maxImagesPerListing: 10,
      canCreateCollections: true,
      canTrade: true,
      isAdFree: true,
    });
  });

  it('null girdide null döner (sunucuya ulaşılamadı)', () => {
    expect(mapServerLimits(null)).toBeNull();
  });

  it('sunucunun vermediği alan için ANAHTAR HİÇ KONMAZ', () => {
    // Kritik: bindirme `{ ...TIER_LIMITS[tier], ...override }` şeklinde.
    // Anahtar `undefined` değeriyle konsaydı TIER_LIMITS değerini EZERDİ.
    const mapped = mapServerLimits({ canTrade: false })!;
    expect(mapped.canTrade).toBe(false);
    expect('maxListings' in mapped).toBe(false);
    expect('maxImagesPerListing' in mapped).toBe(false);
  });

  it('false ve 0 değerleri korunur (falsy tuzağı)', () => {
    const mapped = mapServerLimits({ canTrade: false, isAdFree: false, maxTotalListings: 0 })!;
    expect(mapped.canTrade).toBe(false);
    expect(mapped.isAdFree).toBe(false);
    expect(mapped.maxListings).toBe(0);
  });
});
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest useMembershipLimits --forceExit 2>&1 | tail -25`

Expected: FAIL — modül yok.

> **Adım sırası önemli:** önce store (tip + alan + action), sonra hook. Hook
> store'dan `ServerLimitsOverride` tipini ve `setServerLimits` action'ını
> kullanıyor; ters sırada derlenmez.

- [ ] **Step 3: authStore'a bindirme tipini, alanını ve action'ını ekle**

`src/stores/authStore.ts`'te beş düzenleme:

**(a)** `MembershipLimits` arayüzünün (satır ~78) hemen altına bindirme tipini **burada** tanımla — hook bunu buradan import edecek (ters yön döngü yaratırdı):

```ts
/** Sunucunun sağladığı hak alanları. Sağlanmayan alan için anahtar HİÇ
 *  konmaz; `{ ...TIER_LIMITS[tier], ...override }` bindirmesinde o alan
 *  sabit tablodan gelmeye devam eder. */
export type ServerLimitsOverride = Partial<
  Pick<
    MembershipLimits,
    'maxListings' | 'maxImagesPerListing' | 'canCreateCollections' | 'canTrade' | 'isAdFree'
  >
>;
```

Ardından `AuthState` arayüzüne (satır ~96-117 arası) iki satır ekle:

```ts
  /** Sunucudan gelen hak bindirmesi (GET /membership/me/limits).
   *  Fetch'i useMembershipLimits yapar; store yalnız tutar. */
  serverLimits: ServerLimitsOverride | null;
  setServerLimits: (v: ServerLimitsOverride) => void;
```

**(b)** Store'un başlangıç durumuna `serverLimits: null,` ekle (diğer alanların yanına).

**(c)** Bindirmeyi hesaplayan bir yardımcı ekle (`TIER_LIMITS` tanımının hemen altına):

```ts
/** Sabit tier tablosu + sunucu bindirmesi. Sunucu bir alanı vermiyorsa
 *  o alan TIER_LIMITS'ten gelir (ör. maxAddresses, maxSavedSearches). */
const mergeLimits = (
  tier: MembershipTier,
  override: ServerLimitsOverride | null,
): MembershipLimits => ({ ...TIER_LIMITS[tier], ...(override ?? {}) });
```

**(d)** `limits`'in hesaplandığı **dört** yeri `mergeLimits`'e çevir:

| Satır | Şu an | Olacak |
|---|---|---|
| ~329 (`login`) | `const limits = TIER_LIMITS[mappedUser.membershipTier];` | `const limits = mergeLimits(mappedUser.membershipTier, get().serverLimits);` |
| ~393 (`loadToken`) | `const limits = TIER_LIMITS[mappedUser.membershipTier];` | `const limits = mergeLimits(mappedUser.membershipTier, get().serverLimits);` |
| ~466 (`updateUser`) | `const limits = TIER_LIMITS[updatedUser.membershipTier];` | `const limits = mergeLimits(updatedUser.membershipTier, get().serverLimits);` |
| ~476 (`refreshUserData`) | `const limits = TIER_LIMITS[mappedUser.membershipTier];` | `const limits = mergeLimits(mappedUser.membershipTier, get().serverLimits);` |

`getMembershipLimits()` helper'ı (~satır 523) da:

```ts
  getMembershipLimits: () => {
    const { user, serverLimits } = get();
    return mergeLimits(user?.membershipTier || 'free', serverLimits);
  },
```

**(e)** `setServerLimits` action'ını ekle — bindirmeyi kaydeder **ve** mevcut `limits`'i anında tazeler:

```ts
  setServerLimits: (v: ServerLimitsOverride) => {
    const tier = get().user?.membershipTier || 'free';
    set({ serverLimits: v, limits: mergeLimits(tier, v) });
  },
```

`login`/`loadToken`/`refreshUserData` içinde `get()` erişilebilir değilse zustand'ın `(set, get) => ({...})` imzasını kullan (store zaten bu biçimde).

> `src/utils/membershipLimits.ts`'e **DOKUNMA.** Üç yardımcı fonksiyon (`canPerformAction`, `shouldShowUpgradePrompt`, `getRemainingCount`) store'daki `limits`'i okur; bindirme sayesinde artık sunucu değerini görürler. Değişiklik gerekmiyor — bu, bu tasarımın asıl kazancı.

- [ ] **Step 4: Hook'u ve eşlemeyi yaz**

`src/hooks/useMembershipLimits.ts` oluştur:

```ts
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore, type ServerLimitsOverride } from '@/stores/authStore';

// NOT: `ServerLimitsOverride` store'da tanımlıdır. Bu hook zaten store'u
// import ettiği için tipi burada tanımlayıp store'a import ettirmek
// döngüsel bağımlılık yaratırdı.

/** Sunucudan gelen ham hak zarfı (GET /membership/me/limits). */
export type ServerLimitsDto = {
  maxTotalListings?: number;
  maxImages?: number;
  canCreateCollection?: boolean;
  canTrade?: boolean;
  isAdFree?: boolean;
};

export function mapServerLimits(dto: ServerLimitsDto | null): ServerLimitsOverride | null {
  if (!dto) return null;
  const out: ServerLimitsOverride = {};
  if (dto.maxTotalListings !== undefined) out.maxListings = dto.maxTotalListings;
  if (dto.maxImages !== undefined) out.maxImagesPerListing = dto.maxImages;
  if (dto.canCreateCollection !== undefined) out.canCreateCollections = dto.canCreateCollection;
  if (dto.canTrade !== undefined) out.canTrade = dto.canTrade;
  if (dto.isAdFree !== undefined) out.isAdFree = dto.isAdFree;
  return out;
}

/**
 * Üyelik haklarının sunucu kaynağı. Sonucu authStore'a yazar; oradaki
 * `limits` alanı TIER_LIMITS üzerine bu değerlerle bindirilir. Böylece
 * `canPerformAction` / `shouldShowUpgradePrompt` / `getRemainingCount`
 * hiç değişmeden sunucu değerini okur.
 *
 * Fetch'i bu hook yapar, store yalnız sonucu tutar (CLAUDE.md §8).
 * Sunucuya ulaşılamazsa override yazılmaz — TIER_LIMITS yedek kalır.
 */
export function useMembershipLimits() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setServerLimits = useAuthStore((s) => s.setServerLimits);
  const limits = useAuthStore((s) => s.limits);

  const query = useQuery({
    queryKey: qk.membershipLimits.mine,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const res = await membershipApi.getLimits();
        const raw = ((res.data as any)?.data ?? res.data ?? null) as ServerLimitsDto | null;
        return mapServerLimits(raw);
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (query.data) setServerLimits(query.data);
  }, [query.data, setServerLimits]);

  return { limits, isLoading: query.isLoading };
}
```

`useEffect`'i `react`'ten import etmeyi unutma.

- [ ] **Step 5: Test'i çalıştır, geçtiğini gör**

Run: `npx jest useMembershipLimits --forceExit 2>&1 | tail -25`

Expected: PASS — 4 test yeşil.

- [ ] **Step 6: `useAds`'i paylaşılan hook'a geçir**

`src/hooks/useAds.ts`'te kopya `limitsQuery` bloğunu (satır ~22-34) sil, yerine:

```ts
import { useMembershipLimits } from './useMembershipLimits';
```

fonksiyon gövdesinde:

```ts
  const { limits } = useMembershipLimits();
  const isAdFree = limits?.isAdFree === true;
```

Artık kullanılmayan `membershipApi` / `qk` / `useQuery` / `useAuthStore` import'larını kaldır (eslint `no-unused-vars` uyaracak).

- [ ] **Step 7: Hook'u uygulama kökünde bir kez bağla**

`app/_layout.tsx`'te, mevcut `useCartMergeOnLogin()` çağrısının yanına ekle:

```ts
import { useMembershipLimits } from '@/hooks/useMembershipLimits';
```

ve aynı bileşenin gövdesinde:

```ts
  useMembershipLimits();
```

Böylece oturum açıldığında haklar bir kez çekilir ve store'a yazılır; `useAds` ve diğer tüketiciler aynı önbelleği paylaşır (`qk.membershipLimits.mine`).

- [ ] **Step 8: Bindirmenin gerçekten çalıştığını doğrula**

Run: `grep -rn "TIER_LIMITS" src app | grep -v __tests__`

Expected: yalnız `src/stores/authStore.ts` — tanım (`:118`) ve `mergeLimits` içindeki tek kullanım. Başka dosyada doğrudan `TIER_LIMITS` okuması kalmamalı.

- [ ] **Step 9: Temeli doğrula**

Run: `npx tsc --noEmit 2>&1 | tail -5` → boş
Run: `npx eslint . --quiet 2>&1 | tail -3` → 0 hata
Run: `npx jest --forceExit 2>&1 | grep -E "Suites|Tests:"` → 0 failed

Ayrıca `authStore` testleri varsa özellikle çalıştır — bindirme mantığı oraya dokunuyor:
Run: `npx jest authStore --forceExit 2>&1 | tail -15`

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(membership): üyelik haklarını API'den oku, sabit tabloyu yedeğe düşür

TIER_LIMITS istemcide sabitti; admin sunucudan limit değiştirdiğinde
sessizce bayatlıyordu. Yeni useMembershipLimits hook'u
GET /membership/me/limits'i çekip authStore'a bindirme olarak yazıyor;
store'daki `limits` alanı artık TIER_LIMITS üzerine sunucu değerleriyle
bindiriliyor.

Bu sayede canPerformAction / shouldShowUpgradePrompt / getRemainingCount
HİÇ DEĞİŞMEDEN sunucu değerini okuyor — store'daki limits'i zaten
okuyorlardı. Fetch'i hook yapıyor, store yalnız tutuyor (CLAUDE.md §8).

maxAddresses ve maxSavedSearches sunucuda yok; bindirme kısmi olduğu için
TIER_LIMITS'ten gelmeye devam ediyorlar (adres sınırı arayüz kuralı,
kayıtlı aramalar tamamen yerel).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: E-posta değişikliği (OTP) (#12a)

**Files:**
- Modify: `src/lib/api/auth.ts`
- Create: `app/settings/email-change/index.tsx`
- Create: `app/settings/email-change/_lib/schema.ts`
- Create: `app/settings/email-change/_hooks/useEmailChange.ts`
- Create: `app/settings/email-change/__tests__/email-change.test.tsx`
- Modify: `app/settings/edit-profile/index.tsx`

**Interfaces:**
- Consumes: `@/ui/form` (`useZodForm`, `Form`, `FormInput`), `@/ui` (`Button`, `Alert`, `ScreenHeader`, `Text`, `appAlert`)
- Produces: `/settings/email-change` rotası. Task 5 bundan bağımsız.

**Sözleşme (`10-profile-settings.md` §3):**

| Method | Path | Gövde | Not |
|---|---|---|---|
| `POST` | `/auth/email/request-change` | `{ newEmail }` | Kod **yeni adrese** gider, throttle 3/dk |
| `POST` | `/auth/email/verify-change` | `{ code }` | 6 hane, throttle 10/dk, yanıt `{ email }` |

İki adımlı: yeni e-posta → 6 haneli kod. **Mevcut e-posta doğrulama bitene kadar aktif kalır.**

- [ ] **Step 1: Failing test'i yaz**

`app/settings/email-change/__tests__/email-change.test.tsx` oluştur:

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EmailChangeScreen from '../index';
import { authApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  authApi: {
    requestEmailChange: jest.fn(() => Promise.resolve({ data: { message: 'ok' } })),
    verifyEmailChange: jest.fn(() => Promise.resolve({ data: { email: 'yeni@ornek.com' } })),
  },
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const renderScreen = () => render(<EmailChangeScreen />);

describe('E-posta değişikliği', () => {
  beforeEach(() => jest.clearAllMocks());

  it('geçersiz e-posta gönderilmez', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('email-change-input'), 'gecersiz');
    fireEvent.press(getByTestId('email-change-request'));
    await waitFor(() => expect(authApi.requestEmailChange).not.toHaveBeenCalled());
  });

  it('geçerli e-posta ile kod istenir ve kod adımına geçilir', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('email-change-input'), 'yeni@ornek.com');
    fireEvent.press(getByTestId('email-change-request'));
    await waitFor(() =>
      expect(authApi.requestEmailChange).toHaveBeenCalledWith('yeni@ornek.com'),
    );
    await waitFor(() => expect(getByTestId('email-change-code')).toBeTruthy());
  });

  it('6 haneden kısa kod doğrulamaya gönderilmez', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('email-change-input'), 'yeni@ornek.com');
    fireEvent.press(getByTestId('email-change-request'));
    await waitFor(() => expect(getByTestId('email-change-code')).toBeTruthy());
    fireEvent.changeText(getByTestId('email-change-code'), '123');
    fireEvent.press(getByTestId('email-change-verify'));
    await waitFor(() => expect(authApi.verifyEmailChange).not.toHaveBeenCalled());
  });

  it('6 haneli kod doğrulanır', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('email-change-input'), 'yeni@ornek.com');
    fireEvent.press(getByTestId('email-change-request'));
    await waitFor(() => expect(getByTestId('email-change-code')).toBeTruthy());
    fireEvent.changeText(getByTestId('email-change-code'), '123456');
    fireEvent.press(getByTestId('email-change-verify'));
    await waitFor(() => expect(authApi.verifyEmailChange).toHaveBeenCalledWith('123456'));
  });
});
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest email-change --forceExit 2>&1 | tail -25`

Expected: FAIL — ekran modülü yok.

- [ ] **Step 3: API uçlarını ekle**

`src/lib/api/auth.ts`'te `verifyPhone` tanımının altına ekle:

```ts
  /** E-posta değişikliği kodu gönder — kod YENİ adrese gider (throttle 3/dk). */
  requestEmailChange: (newEmail: string) =>
    api.post<{ message: string }>('/auth/email/request-change', { newEmail }),
  /** E-posta değişikliği kodunu doğrula (throttle 10/dk). */
  verifyEmailChange: (code: string) =>
    api.post<{ message: string; email: string }>('/auth/email/verify-change', { code }),
```

- [ ] **Step 4: Şemayı yaz**

`app/settings/email-change/_lib/schema.ts` oluştur:

```ts
import { z } from 'zod';

export const emailChangeSchema = z.object({
  newEmail: z.string().trim().min(1, 'E-posta gerekli').email('Geçerli bir e-posta girin'),
});

export const emailCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, '6 haneli kodu girin'),
});

export type EmailChangeInput = z.input<typeof emailChangeSchema>;
export type EmailCodeInput = z.input<typeof emailCodeSchema>;
```

- [ ] **Step 5: Controller hook'unu yaz**

`app/settings/email-change/_hooks/useEmailChange.ts` oluştur:

```ts
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { emailChangeSchema, emailCodeSchema } from '../_lib/schema';

/** Sunucu hata mesajı string veya string[] gelebilir (NestJS doğrulama dizisi). */
const errorText = (e: unknown, fallback: string): string => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join('\n') : (m ?? fallback);
};

export function useEmailChange() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [pendingEmail, setPendingEmail] = useState('');
  const { updateUser } = useAuthStore();

  const emailForm = useZodForm(emailChangeSchema, { defaultValues: { newEmail: '' } });
  const codeForm = useZodForm(emailCodeSchema, { defaultValues: { code: '' } });

  const request = useMutation({
    mutationFn: (newEmail: string) => authApi.requestEmailChange(newEmail),
    onSuccess: (_res, newEmail) => {
      setPendingEmail(newEmail);
      setStep('code');
      appAlert('Kod gönderildi', `Doğrulama kodu ${newEmail} adresine gönderildi.`);
    },
    onError: (e) => appAlert('Gönderilemedi', errorText(e, 'Kod gönderilemedi. Tekrar deneyin.')),
  });

  const verify = useMutation({
    mutationFn: (code: string) => authApi.verifyEmailChange(code),
    onSuccess: (res) => {
      const email = (res.data as { email?: string })?.email;
      if (email) updateUser({ email });
      appAlert('E-posta güncellendi', 'Yeni e-posta adresiniz doğrulandı.');
      router.back();
    },
    onError: (e) => appAlert('Doğrulanamadı', errorText(e, 'Kod doğrulanamadı. Tekrar deneyin.')),
  });

  return {
    step,
    pendingEmail,
    emailForm,
    codeForm,
    submitEmail: emailForm.handleSubmit((v) => request.mutate(v.newEmail.trim())),
    submitCode: codeForm.handleSubmit((v) => verify.mutate(v.code.trim())),
    isRequesting: request.isPending,
    isVerifying: verify.isPending,
  };
}
```

- [ ] **Step 6: Ekranı yaz**

`app/settings/email-change/index.tsx` oluştur:

```tsx
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Alert, Button, ScreenHeader, Text, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useEmailChange } from './_hooks/useEmailChange';

export default function EmailChangeScreen() {
  const f = useEmailChange();

  return (
    <View style={styles.container}>
      <ScreenHeader title="E-posta Değiştir" onBack={() => router.back()} />
      <View style={styles.body}>
        <Alert variant="info" title="Mevcut e-postanız aktif kalır">
          Yeni adresinizi doğrulayana kadar hesabınız mevcut e-posta ile çalışmaya devam eder.
        </Alert>

        {f.step === 'email' ? (
          <Form form={f.emailForm}>
            <FormInput
              name="newEmail"
              label="Yeni e-posta"
              placeholder="yeni@ornek.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-change-input"
            />
            <Button
              title="Doğrulama kodu gönder"
              onPress={f.submitEmail}
              isLoading={f.isRequesting}
              testID="email-change-request"
            />
          </Form>
        ) : (
          <Form form={f.codeForm}>
            <Text variant="bodySm" style={styles.hint}>
              {f.pendingEmail} adresine gönderilen 6 haneli kodu girin.
            </Text>
            <FormInput
              name="code"
              label="Doğrulama kodu"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              testID="email-change-code"
            />
            <Button
              title="Doğrula"
              onPress={f.submitCode}
              isLoading={f.isVerifying}
              testID="email-change-verify"
            />
          </Form>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT },
  body: { padding: theme.spacing[4], gap: theme.spacing[4] },
  hint: { color: theme.colors.text.muted },
});
```

> `@/ui` ve `@/ui/form` prop adlarını kaynaktan (`src/ui/index.ts`, `src/ui/components/form/Form.tsx`) **teyit et**; uymayan varsa `app/(auth)/corporate-invite/index.tsx`'teki çalışan kullanımı örnek al.

- [ ] **Step 7: Test'i çalıştır, geçtiğini gör**

Run: `npx jest email-change --forceExit 2>&1 | tail -25`

Expected: PASS — 4 test yeşil.

- [ ] **Step 8: `edit-profile`'dan bağla — menüden erişilemeyen ekran bırakma**

`app/settings/edit-profile/index.tsx`'e, kaydet butonunun yakınına bir satır ekle:

```tsx
        <Button
          variant="ghost"
          title="E-posta Değiştir"
          onPress={() => router.push('/settings/email-change')}
          testID="edit-profile-email-change"
        />
```

Dosyada `router` import'u yoksa `import { router } from 'expo-router';` ekle.

- [ ] **Step 9: Temeli doğrula**

Run: `npx tsc --noEmit 2>&1 | tail -5` → boş
Run: `npx eslint "app/settings/email-change" "app/settings/edit-profile/index.tsx" src/lib/api/auth.ts` → 0 hata
Run: `npx jest --forceExit 2>&1 | grep -E "Suites|Tests:"` → 0 failed
Run: `wc -l app/settings/email-change/index.tsx` → < 150

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(profile): e-posta değişikliği OTP akışı

POST /auth/email/request-change -> /auth/email/verify-change. Kod yeni
adrese gider; mevcut e-posta doğrulama bitene kadar aktif kalır.
edit-profile ekranından bağlandı (menüden erişilemeyen ekran bırakmamak
için).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Kullanıcı adı talebi (#12b)

**Files:**
- Modify: `src/lib/api/user.ts`
- Create: `app/settings/username/index.tsx`
- Create: `app/settings/username/_lib/schema.ts`
- Create: `app/settings/username/_hooks/useClaimUsername.ts`
- Create: `app/settings/username/__tests__/username.test.tsx`
- Modify: `app/settings/edit-profile/index.tsx`

**Interfaces:**
- Consumes: Task 4'te `edit-profile`'a eklenen bağlantı deseni (aynı yere ikinci bir buton eklenir)
- Produces: `/settings/username` rotası.

**Sözleşme (`10-profile-settings.md` §5):**

| Method | Path | Gövde | Not |
|---|---|---|---|
| `PATCH` | `/users/me/username` | `{ username }` | Yanıt `{ username, usernameClaimed: true }` |

> **Canlı uygunluk kontrolü (`GET /auth/username-availability`) bu plana DAHİL DEĞİL.**
> Sunucu zaten alınmış adı reddediyor ve hata mesajı kullanıcıya gösteriliyor; canlı
> kontrol debounce + ayrı sorgu getirir ve bugün kullanılmayan bir API yüzeyi açar.
> İhtiyaç doğarsa ayrı iş olarak eklenir. **Bu ucu ekleme.**

Kural: küçük harf, boşluksuz, 3–30, `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$`, **bir kez belirlenince değiştirilemez**. Giriş yalnız `usernameClaimed` false iken gösterilir; alınmışsa salt okunur `@kullaniciadi` kartı.

- [ ] **Step 1: Failing test'i yaz**

`app/settings/username/__tests__/username.test.tsx` oluştur:

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import UsernameScreen from '../index';
import { userApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  userApi: { claimUsername: jest.fn(() => Promise.resolve({ data: { username: 'kaan.merakli', usernameClaimed: true } })) },
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const mockUser = { username: '', usernameClaimed: false };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: mockUser, updateUser: jest.fn() }),
}));

describe('Kullanıcı adı talebi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.username = '';
    mockUser.usernameClaimed = false;
  });

  it('kalıcı olduğu açıkça yazılır', () => {
    const { getByTestId } = render(<UsernameScreen />);
    expect(getByTestId('username-permanent-warning')).toBeTruthy();
  });

  it('geçersiz kullanıcı adı gönderilmez', async () => {
    const { getByTestId } = render(<UsernameScreen />);
    fireEvent.changeText(getByTestId('username-input'), 'AA');
    fireEvent.press(getByTestId('username-submit'));
    await waitFor(() => expect(userApi.claimUsername).not.toHaveBeenCalled());
  });

  it('geçerli kullanıcı adı gönderilir', async () => {
    const { getByTestId } = render(<UsernameScreen />);
    fireEvent.changeText(getByTestId('username-input'), 'kaan.merakli');
    fireEvent.press(getByTestId('username-submit'));
    await waitFor(() => expect(userApi.claimUsername).toHaveBeenCalledWith('kaan.merakli'));
  });

  it('kullanıcı adı alınmışsa form gösterilmez', () => {
    mockUser.username = 'kaan.merakli';
    mockUser.usernameClaimed = true;
    const { queryByTestId, getByTestId } = render(<UsernameScreen />);
    expect(queryByTestId('username-input')).toBeNull();
    expect(getByTestId('username-claimed')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Test'i çalıştır, başarısız olduğunu gör**

Run: `npx jest settings/username --forceExit 2>&1 | tail -25`

Expected: FAIL — ekran modülü yok.

- [ ] **Step 3: API ucunu ekle**

`src/lib/api/user.ts`'te `updateProfile`'ın yanına:

```ts
  /** Değiştirilemez kullanıcı adını bir kez belirle — PATCH /users/me/username. */
  claimUsername: (username: string) =>
    api.patch<{ username: string; usernameClaimed: boolean }>('/users/me/username', { username }),
```

Başka uç eklenmez (canlı uygunluk kontrolü kapsam dışı — yukarıdaki nota bak).

- [ ] **Step 4: Şemayı yaz**

`app/settings/username/_lib/schema.ts` oluştur:

```ts
import { z } from 'zod';

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

export const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'En az 3 karakter')
    .max(30, 'En fazla 30 karakter')
    .regex(USERNAME_PATTERN, 'Yalnız küçük harf, rakam, nokta ve alt çizgi; başta/sonda nokta olamaz'),
});

export type UsernameInput = z.input<typeof usernameSchema>;
```

- [ ] **Step 5: Controller hook'unu yaz**

`app/settings/username/_hooks/useClaimUsername.ts` oluştur:

```ts
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { usernameSchema } from '../_lib/schema';

const errorText = (e: unknown, fallback: string): string => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join('\n') : (m ?? fallback);
};

export function useClaimUsername() {
  const { user, updateUser } = useAuthStore();
  const claimed = !!user?.usernameClaimed;

  const form = useZodForm(usernameSchema, { defaultValues: { username: '' } });

  const claim = useMutation({
    mutationFn: (username: string) => userApi.claimUsername(username),
    onSuccess: (res) => {
      const username = (res.data as { username?: string })?.username;
      if (username) updateUser({ username, usernameClaimed: true });
      appAlert('Kullanıcı adı belirlendi', 'Kullanıcı adınız kalıcı olarak kaydedildi.');
      router.back();
    },
    onError: (e) => appAlert('Belirlenemedi', errorText(e, 'Kullanıcı adı kaydedilemedi.')),
  });

  return {
    claimed,
    currentUsername: user?.username ?? '',
    form,
    submit: form.handleSubmit((v) => claim.mutate(v.username.trim().toLowerCase())),
    isSubmitting: claim.isPending,
  };
}
```

> `useAuthStore`'daki `User` tipinde `usernameClaimed` alanı yoksa **ekle** (`src/stores/authStore.ts`); `updateUser` kısmi güncellemeyi zaten destekliyor.

- [ ] **Step 6: Ekranı yaz**

`app/settings/username/index.tsx` oluştur:

```tsx
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Alert, Button, Card, ScreenHeader, Text, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useClaimUsername } from './_hooks/useClaimUsername';

export default function UsernameScreen() {
  const f = useClaimUsername();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Kullanıcı Adı" onBack={() => router.back()} />
      <View style={styles.body}>
        {f.claimed ? (
          <Card testID="username-claimed">
            <Text variant="h3">@{f.currentUsername}</Text>
            <Text variant="bodySm" style={styles.hint}>
              Kullanıcı adı bir kez belirlenir ve değiştirilemez.
            </Text>
          </Card>
        ) : (
          <>
            <Alert variant="warning" title="Bu seçim kalıcıdır" testID="username-permanent-warning">
              Kullanıcı adı bir kez belirlenir ve sonradan değiştirilemez.
            </Alert>
            <Form form={f.form}>
              <FormInput
                name="username"
                label="Kullanıcı adı"
                placeholder="kaan.merakli"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                testID="username-input"
              />
              <Button
                title="Kullanıcı adını belirle"
                onPress={f.submit}
                isLoading={f.isSubmitting}
                testID="username-submit"
              />
            </Form>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT },
  body: { padding: theme.spacing[4], gap: theme.spacing[4] },
  hint: { color: theme.colors.text.muted, marginTop: theme.spacing[1] },
});
```

- [ ] **Step 7: Test'i çalıştır, geçtiğini gör**

Run: `npx jest settings/username --forceExit 2>&1 | tail -25`

Expected: PASS — 4 test yeşil.

- [ ] **Step 8: `edit-profile`'dan bağla**

Task 4'te eklenen "E-posta Değiştir" butonunun yanına:

```tsx
        <Button
          variant="ghost"
          title="Kullanıcı Adı"
          onPress={() => router.push('/settings/username')}
          testID="edit-profile-username"
        />
```

- [ ] **Step 9: Temeli doğrula**

Run: `npx tsc --noEmit 2>&1 | tail -5` → boş
Run: `npx eslint "app/settings/username" "app/settings/edit-profile/index.tsx" src/lib/api/user.ts` → 0 hata
Run: `npx jest --forceExit 2>&1 | grep -E "Suites|Tests:"` → 0 failed
Run: `wc -l app/settings/username/index.tsx` → < 150

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(profile): kullanıcı adı talebi ekranı

PATCH /users/me/username ile tek seferlik kullanıcı adı belirleme.
Kalıcı olduğu ekranda açıkça yazılı; alınmışsa form gizlenip salt
okunur @kullaniciadi kartı gösteriliyor. edit-profile'dan bağlandı.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Plan sonrası (bu planın dışında)

- **P1 tamamlanır.** Kalan parite işi P2'dir: menüden erişilemeyen ~22 ekran, i18n'e taşınmamış gömülü Türkçe metinler, `GET /orders/:id/my-review`, `typing:start/stop` yayını, satıcı iade gelen kutusu.
- `TIER_LIMITS` tablosu Task 3'ten sonra yalnız **yedek** rolündedir; sunucu alanları genişlerse tablo tamamen kaldırılabilir.
