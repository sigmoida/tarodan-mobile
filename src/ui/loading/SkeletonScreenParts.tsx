import React from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { SECTION_CARD_METRICS as SC } from '../components/SectionCard';
import { CHIP_HEIGHT } from '../components/Chip';
import { ListRowCard } from '../components/ListRowCard';
import { SkeletonBlock } from './SkeletonBlock';
import { SkeletonLine, type SkeletonLineVariant } from './Skeleton';

const { radius, radiusRole, spacing, controlHeight } = theme;

/**
 * Ekran iskeletlerinin ortak parçaları — yalnız `SkeletonBlock` / `SkeletonLine` + gerçek bileşenin
 * geometri sabitleri. Ekranlara özel iskeletler (`_components/<Ekran>Skeleton.tsx`) bunları dizer;
 * renk ve animasyon tek sürücüden (`theme.loading.skeleton`) gelir, burada yerel renk yoktur.
 */

/** `PageShell` `loadingFallback` gövdesi: `PAGE_GUTTER` kenar boşluğu + kartlar arası `PAGE_SECTION_GAP`. */
export const SkeletonPage: React.FC<{
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}> = ({ children, style, testID }) => (
  <View style={[styles.page, style]} testID={testID}>
    {children}
  </View>
);

/** Düğme yer tutucusu — `Button` ile aynı asgari yükseklik (`controlHeight`) ve köşe (`radiusRole.button`). */
export const SkeletonButton: React.FC<{
  size?: keyof typeof controlHeight;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}> = ({ size = 'md', width = '100%', style }) => (
  <SkeletonBlock width={width} height={controlHeight[size]} borderRadius={radiusRole.button} style={style} />
);

/** Yan yana `count` eşit genişlikli düğme (`ButtonRow` yan yana hâli). */
export const SkeletonButtonRow: React.FC<{
  count?: number;
  size?: keyof typeof controlHeight;
  style?: StyleProp<ViewStyle>;
}> = ({ count = 2, size = 'md', style }) => (
  <View style={[styles.buttonRow, style]}>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonButton key={i} size={size} width={undefined} style={styles.flex} />
    ))}
  </View>
);

const CHIP_WIDTHS = [spacing[20], spacing[24], spacing[20], spacing[24], spacing[16]] as const;

/** `ChipTabs` satırı: çip yüksekliği `CHIP_HEIGHT[size]`, tam yuvarlak hap. */
export const SkeletonChipTabs: React.FC<{ count?: number; size?: keyof typeof CHIP_HEIGHT }> = ({
  count = 3,
  size = 'sm',
}) => (
  <View style={styles.chips}>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonBlock
        key={i}
        width={CHIP_WIDTHS[i % CHIP_WIDTHS.length]}
        height={CHIP_HEIGHT[size]}
        borderRadius={radius.full}
      />
    ))}
  </View>
);

/** Form alanı: etiket satırı + `Input` kutusu (`controlHeight.md`), altında `Input` kapsayıcı boşluğu. */
export const SkeletonField: React.FC<{ multiline?: boolean; style?: StyleProp<ViewStyle> }> = ({
  multiline = false,
  style,
}) => (
  <View style={[styles.field, style]}>
    <SkeletonLine variant="bodySm" width="35%" style={styles.fieldLabel} />
    <SkeletonBlock
      width="100%"
      height={multiline ? spacing[20] : controlHeight.md}
      borderRadius={radiusRole.input}
    />
  </View>
);

/** Etiket solda, değer sağda (özet/ödeme/iade satırı). */
export const SkeletonKeyValueRow: React.FC<{
  variant?: SkeletonLineVariant;
  labelWidth?: DimensionValue;
  valueWidth?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}> = ({ variant = 'bodySm', labelWidth = '30%', valueWidth = '25%', style }) => (
  <View style={[styles.keyValue, style]}>
    <SkeletonLine variant={variant} width={labelWidth} />
    <SkeletonLine variant={variant} width={valueWidth} />
  </View>
);

/** Küçük görsel + yanında metin satırları (sipariş/teklif/iade ürün satırı). */
export const SkeletonMediaRow: React.FC<{
  /** Görsel kenarı (varsayılan 80 = `spacing[20]`). */
  size?: number;
  radiusSize?: number;
  /** Satır değişkenleri, yukarıdan aşağı. */
  lines?: ReadonlyArray<{ variant?: SkeletonLineVariant; width?: DimensionValue }>;
  style?: StyleProp<ViewStyle>;
}> = ({
  size = spacing[20],
  radiusSize = radius.lg,
  lines = [
    { variant: 'body', width: '85%' },
    { variant: 'bodySm', width: '55%' },
    { variant: 'body', width: '35%' },
  ],
  style,
}) => (
  <View style={[styles.media, style]}>
    <SkeletonBlock width={size} height={size} borderRadius={radiusSize} />
    <View style={styles.mediaText}>
      {lines.map((l, i) => (
        <SkeletonLine key={i} variant={l.variant ?? 'bodySm'} width={l.width ?? '70%'} />
      ))}
    </View>
  </View>
);

/** Sayaç/istatistik döşemesi: çerçeveli kutu, değer (h2) + etiket (caption). */
export const SkeletonMetricTile: React.FC<{ style?: StyleProp<ViewStyle>; centered?: boolean }> = ({
  style,
  centered = false,
}) => (
  <ListRowCard direction="column" gap={1} style={[styles.tile, centered && styles.tileCentered, style]}>
    <SkeletonLine variant="h2" width="45%" />
    <SkeletonLine variant="caption" width="70%" />
  </ListRowCard>
);

/** `count` döşeme, 2 sütunlu ızgara (satıcı panosu, işletme paneli, profil sayaçları). */
export const SkeletonMetricGrid: React.FC<{
  count?: number;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ count = 4, centered = false, style }) => (
  <View style={[styles.tileGrid, style]}>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonMetricTile key={i} centered={centered} />
    ))}
  </View>
);

/** `PageHeader` bandı: vurgu çubuğu + başlık (h2 satırı, `PageHeader` başlığı `xl`) + isteğe bağlı açıklama. */
export const SkeletonPageHeader: React.FC<{ lines?: number; style?: StyleProp<ViewStyle> }> = ({
  lines = 1,
  style,
}) => (
  <View style={[styles.pageHeader, style]}>
    <View style={styles.pageHeaderTitle}>
      <SkeletonBlock width={SC.accentWidth} height={SC.accentHeight} borderRadius={SC.accentRadius} />
      <SkeletonLine variant="h2" width="60%" />
    </View>
    {Array.from({ length: lines }, (_, i) => (
      <SkeletonLine key={i} variant="caption" width={i === 0 ? '40%' : '55%'} />
    ))}
  </View>
);

/** Zaman çizelgesi: nokta + iki satır (etiket + tarih), adımlar arası `spacing[4]`. */
export const SkeletonTimeline: React.FC<{ steps?: number; dot?: number; style?: StyleProp<ViewStyle> }> = ({
  steps = 4,
  dot = spacing[3],
  style,
}) => (
  <View style={style}>
    {Array.from({ length: steps }, (_, i) => (
      <View key={i} style={[styles.step, i < steps - 1 && styles.stepGap]}>
        <SkeletonBlock width={dot} height={dot} borderRadius={radius.full} style={styles.stepDot} />
        <View style={styles.flex}>
          <SkeletonLine variant="bodySm" width="45%" />
          <SkeletonLine variant="caption" width="30%" />
        </View>
      </View>
    ))}
  </View>
);

/** Anahtarlı ayar satırı: etiket + açıklama solda, `Switch` yer tutucusu sağda. */
export const SkeletonSwitchRow: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.switchRow, style]}>
    <View style={styles.switchText}>
      <SkeletonLine variant="body" width="55%" />
      <SkeletonLine variant="bodySm" width="85%" />
    </View>
    <SkeletonBlock width={spacing[12]} height={spacing[8]} borderRadius={radius.full} />
  </View>
);

const styles = StyleSheet.create({
  // PAGE_GUTTER = PAGE_SECTION_GAP = spacing[4]; PageShell bu modülü içe aktardığı için sabitler
  // oradan okunmaz (döngüsel içe aktarma) — değerler PageShell.tsx ile aynı tutulur.
  page: { padding: spacing[4], gap: spacing[4] },
  flex: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: spacing[2] },
  chips: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  field: { width: '100%', marginBottom: spacing[2] },
  fieldLabel: { marginBottom: spacing[1.5] },
  keyValue: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  media: { flexDirection: 'row', gap: spacing[3] },
  mediaText: { flex: 1, minWidth: 0, justifyContent: 'center', gap: spacing[0.5] },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  tile: { flexBasis: '47%', flexGrow: 1 },
  tileCentered: { alignItems: 'center' },
  pageHeader: { gap: spacing[2], paddingVertical: spacing[2] },
  pageHeaderTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  step: { flexDirection: 'row', gap: spacing[3] },
  stepGap: { paddingBottom: spacing[4] },
  stepDot: { marginTop: spacing[1] },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], gap: spacing[3] },
  switchText: { flex: 1 },
});
