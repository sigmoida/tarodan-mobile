import { useCallback, useRef } from 'react';
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { NEAR_BOTTOM_THRESHOLD } from '../_lib/scroll';

/**
 * Mesaj listesinin oku(rken/madan) otomatik kaydırma kararı. `MessageList`'in
 * `onScroll`'u son offset'i bir ref'e yazar (state DEĞİL — her scroll'da render
 * tetiklemesin diye), `onContentSizeChange` bu ref'e bakarak karar verir:
 *
 * - İlk konumlanma (`!isPositioned`): bugünkü gibi animasyonsuz dibe konumlan.
 * - Kullanıcı dibe yakınken (`NEAR_BOTTOM_THRESHOLD` içinde) içerik büyüdüyse: kaydır.
 * - Kullanıcı yukarıda okurken içerik büyüdüyse: KAYDIRMA.
 * - `forceScrollToBottom()` çağrılmışsa (kullanıcının kendi mesajı): konumdan
 *   bağımsız HER ZAMAN kaydır — bir sonraki content-size değişiminde tüketilir.
 */
export function useAutoScroll(
  scrollRef: React.RefObject<FlatList | null>,
  isPositioned: boolean,
  setIsPositioned: (value: boolean) => void,
  isContentReady: boolean,
) {
  const distanceFromBottomRef = useRef(0);
  const forceScrollRef = useRef(false);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;
    distanceFromBottomRef.current = contentSize.height - layoutMeasurement.height - contentOffset.y;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!isPositioned) {
      // Boş konuşma (yüklenmiş, mesaj yok) da "konumlanmış" sayılır.
      if (isContentReady) {
        scrollRef.current?.scrollToEnd({ animated: false });
        setIsPositioned(true);
      }
      return;
    }

    const isNearBottom = distanceFromBottomRef.current < NEAR_BOTTOM_THRESHOLD;
    if (forceScrollRef.current || isNearBottom) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
    forceScrollRef.current = false;
  }, [isPositioned, isContentReady, scrollRef, setIsPositioned]);

  // Gönderme akışı çağırır: bir sonraki content-size değişiminde konumdan
  // bağımsız dibe kaydırmayı zorlar.
  const forceScrollToBottom = useCallback(() => {
    forceScrollRef.current = true;
  }, []);

  return { handleScroll, handleContentSizeChange, forceScrollToBottom };
}
