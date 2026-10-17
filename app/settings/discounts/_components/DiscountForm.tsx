import React from 'react';
import { Button, SectionCard } from '@/ui';
import { Form } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import type { Discount } from '../_lib/types';
import { useDiscountForm } from '../_hooks/useDiscountForm';
import { DiscountFormFields } from '../_sections/DiscountFormFields';

/**
 * Yeni / düzenle indirim EKRANI gövdesi (iki rota da bunu kompoze eder):
 * PageShell (klavye kaçınma + sabit alt çubuk) + SectionCard içinde alanlar.
 * Oluştur/Güncelle alt çubukta, klavyenin üstünde. Eski modalın sabit
 * `maxHeight: 460` kaydırma kutusu yok: sayfa kendisi kayar.
 */
export function DiscountForm({ discount }: { discount: Discount | null }) {
  const f = useDiscountForm(discount);
  const { t, form, save, onSubmit, isEdit } = f;

  return (
    <Form form={form}>
      <PageShell
        title={isEdit ? t('discount.editTitle') : t('discount.newTitle')}
        footer={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            title={isEdit ? t('discount.update') : t('discount.create')}
            onPress={onSubmit}
            isLoading={save.isPending}
            disabled={save.isPending}
            testID="discount-save-button"
          />
        }
      >
        <SectionCard>
          <DiscountFormFields f={f} />
        </SectionCard>
      </PageShell>
    </Form>
  );
}
