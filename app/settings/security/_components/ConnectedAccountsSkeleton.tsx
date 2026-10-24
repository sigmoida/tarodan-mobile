import React from 'react';
import { View } from 'react-native';
import {
  SkeletonBlock,
  SkeletonButton,
  SkeletonLine,
  SkeletonPage,
  SkeletonSectionCard,
  theme,
} from '@/ui';
import { SIGN_IN_PROVIDERS } from '@/types/sign-in-methods';
import { styles } from '../_lib/styles';

const { iconSize, radius, spacing } = theme;

/**
 * Connected accounts while the sign-in methods load (web: one skeleton row per provider): the
 * description line, then per provider the mark, name and badge, and the action button.
 */
export function ConnectedAccountsSkeleton() {
  return (
    <SkeletonPage testID="connected-accounts-skeleton">
      <SkeletonSectionCard title={false} style={styles.stack}>
        <SkeletonLine variant="bodySm" width="85%" />
        {SIGN_IN_PROVIDERS.map((provider) => (
          <View key={provider} style={styles.settingRow}>
            <View style={styles.providerHead}>
              <SkeletonBlock width={iconSize.md} height={iconSize.md} borderRadius={radius.full} />
              <SkeletonLine variant="bodySm" width="45%" />
            </View>
            <SkeletonButton size="sm" width={spacing[24]} />
          </View>
        ))}
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}
