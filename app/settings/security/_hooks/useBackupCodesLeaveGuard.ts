import { useTranslation } from 'react-i18next';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

/**
 * Tek seferlik yedek kodlar ekrandayken çıkışı (geri kaydırma, Android geri, üst bar geri) onaya
 * bağlar — kodlar bir daha gösterilmez. Ortak `useUnsavedChangesGuard` üstünde yalnız metin farkı;
 * "Tamam, kaydettim" bilinçli çıkıştır: `leave(go)` korumayı kaldırıp `go()`'yu çalıştırır.
 */
export function useBackupCodesLeaveGuard(active: boolean) {
  const { t } = useTranslation();
  return useUnsavedChangesGuard(active, {
    title: t('security.leaveBackupCodesTitle'),
    message: t('security.leaveBackupCodesBody'),
    confirmLabel: t('profile.twoFactor.savedAck'),
  });
}
