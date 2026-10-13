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
import { act } from '@testing-library/react-native';
import type { LegalIdentityStatus } from '@/lib/shared/legalIdentity';
import { settleLegalIdentityRequest } from '@/stores/legalIdentityRequestStore';
import { MODAL_CLOSE_DELAY_MS } from '@/ui/ModalMessage';

export const mockRequireLegalIdentity = jest.fn(() => Promise.resolve(true));

export const legalIdentityGatePassMock = {
  ...jest.requireActual('@/hooks/useLegalIdentity'),
  ensureLegalIdentity: mockRequireLegalIdentity,
  useRequireLegalIdentity: () => ({ requireIdentity: mockRequireLegalIdentity, isChecking: false }),
  useRequireLegalIdentityFor: () => ({
    requireIdentityFor: mockRequireLegalIdentity,
    checkingTarget: null,
    isPending: false,
  }),
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

/**
 * Kapıyı kapat ("kaydedildi" true / "Vazgeç" false) ve bekleyen işlemin
 * devam ettiği ana kadar bekle: bekleyenler kapı modalı kapandıktan sonra
 * (`MODAL_CLOSE_DELAY_MS`) çözülür. "Vazgeç'te istek yok" iddiası ancak bu
 * bekleme SONRASINDA anlamlı.
 */
export async function settleGateAndWait(completed: boolean): Promise<void> {
  await act(async () => {
    settleLegalIdentityRequest(completed);
    await new Promise((r) => setTimeout(r, MODAL_CLOSE_DELAY_MS + 20));
  });
}
