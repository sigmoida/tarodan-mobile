import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

/** Yenilenecek şey: bir sorgu anahtarı ya da çağıranın kendi `refetch`'i. */
export type ForegroundRefetchTarget = QueryKey | (() => unknown);

/**
 * Uygulama GERÇEKTEN ön plana döndüğünde (arka plandan → `active`) TEK bir
 * sorguyu yeniden çeker. Zorunlu adımlar (onay kapısı; B3'te kimlik adımı)
 * metnin/durumun uygulama arka plandayken değişmiş olabileceği için bunu
 * kullanır.
 *
 * Neden global `focusManager` değil: onu AppState'e bağlamak uygulamadaki
 * BÜTÜN sorguları her ön plana dönüşte yeniden çektirir — davranış değişikliği
 * ve gereksiz trafik. Bu hook yalnız verilen hedefi yeniler.
 *
 * - iOS'ta `inactive` → `active` sayılmaz: Face ID, Apple/Google giriş
 *   penceresi, "Parolayı kaydet" sorusu, bildirim merkezi uygulamayı kısa
 *   süre `inactive` yapar. Bunlarda yeniden çekmek girişte aynı isteğin iki
 *   kez gitmesine yol açıyordu. Yalnız araya `background` girmişse yenilenir.
 * - Dinleyici `enabled`'dan bağımsız hep abonedir: devre dışıyken görülen bir
 *   arka plan geçişi (ör. Android'de Google giriş ekranı) sonradan, sorgu
 *   etkinleşince ikinci bir istek doğurmaz.
 * - Sorgu anahtarıyla verildiğinde yalnız etkin gözlemcisi olan sorgu
 *   yenilenir ve uçuştaki istek iptal edilmez (`cancelRefetch: false`):
 *   aynı anda ikinci istek gitmez.
 */
export function useRefetchOnForeground(
  target: ForegroundRefetchTarget,
  options: { enabled?: boolean } = {},
): void {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const latest = useRef({ target, enabled });
  useEffect(() => {
    latest.current = { target, enabled };
  });

  useEffect(() => {
    let wentToBackground = AppState.currentState === 'background';
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        wentToBackground = true;
        return;
      }
      if (next !== 'active' || !wentToBackground) return;
      wentToBackground = false;
      const { target: current, enabled: on } = latest.current;
      if (!on) return;
      if (typeof current === 'function') void current();
      else
        void queryClient.refetchQueries(
          { queryKey: current, type: 'active' },
          { cancelRefetch: false },
        );
    });
    return () => sub.remove();
  }, [queryClient]);
}
