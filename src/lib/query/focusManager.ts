import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * AppState geçişlerinden "uygulama GERÇEKTEN ön plana döndü" anını çıkaran tek kural
 * (focusManager köprüsü ve `useRefetchOnForeground` aynı kuralı kullanır).
 *
 * iOS'ta `inactive` → `active` sayılmaz: Face ID, Apple/Google giriş penceresi,
 * "Parolayı kaydet" sorusu, bildirim merkezi uygulamayı kısa süre `inactive` yapar;
 * bunlarda yeniden çekmek girişte aynı isteğin iki kez gitmesine yol açıyordu.
 * Yalnız araya `background` girmişse ön plana dönüş sayılır.
 */
export function createForegroundTracker(initial: AppStateStatus = AppState.currentState) {
  let wentToBackground = initial === 'background';
  return (next: AppStateStatus): 'background' | 'foreground' | null => {
    if (next === 'background') {
      wentToBackground = true;
      return 'background';
    }
    if (next !== 'active' || !wentToBackground) return null;
    wentToBackground = false;
    return 'foreground';
  };
}

/**
 * TanStack `focusManager`'ı React Native `AppState`'e bağlar (resmi RN deseni; tarayıcıdaki
 * `visibilitychange` RN'de yok, bağlanmazsa odak olayı HİÇ gelmez).
 *
 * - Arka plana geçiş → odak yok: `refetchInterval`'lı yoklamalar (bildirim / teklif / takas
 *   rozetleri, 60 sn) arka planda DURUR (`refetchIntervalInBackground` varsayılanı false).
 * - Gerçek ön plana dönüş → odak var: `refetchOnWindowFocus` açık olan ve EKRANDA (etkin
 *   gözlemcisi olan) sorgulardan yalnız ESKİMİŞ olanlar (staleTime) yenilenir.
 * - `inactive` sıçraması odağı değiştirmez (yukarıdaki kural).
 *
 * `queryClient` modülü yüklenirken kurulur (ilk sorgudan ÖNCE), `onlineManager` ile aynı desen.
 */
export function installFocusManager(): void {
  focusManager.setEventListener((handleFocus) => {
    const track = createForegroundTracker();
    // Soğuk açılış arka planda olduysa (ör. bildirim) yoklama baştan duraklı başlasın.
    if (AppState.currentState === 'background') handleFocus(false);
    const sub = AppState.addEventListener('change', (next) => {
      const transition = track(next);
      if (transition === 'background') handleFocus(false);
      else if (transition === 'foreground') handleFocus(true);
    });
    return () => sub.remove();
  });
}
