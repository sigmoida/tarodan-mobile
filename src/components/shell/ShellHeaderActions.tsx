import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassIconButton, theme, useScreenFocused } from '@/ui';
import { useBadgePoll } from '@/hooks/useBadgePoll';
import {
  DEFAULT_SHELL_ACTIONS,
  DEFAULT_SHELL_LEADING,
  type ShellActions,
  type ShellLeading,
} from './shellLeading';
import { useShellCounts } from './useShellCounts';
import { useLockedPush } from './useLockedPush';

const { spacing } = theme;

/**
 * Sekme köklerinin üst barındaki sol düğme. Türü kabuğun KENDİ prop'u belirler (`leading`, bkz.
 * `shellLeading.ts`): `categories` (varsayılan) → `squares-2x2` (`/categories` yığın rotasını açar;
 * çift dokunuş tek açılış — `useLockedPush`), `none` → hiçbir şey (Profil kökleri). Ana Sayfa'nın
 * yüzen barı ve başlıklı sekme kökleri (`TitleShell`) aynı bileşeni kullanır; testID çağırandan.
 */
export function ShellLeadingButton({
  leading = DEFAULT_SHELL_LEADING,
  categoriesTestID,
}: {
  leading?: ShellLeading;
  categoriesTestID: string;
}) {
  const { t } = useTranslation();
  const openCategories = useLockedPush('/categories');
  if (leading === 'none') return null;
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
 * Sekme köklerinin üst barındaki sağ grup (`actions`, bkz. `shellLeading.ts`):
 * - `inbox` (varsayılan): TAM iki cam düğme — Mesajlar ve Bildirimler (okunmamış sayaç rozetleriyle;
 *   tek kaynak `useShellCounts`). İkisi yığın rotası açar (`/messages`, `/notifications`).
 * - `settings`: tek ⚙️ Ayarlar düğmesi (`/settings`) — yalnız Profil kökleri.
 * Sepet üst barda değil, alt menüde.
 */
export function ShellHeaderActions({ actions = DEFAULT_SHELL_ACTIONS }: { actions?: ShellActions }) {
  return actions === 'settings' ? <SettingsAction /> : <InboxActions />;
}

function SettingsAction() {
  const { t } = useTranslation();
  const openSettings = useLockedPush('/settings');
  return (
    <GlassIconButton
      icon="cog-6-tooth"
      accessibilityLabel={t('nav.settings')}
      testID="app-shell-settings"
      onPress={openSettings}
    />
  );
}

function InboxActions() {
  const { t } = useTranslation();
  const counts = useShellCounts();
  // Sayaçlar yalnız bu sekme kökü ODAKTAYKEN yoklanır (tek ortak 60 sn döngü, `useBadgePoll`).
  useBadgePoll(useScreenFocused());
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
