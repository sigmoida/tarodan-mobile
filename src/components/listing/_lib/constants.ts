import type { TFunction } from 'i18next';
import type { MaterialOption } from './types';

// ---------------------------------------------------------------------------
// ListingForm — static option lists
// ---------------------------------------------------------------------------
/**
 * Bir modül-seviyesi dizi i18next hazır olmadan çözülür ve ilk yüklenen dilde
 * donardı — bu yüzden factory: bileşen `useMemo(() => buildConditions(t), [t])`
 * ile çağırır. Etiketler zaten katalogda (`product.condition*`).
 */
export const buildConditions = (t: TFunction) => [
  { value: 'new', label: t('product.conditionNew') },
  { value: 'like_new', label: t('product.conditionLikeNew') },
  { value: 'very_good', label: t('product.conditionVeryGood') },
  { value: 'good', label: t('product.conditionGood') },
  { value: 'fair', label: t('product.conditionFair') },
];

export const FALLBACK_SCALES = ['1:18', '1:24', '1:43', '1:64', '1:87'];

export const FALLBACK_MATERIALS: MaterialOption[] = [
  { slug: 'diecast', label: 'Diecast (Metal)' },
  { slug: 'resin', label: 'Resin (Reçine)' },
  { slug: 'composite', label: 'Composite (Kompozit)' },
  { slug: 'plastic', label: 'Plastic (Plastik)' },
];

const currentYear = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

// Kategori ağacında marka/ölçek slug'ları ayrı alanlara sahip; kategori
// listesinden dışlanır.
export const BRAND_SLUGS = ['hot-wheels', 'hot-wheels-premium', 'hot-wheels-rlc', 'matchbox', 'tomica', 'majorette', 'maisto', 'bburago', 'welly', 'jada', 'greenlight', 'auto-world', 'mini-gt', 'tarmac-works', 'inno64', 'pop-race'];
export const SCALE_SLUGS = ['scale-118', 'scale-124', 'scale-143', 'scale-164'];

/**
 * Ürün fotoğrafı için istemci-tarafı alt sınır.
 *
 * Sunucuda alt sınır YOK (`media.service.ts` yalnız 10 MB üst sınırına bakar) —
 * bu tamamen kalite kuralı: 1 KB altında anlamlı bir ürün fotoğrafı pratikte
 * bulunmuyor, gelen şey boş/bozuk kayıt ya da galeri yer tutucusu oluyor.
 * Web'deki `MIN_IMAGE_BYTES` ile aynı değer (2026-08-15).
 */
export const MIN_IMAGE_BYTES = 1024;
