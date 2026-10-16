import type { SetStateAction } from 'react';
import type { ShippingAddressInput } from './types';
import { EMPTY_ADDRESS } from './constants';

/**
 * Inline adres formunun değeri — controller'ın (`useCheckout`) React state'i DEĞİL.
 *
 * Adres alanına her tuş vuruşu eskiden `useCheckout`'u (ödeme akışının tamamı) yeniden
 * çalıştırıyordu. Değer artık bu küçük depoda: yalnız alanı çizen yaprak (`useAddressValue`,
 * `useSyncExternalStore`) abone olur; controller değeri yalnız doğrulama/gönderim anında
 * `get()` ile okur. `set` React `setState` imzasıyla aynı (değer ya da güncelleyici) ve
 * referans-kararlıdır.
 */
export interface AddressStore {
  get: () => ShippingAddressInput;
  set: (action: SetStateAction<ShippingAddressInput>) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createAddressStore(initial: ShippingAddressInput = EMPTY_ADDRESS): AddressStore {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (action) => {
      const next = typeof action === 'function' ? action(value) : action;
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
