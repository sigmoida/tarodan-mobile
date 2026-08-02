/**
 * İlan gönderim kapısı — kurallar ve SIRALARI.
 *
 * Kullanıcı tek bir hata mesajı görüyor, o yüzden sıra davranışın kendisi.
 * Kargo paket boyutu bu tura eklenen kural: boş geçilirse sunucu `small`
 * VARSAYIYOR ve büyük bir ürün küçük paket bedeliyle gidiyor (canlı tarife
 * small 100 / medium 130 / large 160 → paket başına 60 TL eksik tahsil).
 */
import { firstListingValidationError } from '../_lib/validate';
import { emptyListingFormValues } from '../_lib/schema';

const complete = {
  ...emptyListingFormValues,
  title: 'Geçerli bir başlık',
  price: '500',
  categoryId: 'c1',
  shippingPackageTier: 'large',
};

const ok = () => ({ values: { ...complete }, categoryId: 'c1', imageCount: 1 });

describe('firstListingValidationError', () => {
  it('passes a fully filled form', () => {
    expect(firstListingValidationError(ok())).toBeNull();
  });

  it('rejects a listing with no package tier', () => {
    const input = ok();
    input.values.shippingPackageTier = '';

    expect(firstListingValidationError(input)).toBe('Lütfen kargo paket boyutunu seçin.');
  });

  it('accepts every tier code the server tariff returns', () => {
    ['small', 'medium', 'large'].forEach((code) => {
      const input = ok();
      input.values.shippingPackageTier = code;
      expect(firstListingValidationError(input)).toBeNull();
    });
  });

  it('reports the title before anything else', () => {
    const input = ok();
    input.values.title = 'Abc';
    input.values.shippingPackageTier = '';
    input.categoryId = '';

    expect(firstListingValidationError(input)).toBe('Başlık en az 5 karakter olmalıdır.');
  });

  it('reports the category before the package tier', () => {
    const input = ok();
    input.categoryId = '';
    input.values.shippingPackageTier = '';

    expect(firstListingValidationError(input)).toBe('Lütfen bir kategori seçin.');
  });

  it('reports the photo before the package tier', () => {
    const input = ok();
    input.imageCount = 0;
    input.values.shippingPackageTier = '';

    expect(firstListingValidationError(input)).toBe('En az bir fotoğraf ekleyin.');
  });
});
