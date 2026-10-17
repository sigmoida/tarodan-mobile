import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';
import { Icon } from '../icons';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  testID?: string;
}

const { colors, radius, spacing, typography } = theme;

const sizeMap = { sm: 16, md: 20, lg: 24 } as const;

/** Etiket satır yüksekliği (pt): kutu bu satıra dikey ortalanır — çok satırlı etikette İLK satırla hizalı. */
const LABEL_LINE_HEIGHT = Math.round(typography.fontSize.sm * typography.lineHeight.normal);
/** Seçili değilken çerçeve kalınlığı (pt): 1pt kutu açık zeminde silik kalıyordu. */
const BORDER_WIDTH = 1.5;

export interface CheckboxIndicatorProps {
  checked: boolean;
  /** pt (varsayılan 20 = `md`) ya da boyut adı. */
  size?: number | keyof typeof sizeMap;
  /** Hata çerçevesi (danger-600). */
  error?: boolean;
}

/**
 * Web checkbox kutusu — TEK yer: seçili = primary-600 dolu kutu + beyaz `check` ikonu (yazı glifi
 * değil: fonttan bağımsız, tam ortalı), seçili değil = beyaz kutu + 1.5pt gray-300 çerçeve; köşe
 * web `rounded` (4pt). `Checkbox` ve kendi satırını çizen listeler (`SelectSheet`) kullanır;
 * dokunma satırdadır, kutu yalnız görseldir.
 */
export const CheckboxIndicator: React.FC<CheckboxIndicatorProps> = ({ checked, size = 'md', error }) => {
  const s = typeof size === 'number' ? size : sizeMap[size];
  return (
    <View
      style={[
        styles.box,
        {
          width: s,
          height: s,
          borderRadius: radius.DEFAULT,
          backgroundColor: checked ? colors.primary[600]! : colors.white,
          borderColor: error
            ? colors.danger[600]!
            : checked
              ? colors.primary[600]!
              : colors.gray[300],
        },
      ]}
    >
      {checked && <Icon name="check" size={Math.round(s * 0.8)} color={colors.white} strokeWidth={3} />}
    </View>
  );
};

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
  error,
  testID,
}) => {
  // Etiket satırı dinamik yazı ölçeğiyle büyür (RawText gövde tavanı kadar): kutu yuvası da onunla.
  const { fontScale } = useWindowDimensions();
  const lineH = LABEL_LINE_HEIGHT * Math.min(fontScale, typography.maxFontScale.body);
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.row, disabled ? styles.disabled : null]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      {/* Kutu etiketin İLK satırına ortalı: etiket kaç satır olursa olsun üstte hizalı kalır. */}
      {/* Yuva ≥ kutu: `lg` (24) kutu 21pt satırdan büyükse yuva kutuya uyar, taşmaz. */}
      <View style={[styles.boxSlot, label ? { height: Math.max(lineH, sizeMap[size]) } : null]}>
        <CheckboxIndicator checked={checked} size={size} error={!!error} />
      </View>
      {label && (
        <RawText style={[styles.label, disabled ? styles.labelDisabled : null]}>
          {label}
        </RawText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  disabled: { opacity: 0.5 },
  boxSlot: {
    justifyContent: 'center',
  },
  box: {
    borderWidth: BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `flexShrink` (flex: 1 DEĞİL): etiket kalan genişlikte sarar ama satırı doldurmaz — yanına konan
  // öğe (ör. sepetteki "N ürün seçili" sayacı) ekran dışına itilmez.
  label: {
    fontSize: typography.fontSize.sm,
    lineHeight: LABEL_LINE_HEIGHT,
    color: colors.text.body,
    flexShrink: 1,
  },
  labelDisabled: { color: colors.text.muted },
});
