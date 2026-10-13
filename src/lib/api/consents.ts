import { api } from './client';
import type { ConsentDocumentKey, PendingConsentsResponse } from '@/lib/shared/legalConsent';

/**
 * Hukuki onay uçları (web `apps/web/src/lib/api/consents.ts` ile aynı). Sürüm
 * ve kanıt (IP, kullanıcı ajanı) sunucuda damgalanır; istemci yalnız
 * "kabul ettim" der.
 */
export const consentsApi = {
  /** Yeniden-onay kapısı: üyenin onaylaması gereken zorunlu belgeler (boş = açık). */
  getPending: () => api.get<PendingConsentsResponse>('/consents/me/pending'),
  /** Bekleyen belgeleri onayla; yanıt kalan bekleyenlerdir (throttle 10/dk). */
  accept: (documents: ConsentDocumentKey[]) =>
    api.post<PendingConsentsResponse>('/consents/me/accept', { documents }),
};
