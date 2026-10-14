import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassIconButton, theme } from '@/ui';
import { useSideMenu } from './SideMenuContext';
import { useShellCounts } from './useShellCounts';
import { useLockedPush } from './useLockedPush';

const { spacing } = theme;

/**
 * Sekme köklerinin üst barındaki sol düğme: ☰ (yan menüyü açar). Ana Sayfa'nın yüzen barı ve
 * başlıklı sekme kökleri (`TitleShell`) aynı düğmeyi kullanır; testID çağırandan.
 */
export function ShellMenuButton({ testID }: { testID: string }) {
  const { t } = useTranslation();
  const { open } = useSideMenu();
  return <GlassIconButton icon="bars-3" accessibilityLabel={t('nav.menu')} testID={testID} onPress={open} />;
}

/**
 * Sekme köklerinin üst barındaki sağ grup — TAM iki cam düğme: Mesajlar ve Bildirimler (okunmamış
 * sayaç rozetleriyle; tek kaynak `useShellCounts`). İkisi yığın rotası açar (`/messages`,
 * `/notifications`; geri oku olan `PageShell` ekranları). Sepet üst barda değil, alt menüde.
 */
export function ShellHeaderActions() {
  const { t } = useTranslation();
  const counts = useShellCounts();
  const openMessages = useLockedPush('/messages');
  const openNotifications = useLockedPush('/notifications');
  return (
    <View style={styles.row} pointerEvents="box-none" testID="app-shell-actions">
      <GlassIconButton
        icon="chat-bubble-left-right"
        accessibilityLabel={t('message.messages')}
        count={counts.messageCount}
        testID="app-shell-messages"
        onPress={openMessages}
      />
      <GlassIconButton
        icon="bell"
        accessibilityLabel={t('nav.notifications')}
        count={counts.notificationCount}
        testID="app-shell-notifications"
        onPress={openNotifications}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
});
