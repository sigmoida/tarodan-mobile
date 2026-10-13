import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { Pill } from './Pill';

export interface CountBadgeProps {
  count: number;
  /**
   * `false` (varsayılan): ikonun SAĞ ÜST köşesine sabit ofsetle oturur (web `absolute -top-0.5
   * -right-0.5`) — kapsayıcı `relative` olmalı ya da `BadgeAnchor` kullanılmalı. `true`: akışta
   * (satır içi sayaç, ör. liste satırı okunmamış sayısı).
   */
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Zemin rengi farklı bir yüzeyde ayrışsın diye halka (ör. sekme çubuğu). */
  ringColor?: string;
  testID?: string;
}

const { colors, spacing, counterBadgeColor } = theme;

/** İkon rozetinin sağ üst köşe ofseti — TEK kaynak (CountBadge ve BadgeAnchor). */
export const BADGE_ANCHOR_OFFSET = -spacing[0.5];

/**
 * Sayaç rozeti — web `CountBadge`: danger-500, h18 min-w18, `text-2xs` 600, 99+ sınırı.
 * Sepet, mesaj ve bildirim ikonlarının üstünde; 0 ve altında çizilmez.
 */
export const CountBadge: React.FC<CountBadgeProps> = ({ count, inline, style, ringColor, testID }) => {
  if (!count || count <= 0) return null;
  return (
    <Pill
      testID={testID}
      pointerEvents="none"
      size="count"
      shape="full"
      background={counterBadgeColor}
      color={colors.text.inverted}
      style={[
        inline ? null : styles.anchored,
        ringColor ? { borderWidth: 2, borderColor: ringColor } : null,
        style,
      ]}
    >
      {count > 99 ? '99+' : String(count)}
    </Pill>
  );
};

const styles = StyleSheet.create({
  anchored: {
    position: 'absolute',
    top: BADGE_ANCHOR_OFFSET,
    right: BADGE_ANCHOR_OFFSET,
  },
});
