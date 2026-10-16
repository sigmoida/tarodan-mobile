import React from 'react';
import { StyleSheet, View } from 'react-native';
import * as Router from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GlassIconButton, theme } from '@/ui';
import { shellLeadingAction } from './shellLeading';
import { useSideMenu } from './SideMenuContext';
import { useShellCounts } from './useShellCounts';
import { useLockedPush } from './useLockedPush';

const { spacing } = theme;

/**
 * Sekme köklerinin üst barındaki sol düğme — aktif sekmeye göre TEK bileşen karar verir
 * (`shellLeadingAction`): Profil kökünde ☰ (`bars-3`, yan menüyü açar), diğer sekme köklerinde
 * `squares-2x2` (`/categories` yığın rotasını açar; çift dokunuş tek açılış — `useLockedPush`).
 * Ana Sayfa'nın yüzen barı ve başlıklı sekme kökleri (`TitleShell`) aynı bileşeni kullanır; testID'ler
 * çağırandan (menü / kategoriler ayrı). `* as Router`: expo-router'ı kısmi mock'layan testlerde
 * `useSegments` yoksa kategoriler.
 */
export function ShellLeadingButton({
  menuTestID,
  categoriesTestID,
}: {
  menuTestID: string;
  categoriesTestID: string;
}) {
  const { t } = useTranslation();
  const segments = (Router.useSegments?.() ?? []) as string[];
  const { open } = useSideMenu();
  const openCategories = useLockedPush('/categories');
  if (shellLeadingAction(segments) === 'menu') {
    return <GlassIconButton icon="bars-3" accessibilityLabel={t('nav.menu')} testID={menuTestID} onPress={open} />;
  }
  return (
    <GlassIconButton
      icon="squares-2x2"
      accessibilityLabel={t('nav.categories')}
      testID={categoriesTestID}
      onPress={openCategories}
    />
  );
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
