import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Card, Divider, Text, theme } from '@/ui';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { formatPrice } from '@/utils/format';

import { TierFeatureList } from '../../_components/MembershipSections';
import { buildTierNames, type TierType } from '../../_lib/membershipTiers';
import type { MembershipController } from '../../_hooks/useMembership';

const { colors, spacing } = theme;

/**
 * Salt görüntüleme plan kartı: ad + (mevcutsa "Mevcut Planınız" rozeti ve primary kenarlık) +
 * özellik listesi. Satın alma / yükseltme düğmesi YOK. Fiyat yalnız `CAN_BUY_DIGITAL` açıkken —
 * uygulama içinde satın alınamayan dijital ürün için fiyat gösterilmez (App Store 3.1.1).
 */
export function PlanCard({ f, tier }: { f: MembershipController; tier: TierType }) {
  const { t } = f;
  const isCurrent = tier === f.currentTier;
  const price = CAN_BUY_DIGITAL ? f.getPrice(tier) : null;

  return (
    <Card
      variant="bordered"
      padding={5}
      testID={`membership-plan-${tier}`}
      style={isCurrent ? styles.current : undefined}
    >
      <View style={styles.body}>
        <View style={styles.header}>
          <Text variant="h3" style={styles.name}>
            {buildTierNames(t)[tier]}
          </Text>
          {isCurrent ? (
            <Badge variant="default" size="sm" testID="membership-plan-current-badge" style={styles.badge}>
              {t('membership.currentPlan')}
            </Badge>
          ) : null}
        </View>

        {price != null ? (
          <View style={styles.priceRow} testID={`membership-plan-price-${tier}`}>
            {price === 0 ? (
              <Text variant="h2">{t('membership.free')}</Text>
            ) : (
              <>
                <Text variant="h2">{formatPrice(price)}</Text>
                <Text variant="bodySm" tone="muted">
                  {t('membership.perMonth')}
                </Text>
              </>
            )}
          </View>
        ) : null}

        <Divider />
        <TierFeatureList features={f.getFeatures(tier)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  current: { borderColor: colors.primary[500], borderWidth: 2 },
  body: { gap: spacing[3] },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  name: { flexShrink: 1 },
  badge: { flexShrink: 0 },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing[1],
  },
});
