import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { PermissionAccessor, PermissionState } from './types';

/**
 * Bir iznin canlı durumu: açılışta okunur ve uygulama ön plana her döndüğünde (`AppState`
 * → `active`) yeniden okunur — kullanıcı cihaz Ayarlar'ından izni açıp geri döndüğünde ekran
 * güncellenir. `onChange` yalnız durum DEĞİŞİNCE çağrılır (ör. izin verildi → push kaydı).
 *
 * `state` ilk okumaya kadar `null`dır (ekran yükleme göstermez; satır o ana dek çizilmez).
 */
export function usePermissionStatus(
  accessor: PermissionAccessor,
  options: { onChange?: (next: PermissionState, prev: PermissionState | null) => void } = {},
): {
  state: PermissionState | null;
  refresh: () => Promise<PermissionState>;
  request: () => Promise<PermissionState>;
} {
  const [state, setState] = useState<PermissionState | null>(null);
  const stateRef = useRef<PermissionState | null>(null);
  const onChangeRef = useRef(options.onChange);
  onChangeRef.current = options.onChange;
  const mounted = useRef(true);

  const apply = useCallback((next: PermissionState) => {
    const prev = stateRef.current;
    stateRef.current = next;
    if (mounted.current) setState(next);
    if (!prev || prev.status !== next.status || prev.canAskAgain !== next.canAskAgain) {
      onChangeRef.current?.(next, prev);
    }
    return next;
  }, []);

  const refresh = useCallback(async () => apply(await accessor.read()), [accessor, apply]);
  const request = useCallback(async () => apply(await accessor.request()), [accessor, apply]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [refresh]);

  return { state, refresh, request };
}
