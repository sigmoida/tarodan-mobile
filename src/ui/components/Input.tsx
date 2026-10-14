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
import { fieldBoxStyle, fieldSizeStyle } from '../lib/fieldSurface';

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

const { colors, spacing, iconSize } = theme;

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
  const ss = fieldSizeStyle[inputSize];
  const disabled = editable === false;

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
          fieldBoxStyle({ size: inputSize, focused, error, disabled }),
          multiline ? styles.fieldMultiline : null,
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
  fieldMultiline: {
    minHeight: MULTILINE_MIN_HEIGHT,
    paddingVertical: spacing[2],
    alignItems: 'flex-start',
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
