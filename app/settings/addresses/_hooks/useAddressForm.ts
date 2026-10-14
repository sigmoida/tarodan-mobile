import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useZodForm } from '@/ui/form';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import {
  addressDefaultValues,
  addressErrorSummary,
  addressSchema,
  addressToFormValues,
  type AddressFormValues,
} from '../_lib/schema';
import type { Address } from '../_lib/types';
import { useSaveAddress } from './useSaveAddress';

/**
 * Yeni / düzenle adres ekranının denetleyicisi: `useZodForm` + şema, kaydetme
 * mutasyonu, taslak koruması. Başarı: korumayı kaldır → geri dön (toast mutasyonda).
 * Doğrulama hatası alanların altında + alt çubukta hatalı alan adları; sunucu hatası
 * alt çubukta kalıcı (toast yanında).
 */
export function useAddressForm(address: Address | null) {
  const { t } = useTranslation();
  const schema = useMemo(() => addressSchema(t), [t]);
  const form = useZodForm(schema, {
    defaultValues: address ? addressToFormValues(address) : addressDefaultValues(),
  });
  const guard = useUnsavedChangesGuard(form.formState.isDirty);

  const save = useSaveAddress({
    addressId: address?.id,
    // Koruma kalkar (ekran kapanana dek), sonra geri dönülür (geçmiş yoksa ana sekme).
    onSaved: () => guard.leave(goBackOrHome),
    onPhoneRejected: (message) => {
      form.setError('phone', { message });
      form.setError('root', { message });
    },
    onServerError: (message) => form.setError('root', { message }),
  });

  /** İl/ilçe/varsayılan gibi metin dışı alanlar: kirli işaretle, gönderimden sonra canlı doğrula. */
  const setField = <K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) =>
    form.setValue(key, value as never, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });

  const onSubmit = () => {
    form.clearErrors('root');
    return form.handleSubmit(
      (values) => save.mutate(values),
      (errors) => form.setError('root', { message: addressErrorSummary(errors, t) }),
    )();
  };

  return { t, form, save, setField, onSubmit, isEdit: !!address };
}

export type AddressFormController = ReturnType<typeof useAddressForm>;
