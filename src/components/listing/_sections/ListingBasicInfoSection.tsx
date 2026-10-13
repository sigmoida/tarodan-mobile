import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input, SectionCard, Textarea } from '@/ui';

import { TITLE_MAX, DESCRIPTION_MAX } from '../_lib/schema';
import type { ListingFormController } from '../_hooks/useListingForm';
import { CharCount, fieldStyles } from './fields';

type SectionProps = { f: ListingFormController };

/** Temel bilgiler: başlık + açıklama (web `TitleDescriptionCard`). */
export function ListingBasicInfoSection({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('product.basicInfo')} bodyStyle={fieldStyles.body}>
      <View>
        <Input
          label={t('common.title')}
          required
          value={f.title}
          onChangeText={f.setTitle}
          placeholder={t('product.titlePlaceholder')}
          maxLength={TITLE_MAX}
          style={fieldStyles.flush}
        />
        <CharCount value={f.title} max={TITLE_MAX} />
      </View>

      <View>
        <Textarea
          label={t('common.description')}
          required
          rows={5}
          value={f.description}
          onChangeText={f.setDescription}
          placeholder={t('product.descriptionPlaceholder')}
          maxLength={DESCRIPTION_MAX}
          style={fieldStyles.flush}
        />
        <CharCount value={f.description} max={DESCRIPTION_MAX} />
      </View>
    </SectionCard>
  );
}
