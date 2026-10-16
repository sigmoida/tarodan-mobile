import { Platform } from 'react-native';

/**
 * React Native dosya parçası — `{ uri, name, type }` (web `File` karşılığı).
 */
export type RNFile = { uri: string; name: string; type: string };

/**
 * iOS FormData `file://` önekisiz yolu bekliyor; Android önekli URI'yi. Kural TEK yerde:
 * çağıranlar her zaman picker/hazırlayıcının verdiği önekli URI'yi geçirir.
 */
export function formDataUri(uri: string): string {
  return Platform.OS === 'android' ? uri : uri.replace('file://', '');
}

/**
 * Multipart isteğe dosya parçası ekleyen TEK yardımcı — bütün yükleme uçları (ürün görseli,
 * avatar, mesaj eki, iade kanıtı, koleksiyon kapağı, işletme belgesi, satıcı faturası) bunu
 * kullanır. Yalnız `uri`/`name`/`type` gider (hazırlayıcının ek alanları gönderilmez).
 */
export function appendRNFile(formData: FormData, field: string, file: RNFile): void {
  // RN'in FormData'sı dosya parçasını bu nesne biçiminde kabul eder; TS tipi bunu bilmiyor.
  formData.append(field, { uri: formDataUri(file.uri), name: file.name, type: file.type } as unknown as Blob);
}
