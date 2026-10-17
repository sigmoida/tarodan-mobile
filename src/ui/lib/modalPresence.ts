import { useEffect } from 'react';
import { MODAL_CLOSE_DELAY_MS } from './modal-timing';

/**
 * Açık / kapanmakta olan native modal takibi — modül düzeyinde TEK kaynak (yalnız UI durumu).
 *
 * iOS bir modal sunuluyorken ya da kapanırken ikinci bir modal sunumunu sessizce reddeder
 * (src/ui/CLAUDE.md › Feedback). Kendiliğinden (kullanıcı eylemi olmadan) diyalog açmak isteyen global
 * dinleyiciler (çevrimdışı diyaloğu gibi) önce `isModalPresent()` bakar ve engel kalkınca
 * (`subscribeModalPresence`) gösterir. `@/ui` `Modal` ve `BottomSheet` ailesi `useModalPresence`
 * ile kayıt olur; kapanış, `onDismiss`'e bel bağlamadan `MODAL_CLOSE_DELAY_MS` sonra düşer
 * (kapanış animasyonu + iOS oturma payı).
 */
let count = 0;
const listeners = new Set<() => void>();

function change(delta: 1 | -1): void {
  count += delta;
  for (const l of [...listeners]) l();
}

/** Açık ya da kapanış penceresindeki bir modal var mı. */
export function isModalPresent(): boolean {
  return count > 0;
}

/** Sayaç değiştiğinde çağrılır. Dönen fonksiyon aboneliği bırakır. */
export function subscribeModalPresence(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Bir modalın görünürlüğünü bildirir (`open` true iken kayıtlı). Kapanırken ya da sökülürken kayıt
 * `MODAL_CLOSE_DELAY_MS` sonra düşer (zamanlayıcı bileşenden bağımsız: söküm onu iptal etmez).
 */
export function useModalPresence(open: boolean): void {
  useEffect(() => {
    if (!open) return undefined;
    change(1);
    return () => {
      setTimeout(() => change(-1), MODAL_CLOSE_DELAY_MS);
    };
  }, [open]);
}

/** YALNIZ TEST: sayaç ve abonelikleri sıfırlar. */
export function resetModalPresenceForTests(): void {
  count = 0;
  listeners.clear();
}
