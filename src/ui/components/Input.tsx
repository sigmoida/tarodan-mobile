import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { RawTextInput } from './RawTextInput';
import { Icon, RefIcon, type IconRef } from '../icons';
import { FieldMessage, Label } from './Label';

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
  /** Convenience: Heroicons adı, solda (geçiş: Ionicons adları da çözülür). */
  leftIconName?: IconRef;
  /** Convenience: Heroicons adı, sağda. */
  rightIconName?: IconRef;
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
 * `height` Input'ta ASGARİ yüksekliktir (`minHeight` + küçük dikey dolgu): normal yazı ölçeğinde
 * alan tam bu boydadır, büyük ölçekte (metin en çok `maxFontScale.control`, `RawTextInput`) büyür.
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
  const [focused, setFocused] = useState(false);
  const [passwordHidden, setPasswordHidden] = useState(true);
  const ss = inputSizeStyle[inputSize];
  const disabled = editable === false;

  const borderColor = fieldBorderColor(error, focused);

  const resolvedLeftIcon =
    leftIcon ??
    (leftIconName ? (
      <RefIcon icon={leftIconName} size={iconSize.md} color={colors.text.subtle} />
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
        <Icon
          name={passwordHidden ? 'eye' : 'eye-slash'}
          size={iconSize.md}
          color={colors.text.subtle}
        />
      </Pressable>
    ) : rightIconName ? (
      <RefIcon icon={rightIconName} size={iconSize.md} color={colors.text.subtle} />
    ) : null);

  const effectiveSecure = secureTextEntry ? passwordHidden : false;

  return (
    <View style={[styles.container, containerStyle, style as StyleProp<ViewStyle>]}>
      {label ? <Label required={required}>{label}</Label> : null}
      <View
        style={[
          styles.field,
          { paddingHorizontal: ss.px },
          multiline
            ? { minHeight: MULTILINE_MIN_HEIGHT, paddingVertical: spacing[2], alignItems: 'flex-start' }
            : { minHeight: ss.height, paddingVertical: spacing[1] },
          { borderColor, backgroundColor: disabled ? colors.surface.DEFAULT : colors.surface.elevated },
          fieldStyle,
        ]}
      >
        {resolvedLeftIcon && <View style={styles.iconLeft}>{resolvedLeftIcon}</View>}
        <RawTextInput
          style={[
            styles.input,
            { fontSize: ss.font, color: colors.text.body },
            multiline ? styles.inputMultiline : null,
            inputStyle,
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
