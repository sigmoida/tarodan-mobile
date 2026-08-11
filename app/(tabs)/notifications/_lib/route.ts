import { notificationRoute } from '@/utils/notificationRoute';
import type { Notification } from './types';

/**
 * Bildirim → mobil hedef. Karar TEK yerde (`@/utils/notificationRoute`); push
 * tap'i de aynı fonksiyonu çağırır. Burada ikinci bir kopya tutmak, ölçümle
 * yakalanan ayrışmanın ta kendisiydi: liste ile push aynı bildirimde farklı
 * ekranlara gidiyordu.
 *
 * `null` = hedef yok → satır gösterilir ama tıklama gezinmez.
 */
export function routeForNotification(n: Notification): string | null {
  return notificationRoute(n);
}
