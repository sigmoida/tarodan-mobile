import type { ViewStyle } from 'react-native';
import { theme } from './theme';

const { colors, radiusRole, spacing, typography, controlHeight } = theme;

export type FieldSize = 'sm' | 'md' | 'lg';

/**
 * Web `@tarodan/ui` Input: sm h-8 px-2.5 · md h-10 px-3 · lg h-12 px-4. Metin her boyutta 16:
 * web telefon genişliğinde `CONTROL_TEXT` = `text-base` (16px altı iOS'ta odakta yakınlaştırır).
 * `height` ASGARİ yüksekliktir (`minHeight` + küçük dikey dolgu): normal yazı ölçeğinde alan tam
 * bu boydadır, büyük ölçekte (metin en çok `maxFontScale.control`) büyür.
 */
export const fieldSizeStyle = {
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

/** Zemin — normal: beyaz (elevated); pasif: soluk gri. Tüm alan kutularında aynı. */
export function fieldBackgroundColor(disabled?: boolean): string {
  return disabled ? colors.surface.DEFAULT : colors.surface.elevated;
}

export interface FieldBoxOptions {
  size?: FieldSize;
  focused?: boolean;
  error?: unknown;
  disabled?: boolean;
}

/**
 * Alan kutusunun TEK görsel kuralı: zemin, çerçeve (kalınlık/renk/durum), `radiusRole.input`,
 * asgari yükseklik ve iç dolgu. `Input`, `Textarea`, `Select`/`DateField`/il-ilçe tetikleyicileri
 * (`FieldTrigger`) ve `PhoneInput` ülke kodu kutusu yalnız bunu kullanır — kopya stil yok.
 * Çağıran içerik düzenini (ikon/metin) ve çok satırlı alanın yüksekliğini üstüne ekler.
 */
export function fieldBoxStyle({ size = 'md', focused = false, error, disabled }: FieldBoxOptions = {}): ViewStyle {
  const ss = fieldSizeStyle[size];
  return {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ss.height,
    paddingHorizontal: ss.px,
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderRadius: radiusRole.input,
    borderColor: fieldBorderColor(error, focused),
    backgroundColor: fieldBackgroundColor(disabled),
  };
}

/** Arama ekranı alanının vurgu çerçevesi (web arama kutusu: primary-500, 1px). */
export const SEARCH_FIELD_BORDER_COLOR = colors.primary[500];
