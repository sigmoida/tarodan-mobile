# İlan Formu Sözleşmesi — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** İlan düzenleme formunu sunucunun `edit` projeksiyonundan doldurmak ve
görsel/opsiyonel alan sözleşmesini karşılamak, böylece satıcının dokunmadığı
alanlar sessizce değişmesin.

**Architecture:** Prefill mantığı 868 satırlık `useListingForm.ts`'ten saf bir
`toFormValues` eşleyicisine çıkar — sözleşme render olmadan test edilebilir hale
gelir. Kayda geri yazılan her alan `edit` bloğundan gelir; `edit`'in taşımadığı
iki türetme (`isPreorder`, rezerve adet) üst seviyeden okunur. Kademe
workaround'u (`_lib/payload.ts`) silinir.

**Tech Stack:** Expo SDK 54 + expo-router, react-hook-form + zod (`@/ui/form`),
TanStack Query, axios, Jest + @testing-library/react-native, i18next.

**Spec:** `docs/superpowers/specs/2026-08-10-ilan-formu-sozlesmesi-design.md`

## Global Constraints

- **Kayda geri yazılan her alan `edit`'ten gelir.** Yalnız `isPreorder` ve
  rezerve adet (`quantity − availableQuantity`) üst seviyeden okunur — bu ikisi
  `edit` bloğunda YOK (staging'de ölçüldü).
- **Para ve fiyat istemcide türetilmez.** Etkin fiyat için ürün/quote
  yanıtındaki `price`, `oldPrice`, `isOnSale` esastır.
- **İstemci görsel key'i ÜRETMEZ**, URL'den key çıkarmaz, başka bir ilanın
  key'ini yeni upload gibi kullanmaz. Key'ler yalnız upload yanıtından veya
  `edit.images`'tan gelir.
- **`images[]` sırası kanoniktir** — indeks `sortOrder` olur, ilk eleman kapaktır.
- Kullanıcıya görünen her metin `src/i18n/lib/catalog/{tr,en}.json`'dan gelir;
  yeni kodda gömülü Türkçe string yazılmaz. Yeni anahtar eklenirse hem tr hem
  en'e eklenir (asimetri `tsc`'yi patlatır), sonra `pnpm i18n:codegen`.
- Tasarım token'ları zorunlu: `theme.colors.*`, `theme.spacing[n]` (sayısal
  anahtar), `theme.radius.*`. Sabit hex/rgba yasak, `src/theme/colors`'tan
  `TarodanColors` importu yasak.
- Query key'ler `@/lib/query`'den gelir, elle yazılmaz.
- **`useListingForm.ts` bu turda BÖLÜNMEZ.** Yalnız prefill çıkar (~90 satır azalır).
- Test komutu: `npx jest <path> --forceExit`. Tip kontrolü: `npx tsc --noEmit`.
- Branch: `feat/ilan-formu-sozlesmesi` (bu plan başlarken açılır).

---

## Ölçülmüş gerçek gövde (tipler BUNDAN yazılır)

`GET /products/my/:id` — staging, 2026-08-10. Yanıt başlığı:
`Cache-Control: no-store, no-cache, must-revalidate`.

```jsonc
{
  // ── üst seviye (gösterim) — yalnız iki alanı için okunur ──
  "isPreorder": false,
  "availableQuantity": 0,
  "quantity": 0,
  "price": 551.07, "oldPrice": null, "isOnSale": false,
  "scale": "1:64", "material": "Diecast Metal",
  "images": [{ "id": "…", "cardKey": "…", "detailKey": "…", "cardUrl": "…", "detailUrl": "…", "sortOrder": 0 }],

  // ── edit (kayda geri yazılabilir ham değerler) ──
  "edit": {
    "title": "…", "description": "…",
    "price": 551.07, "oldPrice": null, "salePrice": null,
    "saleStartDate": null, "saleEndDate": null,
    "categoryId": "…", "categoryName": "…",
    "brandId": "…", "brandName": "…", "brandSlug": "…",
    "carModelId": "6b74b4b6-75d4-4b1c-a2bd-f0e179c85b72", "carModelName": "…",
    "manufacturerId": "…", "manufacturerName": "…", "manufacturerSlug": "…",
    "condition": "…", "status": "…",
    "modelCode": "SEED-0057", "color": null, "isBoxed": null,
    "quantity": 0, "maxQuantityPerOrder": null,
    "shippingPackageTier": "small",
    "isTradeEnabled": false, "isSet": false, "bundleSize": null,
    "isLimited": false, "editionNumber": null, "editionTotal": null,
    "releaseDate": null, "year": null,
    "images": [
      { "cardKey": "staging/products/…-card.webp",
        "detailKey": "staging/products/…-detail.webp",
        "cardUrl": "https://…-card.webp",
        "detailUrl": "https://…-detail.webp",
        "sortOrder": 0 }
    ],
    "attributes": [
      { "groupSlug": "scale", "groupName": "Ölçek", "slug": "1-64",
        "value": "1:64", "displayValue": "1:64", "manufacturerSlug": null }
    ]
  }
}
```

**Dikkat:** `edit.images` elemanlarında `id` YOK (üst seviyede var).
`edit.attributes` üretici-**bağımsız** nitelikleri de taşıyor
(`manufacturerSlug: null`) — mevcut kod bunları eliyor.

---

## Dosya Yapısı

**Oluşturulacak:**

| Dosya | Sorumluluk |
| --- | --- |
| `src/components/listing/_lib/editMapper.ts` | `edit` yanıtı → form değerleri. Saf, ekrana/hook'a bağımsız |
| `src/components/listing/_lib/__tests__/editMapper.test.ts` | Eşleyicinin sözleşme testleri |

**Değiştirilecek:**

| Dosya | Değişiklik |
| --- | --- |
| `src/components/listing/_lib/types.ts` | `MyProductResponse`, `EditProjection`, `ImageKey` tipleri |
| `src/components/listing/_hooks/useListingForm.ts` | Prefill → eşleyici; kademe koşulsuz; `modelCode`; görsel kapıları; oluşturmada indirim |
| `src/components/listing/_lib/schema.ts` | `modelCode` alanı |
| `src/components/listing/_lib/validate.ts` | Düzenlemede kademe istisnası kalkar |
| `src/components/listing/_components/ListingSections.tsx` | `modelCode` girdisi; kaydet butonu yükleme kuyruğuna bağlanır |
| `src/i18n/lib/catalog/{tr,en}.json` | `modelCode` etiketi (gerekirse) |

**Silinecek:**

| Dosya | Neden |
| --- | --- |
| `src/components/listing/_lib/payload.ts` | `buildTierPayloadField` — "sunucu kademeyi döndürmüyor" varsayımı artık yanlış |

---

## Ölçümün getirdiği iki sadeleşme

Plan yazılırken kod okundu; iki madde beklenenden küçük çıktı:

1. **`carModelId` mobilde ZATEN opsiyonel.** `validate.ts` onu istemiyor, şema
   `z.string()` (boş geçerli), payload `carModelId || undefined` ile boşken
   göndermiyor. Spec'in P2 #6 maddesinin bu yarısı için **yapılacak iş yok** —
   Görev 3 yalnız `modelCode`'u ekler.
2. **`images: undefined` dalı erişilemez.** `validate.ts:29` sıfır görsele izin
   vermiyor, yani "boş dizi listeyi temizler" davranışı mobilde oluşamaz.
   Dokümanda geçiyor diye kod eklenmez.

---

### Task 0: `relatedOrder` / `relatedTrade` ölçümü — KAPI

**Files:**
- Create: `docs/superpowers/reports/2026-08-10-products-my-olcum.md`

**Interfaces:**
- Consumes: yok
- Produces: Görev 7'nin uygulanıp uygulanmayacağı kararı.

- [ ] **Step 1: Staging'e giriş yap ve `GET /products/my`'yi ölç**

```bash
B=https://staging.tarodan.com.tr/api
TOKEN=$(curl -s -X POST "$B/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"ahmet@demo.com","password":"Demo123!"}' | jq -r '.tokens.accessToken')
curl -s "$B/products/my?limit=10" -H "Authorization: Bearer $TOKEN" > /tmp/my.json
jq -c '(if type=="array" then . else (.data//.products//.items) end)[0] | keys' /tmp/my.json
jq -c '(if type=="array" then . else (.data//.products//.items) end)[] | {id, status, relatedOrder, relatedTrade}' /tmp/my.json | head
```

Not: access token ömrü **900 sn**; ölçüm uzarsa token'ı yenile.

- [ ] **Step 2: Raporu yaz**

`relatedOrder` / `relatedTrade` alanları geliyor mu? Geliyorsa hangi alt
alanlarla (`id`, `orderNumber`, `status`, alıcı, tutar / `id`, `tradeNumber`,
`status`, `createdAt`)? Satılmış veya rezerve bir ilan yoksa bunu da yaz —
"alan yok" ile "örnek veri yok" farklı sonuçlardır.

Raporun sonuna karar satırı:

```markdown
| Madde | Staging'de var mı | Karar |
| --- | --- | --- |
| relatedOrder / relatedTrade | evet/hayır/örnek yok | Görev 7 uygulanır / düşer |
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/2026-08-10-products-my-olcum.md
git commit -m "docs(report): measure the my-products transaction context fields"
```

---

### Task 1: `edit` projeksiyonu tipleri

**Files:**
- Modify: `src/components/listing/_lib/types.ts`

**Interfaces:**
- Consumes: yok
- Produces:
  - `type ImageKey = { cardKey: string; detailKey: string }`
  - `type EditImage = ImageKey & { cardUrl: string; detailUrl: string; sortOrder: number }`
  - `type EditAttribute = { groupSlug: string; groupName: string | null; slug: string; value: string | null; displayValue: string | null; manufacturerSlug: string | null }`
  - `type EditProjection` (aşağıdaki tam alan listesi)
  - `type MyProductResponse = { edit?: EditProjection; isPreorder?: boolean; availableQuantity?: number | null; quantity?: number | null; [k: string]: unknown }`

- [ ] **Step 1: Tipleri ekle**

`src/components/listing/_lib/types.ts` sonuna:

```ts
// ---------------------------------------------------------------------------
// GET /products/my/:id — iki projeksiyon
// ---------------------------------------------------------------------------

/** Sunucunun tanıdığı görsel kimliği. İstemci ÜRETMEZ, URL'den çıkarmaz. */
export interface ImageKey {
  cardKey: string;
  detailKey: string;
}

export interface EditImage extends ImageKey {
  cardUrl: string;
  detailUrl: string;
  sortOrder: number;
}

export interface EditAttribute {
  groupSlug: string;
  groupName: string | null;
  slug: string;
  value: string | null;
  displayValue: string | null;
  /** `null` = üretici-bağımsız nitelik (ör. `scale`). Bunlar da forma girer. */
  manufacturerSlug: string | null;
}

/**
 * Kayda GERİ YAZILABİLİR ham değerler (delta 18 §2c). Form yalnız buradan
 * doldurulur — üst seviye alanlar gösterim içindir ve geri yazılamaz.
 *
 * `isPreorder` ve `availableQuantity` bu blokta YOKTUR (2026-08-10 ölçümü);
 * o ikisi üst seviyeden okunur.
 */
export interface EditProjection {
  title: string | null;
  description: string | null;
  price: number | null;
  oldPrice: number | null;
  salePrice: number | null;
  saleStartDate: string | null;
  saleEndDate: string | null;
  categoryId: string | null;
  brandId: string | null;
  carModelId: string | null;
  manufacturerId: string | null;
  condition: string | null;
  status: string | null;
  modelCode: string | null;
  color: string | null;
  isBoxed: boolean | null;
  quantity: number | null;
  maxQuantityPerOrder: number | null;
  shippingPackageTier: 'small' | 'medium' | 'large';
  isTradeEnabled: boolean;
  isSet: boolean;
  bundleSize: number | null;
  isLimited: boolean;
  editionNumber: string | null;
  editionTotal: number | null;
  releaseDate: string | null;
  year: number | null;
  images: EditImage[];
  attributes: EditAttribute[];
  /** Kolaylık etiketleri — dokümanda yok, ölçümde var. Liste yüklenmeden gösterilir. */
  categoryName?: string | null;
  brandName?: string | null;
  brandSlug?: string | null;
  carModelName?: string | null;
  manufacturerName?: string | null;
  manufacturerSlug?: string | null;
}

export interface MyProductResponse {
  edit?: EditProjection;
  /** `edit`'te YOK — üst seviyeden okunur. */
  isPreorder?: boolean;
  /** `edit`'te YOK — rezerve adet hesabı için üst seviyeden okunur. */
  availableQuantity?: number | null;
  quantity?: number | null;
  [key: string]: unknown;
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata (yalnız tip eklendi, kullanan yok).

- [ ] **Step 3: Commit**

```bash
git add src/components/listing/_lib/types.ts
git commit -m "feat(listing): type the edit projection from the measured body"
```

---

### Task 2: Şema alanları + `toFormValues` eşleyicisi

**Files:**
- Modify: `src/components/listing/_lib/schema.ts`
- Create: `src/components/listing/_lib/editMapper.ts`
- Test: `src/components/listing/_lib/__tests__/editMapper.test.ts`

**Interfaces:**
- Consumes: Görev 1'in tipleri (`MyProductResponse`, `EditProjection`, `ImageKey`).
- Produces:
  - `ListingFormValues`'a `modelCode: string` ve `isPreorder: boolean` eklenir;
    `emptyListingFormValues` ikisini de taşır. Görev 3'ün form girdisi ve Görev
    6'nın payload'ı bunlara dayanır.
  ```ts
  export type MappedListing = {
    values: ListingFormValues;
    images: { keys: ImageKey[]; uris: string[] };
    attrs: Record<string, string[]>;
    sale: { salePrice: string; saleStartDate: string; saleEndDate: string };
    reservedQty: number;
    isPreorder: boolean;
    labels: { brandName: string; carModelName: string; categoryName: string; manufacturerName: string };
  };
  export function toFormValues(p: MyProductResponse): MappedListing | null;
  ```
  `edit` yoksa `null` döner (çağıran bunu "kayıt okunamadı" kapısı olarak kullanır).

- [ ] **Step 1: Şemaya iki alanı ekle**

Eşleyici bu iki alanı üreteceği için şema ÖNCE genişler.

`src/components/listing/_lib/schema.ts` — `listingFormSchema` içine:

```ts
  /**
   * Üretici model kodu. Sunucuda OPSİYONEL (delta 18 §2a): gönderilmezse
   * geçerli, gönderilirse trimlenir ve en fazla 100 karakter.
   * Temizlemek için boş veya yalnız boşluk içeren string gönderilir.
   */
  modelCode: z.string().max(100, 'Model kodu en fazla 100 karakter olabilir.'),
  isPreorder: z.boolean(),
```

ve `emptyListingFormValues` içine:

```ts
  modelCode: '',
  isPreorder: false,
```

Dosyanın baş yorumundaki "Schema-DIŞI kalan (useState)" listesinde `isPreorder`
geçiyorsa oradan çıkar — yorum gerçeğe uymalı.

- [ ] **Step 2: Başarısız testi yaz**

`src/components/listing/_lib/__tests__/editMapper.test.ts`:

```ts
/**
 * `toFormValues` — `GET /products/my/:id` → form değerleri, TEK eşleyici.
 *
 * Bugüne kadar prefill 868 satırlık hook'un içinde bir useEffect bloğuydu ve
 * ürünün GÖSTERİM projeksiyonundan okuyordu; sunucu ise kayda geri yazılabilir
 * ham değerleri ayrı bir `edit` bloğunda veriyor (delta 18 §2c). Fark, satıcının
 * dokunmadığı alanların sessizce değişmesine yol açıyordu.
 *
 * Fixture'lar 2026-08-10 staging ölçümünden alınmıştır.
 */
import { toFormValues } from '../editMapper';
import type { MyProductResponse } from '../types';

const EDIT = {
  title: 'Mini GT Volkswagen',
  description: 'Açıklama',
  price: 551.07,
  oldPrice: null,
  salePrice: null,
  saleStartDate: null,
  saleEndDate: null,
  categoryId: 'cat-1',
  brandId: 'brand-1',
  carModelId: 'model-1',
  manufacturerId: 'man-1',
  condition: 'very_good',
  status: 'active',
  modelCode: 'SEED-0057',
  color: null,
  isBoxed: null,
  quantity: 3,
  maxQuantityPerOrder: null,
  shippingPackageTier: 'small',
  isTradeEnabled: false,
  isSet: false,
  bundleSize: null,
  isLimited: false,
  editionNumber: null,
  editionTotal: null,
  releaseDate: null,
  year: 2024,
  images: [
    { cardKey: 'k/a-card.webp', detailKey: 'k/a-detail.webp',
      cardUrl: 'https://s3/a-card.webp', detailUrl: 'https://s3/a-detail.webp', sortOrder: 0 },
    { cardKey: 'k/b-card.webp', detailKey: 'k/b-detail.webp',
      cardUrl: 'https://s3/b-card.webp', detailUrl: 'https://s3/b-detail.webp', sortOrder: 1 },
  ],
  attributes: [
    { groupSlug: 'scale', groupName: 'Ölçek', slug: '1-64',
      value: '1:64', displayValue: '1:64', manufacturerSlug: null },
    { groupSlug: 'series', groupName: 'Seri', slug: 'premium',
      value: 'Premium', displayValue: 'Premium', manufacturerSlug: 'hot-wheels' },
  ],
  categoryName: 'Araba',
  brandName: 'Mini GT',
  carModelName: 'ID. Buzz',
  manufacturerName: 'TSM',
} as const;

const RESPONSE = {
  isPreorder: false,
  quantity: 3,
  availableQuantity: 1,
  // Üst seviye fiyat bilerek FARKLI: eşleyici buradan okumamalı.
  price: 999,
  oldPrice: 1234,
  isOnSale: true,
  edit: EDIT,
} as unknown as MyProductResponse;

describe('toFormValues — kaynak seçimi', () => {
  it('`edit` yoksa null döner', () => {
    expect(toFormValues({} as MyProductResponse)).toBeNull();
  });

  it('fiyatı ÜST SEVİYEDEN değil `edit`ten okur', () => {
    // Üst seviyede 999 var; doğru cevap 551.07.
    expect(toFormValues(RESPONSE)!.values.price).toBe('551.07');
  });

  it('kargo paket kademesini prefill eder', () => {
    // 2026-08-03 varsayımı ("sunucu döndürmüyor") ARTIK YANLIŞ.
    expect(toFormValues(RESPONSE)!.values.shippingPackageTier).toBe('small');
  });

  it('modelCode taşınır', () => {
    expect(toFormValues(RESPONSE)!.values.modelCode).toBe('SEED-0057');
  });

  it('`edit`te olmayan iki alan üst seviyeden gelir', () => {
    const m = toFormValues(RESPONSE)!;
    expect(m.isPreorder).toBe(false);
    // quantity 3, availableQuantity 1 → rezerve 2
    expect(m.reservedQty).toBe(2);
  });
});

describe('toFormValues — indirim çifti', () => {
  it('oldPrice > price ise normal fiyat oldPrice, indirimli price olur', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: { ...EDIT, price: 400, oldPrice: 500 },
    } as unknown as MyProductResponse)!;
    expect(m.values.price).toBe('500');
    expect(m.sale.salePrice).toBe('400');
  });

  it('indirimsizken sale alanları boş kalır', () => {
    const m = toFormValues(RESPONSE)!;
    expect(m.sale.salePrice).toBe('');
    expect(m.sale.saleStartDate).toBe('');
  });

  it('salePrice dolu ama oldPrice boşsa indirim SAYILMAZ', () => {
    // `edit.salePrice` geriye uyum alanıdır; tek başına otorite DEĞİLDİR.
    const m = toFormValues({
      ...RESPONSE,
      edit: { ...EDIT, price: 400, oldPrice: null, salePrice: 400 },
    } as unknown as MyProductResponse)!;
    expect(m.values.price).toBe('400');
    expect(m.sale.salePrice).toBe('');
  });

  it('sale tarihleri YYYY-MM-DD olarak kırpılır', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: {
        ...EDIT, price: 400, oldPrice: 500,
        saleStartDate: '2026-08-01T00:00:00.000Z',
        saleEndDate: '2026-08-31T23:59:59.000Z',
      },
    } as unknown as MyProductResponse)!;
    expect(m.sale.saleStartDate).toBe('2026-08-01');
    expect(m.sale.saleEndDate).toBe('2026-08-31');
  });
});

describe('toFormValues — nitelikler', () => {
  it('üretici-BAĞIMSIZ nitelikleri de alır', () => {
    // Eski kod `manufacturerSlug` dolu olanları filtreliyordu; `scale` düşüyordu.
    expect(toFormValues(RESPONSE)!.attrs).toEqual({
      scale: ['1-64'],
      series: ['premium'],
    });
  });

  it('aynı gruptaki birden çok niteliği toplar', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: {
        ...EDIT,
        attributes: [
          { groupSlug: 'color', groupName: 'Renk', slug: 'red', value: 'Kırmızı', displayValue: 'Kırmızı', manufacturerSlug: null },
          { groupSlug: 'color', groupName: 'Renk', slug: 'blue', value: 'Mavi', displayValue: 'Mavi', manufacturerSlug: null },
        ],
      },
    } as unknown as MyProductResponse)!;
    expect(m.attrs).toEqual({ color: ['red', 'blue'] });
  });
});

describe('toFormValues — görseller', () => {
  it('key ve URL çiftlerini sunucudan aynen alır', () => {
    const m = toFormValues(RESPONSE)!;
    expect(m.images.keys).toEqual([
      { cardKey: 'k/a-card.webp', detailKey: 'k/a-detail.webp' },
      { cardKey: 'k/b-card.webp', detailKey: 'k/b-detail.webp' },
    ]);
    expect(m.images.uris).toEqual(['https://s3/a-card.webp', 'https://s3/b-card.webp']);
  });

  it('key eksik bir görseli ATLAR — URL`den key UYDURMAZ', () => {
    // Eski kod `cardKey ?? i.url` yapıyordu; delta 18 §2d bunu yasaklıyor.
    const m = toFormValues({
      ...RESPONSE,
      edit: {
        ...EDIT,
        images: [
          { cardUrl: 'https://s3/x.webp', detailUrl: 'https://s3/x.webp', sortOrder: 0 },
          EDIT.images[0],
        ],
      },
    } as unknown as MyProductResponse)!;
    expect(m.images.keys).toHaveLength(1);
    expect(m.images.keys[0].cardKey).toBe('k/a-card.webp');
  });

  it('sortOrder`a göre sıralar — dizi sırası kanoniktir', () => {
    const m = toFormValues({
      ...RESPONSE,
      edit: { ...EDIT, images: [EDIT.images[1], EDIT.images[0]] },
    } as unknown as MyProductResponse)!;
    expect(m.images.keys[0].cardKey).toBe('k/a-card.webp');
  });
});

describe('toFormValues — etiketler', () => {
  it('marka/model/kategori/üretici adlarını taşır', () => {
    expect(toFormValues(RESPONSE)!.labels).toEqual({
      brandName: 'Mini GT',
      carModelName: 'ID. Buzz',
      categoryName: 'Araba',
      manufacturerName: 'TSM',
    });
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest src/components/listing/_lib/__tests__/editMapper.test.ts --forceExit`
Expected: FAIL — `Cannot find module '../editMapper'`

- [ ] **Step 4: Eşleyiciyi yaz**

`src/components/listing/_lib/editMapper.ts`:

```ts
import type {
  EditAttribute,
  EditImage,
  ImageKey,
  MyProductResponse,
} from './types';
import { emptyListingFormValues, type ListingFormValues } from './schema';

export type MappedListing = {
  values: ListingFormValues;
  images: { keys: ImageKey[]; uris: string[] };
  /** groupSlug → [attrSlug] */
  attrs: Record<string, string[]>;
  sale: { salePrice: string; saleStartDate: string; saleEndDate: string };
  reservedQty: number;
  isPreorder: boolean;
  labels: {
    brandName: string;
    carModelName: string;
    categoryName: string;
    manufacturerName: string;
  };
};

const str = (v: unknown): string => (v == null ? '' : String(v));
/** ISO tarihi form girdisinin beklediği YYYY-MM-DD'ye kırpar. */
const day = (v: string | null): string => (v ? String(v).slice(0, 10) : '');

/**
 * `GET /products/my/:id` → form değerleri. TEK eşleyici.
 *
 * Kural: kayda GERİ YAZILAN her alan `edit` bloğundan gelir. Üst seviye
 * projeksiyon gösterim içindir ve geri yazılamaz — oradan okumak, satıcının
 * dokunmadığı alanların sessizce değişmesine yol açar.
 *
 * İki istisna, çünkü `edit` onları TAŞIMIYOR (2026-08-10 ölçümü):
 * `isPreorder` ve rezerve adet (`quantity − availableQuantity`).
 */
export function toFormValues(p: MyProductResponse): MappedListing | null {
  const e = p?.edit;
  if (!e) return null;

  // Kanonik indirim çifti `price` + `oldPrice`. `salePrice` geriye uyum
  // alanıdır ve TEK BAŞINA otorite değildir (delta 18 §2c).
  const price = e.price;
  const oldPrice = e.oldPrice;
  const onSale = price != null && oldPrice != null && Number(oldPrice) > Number(price);

  const attrs: Record<string, string[]> = {};
  for (const a of (e.attributes ?? []) as EditAttribute[]) {
    // `manufacturerSlug` filtresi YOK: `scale` gibi üretici-bağımsız
    // nitelikler de forma girer.
    if (!a?.groupSlug || !a?.slug) continue;
    (attrs[a.groupSlug] ??= []).push(a.slug);
  }

  // Dizi sırası kanoniktir (indeks = sortOrder). Sunucu sıralı gönderse de
  // burada garantiye alınır.
  const images = [...((e.images ?? []) as EditImage[])].sort(
    (a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0),
  );
  // Key'i OLMAYAN görsel atlanır — URL'den key türetmek yasak (§2d).
  const usable = images.filter((i) => !!i?.cardKey && !!i?.detailKey);

  const quantity = p.quantity ?? e.quantity ?? null;
  const available = p.availableQuantity ?? null;

  return {
    values: {
      ...emptyListingFormValues,
      title: str(e.title),
      description: str(e.description),
      price: str(onSale ? oldPrice : price),
      quantity: e.quantity != null ? String(e.quantity) : '',
      bundleSize: e.bundleSize != null ? String(e.bundleSize) : '',
      categoryId: str(e.categoryId),
      condition: e.condition || emptyListingFormValues.condition,
      brandId: str(e.brandId),
      carModelId: str(e.carModelId),
      manufacturerId: str(e.manufacturerId),
      modelCode: str(e.modelCode),
      year: e.year != null ? String(e.year) : '',
      isTradeEnabled: !!e.isTradeEnabled,
      isSet: !!e.isSet,
      status: e.status || emptyListingFormValues.status,
      isPreorder: !!p.isPreorder,
      shippingPackageTier: str(e.shippingPackageTier),
      // `scale` ve `material` artık üst seviyeden DEĞİL `attributes`'tan gelir.
      scale: attrs.scale?.[0] ?? '',
      material: attrs.material?.[0] ?? '',
    },
    images: {
      keys: usable.map((i) => ({ cardKey: i.cardKey, detailKey: i.detailKey })),
      uris: usable.map((i) => i.cardUrl || i.detailUrl || ''),
    },
    attrs,
    sale: {
      salePrice: onSale ? str(price) : '',
      saleStartDate: onSale ? day(e.saleStartDate) : '',
      saleEndDate: onSale ? day(e.saleEndDate) : '',
    },
    reservedQty:
      quantity != null && available != null
        ? Math.max(0, Number(quantity) - Number(available))
        : 0,
    isPreorder: !!p.isPreorder,
    labels: {
      brandName: str(e.brandName),
      carModelName: str(e.carModelName),
      categoryName: str(e.categoryName),
      manufacturerName: str(e.manufacturerName),
    },
  };
}
```

- [ ] **Step 5: Testi çalıştır**

Run: `npx jest src/components/listing/_lib/__tests__/editMapper.test.ts --forceExit`
Expected: PASS (16 test)

- [ ] **Step 6: Commit**

```bash
git add src/components/listing/_lib/schema.ts src/components/listing/_lib/editMapper.ts src/components/listing/_lib/__tests__/
git commit -m "feat(listing): map the edit projection to form values in one place"
```

---

### Task 3: Forma model kodu girdisi

**Files:**
- Modify: `src/components/listing/_components/ListingSections.tsx`
- Modify: `src/i18n/lib/catalog/{tr,en}.json`

**Interfaces:**
- Consumes: `ListingFormValues.modelCode` (Görev 2'de şemaya eklendi);
  hook köprüsü `f.modelCode` / `f.setModelCode`.
- Produces: kullanıcı görünür alan; yeni dışa açık isim yok.

> `carModelId` için yapılacak iş YOK — mobilde zaten opsiyonel (bkz. yukarıdaki
> "Ölçümün getirdiği iki sadeleşme"). Bu görev yalnız `modelCode`'u ekler.

- [ ] **Step 1: i18n anahtarını ekle**

`src/i18n/lib/catalog/tr.json` içinde ilan formu bloğuna (mevcut alan
etiketlerinin yanına, gerçek blok adını dosyadan oku):

```json
"modelCodeLabel": "Üretici Model Kodu",
"modelCodePlaceholder": "Örn. SEED-0057"
```

`en.json` aynı yere:

```json
"modelCodeLabel": "Manufacturer Model Code",
"modelCodePlaceholder": "e.g. SEED-0057"
```

Run: `pnpm i18n:codegen`

- [ ] **Step 2: Forma girdiyi ekle**

`src/components/listing/_components/ListingSections.tsx` — marka/model
seçicilerinin bulunduğu bölüme, mevcut metin girdilerinin kalıbını **birebir
izleyerek** bir `modelCode` girdisi ekle. Zorunlu değildir: etikete "(opsiyonel)"
benzeri bir işaret eklenecekse o metin de katalogdan gelmeli, gömülü yazılmamalı.

Dosyadaki mevcut bir metin girdisini (ör. `title` veya `year`) kopyalayıp alan
adını değiştirmek doğru yaklaşımdır — kendi stil/token seçimini icat etme.

- [ ] **Step 3: Tip kontrolü ve testler**

Run: `npx tsc --noEmit`
Expected: 0 hata. `f.modelCode` / `f.setModelCode` köprüsü hook'ta yoksa
`useListingForm.ts`'teki mevcut `form.watch`/`form.setValue` kalıbıyla ekle —
kendi kalıbını icat etme.

Run: `npx jest src/components/listing --forceExit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/listing src/i18n/lib
git commit -m "feat(listing): carry the optional manufacturer model code"
```

---

### Task 4: Prefill'i eşleyiciye bağla ve kademe workaround'unu sil

**Files:**
- Modify: `src/components/listing/_hooks/useListingForm.ts:220-296` (prefill effect),
  `:598-601` (payload'daki tier satırı)
- Modify: `src/components/listing/_lib/validate.ts`
- Delete: `src/components/listing/_lib/payload.ts`

**Interfaces:**
- Consumes: `toFormValues(p)` → `MappedListing | null` (Görev 2).
- Produces: davranış değişikliği; hook'un dışa açık yüzeyi aynı kalır.

- [ ] **Step 1: Prefill efektini eşleyiciye indir**

`useListingForm.ts` — `productsApi.getMyById` çağrısını izleyen ~70 satırlık
`setX(...)` bloğunu şununla değiştir:

```ts
        const mapped = toFormValues((res.data?.data ?? res.data) as MyProductResponse);
        if (cancelled) return;
        if (!mapped) {
          setProductNotFound(true);
          return;
        }

        // Şema alanları tek seferde; tek tek setter çağırmak yerine form.reset.
        form.reset(mapped.values);
        setReservedQty(mapped.reservedQty);
        setImageKeys(mapped.images.keys);
        setImageUris(mapped.images.uris);
        setSalePrice(mapped.sale.salePrice);
        setSaleStartDate(mapped.sale.saleStartDate);
        setSaleEndDate(mapped.sale.saleEndDate);
        if (Object.keys(mapped.attrs).length) {
          initialCustomAttrsRef.current = mapped.attrs;
        }
```

Importlara `toFormValues` ve `MyProductResponse` ekle. `isPreorder` artık şemada
olduğu için ayrı `setIsPreorder` çağrısı gerekmez — varsa onu ve karşılık gelen
`useState`'i kaldır, `form.watch('isPreorder')` köprüsünü mevcut kalıba göre kur.

- [ ] **Step 2: Etiketleri yedek olarak bağla**

Bugün seçili marka/model/kategori/üretici adları listeler üzerinden çözülüyor
(`useListingForm.ts:565-568`, `.find()`), yani **listeler yüklenene kadar alanlar
boş görünüyor.** Sunucu bu adları `edit` içinde zaten veriyor.

Eşleyicinin döndürdüğü etiketleri bir ref'te tut:

```ts
  const editLabelsRef = useRef<MappedListing['labels'] | null>(null);
```

prefill'de doldur (`editLabelsRef.current = mapped.labels;`) ve dört türetmeyi
yedekli hale getir:

```ts
  const selectedCategory =
    flatCategories.find((c) => c.id === categoryId) ??
    (editLabelsRef.current?.categoryName
      ? { id: categoryId, name: editLabelsRef.current.categoryName, slug: '' }
      : undefined);
```

Aynı kalıbı `selectedBrand`, `selectedModel`, `selectedManufacturer` için uygula
(`Brand`/`CarModel`/`Manufacturer` tiplerinin zorunlu alanlarını boş string ile
doldur — bu nesneler yalnız etiket göstermek için kullanılıyor).

**Liste yüklendiğinde `.find()` kazanır** — yedek yalnız boşluğu doldurur, gerçek
kaydı ezmez.

- [ ] **Step 3: Kademeyi koşulsuz gönder ve workaround'u sil**

`buildBasePayload` içindeki şu satırları:

```ts
      // Boş kademe payload'a KONMAZ — düzenlemede sunucunun kayıtlı değerini
      // ezmesin (sunucu mevcut kademeyi geri döndürmüyor, bkz. `_lib/payload`).
      ...buildTierPayloadField(shippingPackageTier),
```

şununla değiştir:

```ts
      // Sunucu kademeyi `edit.shippingPackageTier` ile geri döndürüyor
      // (2026-08-10 ölçümü), yani form onu HEP dolu açar. Koşullu göndermek
      // artık satıcının BİLEREK yaptığı değişikliği yutardı.
      shippingPackageTier,
```

Sonra dosyayı sil ve importunu kaldır:

```bash
git rm src/components/listing/_lib/payload.ts
```

- [ ] **Step 4: `validate.ts`'teki düzenleme istisnasını kaldır**

`firstListingValidationError` içindeki son bloğu şununla değiştir:

```ts
  // Kargo bölümü formun en altında, bu yüzden en sonda. Sunucu kademe
  // gelmediğinde `small` VARSAYIYOR ve büyük bir ürün küçük paket bedeliyle
  // gidiyor — paket başına 60 TL'ye kadar eksik tahsil.
  //
  // Düzenlemede de zorunlu: form artık kademeyi `edit.shippingPackageTier`'dan
  // dolu açıyor (2026-08-10 ölçümü), yani satıcı göremediği bir değeri yeniden
  // seçmek zorunda kalmıyor. Eski istisna o ölçümden ÖNCEKİ duruma aitti.
  if (!input.values.shippingPackageTier) {
    return 'Lütfen kargo paket boyutunu seçin.';
  }
```

`ListingValidationInput`'taki `isEdit` alanı başka bir yerde kullanılmıyorsa
kaldır; kullanılıyorsa dokunma.

- [ ] **Step 5: Testler ve tip kontrolü**

Run: `npx jest src/components/listing app/settings/__tests__/my-listings.test.tsx --forceExit`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 0 hata — `buildTierPayloadField` importu kalmadığı doğrulanır.

Run: `grep -rn "buildTierPayloadField\|_lib/payload" src/ app/`
Expected: çıktı yok.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/listing
git commit -m "fix(listing): fill the edit form from the server's edit projection"
```

---

### Task 5: Görsel sözleşmesi — kaydet kapısı ve `409`

**Files:**
- Modify: `src/components/listing/_hooks/useListingForm.ts:524-540` (upload),
  submit `catch` bloğu
- Modify: `src/components/listing/_components/ListingSections.tsx:670-678` (kaydet butonu)
- Modify: `src/i18n/lib/catalog/{tr,en}.json`
- Test: `src/components/listing/_lib/__tests__/editMapper.test.ts` (mevcut, genişlemez)

**Interfaces:**
- Consumes: `uploadingImages: boolean` (hook'ta mevcut).
- Produces: davranış değişikliği; yeni dışa açık isim yok.

> Prefill'deki URL-key fallback'i Görev 2'de eşleyiciyle zaten kalktı ve testi
> var. Bu görev kalan üç maddeyi kapatır.

- [ ] **Step 1: Yükleme URL'i dönmezse başarısız say**

`pickImages` içindeki şu satırı:

```ts
      setImageUris((prev) => [...prev, ...assets.map((a, i) => newPreviewUrls[i] || a.uri)]);
```

şununla değiştir:

```ts
      // API'nin döndürdüğü URL esastır; yerel geçici URI'yi saklamak, kaydetme
      // anında sunucuda karşılığı olmayan bir görselin "yüklenmiş" görünmesine
      // yol açar (delta 18 §2d).
      setImageUris((prev) => [...prev, ...newPreviewUrls]);
```

ve `newKeys`/`newPreviewUrls` üretimini, key'i eksik gelen yanıtları eleyecek
şekilde sıkılaştır:

```ts
      const usable = uploaded.filter((r: any) => r?.cardKey && r?.detailKey);
      if (usable.length !== uploaded.length) {
        appAlert('Hata', t('listing.imageUploadIncomplete'));
      }
      const newKeys = usable.map((r: any) => ({
        cardKey: r.cardKey,
        detailKey: r.detailKey,
      }));
      const newPreviewUrls = usable.map((r: any) => r.cardUrl || r.detailUrl || '');
```

- [ ] **Step 2: i18n anahtarlarını ekle**

`tr.json` ilan bloğuna:

```json
"imageUploadIncomplete": "Bazı görseller yüklenemedi. Lütfen tekrar deneyin.",
"saveWhileUploading": "Görseller yükleniyor…",
"listingChangedElsewhere": "Bu ilan başka bir yerden güncellendi. En güncel hali yüklendi, değişikliklerinizi tekrar uygulayın."
```

`en.json` aynı yere:

```json
"imageUploadIncomplete": "Some images could not be uploaded. Please try again.",
"saveWhileUploading": "Uploading images…",
"listingChangedElsewhere": "This listing was updated elsewhere. The latest version has been loaded; please reapply your changes."
```

Run: `pnpm i18n:codegen`

- [ ] **Step 3: Kaydet butonunu kuyruğa bağla**

`ListingSections.tsx:670-678` — butonun `disabled` ve etiket mantığını değiştir:

```tsx
          style={[styles.submitButton, (f.isSubmitting || f.uploadingImages) && styles.submitButtonDisabled]}
          disabled={f.isSubmitting || f.uploadingImages}
```

ve etiket dalına yükleme durumunu ekle:

```tsx
          {f.isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {f.uploadingImages
                ? t('listing.saveWhileUploading')
                : f.isEdit
                  ? 'Değişiklikleri Kaydet'
                  : 'İlanı Oluştur'}
            </Text>
          )}
```

> Mevcut iki Türkçe literal (`'Değişiklikleri Kaydet'`, `'İlanı Oluştur'`) bu
> dosyada zaten gömülü. Bu turda **dokunma** — bu bir sözleşme turu, i18n göçü
> turu değil; dokunulan satır yalnız yeni eklenen daldır.

- [ ] **Step 4: `409` davranışını ekle**

Submit'in `catch` bloğuna, mevcut hata gösteriminden ÖNCE:

```ts
      // İyimser kilit / atomik görsel yazımı çakışması (delta 18 §2d).
      // Yerel formu kaydedilmiş SAYMA: sunucudaki güncel kaydı çek ve
      // kullanıcıya çakışmayı bildir.
      if (err?.response?.status === 409 && isEdit) {
        try {
          const fresh = await productsApi.getMyById(productId!);
          const mapped = toFormValues((fresh.data?.data ?? fresh.data) as MyProductResponse);
          if (mapped) {
            form.reset(mapped.values);
            setImageKeys(mapped.images.keys);
            setImageUris(mapped.images.uris);
            setSalePrice(mapped.sale.salePrice);
            setSaleStartDate(mapped.sale.saleStartDate);
            setSaleEndDate(mapped.sale.saleEndDate);
          }
        } catch {
          // Yeniden çekme de başarısızsa formu olduğu gibi bırak; aşağıdaki
          // uyarı yine çıkar ve kullanıcı kaydedilmediğini bilir.
        }
        appAlert('Hata', t('listing.listingChangedElsewhere'));
        return;
      }
```

- [ ] **Step 5: Testler**

Run: `npx jest src/components/listing --forceExit`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 6: Commit**

```bash
git add src/components/listing src/i18n/lib
git commit -m "fix(listing): hold saving until uploads finish and handle write conflicts"
```

---

### Task 6: Oluşturmada indirim

**Files:**
- Modify: `src/components/listing/_hooks/useListingForm.ts:649-692` (create/update dalları)

**Interfaces:**
- Consumes: `salePrice`, `saleStartDate`, `saleEndDate` state'leri (mevcut).
- Produces: `buildSalePayload(formPrice, salePrice, saleStartDate, saleEndDate)`
  → `Record<string, unknown>`; iki dal da onu kullanır.

- [ ] **Step 1: Ortak indirim payload'ını çıkar**

Bugün indirim mantığı yalnız `isEdit` dalında, satır içi. Onu hook'un içinde tek
bir yardımcıya al (dosya dışına çıkarmaya gerek yok, iki çağıranı var):

```ts
  /**
   * İndirim alanları — `POST /products` de artık kabul ediyor (delta 18 §2b).
   * `price` formdaki indirim ÖNCESİ normal fiyattır; sunucu
   * `salePrice < max(originalPrice, price)` ise ürünü indirimli açar, aksi
   * halde indirim alanlarını yok sayar. Etkin fiyatı İSTEMCİ TÜRETMEZ.
   */
  const buildSalePayload = (): Record<string, unknown> => {
    const formPrice = Number(price);
    const sale = salePrice ? Number(salePrice) : 0;
    const hasSale = sale > 0 && formPrice > sale && sale !== formPrice;
    if (!hasSale) {
      return {
        originalPrice: null,
        salePrice: null,
        saleStartDate: null,
        saleEndDate: null,
      };
    }
    return {
      originalPrice: formPrice,
      salePrice: sale,
      saleStartDate: saleStartDate ? new Date(saleStartDate).toISOString() : null,
      saleEndDate: saleEndDate ? new Date(saleEndDate).toISOString() : null,
    };
  };
```

- [ ] **Step 2: İki dala da uygula**

`create` çağrısını:

```ts
        await productsApi.create({
          ...buildBasePayload(),
          ...buildSalePayload(),
          isPreorder: false,
          quantity: quantity ? Number(quantity) : 1,
        });
```

`update` dalındaki satır içi indirim bloğunu sil ve payload'ı:

```ts
        const payload: Record<string, any> = {
          ...buildBasePayload(),
          ...buildSalePayload(),
          isPreorder,
          quantity: quantity !== '' ? Number(quantity) : null,
          status,
        };
```

> Oluşturmada `originalPrice: null` göndermek zararsızdır — sunucu indirim
> alanlarını yok sayar. İki dalın **aynı** payload'ı üretmesi, ileride birinin
> sessizce ayrışmasını engeller.

- [ ] **Step 3: Testler**

Run: `npx jest src/components/listing --forceExit`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 0 hata

- [ ] **Step 4: Commit**

```bash
git add src/components/listing
git commit -m "feat(listing): let a new listing open with a discount"
```

---

### Task 7: `relatedOrder` / `relatedTrade` (Görev 0 geçtiyse)

> **Görev 0'ın raporu bu alanların staging'de gelmediğini söylüyorsa BU GÖREV
> DÜŞER.** Ledger'a "backend bekliyor" olarak yaz ve Görev 8'e geç. Alanı
> uydurup kod yazma.

**Files:**
- Modify: `app/settings/my-listings.tsx` veya ilanlarım satırını çizen bileşen
  (Görev 0 raporunda hangi ekranın okuduğu yazılı olacak)
- Test: ilgili mevcut test dosyası (`app/settings/__tests__/my-listings.test.tsx`)

**Interfaces:**
- Consumes: Görev 0'ın ölçtüğü gerçek alan şekli.
- Produces: davranış değişikliği.

- [ ] **Step 1: Başarısız testi yaz**

`app/settings/__tests__/my-listings.test.tsx`'e ekle — beklenen alan adlarını
**Görev 0 raporundan** al, buradaki isimleri varsayma:

```tsx
it('satılmış ilanın aksiyonu relatedOrder`dan gelir, tahminden değil', () => {
  // Görev 0 raporundaki gerçek şekli kullan.
  // Kritik nokta: ekran `orderId` benzeri bir tahminî alandan veya son yerel
  // işlemden değil, sunucunun verdiği bağlamdan okumalı.
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx jest app/settings/__tests__/my-listings.test.tsx --forceExit`
Expected: FAIL

- [ ] **Step 3: Uygula**

Satır tipine `relatedOrder` / `relatedTrade` alanlarını ekle ve satılmış/rezerve
ilan aksiyonunu bunlardan türet. Alan yoksa mevcut davranış korunur (ileri uyum).

- [ ] **Step 4: Testler**

Run: `npx jest app/settings --forceExit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/settings
git commit -m "feat(listings): read the transaction context from the server"
```

---

### Task 8: Tam doğrulama

**Files:** yok (yalnız doğrulama)

- [ ] **Step 1: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: 0 hata. Hata varsa düzelt; `main`'le karşılaştırmak için:

```bash
git stash && npx tsc --noEmit 2>&1 | tail -3 && git stash pop
```

- [ ] **Step 2: Lint**

Run: `npx eslint app src --ext .ts,.tsx`
Expected: 0 error (warning'ler önceden var olan `no-explicit-any`).

- [ ] **Step 3: Tüm test paketi**

Run: `npx jest --forceExit`
Expected: PASS. Referans: bu plan başlarken 173 suite / 1398 test yeşildi; sayı
düşmemeli. Kırılan testi `--testPathIgnorePatterns` ile saklama, düzelt.

- [ ] **Step 4: Ölü kod taraması**

```bash
grep -rn "buildTierPayloadField\|_lib/payload" src/ app/
grep -rn "manufacturerSlug &&" src/components/listing/
```
Expected: ikisi de boş — workaround ve eski nitelik filtresi kalmadı.

- [ ] **Step 5: Metro'da elle dene**

```bash
npx expo start -c
```

**Asıl test, bu turun varlık sebebi:** mevcut bir ilanı düzenle, **yalnız
başlığı** değiştir, kaydet. Sonra ilanı yeniden aç ve şunları doğrula:

- kargo paket kademesi **değişmedi**
- indirim varsa normal/indirimli fiyat aynı kaldı
- görseller ve sıraları aynı
- model kodu korundu
- nitelikler (ölçek dahil) korundu

Ayrıca: yeni ilan oluştururken görsel yüklerken kaydet butonunun **kapalı**
olduğunu gör.

- [ ] **Step 6: Kapanış raporu**

`docs/superpowers/reports/2026-08-10-ilan-formu-kapanis.md` — ne kapandı, Görev
0'ın kapısında ne düştü, elle testte ne görüldü. `docs/PARITE_KALAN_ISLER.md`'de
kapanan maddeleri (P1 #2, #3 ve P2 #6, #7, varsa #8) işaretle.

- [ ] **Step 7: Commit**

```bash
git add docs
git commit -m "docs(report): close out the listing form contract round"
```
