import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Divider, Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../_lib/styles';
import { SettingItem } from './SettingItem';
import type { NotificationSettingsController } from '../_hooks/useNotificationSettings';

const { colors } = theme;

/** Anlık bildirim + bildirim türleri + e-posta/SMS kartları + bilgi kutusu. */
export function NotificationCards({ f }: { f: NotificationSettingsController }) {
  const { t } = useTranslation();
  const { settings, handleToggle } = f;

  return (
    <>
      {/* Push Notifications */}
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="phone-portrait" size={24} color={colors.primary[600]!} />
          <Text variant="h3" style={styles.sectionTitle}>{t('notification.pushSection')}</Text>
        </View>
        <SettingItem
          icon="notifications"
          label={t('notification.pushEnableLabel')}
          description={t('notification.pushEnableDesc')}
          value={settings.pushNotifications}
          onToggle={() => handleToggle('pushNotifications')}
        />
      </Card>

      {/* Notification Categories (apply to push + in-app + email) */}
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="options" size={24} color={colors.primary[600]!} />
          <Text variant="h3" style={styles.sectionTitle}>{t('notification.typesSection')}</Text>
        </View>
        <SettingItem
          icon="cart"
          label={t('notification.orderUpdatesLabel')}
          description={t('notification.orderUpdatesDesc')}
          value={settings.orderUpdates}
          onToggle={() => handleToggle('orderUpdates')}
        />
        <SettingItem
          icon="chatbubble"
          label={t('notification.messagesLabel')}
          description={t('notification.messagesDesc')}
          value={settings.messageAlerts}
          onToggle={() => handleToggle('messageAlerts')}
        />
        <SettingItem
          icon="pricetag"
          label={t('notification.priceDropLabel')}
          description={t('notification.priceDropDesc')}
          value={settings.priceDropAlerts}
          onToggle={() => handleToggle('priceDropAlerts')}
        />
        <SettingItem
          icon="person-add"
          label={t('notification.newListingsLabel')}
          description={t('notification.newListingsDesc')}
          value={settings.newListingAlerts}
          onToggle={() => handleToggle('newListingAlerts')}
        />
        <SettingItem
          icon="megaphone"
          label={t('notification.marketingLabel')}
          description={t('notification.marketingDesc')}
          value={settings.marketingEmails}
          onToggle={() => handleToggle('marketingEmails')}
        />
      </Card>

      {/* Email & SMS channels */}
      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mail" size={24} color={colors.primary[600]!} />
          <Text variant="h3" style={styles.sectionTitle}>E-posta ve SMS</Text>
        </View>
        <SettingItem
          icon="mail"
          label="E-posta Bildirimlerini Etkinleştir"
          description={t('notification.emailDesc')}
          value={settings.emailNotifications}
          onToggle={() => handleToggle('emailNotifications')}
        />
        <Divider style={styles.divider} />
        <SettingItem
          icon="chatbox-ellipses"
          label="SMS Bildirimleri"
          description={t('notification.smsDesc')}
          value={settings.smsNotifications}
          onToggle={() => handleToggle('smsNotifications')}
        />
      </Card>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={colors.info[600]!} />
        <Text style={styles.infoText}>
          Bildirim tercihlerinizi istediğiniz zaman değiştirebilirsiniz.
          Önemli güvenlik ve hesap bildirimleri her zaman gönderilir.
        </Text>
      </View>

      <View style={{ height: 50 }} />
    </>
  );
}
