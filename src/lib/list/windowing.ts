import { Platform } from 'react-native';

/**
 * FlatList pencereleme ayarları — TEK kaynak (offers / notifications ile aynı değerler).
 * Varsayılan windowSize (21) ekran dışında ~10 ekran yüksekliği bileşen tutar; 7 ≈ 3 ekran.
 * `removeClippedSubviews` yalnız Android'de: iOS'ta görünmez kalma/odak hatalarına yol açabiliyor.
 *
 * Kullanım: `<FlatList {...listWindowing} />`. Çağıran gerekirse tek tek üzerine yazar.
 */
export const listWindowing = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 10,
  windowSize: 7,
  removeClippedSubviews: Platform.OS === 'android',
} as const;
