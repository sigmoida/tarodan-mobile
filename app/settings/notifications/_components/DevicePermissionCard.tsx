import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, SectionCard, Text } from '@/ui';
import { styles } from '../_lib/styles';
import { useDeviceNotificationPermission } from '../_hooks/useDeviceNotificationPermission';

/**
 * Bu cihazın işletim sistemi bildirim izni. Hesap tercihlerinin (aşağıdaki anahtarlar) üstünde
 * durur: OS izni kapalıysa tercihler açık olsa da push gelmez — kullanıcı nedenini burada görür.
 * - izin verilmedi / sorulabilir → "Bildirimlere İzin Ver" (sistem diyaloğu);
 * - reddedildi ve sorulamaz → "Ayarları Aç" (cihaz Ayarlar'ı; dönüşte durum yenilenir);
 * - açık → yalnız durum.
 */
export function DevicePermissionCard() {
  const { t } = useTranslation();
  const p = useDeviceNotificationPermission();
  if (!p.state) return null;

  const { status } = p.state;
  const statusText =
    status === 'granted'
      ? t('notification.permission.granted')
      : status === 'undetermined'
        ? t('notification.permission.undetermined')
        : status === 'denied'
          ? t('notification.permission.denied')
          : null;
  const hint =
    status === 'unavailable'
      ? t('notification.permission.unavailableHint')
      : status === 'granted'
        ? null
        : p.canRequest
          ? t('notification.permission.undeterminedHint')
          : t('notification.permission.deniedHint');

  return (
    <SectionCard title={t('notification.permission.sectionTitle')} testID="device-permission-card">
      <View style={styles.settingItem}>
        <View style={styles.settingContent}>
          <Text variant="body">{t('notification.permission.statusLabel')}</Text>
          {hint ? (
            <Text variant="bodySm" tone="muted" style={styles.settingDescription}>
              {hint}
            </Text>
          ) : null}
        </View>
        {statusText ? (
          <Text
            variant="bodySm"
            tone={status === 'granted' ? 'success' : 'muted'}
            testID="device-permission-status"
          >
            {statusText}
          </Text>
        ) : null}
      </View>
      {status !== 'granted' && status !== 'unavailable' ? (
        p.canRequest ? (
          <Button
            variant="primary"
            fullWidth
            title={t('notification.permission.allow')}
            onPress={p.allow}
            testID="device-permission-allow"
          />
        ) : (
          <Button
            variant="secondary"
            fullWidth
            title={t('notification.permission.openSettings')}
            onPress={p.openSettings}
            testID="device-permission-open-settings"
          />
        )
      ) : null}
    </SectionCard>
  );
}
