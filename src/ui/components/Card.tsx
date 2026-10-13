import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { theme } from '../lib/theme';

export interface CardProps extends ViewProps {
  /** Web: default = hafif gölge, bordered = çerçeve, elevated = belirgin gölge. */
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: keyof typeof theme.spacing;
}

const { colors, radiusRole, spacing, shadow } = theme;

/** Web `@tarodan/ui` Card: `rounded-lg bg-surface-elevated` + varyanta göre gölge/çerçeve. */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 4,
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'default' && styles.soft,
        variant === 'bordered' && styles.bordered,
        variant === 'elevated' && styles.elevated,
        { padding: spacing[padding] },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radiusRole.card,
  },
  soft: {
    ...shadow.soft,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  elevated: {
    ...shadow.elevated,
  },
});
