import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { theme, Icon } from '@/ui';
import type { Message } from '@/stores/messagesStore';

const { colors } = theme;
const TICK_SIZE = 16;

/**
 * Web `MessageTicks` ile aynı çizim (lucide stili tek/çift tik; Heroicons'ta çift tik yok):
 * 24 viewBox, çizgi 2.5, yuvarlak uç.
 */
function Tick({
  double,
  color,
  testID,
  accessibilityLabel,
}: {
  double: boolean;
  color: string;
  testID: string;
  accessibilityLabel: string;
}) {
  return (
    <Svg
      width={TICK_SIZE}
      height={TICK_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {double ? (
        <>
          <Path d="M18 6 7 17l-5-5" />
          <Path d="m22 10-7.5 7.5L13 16" />
        </>
      ) : (
        <Path d="M20 6 9 17l-5-5" />
      )}
    </Svg>
  );
}

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
        <Tick
          double
          color={colors.primary[300]!}
          accessibilityLabel={t('page.messages.messageticks.okundu')}
          testID="message-tick-read"
        />
      );
    case 'sent':
    case 'delivered':
      return (
        <Tick
          double={false}
          color={colors.overlay.white70}
          accessibilityLabel={t('page.messages.messageticks.iletildi')}
          testID="message-tick-sent"
        />
      );
    case 'pending_approval':
      return <Icon name="clock" size={TICK_SIZE} color={colors.overlay.white70} testID="message-tick-pending" />;
    case 'rejected':
      return <Icon name="x-circle" variant="solid" size={TICK_SIZE} color={colors.danger[200]!} testID="message-tick-rejected" />;
    default:
      return null;
  }
}
