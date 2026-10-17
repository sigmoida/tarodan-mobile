import { useWindowDimensions } from 'react-native';

/**
 * Galeri karesinin kenarı (görsel kare, pencere genişliği) — üst bar kaydırma eşiği buradan türer.
 * Modül düzeyinde `Dimensions.get` yerine hook: döndürme / katlanır ekran / bölünmüş ekranda
 * genişlik değişince galeri ile üst bar eşiği birlikte güncellenir.
 */
export function useGallerySize(): number {
  return useWindowDimensions().width;
}
