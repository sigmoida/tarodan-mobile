import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, ButtonRow, Text, theme, useBottomSheet } from '@/ui';
import { recordPrePromptDismissed } from '@/lib/notifications/prePrompt';
import { requestNotificationPermission } from '@/lib/permissions';
import { ensureNotificationChannels, syncPushRegistration } from '@/services/push';
import {
  useNotificationPromptStore,
  type NotificationPromptReason,
} from '@/stores/notificationPromptStore';

const { spacing } = theme;

const REASON_KEY = {
  message: 'notification.prePrompt.reasonMessage',
  offer: 'notification.prePrompt.reasonOffer',
  order: 'notification.prePrompt.reasonOrder',
} as const satisfies Record<NotificationPromptReason, string>;

/**
 * Bildirim ön-izin sheet'i (kökte bağlı). Değer anında `offerNotificationPrompt` açar.
 *
 * "Bildirimleri Aç": sheet ÖNCE kapanır, sistem izin diyaloğu kapanış tamamlandıktan sonra
 * gelir (`runAfterClose` — açık sheet üstünde ikinci native sunum iOS'u kilitler, CLAUDE.md §12).
 * İzin verilirse token hemen kaydedilir. "Şimdi Değil" bekleme süresini başlatır.
 */
export function NotificationPrePromptHost() {
  const { t } = useTranslation();
  const reason = useNotificationPromptStore((s) => s.reason);
  const hide = useNotificationPromptStore((s) => s.hide);
  // Kapanış animasyonu sürerken metin kaybolmasın: son gerekçe tutulur.
  const lastReason = useRef<NotificationPromptReason>('message');
  if (reason) lastReason.current = reason;
  const accepted = useRef(false);

  const onClose = () => {
    if (!accepted.current) void recordPrePromptDismissed();
    hide();
  };

  return (
    <BottomSheet
      isOpen={reason !== null}
      onClose={onClose}
      onClosed={() => {
        accepted.current = false;
      }}
      title={t('notification.prePrompt.title')}
      testID="notification-pre-prompt"
      footer={
        <PrePromptFooter
          onAccept={() => {
            accepted.current = true;
          }}
        />
      }
    >
      <Text variant="body" tone="heading" style={styles.reason}>
        {t(REASON_KEY[lastReason.current])}
      </Text>
      <Text variant="bodySm" tone="muted">
        {t('notification.prePrompt.detail')}
      </Text>
    </BottomSheet>
  );
}

function PrePromptFooter({ onAccept }: { onAccept: () => void }) {
  const { t } = useTranslation();
  const { close, runAfterClose } = useBottomSheet();
  return (
    <ButtonRow layout="stack">
      <Button
        key="allow"
        variant="primary"
        title={t('notification.prePrompt.allow')}
        testID="notification-pre-prompt-allow"
        onPress={() => {
          onAccept();
          runAfterClose(() => {
            void (async () => {
              // Android 13: kanal yoksa izin diyaloğu gösterilmez.
              await ensureNotificationChannels();
              const state = await requestNotificationPermission();
              if (state.status === 'granted') await syncPushRegistration();
            })();
          });
        }}
      />
      <Button
        key="later"
        variant="ghost"
        title={t('notification.prePrompt.later')}
        testID="notification-pre-prompt-later"
        onPress={close}
      />
    </ButtonRow>
  );
}

const styles = StyleSheet.create({
  reason: {
    marginBottom: spacing[2],
  },
});
