import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, theme } from '@/ui';
import { useStableCallback } from '@/hooks/useStableCallback';

import type { AttrGroup } from '../_lib/types';
import type { ListingFormController } from '../_hooks/useListingForm';
import { ChoiceChips, FieldGroup, PickerField, fieldStyles, type ChoiceOption } from './fields';

const { spacing } = theme;

type SectionProps = { f: ListingFormController };

interface GlobalGroupProps {
  group: AttrGroup;
  selected: string | undefined;
  onSelect: (groupSlug: string, attrSlug: string) => void;
}

/** Tek genel nitelik grubu: tek seçim çipleri; zorunluysa yıldızlı. */
const GlobalAttrGroup = memo(function GlobalAttrGroup({ group, selected, onSelect }: GlobalGroupProps) {
  const options = useMemo<ChoiceOption[]>(
    () =>
      group.attributes.map((a) => ({
        value: a.slug,
        label: a.label,
        testID: `listing-attr-${group.slug}-${a.slug}`,
      })),
    [group],
  );
  const select = useCallback((slug: string) => onSelect(group.slug, slug), [group.slug, onSelect]);
  return (
    <FieldGroup label={group.name} required={group.isRequired}>
      <ChoiceChips options={options} selected={selected} onSelect={select} />
    </FieldGroup>
  );
});

/**
 * "Ek Özellikler" — genel özel gruplar (ör. Nadirlik/Bulunabilirlik), web
 * `GlobalAttributesCard` ile aynı: tek seçim, zorunlu olan yıldızlı. Yüklenirken ve katalog
 * boşken çizilmez; istek düştüyse sebep yazılır (satıcı zorunlu alanın neden yok olduğunu
 * sunucu 400'ünden öğrenmemeli).
 */
export function ListingGlobalAttributesSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const onSelect = useStableCallback(f.setGlobalAttribute);

  if (f.globalAttrGroups.length === 0) {
    if (!f.globalAttrGroupsFailed) return null;
    return (
      <SectionCard title={t('product.additionalDetails')}>
        <Text variant="bodySm" tone="danger">
          {t('product.optionsLoadFailed')}
        </Text>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t('product.additionalDetails')} bodyStyle={fieldStyles.body}>
      <Text variant="caption" tone="muted" style={styles.hint}>
        {t('product.globalAttrsHint')}
      </Text>
      {f.globalAttrGroups.map((group) => (
        <GlobalAttrGroup
          key={group.slug}
          group={group}
          selected={f.globalAttributes[group.slug]?.[0]}
          onSelect={onSelect}
        />
      ))}
    </SectionCard>
  );
}

/**
 * Üreticiye özel nitelik grupları (web `ManufacturerAttributesCard`): çoklu seçim, seçici
 * modalda (`ListingPickers`). Grup yoksa çizilmez.
 */
export function ListingManufacturerAttributesSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const openGroup = useStableCallback(f.setShowAttrGroupPicker);

  if (f.manufacturerAttrGroups.length === 0) return null;

  const title = `${f.selectedManufacturer?.name ?? ''} ${t('product.detailsSuffix')}`.trim();
  return (
    <SectionCard title={title} bodyStyle={fieldStyles.body}>
      <Text variant="caption" tone="muted" style={styles.hint}>
        {t('product.manufacturerAttrsHint')}
      </Text>
      {f.manufacturerAttrGroups.map((group) => {
        const selected = f.customAttributes[group.slug] ?? [];
        const value =
          selected.length === 0
            ? null
            : selected.length === 1
              ? (group.attributes.find((a) => a.slug === selected[0])?.label ??
                t('listing.attrGroupSelectedCount', { count: 1 }))
              : t('listing.attrGroupSelectedCount', { count: selected.length });
        return (
          <PickerField
            key={group.slug}
            label={group.name}
            value={value}
            placeholder={t('product.selectAttribute', { name: group.name })}
            onPress={() => openGroup(group.slug)}
          />
        );
      })}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  // Web: `text-xs text-muted -mt-2` — başlığa yakın, alanlardan gövde boşluğuyla ayrık.
  hint: {
    marginTop: -spacing[2],
  },
});
