import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { brandFontStyle } from '@/theme';
import { theme } from '../lib/theme';
import { useBrandFont } from '../lib/font';
import { FieldMessage, Label } from './Label';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Not: `style` dış sarmalayıcıya (container) uygulanır — margin/yerleşim için.
 * İçteki TextInput'u stillemek için `inputStyle`, çerçeve için `fieldStyle` kullanın.
 */
export interface InputProps extends TextInputProps {
  label?: string;
  /** Etiketin sonuna kırmızı `*` (web `Label required`). */
  required?: boolean;
  error?: string;
  helperText?: string;
  /** Pass a custom node. Takes precedence over `leftIconName`. */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Convenience: Ionicon by name on the left. */
  leftIconName?: IoniconName;
  /** Convenience: Ionicon by name on the right. */
  rightIconName?: IoniconName;
  /** When true and `secureTextEntry`, show a tap-to-toggle visibility eye on the right. */
  togglePasswordVisibility?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  containerStyle?: ViewStyle;
  /** Style merged into the bordered field wrapper (e.g. to square corners). */
  fieldStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextStyle;
}

const { colors, radiusRole, spacing, typography, controlHeight, iconSize } = theme;

/**
 * Web `@tarodan/ui` Input: sm h-8 px-2.5 · md h-10 px-3 · lg h-12 px-4. Metin her boyutta 16:
 * web telefon genişliğinde `CONTROL_TEXT` = `text-base` (16px altı iOS'ta odakta yakınlaştırır).
 */
export const inputSizeStyle = {
  sm: { height: controlHeight.sm, px: spacing[2.5], font: typography.fontSize.base },
  md: { height: controlHeight.md, px: spacing[3], font: typography.fontSize.base },
  lg: { height: controlHeight.lg, px: spacing[4], font: typography.fontSize.base },
} as const;

/** Çerçeve rengi — web: hata danger-500, odak primary-500, normal border. */
export function fieldBorderColor(error: unknown, focused: boolean): string {
  if (error) return colors.danger[500];
  if (focused) return colors.primary[500];
  return colors.border.DEFAULT;
}

export const Input: React.FC<InputProps> = ({
  label,
  required,
  error,
  helperText,
  leftIcon,
  rightIcon,
  leftIconName,
  rightIconName,
  togglePasswordVisibility,
  secureTextEntry,
  inputSize = 'md',
  containerStyle,
  fieldStyle,
  inputStyle,
  style,
  multiline,
  onFocus,
  onBlur,
  editable,
  ...rest
}) => {
  const { t } = useTranslation();
  const brandFont = useBrandFont();
  const [focused, setFocused] = useState(false);
  const [passwordHidden, setPasswordHidden] = useState(true);
  const ss = inputSizeStyle[inputSize];
  const disabled = editable === false;

  const borderColor = fieldBorderColor(error, focused);

  const resolvedLeftIcon =
    leftIcon ??
    (leftIconName ? (
      <Ionicons name={leftIconName} size={iconSize.md} color={colors.text.subtle} />
    ) : null);

  const showEye = togglePasswordVisibility && secureTextEntry;
  const resolvedRightIcon =
    rightIcon ??
    (showEye ? (
      <Pressable
        onPress={() => setPasswordHidden((v) => !v)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={passwordHidden ? t('common.showPassword') : t('common.hidePassword')}
      >
        <Ionicons
          name={passwordHidden ? 'eye-outline' : 'eye-off-outline'}
          size={iconSize.md}
          color={colors.text.subtle}
        />
      </Pressable>
    ) : rightIconName ? (
      <Ionicons name={rightIconName} size={iconSize.md} color={colors.text.subtle} />
    ) : null);

  const effectiveSecure = secureTextEntry ? passwordHidden : false;
  const flatInput = StyleSheet.flatten(inputStyle) ?? {};
  const fontStyle = brandFontStyle(brandFont, flatInput.fontWeight, flatInput.fontFamily);

  return (
    <View style={[styles.container, containerStyle, style as StyleProp<ViewStyle>]}>
      {label ? <Label required={required}>{label}</Label> : null}
      <View
        style={[
          styles.field,
          { paddingHorizontal: ss.px },
          multiline
            ? { minHeight: MULTILINE_MIN_HEIGHT, paddingVertical: spacing[2], alignItems: 'flex-start' }
            : { height: ss.height },
          { borderColor, backgroundColor: disabled ? colors.surface.DEFAULT : colors.surface.elevated },
          fieldStyle,
        ]}
      >
        {resolvedLeftIcon && <View style={styles.iconLeft}>{resolvedLeftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            { fontSize: ss.font, color: colors.text.body },
            multiline ? styles.inputMultiline : null,
            inputStyle,
            fontStyle,
          ]}
          multiline={multiline}
          editable={editable}
          placeholderTextColor={colors.text.subtle}
          secureTextEntry={effectiveSecure}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {resolvedRightIcon && <View style={styles.iconRight}>{resolvedRightIcon}</View>}
      </View>
      <FieldMessage error={error} helperText={helperText} />
    </View>
  );
};

/** Web Textarea `min-h-[80px]`. */
const MULTILINE_MIN_HEIGHT = 80;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing[2],
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radiusRole.input,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    padding: spacing[0],
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputMultiline: {
    alignSelf: 'stretch',
    textAlignVertical: 'top',
  },
  iconLeft: { marginRight: spacing[2] },
  iconRight: { marginLeft: spacing[2] },
});
