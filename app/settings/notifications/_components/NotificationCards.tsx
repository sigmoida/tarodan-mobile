import { useTranslation } from 'react-i18next';
import { Divider, SectionCard, Text } from '@/ui';
import { styles } from '../_lib/styles';
import { SettingItem } from './SettingItem';
import type { NotificationSettingsController } from '../_hooks/useNotificationSettings';

/** Anlık bildirim + bildirim türleri + e-posta/SMS bölümleri (SectionCard) + bilgi notu. */
export function NotificationCards({ f }: { f: NotificationSettingsController }) {
  const { t } = useTranslation();
  const { settings, handleToggle } = f;

  return (
    <>
      {/* Push Notifications */}
      <SectionCard title={t('notification.pushSection')}>
        <SettingItem
          label={t('notification.pushEnableLabel')}
          description={t('notification.pushEnableDesc')}
          value={settings.pushNotifications}
          onToggle={() => handleToggle('pushNotifications')}
        />
      </SectionCard>

      {/* Notification Categories (apply to push + in-app + email) */}
      <SectionCard title={t('notification.typesSection')}>
        <SettingItem
          label={t('notification.orderUpdatesLabel')}
          description={t('notification.orderUpdatesDesc')}
          value={settings.orderUpdates}
          onToggle={() => handleToggle('orderUpdates')}
        />
        <SettingItem
          label={t('notification.messagesLabel')}
          description={t('notification.messagesDesc')}
          value={settings.messageAlerts}
          onToggle={() => handleToggle('messageAlerts')}
        />
        <SettingItem
          label={t('notification.priceDropLabel')}
          description={t('notification.priceDropDesc')}
          value={settings.priceDropAlerts}
          onToggle={() => handleToggle('priceDropAlerts')}
        />
        <SettingItem
          label={t('notification.newListingsLabel')}
          description={t('notification.newListingsDesc')}
          value={settings.newListingAlerts}
          onToggle={() => handleToggle('newListingAlerts')}
        />
        <SettingItem
          label={t('notification.marketingLabel')}
          description={t('notification.marketingDesc')}
          value={settings.marketingEmails}
          onToggle={() => handleToggle('marketingEmails')}
        />
      </SectionCard>

      {/* Email & SMS channels */}
      <SectionCard title={t('notification.emailSmsSection')}>
        <SettingItem
          label={t('notification.emailEnableLabel')}
          description={t('notification.emailDesc')}
          value={settings.emailNotifications}
          onToggle={() => handleToggle('emailNotifications')}
        />
        <Divider style={styles.divider} />
        <SettingItem
          label={t('notification.smsLabel')}
          description={t('notification.smsDesc')}
          value={settings.smsNotifications}
          onToggle={() => handleToggle('smsNotifications')}
        />
      </SectionCard>

      <Text variant="bodySm" tone="muted">
        {t('notification.preferencesInfo')}
      </Text>
    </>
  );
}
