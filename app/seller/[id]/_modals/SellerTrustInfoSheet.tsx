import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, ButtonRow, Text } from '@/ui';
import { SELLER_TRUST_MIN_COUNTERPARTIES, SELLER_TRUST_MIN_TRANSACTIONS } from '@/types/seller-trust';

import { styles } from '../_lib/styles';

const FACTOR_KEYS = [
  'seller.trustScore.info.ratings',
  'seller.trustScore.info.reliability',
  'seller.trustScore.info.onTime',
  'seller.trustScore.info.volume',
  'seller.trustScore.info.tenure',
] as const;

/** Explains how the seller trust score is calculated (web `SellerTrustInfoModal`, same keys). */
export function SellerTrustInfoSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t('seller.trustScore.info.title')}
      closeLabel={t('common.close')}
      testID="seller-trust-info-sheet"
      footer={
        <ButtonRow>
          <Button variant="outline" title={t('common.close')} onPress={onClose} />
        </ButtonRow>
      }
    >
      <View style={styles.trustInfo}>
        <Text variant="bodySm">{t('seller.trustScore.info.intro')}</Text>
        <View style={styles.trustFactors}>
          {FACTOR_KEYS.map((key) => (
            <View key={key} style={styles.trustFactor}>
              <Text variant="bodySm">{'•'}</Text>
              <Text variant="bodySm" style={styles.flex}>
                {t(key)}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="bodySm">
          {t('seller.trustScore.info.newSeller', {
            count: SELLER_TRUST_MIN_TRANSACTIONS,
            counterparties: SELLER_TRUST_MIN_COUNTERPARTIES,
          })}
        </Text>
        <Text variant="caption" tone="muted">
          {t('seller.trustScore.info.updated')}
        </Text>
      </View>
    </BottomSheet>
  );
}
