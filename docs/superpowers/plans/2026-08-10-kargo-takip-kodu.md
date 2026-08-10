# Kargo Akışı ve Takip Kodu — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satıcı kargo akışını sunucunun yaşam döngüsüne getirmek ve kullanıcıya
rolüne göre **doğru numarayı** göstermek — bugün mobil, sunucunun iç referansını
alıcıya "takip numarası" diye basıyor ve ondan bozuk bir link kuruyor.

**Architecture:** İki saf birim (`buildTrackingUrl` + `deriveShipmentView`) tek
kod kaynağı olur; `useOrderShipment` kargo kaydını okur ve `404`'ü "kargo yok"a
çevirir. Satıcı akışı tersine döner: koşulsuz `POST /shipping` yerine önce oku,
`POST` yalnız onarım yolu. Elle takip numarası girişi kalkar.

**Tech Stack:** Expo SDK 54 + expo-router, TanStack Query, axios, Jest +
@testing-library/react-native, i18next.

**Spec:** `docs/superpowers/specs/2026-08-10-kargo-takip-kodu-design.md`

## Global Constraints

- **`trackingUrl` sunucudan OKUNMAZ.** 13 kayıtta ölçüldü: gerçek kod varsa alan
  `null`, yoksa iç referansı taşıyan bozuk bir Sürat linki. Link
  `providerTrackingId`'den **kurulur**.
- **İki numara, iki iş:** `trackingNumber` (`PKG-…`/`ORD-…`) satıcının şubeye
  verdiği **referans**; `providerTrackingId` iki tarafın kullandığı **takip
  numarası**. Alıcı `PKG-`'yi **hiç görmez**.
- **`POST /shipping` yalnız onarım yolu:** shipment `404` **ve** sipariş
  `preparing` **ve** kullanıcı satıcı. Aksi halde çağrılmaz.
- **Bilinmeyen shipment durumunda ham kod basılmaz** — nötr metin gösterilir.
- Kullanıcıya görünen her metin `src/i18n/lib/catalog/{tr,en}.json`'dan gelir;
  yeni anahtar eklenirse **hem tr hem en** + `pnpm i18n:codegen`.
- Query key'ler `@/lib/query`'den (`qk.*`); elle yazılmaz.
- Tasarım token'ları zorunlu: `theme.colors.*`, `theme.spacing[n]` (sayısal
  anahtar), `theme.radius.*`. Sabit hex/rgba yasak, `TarodanColors` importu yasak.
- Bileşenler kendi koşullarında `null` döner (self-gating); türetmeler saf
  birimlerde toplanır, JSX'te yeniden türetilmez.
- Test komutu: `npx jest <path> --forceExit`. Tip kontrolü: `npx tsc --noEmit`.
- Branch: `feat/kargo-takip-kodu` (açıldı, spec commit'li).

---

## Ölçülmüş gerçek gövde (tipler BUNDAN yazılır)

`GET /shipping/order/:orderId` — staging, 2026-08-10, **tek nesne** (dizi değil):

```jsonc
{
  "id": "038d23b6-d846-4bde-ab48-19f7bb0d656a",
  "orderId": "0cd43fd3-376a-4ef5-b42e-6f74f15b5eec",
  "provider": "surat",
  "trackingNumber": "PKG-CMRGW9D6ZH",   // iç referans
  "providerTrackingId": null,            // gerçek Sürat kodu (henüz yok)
  "trackingUrl": null,
  "status": "label_created",
  "cost": 50,
  "estimatedDelivery": "2026-08-13T11:37:48.537Z",
  "providerRawStatus": null,
  "receivedBy": null,
  "returnReason": null,
  "events": [],
  "createdAt": "2026-08-10T11:37:48.549Z",
  "updatedAt": "2026-08-10T11:37:50.331Z"
}
```

Kargo kaydı yokken: `404 {"message":"Bu sipariş için kargo bulunamadı","error":"Not Found","statusCode":404}`

Mevcut shipment'lı siparişe `POST /shipping` (satıcı olarak):
`400 {"message":"Sipariş hazırlanma durumunda değil","error":"Bad Request","statusCode":400}`

Gerçek kodun geldiği kayıtlar: `providerTrackingId` = `79174212154116`,
`11079211193731`, `18841250533621` — hepsinde `trackingUrl: null`.
Kodu olmayan kayıtlarda `trackingUrl` = `…?kargotakipno=PKG-3BQ2W4JPJ3` (bozuk).

---

## Dosya Yapısı

**Oluşturulacak:**

| Dosya | Sorumluluk |
| --- | --- |
| `src/lib/shipping/tracking.ts` | `buildTrackingUrl` + `deriveShipmentView` — saf, tek kod kaynağı |
| `src/lib/shipping/__tests__/tracking.test.ts` | İki saf birimin sözleşme testleri |
| `src/hooks/useOrderShipment.ts` | `GET /shipping/order/:orderId` query'si; `404` → `null` (cross-route: orders + sales) |
| `src/hooks/__tests__/useOrderShipment.test.tsx` | `404`'ün hata sayılmadığının testi |
| `app/orders/[id]/_lib/shipmentStatus.ts` | Shipment durum etiketleri + nötr fallback |

**Değiştirilecek:**

| Dosya | Değişiklik |
| --- | --- |
| `src/lib/api/orders.ts` | `Shipment` tipi (ölçülmüş gövdeden); `updateTracking` çağrısı kalkınca metodu da sil |
| `src/lib/query/keys.ts` | `qk.shipping.byOrder(orderId)` |
| `app/sales/_hooks/useSaleActions.ts` | Önce oku; elle takip numarası state'i ve `PATCH` çağrısı kalkar |
| `app/sales/_modals/ShipDialog.tsx` | Takip numarası girdisi kalkar; onay diyaloğuna dönüşür |
| `app/orders/[id]/_components/OrderInfoCards.tsx` | `OrderTrackingCard` role duyarlı olur |
| `app/orders/[id]/_lib/types.ts` | `OrderDetail`'e `shipment` alanı |
| `src/i18n/lib/catalog/{tr,en}.json` | Yalnız shipment durum etiketleri (gerekirse) |

---

## Katalogda ZATEN olan anahtarlar — yenisini yazma

Dokuzu da mevcut ve **hiçbiri kullanılmıyor**. Metinleri değiştirme:

| Anahtar | Metin |
| --- | --- |
| `order.cargoReference` | Kargo Referans Numarası |
| `order.trackingNumber` | Takip Numarası |
| `order.cargoRefInstructions` | Paketi Sürat Kargo şubesine teslim ederken bu numarayı veriniz. Gönderi zaten sistemde kayıtlıdır — şube tüm bilgileri otomatik olarak alacaktır. |
| `order.trackingAppearsAfterDropoff` | Şube paketinizi aldığında Sürat takip numarası burada otomatik olarak görünecektir (30 dakika içinde). |
| `order.cargoCodePending` | Kargo numarası oluşturuluyor. Birkaç dakika içinde burada görünecektir. Hazır olduğunda size bildirim göndereceğiz. |
| `order.cargoCodeCopied` | Kargo numarası kopyalandı |
| `order.shipmentPreparingBuyer` | Satıcı paketinizi hazırlıyor. Sürat şubesine teslim edildiği anda takip bilgileri burada görünecek. |
| `order.trackShipment` | Kargoyu takip et |
| `order.trackOnCarrierSite` | (mevcut kartta kullanılıyor) |

---

### Task 1: `buildTrackingUrl` + `deriveShipmentView`

**Files:**
- Create: `src/lib/shipping/tracking.ts`, `src/lib/shipping/__tests__/tracking.test.ts`
- Modify: `src/lib/api/orders.ts` (`Shipment` tipi)

**Interfaces:**
- Consumes: yok
- Produces:
  ```ts
  export type Shipment = {
    id: string; orderId: string; provider: string;
    trackingNumber: string | null;
    providerTrackingId: string | null;
    trackingUrl: string | null;          // OKUNMAZ — yalnız tipin tamlığı için
    status: string;
    cost?: number | null;
    estimatedDelivery?: string | null;
    events?: unknown[];
  };
  export type ShipmentView = {
    cargoCode: string | null;
    reference: string | null;
    isCodePending: boolean;
    trackingUrl: string | null;
  };
  export function buildTrackingUrl(provider: string | null | undefined, code: string | null | undefined): string | null;
  export function deriveShipmentView(s: Shipment | null | undefined, fallbackCargoCode?: string | null): ShipmentView;
  ```

- [ ] **Step 1: Başarısız testi yaz**

`src/lib/shipping/__tests__/tracking.test.ts`:

```ts
/**
 * Kargo numarası tek kaynak.
 *
 * Sunucu aynı gönderi için İKİ numara veriyor ve ikisinin işi farklı:
 *   - `trackingNumber` (`PKG-…`/`ORD-…`) → Tarodan iç referansı. Satıcı bunu
 *     şubede verir. Sürat bu numarayı TANIMAZ.
 *   - `providerTrackingId` → gerçek Sürat kodu. Takip bununla yapılır.
 *
 * `trackingUrl` OKUNMAZ. 2026-08-10 ölçümü (13 kayıt, istisnasız): gerçek kod
 * varsa alan `null`; yoksa iç referansı taşıyan BOZUK bir link
 * (`…?kargotakipno=PKG-3BQ2W4JPJ3`). Link `providerTrackingId`'den kurulur.
 */
import { buildTrackingUrl, deriveShipmentView } from '../tracking';
import type { Shipment } from '@/lib/api';

const BASE = {
  id: 's1',
  orderId: 'o1',
  provider: 'surat',
  trackingNumber: 'PKG-CMRGW9D6ZH',
  providerTrackingId: null,
  trackingUrl: null,
  status: 'label_created',
} as Shipment;

describe('buildTrackingUrl', () => {
  it('Sürat kodundan takip URL"i kurar', () => {
    expect(buildTrackingUrl('surat', '79174212154116')).toBe(
      'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=79174212154116',
    );
  });

  it('kod yoksa null döner', () => {
    expect(buildTrackingUrl('surat', null)).toBeNull();
    expect(buildTrackingUrl('surat', '')).toBeNull();
  });

  it('bilinmeyen sağlayıcıda null döner', () => {
    expect(buildTrackingUrl('yurtici', '79174212154116')).toBeNull();
    expect(buildTrackingUrl(null, '79174212154116')).toBeNull();
  });

  it('kodu URL"e güvenli şekilde gömer', () => {
    expect(buildTrackingUrl('surat', 'a b&c')).toBe(
      'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=a%20b%26c',
    );
  });
});

describe('deriveShipmentView', () => {
  it('gerçek kod varken takip numarası ve link üretir', () => {
    const v = deriveShipmentView({ ...BASE, providerTrackingId: '79174212154116' });
    expect(v.cargoCode).toBe('79174212154116');
    expect(v.isCodePending).toBe(false);
    expect(v.trackingUrl).toBe(
      'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=79174212154116',
    );
  });

  it('kod yokken bekliyor sayar ve link üretmez', () => {
    const v = deriveShipmentView(BASE);
    expect(v.cargoCode).toBeNull();
    expect(v.isCodePending).toBe(true);
    expect(v.trackingUrl).toBeNull();
  });

  it('sunucunun trackingUrl"ünü ASLA kullanmaz', () => {
    // Ölçülmüş bozuk hâli: iç referansı taşıyan Sürat linki.
    const v = deriveShipmentView({
      ...BASE,
      trackingUrl: 'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=PKG-3BQ2W4JPJ3',
    });
    expect(v.trackingUrl).toBeNull();
  });

  it('referans olarak iç numarayı taşır', () => {
    expect(deriveShipmentView(BASE).reference).toBe('PKG-CMRGW9D6ZH');
  });

  it('shipment yoksa her şey boş, bekliyor DEĞİL', () => {
    const v = deriveShipmentView(null);
    expect(v.cargoCode).toBeNull();
    expect(v.reference).toBeNull();
    expect(v.trackingUrl).toBeNull();
    // Kargo kaydı hiç yokken "kod hazırlanıyor" demek yanlış olurdu.
    expect(v.isCodePending).toBe(false);
  });

  it('sipariş yanıtındaki cargoCode yedeğini kullanır', () => {
    // Sipariş/grup yanıtları aynı bilgiyi `shipment.cargoCode` adıyla veriyor.
    const v = deriveShipmentView(null, '11079211193731');
    expect(v.cargoCode).toBe('11079211193731');
    expect(v.trackingUrl).toBeNull(); // sağlayıcı bilinmiyor
  });

  it('providerTrackingId yedeğe göre önceliklidir', () => {
    const v = deriveShipmentView(
      { ...BASE, providerTrackingId: '79174212154116' },
      '11079211193731',
    );
    expect(v.cargoCode).toBe('79174212154116');
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/lib/shipping/__tests__/tracking.test.ts --forceExit`
Expected: FAIL — `Cannot find module '../tracking'`

- [ ] **Step 3: `Shipment` tipini ekle**

`src/lib/api/orders.ts` — `shippingApi` tanımının yakınına:

```ts
/**
 * `GET /shipping/order/:orderId` yanıtı (2026-08-10 ölçümü — TEK nesne, dizi değil).
 *
 * İKİ numara taşır ve işleri farklıdır:
 *   - `trackingNumber` (`PKG-…`/`ORD-…`): Tarodan iç referansı; satıcı şubede verir.
 *   - `providerTrackingId`: gerçek Sürat kodu; takip bununla yapılır, şube
 *     kabulünden SONRA dolar.
 *
 * `trackingUrl` tipte var ama OKUNMAZ — ölçümde ya `null` ya da iç referansı
 * taşıyan bozuk bir link. Bkz. `src/lib/shipping/tracking.ts`.
 */
export type Shipment = {
  id: string;
  orderId: string;
  provider: string;
  trackingNumber: string | null;
  providerTrackingId: string | null;
  trackingUrl: string | null;
  status: string;
  cost?: number | null;
  estimatedDelivery?: string | null;
  events?: unknown[];
};
```

- [ ] **Step 4: Saf birimleri yaz**

`src/lib/shipping/tracking.ts`:

```ts
import type { Shipment } from '@/lib/api';

/** Sağlayıcı → takip sayfası şablonu. Bugün tek sağlayıcı var. */
const TRACKING_URLS: Record<string, (code: string) => string> = {
  surat: (code) =>
    `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${encodeURIComponent(code)}`,
};

/**
 * Takip linkini KODDAN kurar. Sunucunun `trackingUrl` alanı kullanılmaz:
 * 2026-08-10 ölçümünde gerçek kod varken `null`, yokken iç referansı taşıyan
 * bozuk bir link döndürüyordu.
 */
export function buildTrackingUrl(
  provider: string | null | undefined,
  code: string | null | undefined,
): string | null {
  if (!provider || !code) return null;
  const build = TRACKING_URLS[provider];
  return build ? build(code) : null;
}

export type ShipmentView = {
  /** Gerçek taşıyıcı kodu — kullanıcıya "Takip Numarası" olarak gösterilir. */
  cargoCode: string | null;
  /** İç referans (`PKG-…`) — YALNIZ satıcıya, şubede vereceği numara olarak. */
  reference: string | null;
  /** Kargo kaydı var ama taşıyıcı kodu henüz yok — NORMAL ara durum. */
  isCodePending: boolean;
  /** `cargoCode`'dan kurulmuş takip linki. */
  trackingUrl: string | null;
};

/**
 * Kargo kaydı → görünüm. `fallbackCargoCode`, sipariş/grup yanıtlarının aynı
 * bilgiyi taşıyan `shipment.cargoCode` alanı içindir.
 */
export function deriveShipmentView(
  s: Shipment | null | undefined,
  fallbackCargoCode?: string | null,
): ShipmentView {
  const cargoCode = s?.providerTrackingId || fallbackCargoCode || null;
  return {
    cargoCode,
    reference: s?.trackingNumber || null,
    // Kargo kaydı hiç yokken "kod hazırlanıyor" demek yanlış olur.
    isCodePending: !!s && !cargoCode,
    trackingUrl: buildTrackingUrl(s?.provider, cargoCode),
  };
}
```

- [ ] **Step 5: Testi çalıştır**

Run: `npx jest src/lib/shipping/__tests__/tracking.test.ts --forceExit`
Expected: PASS (12 test)

- [ ] **Step 6: Commit**

```bash
git add src/lib/shipping src/lib/api/orders.ts
git commit -m "feat(shipping): build the tracking link from the carrier code"
```

---

### Task 2: `useOrderShipment` hook'u

**Files:**
- Create: `src/hooks/useOrderShipment.ts`, `src/hooks/__tests__/useOrderShipment.test.tsx`
- Modify: `src/lib/query/keys.ts`

**Interfaces:**
- Consumes: `Shipment` tipi (Görev 1).
- Produces:
  ```ts
  export function useOrderShipment(orderId: string | undefined): {
    shipment: Shipment | null;
    isLoading: boolean;
    refetch: () => void;
  };
  // qk.shipping.byOrder(orderId) → ["shipping", "order", orderId]
  ```

- [ ] **Step 1: Query key'i ekle**

`src/lib/query/keys.ts` — `shipping` bloğuna:

```ts
    /** Siparişin kargo kaydı. 404 = kargo yok (hata değil). */
    byOrder: (orderId: string) => ["shipping", "order", orderId] as const,
```

- [ ] **Step 2: Başarısız testi yaz**

`src/hooks/__tests__/useOrderShipment.test.tsx`:

```tsx
/**
 * `GET /shipping/order/:orderId` — 404 HATA DEĞİL.
 *
 * Ödeme tamamlanınca backend kargo kaydını otomatik oluşturuyor, ama her
 * siparişin kaydı yok (2026-08-10 ölçümü: 13 satıcı siparişinin 5'inde yok).
 * Uç bu durumda `404 {"message":"Bu sipariş için kargo bulunamadı"}` döndürüyor.
 * Bunu hata saymak, satıcıya olmayan bir sorunu gösterir ve onarım yolunu
 * ("kaydı sen oluştur") kapatır.
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('@/lib/api', () => ({
  shippingApi: { getOrderShipments: jest.fn() },
}));

import { shippingApi } from '@/lib/api';
import { useOrderShipment } from '../useOrderShipment';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const SHIPMENT = {
  id: 's1', orderId: 'o1', provider: 'surat',
  trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: null,
  trackingUrl: null, status: 'label_created',
};

beforeEach(() => jest.clearAllMocks());

it('kargo kaydını döndürür', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockResolvedValue({ data: SHIPMENT } as any);
  const { result } = renderHook(() => useOrderShipment('o1'), { wrapper });
  await waitFor(() => expect(result.current.shipment).not.toBeNull());
  expect(result.current.shipment!.trackingNumber).toBe('PKG-CMRGW9D6ZH');
});

it('404"te null döner, HATA DURUMUNA DÜŞMEZ', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockRejectedValue({
    response: { status: 404, data: { message: 'Bu sipariş için kargo bulunamadı' } },
  });
  const { result } = renderHook(() => useOrderShipment('o1'), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.shipment).toBeNull();
});

it('404 DIŞI hatalar yutulmaz', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockRejectedValue({
    response: { status: 500, data: {} },
  });
  const { result } = renderHook(() => useOrderShipment('o1'), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  // 500'de de shipment null'dır ama bu "kargo yok" DEĞİL — sorgu hata
  // durumundadır ve çağıran isterse ona bakabilir.
  expect(result.current.shipment).toBeNull();
});

it('orderId yokken istek atmaz', async () => {
  renderHook(() => useOrderShipment(undefined), { wrapper });
  await waitFor(() => expect(shippingApi.getOrderShipments).not.toHaveBeenCalled());
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/hooks/__tests__/useOrderShipment.test.tsx --forceExit`
Expected: FAIL — `Cannot find module '../useOrderShipment'`

- [ ] **Step 4: Hook'u yaz**

`src/hooks/useOrderShipment.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { shippingApi, type Shipment } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';

/**
 * Siparişin kargo kaydı. Hem alıcı sipariş detayı hem satıcı kargo ekranı
 * kullanıyor, o yüzden rota-yerel değil paylaşılan hook.
 *
 * **404 hata DEĞİL:** her siparişin kargo kaydı yok. Uç
 * `404 "Bu sipariş için kargo bulunamadı"` döndürüyor; bunu `null`'a çeviriyoruz
 * ki satıcıya olmayan bir sorun gösterilmesin ve onarım yolu açık kalsın.
 */
export function useOrderShipment(orderId: string | undefined) {
  const query = useQuery({
    queryKey: qk.shipping.byOrder(orderId ?? ''),
    queryFn: async () => {
      try {
        const res = await shippingApi.getOrderShipments(orderId!);
        return unwrapEnvelope<Shipment>(res) ?? null;
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(orderId),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
  // Ekran odağa geldiğinde tazele. `isCodePending` NORMAL bir ara durum ve kod
  // birkaç dakika içinde geliyor — zamanlayıcıyla poll etmek pil yakar ve
  // hiçbir şeyi hızlandırmaz. Kalıp `app/orders/_hooks/useOrders.ts:105`.
  useFocusEffect(
    useCallback(() => {
      if (orderId) void query.refetch();
      // `query.refetch` referansı sorgu başına stabil; bağımlılığa orderId yeter.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]),
  );

  return {
    shipment: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
```

Importlara ekle: `import { useCallback } from 'react';` ve
`import { useFocusEffect } from 'expo-router';`

- [ ] **Step 5: Testi çalıştır**

Run: `npx jest src/hooks/__tests__/useOrderShipment.test.tsx --forceExit`
Expected: PASS (4 test)

> `useFocusEffect` testte çağrılıyor; `expo-router` mock'un onu sağlamıyorsa
> testin başına ekle:
> ```ts
> jest.mock('expo-router', () => ({ useFocusEffect: (cb: () => void) => cb() }));
> ```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useOrderShipment.ts src/hooks/__tests__ src/lib/query/keys.ts
git commit -m "feat(shipping): read the order shipment and treat 404 as none"
```

---

### Task 3: Satıcı akışı — önce oku, elle numara girişini kaldır

**Files:**
- Modify: `app/sales/_hooks/useSaleActions.ts`, `app/sales/_modals/ShipDialog.tsx`,
  `src/lib/api/orders.ts` (`updateTracking` silinir)
- Test: `app/sales/__tests__/shipFlow.test.tsx` (yeni)

**Interfaces:**
- Consumes: `useOrderShipment` (Görev 2), `Shipment` (Görev 1).
- Produces: `useSaleActions()` dönüşünden `trackingNumber` ve `setTrackingNumber`
  **kalkar**; `handleShip()` argümansız kalır.

- [ ] **Step 1: Başarısız testi yaz**

`app/sales/__tests__/shipFlow.test.tsx`:

```tsx
/**
 * Satıcı kargo akışı — ÖNCE OKU.
 *
 * Ödeme tamamlanınca backend kargo kaydını otomatik oluşturuyor. Mobil bugün
 * koşulsuz `POST /shipping` atıyor ve mevcut kayıtta sunucu
 * `400 "Sipariş hazırlanma durumunda değil"` döndürüyor (2026-08-10 ölçümü) —
 * satıcı bu ham mesajı görüyor.
 *
 * `POST` yalnız ONARIM yoludur: kayıt 404 + sipariş `preparing` + kullanıcı satıcı.
 *
 * Elle takip numarası girişi kalktı: numarayı sunucu üretiyor, satıcının yazdığı
 * serbest metin sunucunun `PKG-` düzeniyle çelişiyordu (matris #20).
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('@/lib/api', () => ({
  ordersApi: { markAsPreparing: jest.fn() },
  shippingApi: { getOrderShipments: jest.fn(), createShipment: jest.fn() },
}));
jest.mock('@/ui', () => ({ ...jest.requireActual('@/ui'), appAlert: jest.fn() }));

import { shippingApi } from '@/lib/api';
import { useSaleActions } from '../_hooks/useSaleActions';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const ORDER = { id: 'o1', status: 'preparing' } as any;

/** Diyaloğu açıp kargoya verme akışını tetikler. */
async function ship() {
  const { result } = renderHook(() => useSaleActions(), { wrapper });
  act(() => result.current.setShipDialog({ visible: true, order: ORDER }));
  await act(async () => { result.current.handleShip(); });
  await waitFor(() => expect(result.current.updateStatusMutation.isPending).toBe(false));
  return result;
}

beforeEach(() => jest.clearAllMocks());

it('kargo kaydı VARSA POST /shipping çağrılmaz', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockResolvedValue({
    data: { id: 's1', orderId: 'o1', provider: 'surat', trackingNumber: 'PKG-X',
            providerTrackingId: null, trackingUrl: null, status: 'label_created' },
  } as any);

  await ship();

  expect(shippingApi.createShipment).not.toHaveBeenCalled();
});

it('kayıt 404 + sipariş preparing ise POST /shipping çağrılır', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockRejectedValue({ response: { status: 404 } });
  jest.mocked(shippingApi.createShipment).mockResolvedValue({ data: { id: 's9' } } as any);

  await ship();

  expect(shippingApi.createShipment).toHaveBeenCalledWith({ orderId: 'o1', provider: 'surat' });
});

it('elle takip numarası artık gönderilmiyor', async () => {
  // `updateTracking` API yüzeyinden silindi; bu test onun geri gelmesini engeller.
  expect((shippingApi as Record<string, unknown>).updateTracking).toBeUndefined();
});
```

> `app/sales/__tests__/detail.test.tsx` ve `index.test.tsx` bu dizindeki mevcut
> mock kalıbını gösteriyor — `@/lib/api` yüzeyi farklıysa oradan tamamla.

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/sales/__tests__/shipFlow.test.tsx --forceExit`
Expected: FAIL — `createShipment` yine de çağrılıyor

- [ ] **Step 3: `useSaleActions`'ı tersine çevir**

`trackingNumber` / `setTrackingNumber` state'ini sil. `updateStatusMutation`'ın
`shipped` dalını şununla değiştir:

```ts
      if (status === 'shipped') {
        // ÖNCE OKU: ödeme sonrası backend kaydı zaten oluşturmuş olabilir.
        // Mevcut kayda POST atmak `400 "Sipariş hazırlanma durumunda değil"`
        // veriyor (2026-08-10 ölçümü) ve satıcı ham hatayı görüyor.
        let existing: Shipment | null = null;
        try {
          const res = await shippingApi.getOrderShipments(orderId);
          existing = unwrapEnvelope<Shipment>(res) ?? null;
        } catch (error: any) {
          if (error?.response?.status !== 404) throw error;
        }
        if (existing) return existing;
        // ONARIM yolu: kayıt yok. Sunucu durum kapısını kendi uyguluyor.
        const created = await shippingApi.createShipment({ orderId, provider: 'surat' });
        return unwrapEnvelope<Shipment>(created) ?? null;
      }
```

`mutationFn` imzasından `trackingNumber` parametresini kaldır. `handleShip`:

```ts
  const handleShip = () => {
    if (!shipDialog.order) return;
    updateStatusMutation.mutate({ orderId: shipDialog.order.id, status: 'shipped' });
  };
```

`onSuccess`'teki `setTrackingNumber('')` satırını sil. Dönüş nesnesinden
`trackingNumber` ve `setTrackingNumber` kalkar. Ayrıca kargo kaydını tazele:

```ts
      queryClient.invalidateQueries({ queryKey: ['shipping'] });
```

> `qk.shipping.byOrder(...)` ile tek siparişi hedeflemek daha dar olurdu, ama
> `onSuccess` sipariş id'sini taşımıyor; `['shipping']` öneki tüm kargo
> sorgularını tazeler ve bu ekranda birkaç kayıt var.

- [ ] **Step 4: `ShipDialog`'u onay diyaloğuna dönüştür**

`app/sales/_modals/ShipDialog.tsx` — `TextInput`'u ve `trackingNumber`
prop'larını sil. Diyalog artık yalnız onay soruyor; gövde metni olarak
`order.cargoRefInstructions` gösterilir (katalogda mevcut, yeni anahtar yazma).

Butonun `disabled` koşulundaki "numara boş" kontrolü kalkar; yalnız
`updateStatusMutation.isPending` kalır.

- [ ] **Step 5: `updateTracking`'i sil**

`src/lib/api/orders.ts` — çağıranı kalmadı:

```bash
grep -rn "updateTracking" src/ app/    # yalnız tanım kalmalı
```

Tanımı sil. Ölü API yüzeyi, "bu yol destekleniyor" izlenimi verir.

- [ ] **Step 6: Testleri çalıştır**

Run: `npx jest app/sales src/hooks src/lib/shipping --forceExit`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 0 hata — `trackingNumber` prop'unu geçen yer kalmadığı doğrulanır.

- [ ] **Step 7: Commit**

```bash
git add app/sales src/lib/api/orders.ts
git commit -m "fix(sales): read the shipment before creating one"
```

---

### Task 4: Gösterim — role duyarlı numara + durum etiketleri

**Files:**
- Create: `app/orders/[id]/_lib/shipmentStatus.ts`
- Modify: `app/orders/[id]/_components/OrderInfoCards.tsx`,
  `app/orders/[id]/_lib/types.ts`, `app/orders/[id]/index.tsx`,
  `src/i18n/lib/catalog/{tr,en}.json`
- Test: `app/orders/__tests__/trackingCard.test.tsx` (yeni)

**Interfaces:**
- Consumes: `deriveShipmentView` (Görev 1), `useOrderShipment` (Görev 2).
- Produces: `shipmentStatusLabel(status, t): string` — bilinmeyen durumda nötr metin.

- [ ] **Step 1: Durum etiketlerini ekle**

Katalogda `order.shipmentStatus` bloğu yoksa `tr.json`'a:

```json
"shipmentStatus": {
  "label_created": "Kargo kaydı oluşturuldu",
  "pending": "Şube kabulü bekleniyor",
  "picked_up": "Şubede kabul edildi",
  "in_transit": "Yolda",
  "at_delivery_branch": "Dağıtım şubesinde",
  "out_for_delivery": "Dağıtıma çıktı",
  "delivered": "Teslim edildi",
  "return_in_progress": "İade sürecinde",
  "returned": "İade edildi",
  "cancelled": "İptal edildi",
  "failed": "Başarısız",
  "unknown": "Kargo durumu güncelleniyor"
}
```

`en.json` aynı yere:

```json
"shipmentStatus": {
  "label_created": "Shipping label created",
  "pending": "Awaiting branch acceptance",
  "picked_up": "Accepted at branch",
  "in_transit": "In transit",
  "at_delivery_branch": "At delivery branch",
  "out_for_delivery": "Out for delivery",
  "delivered": "Delivered",
  "return_in_progress": "Return in progress",
  "returned": "Returned",
  "cancelled": "Cancelled",
  "failed": "Failed",
  "unknown": "Updating shipment status"
}
```

Run: `pnpm i18n:codegen`

- [ ] **Step 2: Etiket çözücüyü yaz**

`app/orders/[id]/_lib/shipmentStatus.ts`:

```ts
import type { TFunction } from 'i18next';

/**
 * Sunucunun kargo durumları. Liste KAPALI DEĞİL — Sürat entegrasyonu yeni
 * durum ekleyebilir (`8f9ae671` kod 1'i `pending` → `picked_up` yaptı).
 * Bilinmeyen durumda HAM KOD BASILMAZ; nötr bir metin gösterilir, yoksa
 * ekranda `at_delivery_branch` yazar.
 */
const KNOWN = new Set([
  'label_created', 'pending', 'picked_up', 'in_transit', 'at_delivery_branch',
  'out_for_delivery', 'delivered', 'return_in_progress', 'returned',
  'cancelled', 'failed',
]);

export function shipmentStatusLabel(
  status: string | null | undefined,
  t: TFunction,
): string {
  const key = status && KNOWN.has(status) ? status : 'unknown';
  return t(`order.shipmentStatus.${key}` as any);
}
```

- [ ] **Step 3: Başarısız testi yaz**

`app/orders/__tests__/trackingCard.test.tsx`:

```tsx
/**
 * Takip kartı — İKİ NUMARA, İKİ İŞ.
 *
 *   - `trackingNumber` (`PKG-…`): Tarodan iç referansı. SATICI bunu şubede
 *     verir. Sürat TANIMAZ, alıcının hiçbir işine yaramaz.
 *   - `providerTrackingId`: gerçek Sürat kodu; takip bununla yapılır.
 *
 * Bugünkü hata: `PKG-` alıcıya "Takip Numarası" diye basılıyor ve sunucunun
 * bozuk `trackingUrl`'ü ile link veriliyor.
 */
it('ALICI: kod gelmeden PKG- referansını GÖRMEZ', () => {
  renderCard({ role: 'buyer', shipment: { trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: null } });
  expect(screen.queryByText(/PKG-/)).toBeNull();
  expect(screen.getByText('Satıcı paketinizi hazırlıyor. Sürat şubesine teslim edildiği anda takip bilgileri burada görünecek.')).toBeTruthy();
});

it('ALICI: kod gelince takip numarasını ve linki görür', () => {
  renderCard({ role: 'buyer', shipment: { trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: '79174212154116' } });
  expect(screen.getByText('79174212154116')).toBeTruthy();
  expect(screen.getByText('Kargoyu takip et')).toBeTruthy();
});

it('SATICI: kod gelmeden PKG- referansını yönergesiyle görür', () => {
  renderCard({ role: 'seller', shipment: { trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: null } });
  expect(screen.getByText('PKG-CMRGW9D6ZH')).toBeTruthy();
  expect(screen.getByText('Kargo Referans Numarası')).toBeTruthy();
});

it('sunucunun bozuk trackingUrl"ü kullanılmaz', () => {
  renderCard({
    role: 'buyer',
    shipment: {
      trackingNumber: 'PKG-3BQ2W4JPJ3', providerTrackingId: null,
      trackingUrl: 'https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=PKG-3BQ2W4JPJ3',
    },
  });
  expect(screen.queryByText('Kargoyu takip et')).toBeNull();
});

it('bilinmeyen durumda ham kod basılmaz', () => {
  renderCard({ role: 'buyer', shipment: { providerTrackingId: '79174212154116', status: 'yeni_bir_durum' } });
  expect(screen.queryByText('yeni_bir_durum')).toBeNull();
  expect(screen.getByText('Kargo durumu güncelleniyor')).toBeTruthy();
});
```

`renderCard` yardımcısı — `app/orders/__tests__/detail.test.tsx`'in mock/sarmalayıcı
kalıbını izler:

```tsx
function renderCard({ role, shipment }: { role: 'buyer' | 'seller'; shipment: any }) {
  const order = { id: 'o1', status: 'shipped', shipment: null } as any;
  const view = { isDelivered: false, showTrackingCard: true } as any;
  return render(
    <OrderTrackingCard
      order={order}
      view={view}
      shipment={{ id: 's1', orderId: 'o1', provider: 'surat', status: 'in_transit',
                  trackingUrl: null, ...shipment }}
      isSeller={role === 'seller'}
    />,
  );
}
```

`OrderTrackingCard` `useTranslation()` çağırıyor; `detail.test.tsx`'in
`react-i18next` kurulumu neyse aynısını kullan (gerçek katalog metinleri
beklendiği için passthrough mock YETMEZ).

- [ ] **Step 4: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/orders/__tests__/trackingCard.test.tsx --forceExit`
Expected: FAIL — alıcı hâlâ `PKG-` görüyor

- [ ] **Step 5: `OrderTrackingCard`'ı role duyarlı yap**

`app/orders/[id]/_lib/types.ts` — `OrderDetail`'e ekle:

```ts
  /** Sipariş yanıtındaki kargo özeti; `cargoCode` = `providerTrackingId`. */
  shipment?: {
    cargoCode?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
  } | null;
```

`OrderInfoCards.tsx` — `OrderTrackingCard`'ı yeniden yaz. Kart `view` ve
`shipment`'ı alır, `deriveShipmentView` ile türetir ve **rolüne göre** çizer:

```tsx
export function OrderTrackingCard({
  order, view, shipment, isSeller,
}: {
  order: OrderDetail;
  view: OrderView;
  shipment: Shipment | null;
  isSeller: boolean;
}) {
  const { t } = useTranslation();
  const s = deriveShipmentView(shipment, order.shipment?.cargoCode);
  // Kargo kaydı hiç yoksa çizecek bir şey yok.
  if (!shipment && !s.cargoCode) return null;

  return (
    <Card variant="elevated" style={styles.card} testID="order-tracking-card">
      <View style={styles.trackingHeaderRow}>
        <Text variant="label" style={styles.sectionTitle}>{t('order.trackOrder')}</Text>
        <Text variant="caption" tone="muted">
          {shipmentStatusLabel(shipment?.status ?? order.shipment?.status, t)}
        </Text>
      </View>

      {s.cargoCode ? (
        <View style={styles.trackingInfo}>
          <Text variant="caption" tone="muted">{t('order.trackingNumber')}</Text>
          <Text testID="order-tracking-number">{s.cargoCode}</Text>
          {s.trackingUrl ? (
            <Pressable onPress={() => Linking.openURL(s.trackingUrl!)}>
              <Text style={styles.trackLink}>{t('order.trackShipment')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : isSeller ? (
        // SATICI: şubede vereceği referans + kodun ne zaman geleceği.
        <View style={styles.trackingInfo}>
          <Text variant="caption" tone="muted">{t('order.cargoReference')}</Text>
          <Text testID="order-cargo-reference">{s.reference}</Text>
          <Text variant="caption" tone="muted">{t('order.cargoRefInstructions')}</Text>
          <Text variant="caption" tone="muted">{t('order.trackingAppearsAfterDropoff')}</Text>
        </View>
      ) : (
        // ALICI: iç referans işine yaramaz, gösterme.
        <Text variant="caption" tone="muted">{t('order.shipmentPreparingBuyer')}</Text>
      )}
    </Card>
  );
}
```

`order.trackingNumber` ve `order.trackingUrl` okumaları **tamamen kalkar**.

- [ ] **Step 6: Ekrandan bağla**

`app/orders/[id]/index.tsx` — hook'u **koşulsuz**, erken dönüşlerden ÖNCE çağır:

```tsx
  const { shipment } = useOrderShipment(orderId);
```

Satıcı tespiti: ekran `order.seller.id`'yi zaten kullanıyor (`:136`), oturum
kullanıcısı `useAuthStore`'dan gelir. Ekranda `user` zaten yoksa ekle:

```tsx
  const { user } = useAuthStore();
  const isSeller = !!user?.id && order?.seller?.id === user.id;
```

ve karta geçir:

```tsx
  <OrderTrackingCard order={order} view={view} shipment={shipment} isSeller={isSeller} />
```

`derive.ts`'teki `showTrackingCard` artık `order.trackingNumber`'a bakmamalı —
kart kendi kapısını tutuyor. O alanı kaldır veya kargo kaydı varlığına bağla.

- [ ] **Step 7: Testleri çalıştır**

Run: `npx jest app/orders src/lib/shipping src/hooks --forceExit`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 8: Commit**

```bash
git add app/orders src/i18n/lib
git commit -m "fix(orders): show the carrier code to buyers and the reference to sellers"
```

---

### Task 5: Tam doğrulama

**Files:** yok (yalnız doğrulama)

- [ ] **Step 1: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata. Hata varsa düzelt; `main`'le karşılaştırmak için:

```bash
git stash && npx tsc --noEmit 2>&1 | tail -3 && git stash pop
```

- [ ] **Step 2: Lint**

Run: `npx eslint app src --ext .ts,.tsx`
Expected: 0 error.

- [ ] **Step 3: Tüm test paketi**

Run: `npx jest --forceExit`
Expected: PASS. Referans: bu plan başlarken 178 suite / 1429 test yeşildi; sayı
düşmemeli.

- [ ] **Step 4: Ölü kod taraması**

```bash
grep -rn "updateTracking" src/ app/
grep -rn "order.trackingUrl\|order\.trackingNumber" app/orders/
```
Expected: ikisi de boş — elle takip API'si ve iç referansın kullanıcıya
basılması kalmadı.

- [ ] **Step 5: Metro'da elle dene**

```bash
npx expo start -c
```

- **Alıcı olarak** `ORD-PYK6QAP8GH` siparişini aç: **`PKG-` görmemelisin**;
  "Satıcı paketinizi hazırlıyor…" metni görünmeli.
- **Satıcı hesabında** kargo ekranını aç: mevcut kargo kaydı olan bir siparişte
  "Kargoya Ver" mükerrer `POST` denememeli ve ham `400` hatası çıkmamalı.
- Gerçek kodu olan bir siparişte (`providerTrackingId` dolu) takip linkinin
  Sürat sayfasını **gerçek kodla** açtığını doğrula.

- [ ] **Step 6: Kapanış raporu**

`docs/superpowers/reports/2026-08-10-kargo-takip-kapanis.md` — ne kapandı, elle
testte ne görüldü, ertelenenler. `docs/PARITE_KALAN_ISLER.md`'de P1 #4 ve
matris #20 işaretlenir.

- [ ] **Step 7: Commit**

```bash
git add docs
git commit -m "docs(report): close out the shipping and tracking code round"
```
