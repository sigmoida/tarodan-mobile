import { useEffect } from 'react';
import { focusManager, hashKey, type QueryClient } from '@tanstack/react-query';
import { qk, queryClient } from '@/lib/query';

/** Rozet yoklama aralığı (ms). */
export const BADGE_POLL_MS = 60000;

/**
 * Yoklanan sunucu rozet sayaçları (tek liste). API'de birleşik bir "counts" ucu yok; üç ayrı
 * `refetchInterval` yerine TEK zamanlayıcı bunları aynı anda tazeler. Okunmamış mesaj sayısı
 * burada YOK: soket olaylarıyla (`useMessagingSocket`) güncellenir.
 */
const BADGE_KEYS = [qk.notifications.unread, qk.offers.pendingCount, qk.trades.pendingCount] as const;
const BADGE_HASHES = new Set(BADGE_KEYS.map((k) => hashKey(k)));

/**
 * Rozet sayaçlarını geçersiz kılar: yalnız ekranda olanlar yeniden çekilir. `cancelRefetch: false`:
 * aynı bildirim hem push hem soketle gelince ikinci çağrı uçuştaki isteği iptal edip yenisini
 * atmaz, ona bağlanır (çift istek yok).
 */
export function invalidateBadgeCounts(qc: QueryClient): void {
  void qc.invalidateQueries(
    { predicate: (q) => BADGE_HASHES.has(q.queryHash) },
    { cancelRefetch: false },
  );
}

/**
 * Yeni bildirim geldi (push alımı VEYA soket `notification:new`) — TEK yardımcı: bildirim listesi
 * + rozet sayaçları bayat. İkisi aynı bildirim için ardışık çalışsa da çift istek olmaz.
 */
export function invalidateForNewNotification(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: qk.notifications.list }, { cancelRefetch: false });
  invalidateBadgeCounts(qc);
}

// ── Tek yoklama döngüsü (modül düzeyi, abone sayımlı) ────────────────────────────────────────
let subscribers = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastTick = 0;
let unsubscribeFocus: (() => void) | null = null;

function tick(): void {
  timer = null;
  lastTick = Date.now();
  // Yalnız ETKİN (ekranda gözlemcisi olan, `enabled`) rozet sorguları; uçuştaki istek iptal edilmez.
  void queryClient.refetchQueries(
    { type: 'active', predicate: (q) => BADGE_HASHES.has(q.queryHash) },
    { cancelRefetch: false },
  );
  sync();
}

function sync(): void {
  const running = subscribers > 0 && focusManager.isFocused();
  if (!running) {
    if (timer) clearTimeout(timer);
    timer = null;
    return;
  }
  if (timer) return;
  // Odak/ön plan dönüşünde süre dolmuşsa hemen, değilse kalan sürede tazele (sayaç sıfırlanmaz).
  timer = setTimeout(tick, Math.max(0, lastTick + BADGE_POLL_MS - Date.now()));
}

/**
 * Rozet yoklamasına katıl: `active` (ör. `useScreenFocused()`) true olan en az bir ekran varken
 * tek bir 60 sn döngü çalışır; hiçbir rozetli ekran odakta değilken veya uygulama arka plandayken
 * (`focusManager`) DURUR. Kaç ekran katılırsa katılsın tek zamanlayıcı vardır.
 */
export function useBadgePoll(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    subscribers += 1;
    if (subscribers === 1) {
      // Sorgular az önce mount'ta çekildi: ilk tazeleme bir aralık sonra.
      if (!lastTick) lastTick = Date.now();
      unsubscribeFocus = focusManager.subscribe(sync);
    }
    sync();
    return () => {
      subscribers -= 1;
      if (subscribers === 0) {
        unsubscribeFocus?.();
        unsubscribeFocus = null;
      }
      sync();
    };
  }, [active]);
}

/** Testler için: modül durumunu sıfırlar. */
export function __resetBadgePollForTests(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  subscribers = 0;
  lastTick = 0;
  unsubscribeFocus?.();
  unsubscribeFocus = null;
}
