import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { api } from '@/lib/api';
// Doğrudan modül yolu: testler `@/lib/api` barrel'ını mock'luyor.
import { apiErrorMessage } from '@/lib/api/errorText';
import { qk, useAppMutation } from '@/lib/query';
import { getPhoneInvalidMessage, parsePhoneForPayload } from '@/utils/phone';
import type { AddressFormValues } from '../_lib/schema';

/** İstemci tarafı telefon reddi — ağ hatası değil, alanın altında gösterilir. */
type ClientPhoneError = Error & { isClientValidation: true };
const isClientPhoneError = (e: unknown): e is ClientPhoneError =>
  !!e && (e as Partial<ClientPhoneError>).isClientValidation === true;

/**
 * Oluştur (`addressId` yok → POST) / güncelle (PATCH) mutasyonu. Liste sorgusunu
 * geçersiz kılar ve başarı toast'ını atar; sunucu hatası `toast.error` + formda kalıcı
 * (`onServerError` → `FormError`; ekran açık kalır, kullanıcı düzeltip yeniden dener). İstemci telefon reddi toast
 * DEĞİL, `onPhoneRejected` ile alanın altına gider.
 */
export function useSaveAddress({
  addressId,
  onSaved,
  onPhoneRejected,
  onServerError,
}: {
  addressId?: string;
  onSaved: () => void;
  onPhoneRejected: (message: string) => void;
  /** Sunucu reddi (400 vb.): tüm satırlar formda kalıcı gösterilir (toast kaybolur). */
  onServerError: (message: string) => void;
}) {
  const { t } = useTranslation();
  return useAppMutation(
    async (values: AddressFormValues) => {
      // API CreateAddressDto `zipCode` bekliyor (postalCode değil) — eşle, yoksa posta kodu kaybolur.
      // phoneCountryCode DTO'da yok; telefonu "+90…" olarak normalize edip payload'dan çıkar.
      const { postalCode, phoneCountryCode, ...rest } = values;
      // EMNİYET KEMERİ: şema zaten geçirmiyor, ama çözülemeyen numara buradan
      // ASLA sessizce (kırpılmış/uydurulmuş olarak) çıkmasın — kargo telefonu bu.
      const phone = parsePhoneForPayload(values.phone, phoneCountryCode);
      if (!phone) {
        throw Object.assign(new Error(getPhoneInvalidMessage()), { isClientValidation: true as const });
      }
      // Şema kırpılmış uzunluğu denetliyor; sunucu ham uzunluğu — kenar boşlukları gitmesin.
      const payload = {
        ...rest,
        title: rest.title.trim(),
        fullName: rest.fullName.trim(),
        address: rest.address.trim(),
        phone,
        zipCode: postalCode.trim(),
      };
      return addressId
        ? api.patch(`/users/me/addresses/${addressId}`, payload)
        : api.post('/users/me/addresses', payload);
    },
    {
      invalidates: [qk.user.addresses],
      success: t(addressId ? 'address.updated' : 'address.added'),
      // Hata yolu iki dallı (istemci telefon reddi satır içi, sunucu hatası toast).
      silentError: true,
      onSuccess: onSaved,
      onError: (e) => {
        if (isClientPhoneError(e)) onPhoneRejected(e.message);
        else {
          toast.error(apiErrorMessage(e, t('address.saveFailed')));
          onServerError(apiErrorMessage(e, t('address.saveFailed'), 'all'));
        }
      },
    },
  );
}
