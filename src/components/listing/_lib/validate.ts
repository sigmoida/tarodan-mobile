import { listingFormSchema, type ListingFormValues } from './schema';

export interface ListingValidationInput {
  values: ListingFormValues;
  /** Şema dışı: picker'dan gelir. */
  categoryId: string;
  /** Şema dışı: yüklenmiş görsel sayısı. */
  imageCount: number;
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
  input: ListingValidationInput,
): string | null {
  const result = listingFormSchema.safeParse(input.values);
  if (!result.success) {
    return result.error.issues[0]?.message || 'Lütfen alanları kontrol edin.';
  }
  if (!input.categoryId) return 'Lütfen bir kategori seçin.';
  if (input.imageCount === 0) return 'En az bir fotoğraf ekleyin.';
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
  return null;
}
