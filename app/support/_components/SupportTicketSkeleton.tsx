import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonBlock,
  SkeletonChatBubble,
  SkeletonPage,
  SkeletonPageHeader,
  SkeletonSectionCard,
  theme,
} from '@/ui';

const { radius, spacing } = theme;

/**
 * Destek talebi detayı iskeleti (`PageShell` `loadingFallback`) — `PageHeader` bandı (konu +
 * #numara/kategori satırları, altında durum rozeti) ve mesaj balonlarını taşıyan kart. Balonlar
 * avatarsızdır (karşı taraf solda, kendi mesajım sağda). Yanıt alanı alt bardadır; yüklenirken
 * `PageShell` alt barı zaten çizmez.
 */
export function SupportTicketSkeleton() {
  return (
    <SkeletonPage testID="support-ticket-skeleton">
      <View style={styles.header}>
        <SkeletonPageHeader lines={2} />
        <SkeletonBlock width={spacing[20]} height={spacing[6]} borderRadius={radius.full} />
      </View>
      <SkeletonSectionCard title={false}>
        <View style={styles.messages}>
          <SkeletonChatBubble side="left" avatarColumn={false} width="80%" lines={2} />
          <SkeletonChatBubble side="right" width="70%" lines={1} />
          <SkeletonChatBubble side="left" avatarColumn={false} width="75%" lines={3} />
        </View>
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing[3] },
  messages: { gap: spacing[2] },
});
