import React, { useMemo } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Input, SectionCard, Switch } from '@/ui';
import UpgradeCta from '@/components/UpgradeCta';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { useStableCallback } from '@/hooks/useStableCallback';

import type { ListingFormController } from '../_hooks/useListingForm';
import { ChoiceChips, FieldGroup, ToggleRow, fieldStyles, type ChoiceOption } from './fields';

type SectionProps = { f: ListingFormController };

const goUpgrade = () => router.push('/(tabs)/profile');

/**
 * Set / Paket geçici olarak kapalı ve formdan gizli — web `OptionsCard`
 * `SET_BUNDLE_ENABLED` ile aynı karar. Şema/payload/düzenleme eşleyicisi
 * dokunulmadan kalır: mevcut set ilanlar değerlerini korur. Geri açmak için `true`.
 */
export const SET_BUNDLE_ENABLED: boolean = false;

/**
 * Seçenekler (web `OptionsCard`): takas, set/paket (+ parça sayısı; şu an kapalı), ön sipariş ve ilan
 * durumu (yalnız düzenleme). Takas hakkı yoksa anahtar yerine yükseltme bağlantısı
 * (`UpgradeCta`: satın alma kapalıysa hiç çizilmez) ve nötr açıklama.
 */
export function ListingOptionsSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const canTrade = !!f.limits?.canTrade;
  const statusOptions = useMemo<ChoiceOption[]>(
    () => [
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
    ],
    [t],
  );
  const onStatus = useStableCallback(f.setStatus);
  const onBundleSize = useStableCallback((v: string) => f.setBundleSize(v.replace(/[^0-9]/g, '')));

  return (
    <SectionCard title={t('product.options')} bodyStyle={fieldStyles.body}>
      <ToggleRow
        label={t('product.tradeEnabled')}
        hint={
          canTrade
            ? t('product.tradeKeepsOpenForTrade')
            : CAN_BUY_DIGITAL
              ? t('product.tradeRequiresPremium')
              : t('membership.featureUnavailableOnAccount')
        }
        control={
          canTrade ? (
            <Switch
              value={f.isTradeEnabled}
              onValueChange={f.setIsTradeEnabled}
              accessibilityLabel={t('product.tradeEnabled')}
            />
          ) : (
            <UpgradeCta>
              <Button variant="link" size="sm" title={t('product.upgradeArrow')} onPress={goUpgrade} />
            </UpgradeCta>
          )
        }
      />

      {SET_BUNDLE_ENABLED ? (
        <ToggleRow
          label={t('product.setBundle')}
          hint={t('product.setBundleHelper')}
          control={
            <Switch value={f.isSet} onValueChange={f.setIsSet} accessibilityLabel={t('product.setBundle')} />
          }
        />
      ) : null}

      {SET_BUNDLE_ENABLED && f.isSet ? (
        <Input
          label={t('product.setPieceCount')}
          value={f.bundleSize}
          onChangeText={onBundleSize}
          keyboardType="number-pad"
          placeholder={t('product.setPiecePlaceholder')}
          helperText={t('product.setSizeHelper')}
          style={fieldStyles.flush}
        />
      ) : null}

      {/* Ön sipariş (yalnız düzenleme) */}
      {f.isEdit ? (
        <ToggleRow
          label={t('product.preOrder')}
          hint={t('listing.preorderNotInHandHint')}
          control={
            <Switch
              value={f.isPreorder}
              onValueChange={f.setIsPreorder}
              accessibilityLabel={t('product.preOrder')}
            />
          }
        />
      ) : null}

      {/* İlan durumu (yalnız düzenleme, aktif/pasif) */}
      {f.isEdit && (f.status === 'active' || f.status === 'inactive') ? (
        <FieldGroup label={t('listing.statusLabel')}>
          <ChoiceChips options={statusOptions} selected={f.status} onSelect={onStatus} />
        </FieldGroup>
      ) : null}
    </SectionCard>
  );
}
