import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';

export interface CountBadgeProps {
  count: number;
  /** Varsayılan: ikonun sağ üst köşesine oturur (web `absolute -top-0.5 -right-0.5`). */
  style?: StyleProp<ViewStyle>;
  /** Zemin rengi farklı bir yüzeyde ayrışsın diye halka (ör. sekme çubuğu). */
  ringColor?: string;
  testID?: string;
}

const { colors, radius, spacing, typography, counterBadgeColor } = theme;
const SIZE = 18;

/**
 * Sayaç rozeti — web `CountBadge`: danger-500, h18 min-w18, `text-2xs` 600, 99+ sınırı.
 * Sepet, mesaj ve bildirim ikonlarının üstünde; 0 ve altında çizilmez.
 */
export const CountBadge: React.FC<CountBadgeProps> = ({ count, style, ringColor, testID }) => {
  if (!count || count <= 0) return null;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={[
        styles.badge,
        ringColor ? { borderWidth: 2, borderColor: ringColor } : null,
        style,
      ]}
    >
      <RawText style={styles.text}>{count > 99 ? '99+' : String(count)}</RawText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -spacing[0.5],
    right: -spacing[0.5],
    minWidth: SIZE,
    height: SIZE,
    paddingHorizontal: spacing[1],
    borderRadius: radius.full,
    backgroundColor: counterBadgeColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.text.inverted,
    fontSize: typography.fontSize['2xs'],
    lineHeight: typography.fontSize['2xs'] * typography.lineHeight.tight,
    fontWeight: typography.fontWeight.semibold,
  },
});
