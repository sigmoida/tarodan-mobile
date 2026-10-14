import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { androidRipple, rippleClip, showPressedStyle } from '../lib/pressableFeedback';
import { fieldBoxStyle, fieldSizeStyle, type FieldSize } from '../lib/fieldSurface';
import { RawText } from './Text';
import { FieldMessage, Label } from './Label';
import { Icon, type IconName } from '../icons';

export interface FieldTriggerProps {
  /** Kutunun ÜSTÜNDE ayrı etiket (Input ile aynı `Label`); kutu içinde etiket çizilmez. */
  label?: string;
  /** Etiketin sonuna kırmızı `*`. */
  required?: boolean;
  /** Seçili değerin metni; yoksa `placeholder` soluk yazılır. */
  value?: string | null;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Metin ⇒ hata mesajı + hata çerçevesi; `true` ⇒ yalnız hata çerçevesi. */
  error?: string | boolean;
  helperText?: string;
  /** Seçenek sheet'i/seçici açıkken true (odak çerçevesi). */
  open?: boolean;
  size?: FieldSize;
  /** Sağdaki ikon (varsayılan aşağı ok). */
  icon?: IconName;
  /** Dar (yarım genişlik) yerleşimde değer sığmazsa küçülsün. */
  fitText?: boolean;
  /** Dış sarmalayıcı (margin/yerleşim). Varsayılan alt boşluk `Input` ile aynı. */
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityRole?: 'button' | 'combobox';
  accessibilityLabel?: string;
}

const { colors, spacing, iconSize, typography } = theme;

/**
 * Seçim türü alanların (Select, DateField, il/ilçe, ilan formu seçicileri) TEK tetikleyicisi:
 * `Input` ile aynı düzen — üstte `Label`, altında `fieldBoxStyle` kutusu (içinde yalnız değer
 * ya da placeholder + ikon), altında `FieldMessage`. Zemin/çerçeve/yükseklik/pasif/hata
 * durumları `lib/fieldSurface`'tan gelir; burada kopya stil yok.
 */
export const FieldTrigger: React.FC<FieldTriggerProps> = ({
  label,
  required,
  value,
  placeholder,
  onPress,
  disabled,
  error,
  helperText,
  open = false,
  size = 'md',
  icon = 'chevron-down',
  fitText,
  containerStyle,
  testID,
  accessibilityRole = 'button',
  accessibilityLabel,
}) => {
  const hasValue = !!value;
  const shown = hasValue ? value : placeholder;
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Label required={required}>{label}</Label> : null}
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityValue={shown ? { text: shown } : undefined}
        accessibilityState={{ disabled: !!disabled, ...(accessibilityRole === 'combobox' ? { expanded: open } : null) }}
        android_ripple={androidRipple()}
        style={({ pressed }) => [
          fieldBoxStyle({
            size,
            focused: open || (!disabled && showPressedStyle(pressed)),
            error,
            disabled,
          }),
          styles.box,
          rippleClip(),
        ]}
      >
        <RawText
          numberOfLines={1}
          maxFontSizeMultiplier={typography.maxFontScale.control}
          {...(fitText ? { adjustsFontSizeToFit: true, minimumFontScale: 0.8 } : null)}
          style={[
            styles.value,
            { fontSize: fieldSizeStyle[size].font, color: hasValue ? colors.text.body : colors.text.subtle },
          ]}
        >
          {shown}
        </RawText>
        <Icon name={icon} size={iconSize.md} color={colors.text.subtle} />
      </Pressable>
      <FieldMessage error={typeof error === 'string' ? error : undefined} helperText={helperText} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: spacing[2] },
  box: { justifyContent: 'space-between', gap: spacing[2] },
  value: { flex: 1 },
});
