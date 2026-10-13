import React from 'react';
import { View } from 'react-native';
import { theme, Spinner } from '@/ui';
import { AdBanner } from '@/components/ads/AdBanner';
import type { AdSession } from '@/lib/ads/useAdSession';

const { colors, spacing } = theme;

/**
 * Liste altı: sonraki sayfa yüklenirken spinner + (web ile aynı) footer reklam
 * yuvası. Liste içeriği yatay boşluk verdiği için yuvanın kendi boşluğu geri alınır.
 */
export function ListingsFooter({ loadingMore, session }: { loadingMore: boolean; session: AdSession }) {
  return (
    <>
      {loadingMore && (
        <View style={{ paddingVertical: spacing[4] }}>
          <Spinner size="md" color={colors.primary[600]!} />
        </View>
      )}
      <View style={{ marginHorizontal: -spacing[4] }}>
        <AdBanner position="footer" session={session} />
      </View>
      <View style={{ height: 60 }} />
    </>
  );
}
