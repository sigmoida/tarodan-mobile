import React from 'react';
import {
  SkeletonLine,
  SkeletonPage,
  SkeletonSectionCard,
  SkeletonSwitchRow,
} from '@/ui';

/**
 * Bildirim tercihleri iskeleti (`PageShell` `loadingFallback`) — gerçek kartlarla aynı sıra ve
 * satır sayısı: Anlık bildirim (1 satır), Bildirim türleri (5), E-posta ve SMS (2) + bilgi notu.
 * Her satır etiket + açıklama solda, anahtar sağda. Sabit "Kaydet" alt barı yüklenirken çizilmez.
 */
export function NotificationSettingsSkeleton() {
  return (
    <SkeletonPage testID="notification-settings-skeleton">
      <SkeletonSectionCard>
        <SkeletonSwitchRow />
      </SkeletonSectionCard>
      <SkeletonSectionCard>
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonSwitchRow key={i} />
        ))}
      </SkeletonSectionCard>
      <SkeletonSectionCard>
        <SkeletonSwitchRow />
        <SkeletonSwitchRow />
      </SkeletonSectionCard>
      <SkeletonLine variant="bodySm" width="90%" />
    </SkeletonPage>
  );
}
