/**
 * İlan görseli yükleme test yardımcıları.
 *
 * Form artık seçilen HER görseli ayrı istekle yüklüyor (`mediaApi.uploadProductImage`,
 * dosya başına bir sonuç). Akış testleri picker'ı N görsel döndürecek şekilde ve
 * yükleme portunu sıralı sonuç verecek şekilde sabitler:
 *
 *   jest.mock('expo-image-picker', () =>
 *     jest.requireActual<typeof import('@/test-utils/listingUpload')>('@/test-utils/listingUpload').imagePickerMock(3),
 *   );
 *   const mockUpload = jest.fn();
 *   jest.mock('@/lib/api', () => ({ ..., mediaApi: { uploadProductImage: (...a: unknown[]) => mockUpload(...a) } }));
 *   mockUpload.mockImplementation(uploadResponder());   // 1. çağrı → card-1, 2. → card-2 …
 */

/** Picker varlıkları — `file:///tmp/photo-N.jpg`. */
export function pickerAssets(count = 3, start = 1) {
  return Array.from({ length: count }, (_, i) => ({
    uri: `file:///tmp/photo-${start + i}.jpg`,
    fileName: `photo-${start + i}.jpg`,
    mimeType: 'image/jpeg',
    width: 1200,
    height: 900,
  }));
}

/** `expo-image-picker` modül mock'u: izin verilir, `count` görsel seçilir. */
export function imagePickerMock(count = 3) {
  return {
    requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
    launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: pickerAssets(count) })),
    MediaTypeOptions: { Images: 'Images' },
  };
}

/** N. yüklemenin sunucu yanıtı (dizi — sunucu tek dosyada da dizi döndürür). */
export function uploadResponse(n: number | string) {
  return {
    data: [
      {
        cardKey: `card-${n}`,
        detailKey: `detail-${n}`,
        cardUrl: `https://example.com/card-${n}.jpg`,
        detailUrl: `https://example.com/detail-${n}.jpg`,
      },
    ],
  };
}

/** Sıralı yanıt üreten uygulama: her çağrı bir sonraki numarayı alır. */
export function uploadResponder(start = 1) {
  let n = start - 1;
  return async () => {
    n += 1;
    return uploadResponse(n);
  };
}
