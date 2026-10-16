import { useSyncExternalStore } from 'react';
import type { AddressStore } from '../_lib/addressStore';

/** Adres deposuna abone olan yaprak okuma (yalnız çağıran bileşen yeniden çizilir). */
export function useAddressValue(store: AddressStore) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
