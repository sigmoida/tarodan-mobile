import { useCallback, useRef } from 'react';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/ui';

/**
 * Tek seferlik yedek kodlar ekrandayken çıkışı (geri kaydırma, Android geri, üst bar geri) onaya
 * bağlar — kodlar bir daha gösterilmez. Native-stack'te `usePreventRemove` (ham `beforeRemove`
 * değil). "Tamam, kaydettim" bilinçli çıkıştır: `allowLeave()` sonraki çıkışı onaysız geçirir.
 */
export function useBackupCodesLeaveGuard(active: boolean) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const allowed = useRef(false);

  usePreventRemove(active, ({ data }) => {
    if (allowed.current) {
      navigation.dispatch(data.action);
      return;
    }
    void confirm({
      title: t('security.leaveBackupCodesTitle'),
      message: t('security.leaveBackupCodesBody'),
      confirmLabel: t('profile.twoFactor.savedAck'),
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action);
    });
  });

  return {
    allowLeave: useCallback(() => {
      allowed.current = true;
    }, []),
  };
}
