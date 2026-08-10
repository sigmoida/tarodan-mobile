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
