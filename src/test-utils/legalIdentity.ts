/**
 * Yasal kimlik kapısı test yardımcıları (B4).
 *
 * Kapıyla ilgisi olmayan akış testleri kapıyı "geçti" diye sabitler — aksi
 * halde gerçek `ensureLegalIdentity` `useAuthStore.getState()` ve
 * `legalIdentityApi` ister, bu testlerin mock'larında ikisi de yok:
 *
 *   jest.mock('@/hooks/useLegalIdentity', () =>
 *     require('@/test-utils/legalIdentity').legalIdentityGatePassMock);
 *
 * Kapının kendisini sınayan testler modülü mock'lamaz; `legalIdentityApi`
 * mock'una `MISSING_LEGAL_IDENTITY` döndürür, kapının açıldığını
 * `useLegalIdentityRequestStore` ile görür ve `settleLegalIdentityRequest`
 * ile "kaydedildi" (true) / "Vazgeç" (false) der.
 */
import type { LegalIdentityStatus } from '@/lib/shared/legalIdentity';

export const mockRequireLegalIdentity = jest.fn(() => Promise.resolve(true));

export const legalIdentityGatePassMock = {
  ...jest.requireActual('@/hooks/useLegalIdentity'),
  ensureLegalIdentity: mockRequireLegalIdentity,
  useRequireLegalIdentity: () => mockRequireLegalIdentity,
};

/** Yeni hesabın durumu: üç alan da eksik, kapı açılmalı. */
export const MISSING_LEGAL_IDENTITY: LegalIdentityStatus = {
  required: true,
  missing: ['legalFirstName', 'legalLastName', 'nationalId'],
  legalFirstName: null,
  legalLastName: null,
  nationalIdMasked: null,
  suggestedNationalId: null,
};
