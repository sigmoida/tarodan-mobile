import { useTranslation } from 'react-i18next';
import { SectionCard, Text } from '@/ui';
import type { MessageKey } from '@/i18n/lib/generated/keys';
import { SettingItem } from './SettingItem';
import { DevicePermissionCard } from './DevicePermissionCard';
import type { NotificationSettingsController } from '../_hooks/useNotificationSettings';
import type { NotificationSettings } from '../_lib/types';

/**
 * Web `/profile` `NotificationsSection` ile aynı 6 anahtar, aynı sırada (tek SectionCard).
 * `smsNotifications` / `newListingAlerts` sözleşmede (tip + varsayılan) durur ama çizilmez:
 * sunucu yeni ilan bildirimi göndermiyor, SMS çağıranı da kullanılmıyor — anahtarlar hiçbir şeyi
 * yönetmiyordu (web de göstermiyor).
 */
const ROWS = [
  { key: 'emailNotifications', label: 'notification.emailEnableLabel', desc: 'settings.emailNotificationsDesc' },
  { key: 'pushNotifications', label: 'notification.pushEnableLabel', desc: 'notification.pushEnableDesc' },
  { key: 'orderUpdates', label: 'notification.orderUpdatesLabel', desc: 'notification.orderUpdatesDesc' },
  { key: 'messageAlerts', label: 'notification.messagesLabel', desc: 'notification.messagesDesc' },
  { key: 'priceDropAlerts', label: 'notification.priceDropLabel', desc: 'notification.priceDropDesc' },
  { key: 'marketingEmails', label: 'notification.marketingLabel', desc: 'notification.marketingDesc' },
] as const satisfies ReadonlyArray<{ key: keyof NotificationSettings; label: MessageKey; desc: MessageKey }>;

/** Cihaz izni kartı + bildirim tercihleri (web sırası) + bilgi notu. */
export function NotificationCards({ f }: { f: NotificationSettingsController }) {
  const { t } = useTranslation();
  const { settings, handleToggle } = f;

  return (
    <>
      {/* Cihaz (işletim sistemi) bildirim izni — kapalıysa aşağıdaki tercihler push üretmez. */}
      <DevicePermissionCard />

      <SectionCard title={t('settings.notificationPreferences')}>
        {ROWS.map((row) => (
          <SettingItem
            key={row.key}
            label={t(row.label)}
            description={t(row.desc)}
            value={settings[row.key]}
            onToggle={() => handleToggle(row.key)}
          />
        ))}
      </SectionCard>

      <Text variant="bodySm" tone="muted">
        {t('notification.preferencesInfo')}
      </Text>
    </>
  );
}
