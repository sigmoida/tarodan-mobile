import { z } from 'zod';

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
 */
export const listingFormSchema = z.object({
  title: z.string().trim().min(5, 'Başlık en az 5 karakter olmalıdır.'),
  description: z.string().max(5000, 'Açıklama en fazla 5000 karakter olabilir.'),
  price: z
    .string()
    .min(1, 'Geçerli bir fiyat giriniz.')
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1, 'Geçerli bir fiyat giriniz.'),
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
  modelCode: z.string().max(100, 'Model kodu en fazla 100 karakter olabilir.'),
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
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

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
};
