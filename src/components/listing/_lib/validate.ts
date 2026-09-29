import type { TFunction } from 'i18next';
import { buildListingFormSchema, MIN_IMAGES, type ListingFormValues } from './schema';

export interface ListingValidationInput {
  values: ListingFormValues;
  /** Şema dışı: picker'dan gelir. */
  categoryId: string;
  /** Şema dışı: yüklenmiş görsel sayısı. */
  imageCount: number;
  /**
   * Düzenleme: güncelleme DTO'su `PartialType(CreateProductDto)` — alanlar
   * opsiyonel, gönderilen alan yine kurala tabi. 2026-07-29 öncesi ilanlarda
   * renk/kutu yok; burada zorunlu tutmak onları düzenlenemez yapardı.
   */
  isEdit?: boolean;
}

/**
 * İlan formunun gönderim kapısı — ilk hatanın mesajı, hata yoksa `null`.
 *
 * Şema title/price gibi metin alanlarını taşır; kategori, fotoğraf ve kargo
 * paket boyutu şema dışıdır (biri picker, biri yükleme, biri sunucu
 * tarifesinden gelen kod listesi). Sıra kullanıcıya gösterilecek TEK mesajı
 * belirlediği için burada açıkça yazılı — hook içinde dağılmış if'lerde değil.
 */
export function firstListingValidationError(
  t: TFunction,
  input: ListingValidationInput,
): string | null {
  const result = buildListingFormSchema(t, { isEdit: input.isEdit }).safeParse(input.values);
  if (!result.success) {
    return result.error.issues[0]?.message || t('listing.checkFieldsFallback');
  }
  if (!input.categoryId) return t('listing.categoryRequiredMsg');
  if (input.imageCount < MIN_IMAGES) return t('listing.minImagesMsg', { min: MIN_IMAGES });
  // Sunucu 2026-07-29'dan beri (`0096579da`) bunları zorunlu tutuyor. İstemci
  // kontrol etmezse sunucu hata LİSTESİ döndürür ve kullanıcı neyin eksik
  // olduğunu göremez. Sıra formdaki görsel sıra.
  const v = input.values;
  if (!input.isEdit) {
    if (!v.brandId) return t('listing.brandRequiredMsg');
    if (!v.scale) return t('listing.scaleRequiredMsg');
    if (!v.material) return t('listing.materialRequiredMsg');
    if (!v.manufacturerId) return t('listing.manufacturerRequiredMsg');
    if (v.colors.length === 0) return t('listing.colorRequiredMsg');
    if (!v.isBoxed) return t('listing.boxedRequiredMsg');
  }
  // Kargo bölümü formun en altında, bu yüzden en sonda. Sunucu kademe
  // gelmediğinde `small` VARSAYIYOR ve büyük bir ürün küçük paket bedeliyle
  // gidiyor — paket başına 60 TL'ye kadar eksik tahsil.
  //
  // Düzenlemede de zorunlu: form artık kademeyi `edit.shippingPackageTier`'dan
  // dolu açıyor (2026-08-10 ölçümü), yani satıcı göremediği bir değeri yeniden
  // seçmek zorunda kalmıyor. Eski istisna o ölçümden ÖNCEKİ duruma aitti.
  if (!input.values.shippingPackageTier) {
    return t('listing.packageTierRequiredMsg');
  }
  return null;
}
