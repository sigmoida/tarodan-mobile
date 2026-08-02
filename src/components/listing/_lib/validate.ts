import { listingFormSchema, type ListingFormValues } from './schema';

export interface ListingValidationInput {
  values: ListingFormValues;
  /** Şema dışı: picker'dan gelir. */
  categoryId: string;
  /** Şema dışı: yüklenmiş görsel sayısı. */
  imageCount: number;
  /** Düzenleme mi? Kademe zorunluluğu yalnız oluşturmada geçerli (aşağıya bak). */
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
  input: ListingValidationInput,
): string | null {
  const result = listingFormSchema.safeParse(input.values);
  if (!result.success) {
    return result.error.issues[0]?.message || 'Lütfen alanları kontrol edin.';
  }
  if (!input.categoryId) return 'Lütfen bir kategori seçin.';
  if (input.imageCount === 0) return 'En az bir fotoğraf ekleyin.';
  // Kargo bölümü formun en altında, bu yüzden en sonda. Oluşturmada boş
  // geçilemez: sunucu kademe gelmediğinde `small` VARSAYIYOR ve büyük bir ürün
  // küçük paket bedeliyle gidip paket başına 60 TL eksik tahsil ediliyor.
  //
  // DÜZENLEMEDE zorunlu DEĞİL: `GET /products/my/:id` mevcut kademeyi geri
  // döndürmüyor (canlı ölçüm, 2026-08-03 — 46 alan, hiçbiri kargo değil), yani
  // alan boş açılıyor. Zorunlu tutmak, yazım hatası düzeltmeye gelen satıcıyı
  // göremediği bir değeri yeniden seçmeye zorlardı ve farkında olmadan
  // değiştirmesine yol açardı. Boş bırakılırsa payload'a da KONMAZ, sunucu
  // kendi kayıtlı değerini korur.
  if (!input.isEdit && !input.values.shippingPackageTier) {
    return 'Lütfen kargo paket boyutunu seçin.';
  }
  return null;
}
