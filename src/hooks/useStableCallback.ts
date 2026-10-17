import { useCallback } from 'react';
import { useLatestRef } from './useLatestRef';

/**
 * Kimliği hiç değişmeyen, çağrıldığında EN SON commit edilen `fn`'i çalıştıran sarmalayıcı
 * ("useEvent" kalıbı, `useLatestRef` üstünde). Her render'da yeniden yaratılan bir işleyiciyi
 * `React.memo`'lu bir çocuğa geçirirken kullanılır: çocuk boşuna yeniden çizilmez, işleyici de
 * bayatlamaz. Yalnız olay işleyicileri için — render sırasında çağrılmaz.
 */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useLatestRef(fn);
  return useCallback((...args: A) => ref.current(...args), [ref]);
}
