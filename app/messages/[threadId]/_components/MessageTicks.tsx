import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/ui';
import type { Message } from '@/stores/messagesStore';

const { colors } = theme;
const TICK_SIZE = 16;

/**
 * Okundu işareti — web `MessageTicks` karşılığı (kendi balonunda): iletildi = tek tik
 * (beyaza yakın, soluk), okundu = çift tik, turuncu (primary-300). Onay bekliyor / reddedildi
 * durumları web'deki gibi durum ikonu alır. Metin ("✓✓") değil ikon.
 */
export function MessageTicks({ status }: { status: Message['status'] }) {
  const { t } = useTranslation();
  switch (status) {
    case 'read':
      return (
        <Ionicons
          name="checkmark-done"
          size={TICK_SIZE}
          color={colors.primary[300]!}
          accessibilityLabel={t('page.messages.messageticks.okundu')}
          testID="message-tick-read"
        />
      );
    case 'sent':
    case 'delivered':
      return (
        <Ionicons
          name="checkmark"
          size={TICK_SIZE}
          color={colors.overlay.white70}
          accessibilityLabel={t('page.messages.messageticks.iletildi')}
          testID="message-tick-sent"
        />
      );
    case 'pending_approval':
      return <Ionicons name="time-outline" size={TICK_SIZE} color={colors.overlay.white70} testID="message-tick-pending" />;
    case 'rejected':
      return <Ionicons name="close-circle" size={TICK_SIZE} color={colors.danger[200]!} testID="message-tick-rejected" />;
    default:
      return null;
  }
}
