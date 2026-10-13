/**
 * Human-readable message from NestJS / axios error bodies (validation arrays, etc.).
 * Tek kaynak `apiErrorMessage` (`@/lib/api/errorText`); bu ad geriye dönük ince sarmalayıcı.
 *
 * ⚠️ React DIŞI modül — `useTranslation` çağıramaz; varsayılan `fallback`
 * global `i18n`'den ÇAĞRI ANINDA okunur (bkz. `paytrDirectForm.ts`). Bugünkü
 * tüm çağıranlar kendi `fallback`'ini geçiyor (bu varsayılana hiçbiri
 * düşmüyor), ama güvenlik ağı olarak kalıyor. `common.genericError`'ı REUSE
 * eder — ayrı bir anahtar açmak yerine.
 */
import { apiErrorMessage } from '@/lib/api/errorText';
import i18n from '@/i18n/config';

export function formatApiErrorMessage(err: unknown, fallback = i18n.t('common.genericError')): string {
  return apiErrorMessage(err, fallback, 'all');
}
