import { api } from './client';
import type { LegalIdentityStatus, SubmitLegalIdentityRequest } from '@/lib/shared/legalIdentity';

/**
 * Üyenin yasal kimliği (ad, soyad, TCKN) — web `apps/web/src/lib/api/legal-identity.ts`
 * ile aynı. Sunucu yalnız eksik alanları ve maskeli numarayı döner; tam numara
 * bir kez gönderilir, bir daha okunmaz.
 */
export const legalIdentityApi = {
  /** Kimlik kapısı: eksik alanlar (boş `missing` = kapı kapalı). */
  getStatus: () => api.get<LegalIdentityStatus>('/legal-identity/me'),
  /** Yalnız eksik alanlar gönderilir; dolu alan değiştirilemez (409). */
  submit: (body: SubmitLegalIdentityRequest) =>
    api.post<LegalIdentityStatus>('/legal-identity/me', body),
};
