import React from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';

export interface ListRowCardProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  /** Kart içi dolgu (varsayılan `spacing[4]` = 16). */
  padding?: keyof typeof theme.spacing;
  /** İçerik yönü: varsayılan satır (görsel/ikon + metin + aksiyon). */
  direction?: 'row' | 'column';
  gap?: keyof typeof theme.spacing;
  style?: StyleProp<ViewStyle>;
}

const { colors, radiusRole, spacing } = theme;

/**
 * Liste satırı kartı — uygulamadaki TEK "çerçeveli satır" (web `Card variant="bordered"` + `p-4`):
 * `border-border` 1px, `rounded-md` (radiusRole.card = 6), `surface-elevated`. `onPress` verilirse
 * dokunulabilir (basılı: hafif opaklık). Ekranlarda elle border+radius+padding veren View
 * çizilmez; bölüm kartı için `SectionCard`, serbest kutu için `Card`.
 */
export const ListRowCard: React.FC<ListRowCardProps> = ({
  children,
  padding = 4,
  direction = 'row',
  gap = 3,
  style,
  onPress,
  ...rest
}) => {
  const base: ViewStyle = {
    flexDirection: direction,
    alignItems: direction === 'row' ? 'center' : 'stretch',
    gap: spacing[gap],
    padding: spacing[padding],
  };
  if (!onPress) {
    return (
      <View style={[styles.card, base, style]} testID={rest.testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, base, pressed && styles.pressed, style]}
      {...rest}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusRole.card,
  },
  pressed: { opacity: 0.85 },
});
