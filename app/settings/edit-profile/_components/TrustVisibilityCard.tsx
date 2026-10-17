import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Switch, Text, theme } from '@/ui';
import { useTrustVisibility } from '@/hooks/useTrustVisibility';

const { spacing, minTouchTarget } = theme;

/**
 * Güven skoru görünürlüğü — eskiden profil sekmesi başlığındaki "Herkese açık / Gizli" çipiydi;
 * profil rozetleri kalkınca tek değiştirme yeri burası. Yalnız premium profilde ve skor varken
 * çizilir (önceki çiple aynı kapı); değilse `null`.
 */
export function TrustVisibilityCard() {
  const { t } = useTranslation();
  const tv = useTrustVisibility();
  if (!tv.canToggle) return null;

  const score =
    t('seller.trustScoreLabel', { score: tv.trustScore }) +
    (tv.trustLevel ? t('seller.trustScoreLevelSuffix', { level: tv.trustLevel }) : '');

  return (
    <SectionCard title={t('mobile.trustScoreVisibilityTitle')} testID="edit-profile-trust-section">
      <View style={styles.row}>
        <View style={styles.text}>
          <Text variant="body" tone="heading" weight="medium">
            {t('mobile.trustScoreVisibilityLabel')}
          </Text>
          <Text variant="caption" tone="subtle" testID="edit-profile-trust-score">
            {score}
          </Text>
          <Text variant="caption" tone="subtle">
            {t('mobile.trustScoreVisibilityHint')}
          </Text>
        </View>
        <Switch
          testID="edit-profile-trust-visibility"
          accessibilityLabel={t('mobile.trustScoreVisibilityLabel')}
          value={tv.showTrustScore}
          onValueChange={tv.setShowTrustScore}
          disabled={tv.isPending}
        />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: minTouchTarget,
  },
  text: { flex: 1, minWidth: 0, gap: spacing[0.5] },
});
