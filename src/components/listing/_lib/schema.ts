import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * #81: ListingForm form alanlari icin zod schema (useZodForm). watch/setValue
 * koprusuyle mevcut f.field / f.setField sozlesmesi korunur, boylece ListingSections
 * ve ListingForm.tsx degismez. Sayisal alanlar text input'a bagli oldugu icin string
 * tutulur ve submit'te Number()'a cevrilir (payload byte-byte korunur). Not: title
 * min 5 (web min 1'den farkli, mobil davranisi korunur).
 *
 * Schema-DISI kalan (useState): sale/discount alanlari (salePrice/saleStartDate/
 * saleEndDate), imageKeys/imageUris, customAttributes, reservedQty, reactivate
 * alanlari, productLoading. Bunlar server/UI state.
 *
 * `t` argüman olarak alınıyor (i18n): zod mesajları şema KURULURKEN çözülüyor,
 * modül seviyesinde kurulan bir şema metnini ilk yüklenen dilde donduruyordu —
 * bkz. `src/test-utils/schema.ts`.
 */
/** Sunucu sınırları — `apps/api/src/modules/product/dto/create-product.dto.ts`. */
export const TITLE_MAX = 200;
export const DESCRIPTION_MIN = 30;
export const DESCRIPTION_MAX = 330;
export const MIN_IMAGES = 3;
/** `MAX_PRODUCT_COLORS` (api `common/helpers/attribute-groups.ts`). */
export const MAX_COLORS = 3;

export const buildListingFormSchema = (t: TFunction, opts: { isEdit?: boolean } = {}) => {
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
    price: z
      .string()
      .min(1, t('common.invalidPrice'))
      .refine((v) => !isNaN(Number(v)) && Number(v) >= 1, t('common.invalidPrice')),
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
