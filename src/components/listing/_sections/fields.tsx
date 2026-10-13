import React, { memo } from 'react';
import { Platform, Pressable, StyleSheet, View, type PressableAndroidRippleConfig } from 'react-native';
import { Chip, Icon, Label, ListRowCard, Text, pillBoxStyle, theme } from '@/ui';

const { colors, spacing, controlHeight, radiusRole, iconSize, radius, minTouchTarget } = theme;

/**
 * İlan formunun ortak alan parçaları. Hepsi `@/ui` primitiflerinden; ekranlar elle çerçeve /
 * etiket / çip çizmez. Liste çizen parçalar `memo`: form her tuş vuruşunda yeniden çizilir,
 * seçenek listeleri ise yalnız kendi verisi değişince.
 */

/**
 * Android basılı geri bildirimi (dalga: ortak `pressableFeedback` gelene kadar yerel; `GlassIconButton`
 * ile aynı renk). iOS'ta basılı stil (opaklık/çerçeve) yeterli.
 */
export const listingRipple: PressableAndroidRippleConfig | undefined =
  Platform.OS === 'android' ? { color: colors.overlay.black10, foreground: true } : undefined;

// ---------------------------------------------------------------------------
// Seçici tetikleyici (kategori / marka / model / malzeme / üretici / yıl / nitelik grubu)
// ---------------------------------------------------------------------------
export interface PickerFieldProps {
  label: string;
  required?: boolean;
  /** Seçili değerin etiketi; yoksa `placeholder` soluk yazılır. */
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/** Web Select tetikleyicisiyle aynı ölçü (Input md: h-40, px-3, text-base) + aşağı ok. */
export const PickerField = memo(function PickerField({
  label,
  required,
  value,
  placeholder,
  onPress,
  disabled,
  testID,
}: PickerFieldProps) {
  return (
    <View>
      <Label required={required}>{label}</Label>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value || placeholder }}
        accessibilityState={{ disabled: !!disabled }}
        android_ripple={listingRipple}
        style={({ pressed }) => [
          styles.trigger,
          disabled && styles.triggerDisabled,
          pressed && styles.triggerPressed,
        ]}
      >
        <Text
          variant="body"
          tone={value ? 'body' : 'subtle'}
          numberOfLines={1}
          style={styles.triggerText}
        >
          {value || placeholder}
        </Text>
        <Icon name="chevron-down" size={iconSize.sm} color={colors.text.subtle} />
      </Pressable>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Tek seçimli çip grubu (durum / ölçek / kutu / ilan durumu / genel nitelik)
// ---------------------------------------------------------------------------
export interface ChoiceOption {
  value: string;
  label: string;
  testID?: string;
}

export interface ChoiceChipsProps {
  options: readonly ChoiceOption[];
  selected: string | null | undefined;
  onSelect: (value: string) => void;
}

/** Satıra sarar (yatay kaydırma yok: tüm seçenekler görünür, iç içe kaydırma çakışması olmaz). */
export const ChoiceChips = memo(function ChoiceChips({ options, selected, onSelect }: ChoiceChipsProps) {
  return (
    <View style={styles.chipWrap} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Chip
          key={o.value}
          size="md"
          label={o.label}
          selected={selected === o.value}
          onPress={() => onSelect(o.value)}
          testID={o.testID}
          accessibilityRole="radio"
          accessibilityState={{ selected: selected === o.value }}
        />
      ))}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Çoklu renk seçimi (katalog renkleri; örnek nokta + etiket)
// ---------------------------------------------------------------------------
export interface ColorOption {
  slug: string;
  label: string;
  color?: string | null;
}

export interface ColorChipsProps {
  options: readonly ColorOption[];
  selected: readonly string[];
  onToggle: (slug: string) => void;
}

/**
 * `Chip` ile aynı hap ölçüsü ve seçili/seçili değil renkleri (web Chip: primary-50 zemin,
 * primary-600 yazı, primary-200 çerçeve). `Chip`'te başa nokta koyacak yuva olmadığından
 * kutu `pillBoxStyle` tabanından kurulur (bkz. rapor: `Chip leading` önerisi).
 */
export const ColorChips = memo(function ColorChips({ options, selected, onToggle }: ColorChipsProps) {
  return (
    <View style={styles.chipWrap}>
      {options.map((c) => {
        const active = selected.includes(c.slug);
        return (
          <Pressable
            key={c.slug}
            testID={`listing-color-${c.slug}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={c.label}
            onPress={() => onToggle(c.slug)}
            hitSlop={CHIP_SLOP}
            style={({ pressed }) => [
              styles.colorChip,
              active ? styles.colorChipOn : styles.colorChipOff,
              pressed && styles.pressed,
            ]}
          >
            {c.color ? <View style={[styles.colorDot, { backgroundColor: c.color }]} /> : null}
            <Text variant="bodySm" numberOfLines={1} color={active ? colors.primary[600] : colors.text.muted}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Anahtar satırı (takas / set / ön sipariş)
// ---------------------------------------------------------------------------
export interface ToggleRowProps {
  label: string;
  hint?: string;
  /** Sağdaki denetim (Switch ya da yükseltme bağlantısı). */
  control: React.ReactNode;
}

/** Web: `flex justify-between p-4 rounded-xl border bg-surface` → `ListRowCard`. */
export function ToggleRow({ label, hint, control }: ToggleRowProps) {
  return (
    <ListRowCard padding={3} style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text variant="label">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted" style={styles.toggleHint}>
            {hint}
          </Text>
        ) : null}
      </View>
      {control}
    </ListRowCard>
  );
}

/** Alan altı sayaç ("12/200"), sağa yaslı. Alanla birlikte tek blok (aradaki gövde boşluğu yok). */
export function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <Text variant="caption" tone="subtle" align="right" style={styles.charCount}>
      {value.length}/{max}
    </Text>
  );
}

/** Etiket + içerik bloğu (çip grupları gibi `Label`'ı kendisi taşımayan alanlar için). */
export function FieldGroup({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Label required={required}>{label}</Label>
      {hint ? (
        <Text variant="caption" tone="subtle" style={styles.groupHint}>
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Çip yüksekliği md = 32 → dokunma alanı 44 (Chip `touchSlop` ile aynı hesap). */
const CHIP_HEIGHT = controlHeight.sm;
const CHIP_SLOP = { top: (minTouchTarget - CHIP_HEIGHT) / 2, bottom: (minTouchTarget - CHIP_HEIGHT) / 2 };
const COLOR_DOT = spacing[2.5];

const styles = StyleSheet.create({
  trigger: {
    height: controlHeight.md,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusRole.input,
    backgroundColor: colors.surface.elevated,
  },
  triggerDisabled: {
    backgroundColor: colors.surface.DEFAULT,
    opacity: 0.5,
  },
  triggerPressed: {
    borderColor: colors.primary[500],
  },
  triggerText: {
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  colorChip: {
    ...pillBoxStyle('lg', 'full'),
    height: CHIP_HEIGHT,
    paddingVertical: spacing[0],
    gap: spacing[1.5],
    borderWidth: 1,
  },
  colorChipOn: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  colorChipOff: {
    backgroundColor: colors.transparent,
    borderColor: colors.border.DEFAULT,
  },
  // Dolgu rengi sunucu kataloğundan (`colors[].color`) gelir.
  colorDot: {
    width: COLOR_DOT,
    height: COLOR_DOT,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  pressed: {
    opacity: 0.85,
  },
  groupHint: {
    marginTop: -spacing[1],
    marginBottom: spacing[2],
  },
  toggleRow: {
    backgroundColor: colors.surface.DEFAULT,
  },
  toggleText: {
    flex: 1,
    minWidth: 0,
  },
  toggleHint: {
    marginTop: spacing[0.5],
  },
  charCount: {
    marginTop: spacing[1],
  },
});

/**
 * Bölüm gövdesi ritmi (web `space-y-4`): alanlar arası TEK boşluk kaynağı `body.gap`;
 * `Input`/`Textarea`'nın kendi alt boşluğu `flush` ile sıfırlanır (çift boşluk olmaz).
 */
export const fieldStyles = StyleSheet.create({
  body: {
    gap: spacing[4],
  },
  flush: {
    marginBottom: spacing[0],
  },
});
