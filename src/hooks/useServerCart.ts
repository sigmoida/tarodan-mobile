import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi, type ServerCart, type ServerCartItem } from '@/lib/api';
import { qk } from '@/lib/query';
import { createForegroundTracker } from '@/lib/query/focusManager';
import { subscribeOnline } from '@/lib/network/networkStatus';
import { mergeLocalCart } from '@/lib/cart/mergeLocalCart';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';

/**
 * Üyenin sunucu sepeti.
 *
 * Sunucu, istemcinin üretemediği bilgileri döndürür: satır bazında
 * `isAvailable` / `stockWarning` / `maxQuantity` ve kampanya-indirim toplamları.
 * Yerel store stok tavanını sepete eklerken donduruyor; ürün sonradan tükenirse
 * kullanıcı bunu ancak checkout'ta görüyordu. Bu query o boşluğu kapatır.
 *
 * Misafirde hiç çalışmaz — /cart uçlarının tamamı bearer ister.
 */
export function useServerCart() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: qk.cart.mine,
    enabled: isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await cartApi.get();
      return ((res.data as any)?.data ?? res.data ?? null) as ServerCart | null;
    },
  });

  const items = query.data?.calculation?.items ?? [];
  const byProductId = new Map<string, ServerCartItem>(items.map((it) => [it.productId, it]));

  return {
    cart: query.data ?? null,
    calculation: query.data?.calculation ?? null,
    /** Yerel satırı sunucu satırıyla eşlemek için — uyarıları göstermekte kullanılır. */
    byProductId,
    isLoading: query.isLoading,
  };
}

/** Geçici hatadan sonra zamanlı yeniden deneme: 30 sn'den başlar, ≤ 5 dk; en çok bu kadar. */
const MERGE_RETRY_BASE_MS = 30_000;
const MERGE_RETRY_MAX_MS = 5 * 60_000;
const MERGE_TIMED_RETRIES = 6;
/** Tanınmayan 403'te en çok bu kadar deneme; sonra birleştirme bırakılır (satırlar yerelde kalır). */
const MERGE_FORBIDDEN_RETRIES = 3;

/**
 * Misafirken sepete atılan ürünleri sunucu sepetine taşır — GİRİŞ GEÇİŞİ BAŞINA bir kez.
 *
 * Tetikleyici her soğuk açılış DEĞİL, sepetin kalıcı "birleştirme bekliyor" işaretidir
 * (`cartStore.mergePendingFor`): giriş (ve ertelenmiş oturumun doğrulanması) koyar, aynalanan
 * eklemenin geçici hatası da koyar. Kesin sonuçta (`done`, hesap düzeyi kesin 403 → `blocked`)
 * kalkar. Geçici hatada (ağ / 5xx / 401 / 408 / 429) yerel satırlar KORUNUR ve işaret kalır:
 * bağlantı gelince, ön plana dönüşte, geri çekilen süre dolunca ya da sonraki açılışta yeniden
 * denenir; tanınmayan 403 en çok `MERGE_FORBIDDEN_RETRIES` kez (`mergeLocalCart`).
 * Kullanıcı (işaret) değişince geri çekilme durumu sıfırlanır.
 */
export function useCartMergeOnLogin() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const pendingFor = useCartStore((s) => s.mergePendingFor);
  const queryClient = useQueryClient();
  const session = useRef({ isAuthenticated, userId });
  session.current = { isAuthenticated, userId };
  const running = useRef(false);
  const failures = useRef(0);
  const forbiddenFailures = useRef(0);
  const [retryTick, setRetryTick] = useState(0);
  const [waiting, setWaiting] = useState(false);

  const due = isAuthenticated && !!userId && pendingFor === userId;

  // Kullanıcı / işaret değişti: önceki kullanıcının geri çekilmesi yeni birleştirmeyi bekletmesin.
  useEffect(() => {
    failures.current = 0;
    forbiddenFailures.current = 0;
    setWaiting(false);
  }, [userId, pendingFor]);

  useEffect(() => {
    if (!due || !userId || running.current || waiting) return;
    running.current = true;
    const isCurrent = () =>
      session.current.isAuthenticated && session.current.userId === userId;
    const finish = () => {
      failures.current = 0;
      forbiddenFailures.current = 0;
      useCartStore.getState().clearMergePending(userId);
    };
    void mergeLocalCart(isCurrent).then((outcome) => {
      running.current = false;
      if (outcome === 'done') {
        finish();
        queryClient.invalidateQueries({ queryKey: qk.cart.mine });
      } else if (outcome === 'blocked') {
        // Hesap düzeyinde kesin 403: yeniden denemek sonucu değiştirmez; satırlar yerelde kalır.
        finish();
      } else if (outcome === 'retryForbidden' && forbiddenFailures.current + 1 >= MERGE_FORBIDDEN_RETRIES) {
        finish();
      } else if (outcome === 'retry' || outcome === 'retryForbidden') {
        if (outcome === 'retryForbidden') forbiddenFailures.current += 1;
        failures.current += 1;
        setWaiting(true);
        return;
      }
      // Çalışırken durum değiştiyse (ör. `aborted`: başka kullanıcı) efekt atlanmıştı — yeniden değerlendir.
      setRetryTick((t) => t + 1);
    });
  }, [due, userId, waiting, retryTick, queryClient]);

  // Geçici hatadan sonra: bağlantı geri gelince / gerçek ön plana dönüşte / süre dolunca.
  useEffect(() => {
    if (!waiting) return;
    const fire = () => {
      setWaiting(false);
      setRetryTick((t) => t + 1);
    };
    const attempt = failures.current;
    const timer =
      attempt <= MERGE_TIMED_RETRIES
        ? setTimeout(fire, Math.min(MERGE_RETRY_BASE_MS * 2 ** (attempt - 1), MERGE_RETRY_MAX_MS))
        : undefined;
    const stopOnline = subscribeOnline((online) => {
      if (online) fire();
    });
    const track = createForegroundTracker();
    const appState = AppState.addEventListener('change', (next) => {
      if (track(next) === 'foreground') fire();
    });
    return () => {
      if (timer) clearTimeout(timer);
      stopOnline();
      appState.remove();
    };
  }, [waiting]);
}
