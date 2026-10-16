import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/ui';

import { TITLE_MAX, DESCRIPTION_MAX } from '../_lib/schema';
import type { ListingFormController } from '../_hooks/useListingForm';
import { memoSection, type ListingFormKey } from '../_lib/memoSection';
import { fieldStyles } from './fields';
import { FormTextField } from './FormTextField';

type SectionProps = { f: ListingFormController };

/** Bu dosyadaki bölümün okuduğu controller alanları (memo karşılaştırması; bkz. `memoSection`). */
const KEYS: readonly ListingFormKey[] = ['form'];

/**
 * Temel bilgiler: başlık + açıklama (web `TitleDescriptionCard`). Alanlar RHF'ye doğrudan bağlı
 * (`FormTextField`): yazarken yalnız alanın kendisi ve sayacı yeniden çizilir.
 */
export const ListingBasicInfoSection = memoSection(function ListingBasicInfoSection({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('product.basicInfo')} bodyStyle={fieldStyles.body}>
      <FormTextField
        control={f.form.control}
        name="title"
        countMax={TITLE_MAX}
        label={t('common.title')}
        required
        placeholder={t('product.titlePlaceholder')}
        maxLength={TITLE_MAX}
        style={fieldStyles.flush}
      />

      <FormTextField
        control={f.form.control}
        name="description"
        rows={5}
        countMax={DESCRIPTION_MAX}
        label={t('common.description')}
        required
        placeholder={t('product.descriptionPlaceholder')}
        maxLength={DESCRIPTION_MAX}
        style={fieldStyles.flush}
      />
    </SectionCard>
  );
}, KEYS);
