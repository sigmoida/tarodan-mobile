import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';

const { colors, spacing, typography } = theme;

export interface LabelProps {
  children?: React.ReactNode;
  /** Alanın zorunlu olduğunu belirtir: sona kırmızı `*` (web `Label required`). */
  required?: boolean;
  /** Web: sm = text-xs, md = text-sm (varsayılan), lg = text-base. */
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<TextStyle>;
  nativeID?: string;
}

const sizeFont = {
  sm: typography.fontSize.xs,
  md: typography.fontSize.sm,
  lg: typography.fontSize.base,
} as const;

/** Web `@tarodan/ui` Label: `block font-medium text-body mb-1.5` (+ `*` danger-600). */
export const Label: React.FC<LabelProps> = ({ children, required, size = 'md', style, nativeID }) => (
  <RawText nativeID={nativeID} style={[styles.label, { fontSize: sizeFont[size] }, style]}>
    {children}
    {required ? (
      <RawText style={styles.required} accessibilityElementsHidden importantForAccessibility="no">
        {'\u200A*'}
      </RawText>
    ) : null}
  </RawText>
);

export interface FieldMessageProps {
  error?: string;
  helperText?: string;
}

/** Alan altı mesajı (web `mt-1 text-sm`): hata danger-600, yardım muted. Hata yardımı gizler. */
export const FieldMessage: React.FC<FieldMessageProps> = ({ error, helperText }) => {
  const message = error || helperText;
  if (!message) return null;
  return <RawText style={[styles.helper, error ? styles.error : null]}>{message}</RawText>;
};

const styles = StyleSheet.create({
  label: {
    fontWeight: typography.fontWeight.medium,
    color: colors.text.body,
    marginBottom: spacing[1.5],
  },
  required: {
    color: colors.danger[600],
  },
  helper: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
  error: {
    color: colors.danger[600],
  },
});
