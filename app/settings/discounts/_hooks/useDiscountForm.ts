import { useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useZodForm } from '@/ui/form';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { buildDiscountPayload } from '../_lib/form';
import { useProductPickerDraft } from '../_lib/productPickerDraft';
import {
  discountDefaultValues,
  discountSchema,
  discountToFormValues,
  type DiscountFormValues,
} from '../_lib/schema';
import { discountRoutes, type Discount, type DiscountType } from '../_lib/types';
import { useSaveDiscount } from './useSaveDiscount';

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * Yeni / düzenle indirim ekranının denetleyicisi: `useZodForm` + şema, kaydetme
 * mutasyonu, taslak koruması ve ürün seçici dönüşü. Gövde kurucu
 * (`buildDiscountPayload`) AYNEN; alan hataları ilgili girdinin altında.
 */
export function useDiscountForm(discount: Discount | null) {
  const { t } = useTranslation();
  const schema = useMemo(() => discountSchema(t), [t]);
  const form = useZodForm(schema, {
    defaultValues: discount ? discountToFormValues(discount) : discountDefaultValues(),
  });
  const guard = useUnsavedChangesGuard(form.formState.isDirty);

  const save = useSaveDiscount({
    // Koruma tek seferlik kalkar, sonra geri dönülür (geçmiş yoksa ana sekme).
    onSaved: () => guard.leave(goBackOrHome),
  });

  const set = useCallback(
    <K extends keyof DiscountFormValues>(key: K, value: DiscountFormValues[K]) =>
      form.setValue(key, value as never, { shouldDirty: true }),
    [form],
  );

  // Tür değişince eski türün (alan bazlı) hataları geçersiz kalır.
  const setType = (next: DiscountType) => {
    set('type', next);
    form.clearErrors();
  };

  const setScope = (next: DiscountFormValues['scope']) => {
    set('scope', next);
    if (next === 'seller') {
      set('targetProductIds', []);
      form.clearErrors('targetProductIds');
    }
  };

  const openProductPicker = () => {
    useProductPickerDraft.getState().open(form.getValues('targetProductIds'));
    router.push(discountRoutes.products as never);
  };

  // Ürün seçiciden dönüş: taslaktaki seçim forma yazılır (değiştiyse kirli işaretlenir).
  useFocusEffect(
    useCallback(() => {
      const ids = useProductPickerDraft.getState().consume();
      if (!ids) return;
      if (!sameIds(ids, form.getValues('targetProductIds'))) set('targetProductIds', ids);
      if (ids.length > 0) form.clearErrors('targetProductIds');
    }, [form, set]),
  );

  const onSubmit = form.handleSubmit((values) => {
    if (discount) save.mutate({ id: discount.id, payload: buildDiscountPayload(values, true) });
    else save.mutate({ payload: buildDiscountPayload(values) });
  });

  return { t, form, save, set, setType, setScope, openProductPicker, onSubmit, isEdit: !!discount };
}

export type DiscountFormController = ReturnType<typeof useDiscountForm>;
