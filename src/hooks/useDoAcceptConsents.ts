import { useMutation, useQueryClient } from '@tanstack/react-query';
import { consentsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { ConsentDocumentKey } from '@/lib/shared/legalConsent';

/**
 * Onay kapısının TEK yazma yolu: `POST /consents/me/accept`. Yanıt KALAN
 * bekleyenlerdir; önbelleğe yazılır, kapı ek bir istek beklemeden kapanır.
 *
 * Geri bildirim hook'ta DEĞİL: kapı tam ekran bir native Modal, hata
 * `appAlert` yerine kapının içinde satır içi gösterilir (iOS ModalFreeze).
 */
export function useDoAcceptConsents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documents: ConsentDocumentKey[]) =>
      (await consentsApi.accept(documents)).data?.pending ?? [],
    // Önce uçuştaki GET iptal edilir: onaydan ÖNCE başlamış (ör. ön plana
    // dönüş) bir istek sonradan dönüp eski listeyi önbelleğe yazarsa kapı
    // yeniden açılırdı.
    onSuccess: async (remaining) => {
      await queryClient.cancelQueries({ queryKey: qk.consents.pending });
      queryClient.setQueryData(qk.consents.pending, remaining);
    },
  });
}

export type AcceptConsentsMutation = ReturnType<typeof useDoAcceptConsents>;
