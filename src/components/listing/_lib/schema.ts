import { z } from 'zod';
import type { TFunction } from 'i18next';
import { NO_PRICE_LIMITS, type PriceLimits } from '@/lib/shared/priceLimits';
import { parseTlAmount } from '@/lib/shared/tlAmount';
import { priceFieldError } from './priceRules';

/**
 * #81: the zod schema of the ListingForm fields (useZodForm). The watch/setValue bridge keeps
 * the f.field / f.setField contract, so ListingSections and ListingForm.tsx do not change.
 * Numeric fields are bound to text inputs, so they stay strings and are read at submit time:
 * the price with the shared TL amount parser (`tlAmountValue`, never `Number()`, which reads
 * "1.000" as 1 and "1250,50" as NaN), the counts with `Number()`. Note: title min 5 (web
 * min 1; the mobile rule is kept).
 *
 * Outside the schema (useState): the sale/discount fields (salePrice/saleStartDate/
 * saleEndDate), images, customAttributes, reservedQty, the reactivate fields and
 * productLoading. These are server/UI state.
 *
 * `t` is an argument (i18n): zod messages are resolved when the schema is BUILT, so a schema
 * built at module level froze its copy in the first loaded language; see
 * `src/test-utils/schema.ts`.
 */
/** Sunucu sınırları — `apps/api/src/modules/product/dto/create-product.dto.ts`. */
export const TITLE_MAX = 200;
export const DESCRIPTION_MIN = 30;
export const DESCRIPTION_MAX = 330;
export const MIN_IMAGES = 3;
/** `MAX_PRODUCT_COLORS` (api `common/helpers/attribute-groups.ts`). */
export const MAX_COLORS = 3;

export interface ListingSchemaOptions {
  isEdit?: boolean;
  /** Admin fiyat sınırları (`min_product_price` / `max_product_price`); yoksa kural yok. */
  priceLimits?: PriceLimits;
  /** Düzenlemede ilanda saklı fiyat değerleri — bunlardan birine eşit aday fiyat hata vermez. */
  storedPrices?: readonly string[] | null;
}

export const buildListingFormSchema = (t: TFunction, opts: ListingSchemaOptions = {}) => {
  const limits = opts.priceLimits ?? NO_PRICE_LIMITS;
  const descriptionMsg = t('listing.descriptionLengthMsg', { min: DESCRIPTION_MIN, max: DESCRIPTION_MAX });
  const inRange = (v: string) => v.length >= DESCRIPTION_MIN && v.length <= DESCRIPTION_MAX;
  return z.object({
    title: z
      .string()
      .trim()
      .min(5, t('validation.minLength', { min: 5 }))
      .max(TITLE_MAX, t('validation.maxLength', { max: TITLE_MAX })),
    /**
     * Sunucu (`create-product.dto.ts`) 30–330 karakter zorunlu tutuyor.
     * Düzenlemede boş açıklama hiç gönderilmez (`description || undefined`) ve
     * güncelleme DTO'su `PartialType` — eski ilanın boş açıklaması kaydı kilitlemez.
     */
    description: z
      .string()
      .trim()
      .refine((v) => (opts.isEdit && v.length === 0) || inRange(v), descriptionMsg),
    /**
     * A TL amount read by the shared parser, as on web: "1.000" (one thousand to a Turkish
     * seller) is refused (`validation.amountFormatRefused`), never listed as 1 TL. Then the
     * 1 TL minimum, then the admin price limits (`priceFieldError`), one issue at a time.
     */
    price: z.string().superRefine((v, ctx) => {
      const parsed = parseTlAmount(v);
      const message =
        parsed.status === 'refused'
          ? t('validation.amountFormatRefused')
          : parsed.status !== 'ok' || parsed.amount < 1
            ? t('common.invalidPrice')
            : priceFieldError(t, v, limits, opts.storedPrices);
      if (message) ctx.addIssue({ code: 'custom', message });
    }),
    quantity: z.string(),
    bundleSize: z.string(),
    categoryId: z.string(),
    condition: z.string(),
    brandId: z.string(),
    carModelId: z.string(),
    scale: z.string(),
    material: z.string(),
    manufacturerId: z.string(),
    year: z.string(),
    isTradeEnabled: z.boolean(),
    isSet: z.boolean(),
    status: z.string(),
    isPreorder: z.boolean(),
    /**
     * Üretici model kodu. Sunucuda OPSİYONEL (delta 18 §2a): gönderilmezse
     * geçerli, gönderilirse trimlenir ve en fazla 100 karakter.
     * Temizlemek için boş veya yalnız boşluk içeren string gönderilir.
     */
    modelCode: z.string().max(100, t('validation.maxLength', { max: 100 })),
    /**
     * Kargo paket boyutu — ilan başına satıcı seçer (kaldırılan desi girdisinin
     * yerine geçti). Kodlar sunucu tarifesinden (`GET /shipping/package-tiers`)
     * gelir; şema onları sabitlemez ki tarifeye kademe eklenince form
     * kilitlenmesin.
     *
     * ZORUNLULUK burada değil `validate()`'te: hata mesajları formdaki görsel
     * sırayla çıkmalı (başlık → kategori → fotoğraf → … → paket boyutu) ve
     * kategori/fotoğraf zaten şema dışında, elle kontrol ediliyor.
     */
    shippingPackageTier: z.string(),
    /**
     * Katalog renk slug'ları (`GET /products/filters` → `colors`), web gibi
     * `colors` olarak gönderilir. Sunucu en az 1, en fazla `MAX_COLORS` ister.
     * "En az 1" `validate()`'te — hata sırası formdaki görsel sırayı izler.
     */
    colors: z.array(z.string()).max(MAX_COLORS, t('listing.colorLimitMsg', { max: MAX_COLORS })),
    /** '' (seçilmedi) | 'boxed' | 'unboxed' — sunucuya boolean gider. */
    isBoxed: z.enum(['', 'boxed', 'unboxed']),
  });
};

export type ListingFormValues = z.infer<ReturnType<typeof buildListingFormSchema>>;

export const emptyListingFormValues: ListingFormValues = {
  title: '',
  description: '',
  price: '',
  quantity: '1',
  bundleSize: '',
  categoryId: '',
  condition: 'very_good',
  brandId: '',
  carModelId: '',
  scale: '1:64',
  material: '',
  manufacturerId: '',
  year: '',
  isTradeEnabled: false,
  isSet: false,
  status: 'active',
  isPreorder: false,
  modelCode: '',
  shippingPackageTier: '',
  colors: [],
  isBoxed: '',
};
