import React from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { bodyLetterSpacing, brandFontStyle, maxFontScale } from '@/theme';
import { useBrandFont } from '../lib/font';

const RN_DEFAULT_FONT_SIZE = 14;

/**
 * Ham RN `TextInput`'un marka fontlu karşılığı: ağırlık → Noto Sans dosyası ve web gövde harf
 * aralığı (-0.01em) TEK yerde uygulanır (placeholder da aynı fontu alır). `Input`/`Textarea`
 * bunun üstüne kurulur; ham `TextInput` import etmek yerine bunu (ya da `Input`) kullanın —
 * ham TextInput sistem fontunda kalır.
 *
 * Dinamik yazı boyutu: girdi metni kontrol rolüyle sınırlı (`maxFontScale.control`) — alan
 * sabit/asgari yükseklikli kontroldür; büyük ölçekte metin kırpılmasın. Çağıran ezebilir.
 */
export const RawTextInput = React.forwardRef<TextInput, TextInputProps>(({ style, maxFontSizeMultiplier, ...rest }, ref) => {
  const enabled = useBrandFont();
  const flat = StyleSheet.flatten(style) ?? {};
  const font = brandFontStyle(enabled, flat.fontWeight, flat.fontFamily, flat.fontStyle);
  const spacing =
    enabled && flat.letterSpacing == null
      ? bodyLetterSpacing(true, flat.fontSize ?? RN_DEFAULT_FONT_SIZE)
      : undefined;
  const brand = font || spacing != null ? { ...(font ?? {}), ...(spacing != null ? { letterSpacing: spacing } : {}) } : null;
  return (
    <TextInput
      ref={ref}
      style={brand ? [style, brand] : style}
      maxFontSizeMultiplier={maxFontSizeMultiplier === undefined ? maxFontScale.control : maxFontSizeMultiplier}
      {...rest}
    />
  );
});
RawTextInput.displayName = 'RawTextInput';
