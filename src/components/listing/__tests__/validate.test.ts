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

/**
 * Düzenleme akışı — sunucu mevcut kademeyi GERİ DÖNDÜRMÜYOR.
 *
 * Canlı ölçüm (staging, 2026-08-03): `GET /products/my/:id` 46 alan
 * döndürüyor ve içlerinde `shippingPackageTier` YOK. Yani düzenlemede alan
 * boş açılıyor. Kademe zorunlu tutulursa satıcı yazım hatası düzeltmek için
 * girdiği ilanda kargo boyutunu YENİDEN SEÇMEK zorunda kalır ve mevcut
 * değeri göremediği için farkında olmadan değiştirebilir — 60 TL'lik fark
 * sessizce oluşur. Bu yüzden zorunluluk yalnız OLUŞTURMADA geçerli.
 */
describe('firstListingValidationError on edit', () => {
  const editable = () => ({
    values: { ...complete, shippingPackageTier: '' },
    categoryId: 'c1',
    imageCount: 1,
    isEdit: true,
  });

  it('does not force a tier the server never sent back', () => {
    expect(firstListingValidationError(editable())).toBeNull();
  });

  it('still requires it when creating', () => {
    expect(firstListingValidationError({ ...editable(), isEdit: false })).toBe(
      'Lütfen kargo paket boyutunu seçin.',
    );
  });

  it('still validates everything else on edit', () => {
    const input = editable();
    input.categoryId = '';
    expect(firstListingValidationError(input)).toBe('Lütfen bir kategori seçin.');
  });
});
