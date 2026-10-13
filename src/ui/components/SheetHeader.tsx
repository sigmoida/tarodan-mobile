import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { useHeaderTopInset } from '../lib/header';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface SheetHeaderProps {
  title: string;
  /** Kapat (X) düğmesi sağda; verilmezse düğme çizilmez. */
  onClose?: () => void;
  closeLabel?: string;
  /**
   * Başlık, tam ekran açılan bir `Modal` içinde (ör. `presentationStyle="pageSheet"` olup
   * Android'de tam ekrana dönen sheet) en üstte duruyor. Android'de güvenli alan üst boşluğu
   * eklenir — o `Modal` `statusBarTranslucent` olmalı. iOS pageSheet kendi üst boşluğunu
   * yönetir; orada eklenmez.
   */
  fullScreen?: boolean;
  /** Yatay iç boşluk (spacing anahtarı). Varsayılan 4 (16pt); Dialog kartı 6 kullanır. */
  paddingX?: keyof typeof theme.spacing;
  /** Alt çizgi (varsayılan açık). */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  closeTestID?: string;
}

const { colors, spacing, headerHeight } = theme;

/**
 * Modal / sheet başlığı — uygulamadaki TEK kopya (Modal, ProductFilterSheet, CityDistrictSelector,
 * BoostModal): başlık SOLA (h3: lg/600, tek satır), kapat X sağda, SABİT `headerHeight`
 * yükseklik, alt çizgi. Dekoratif ikon taşımaz.
 */
export const SheetHeader: React.FC<SheetHeaderProps> = ({
  title,
  onClose,
  closeLabel,
  fullScreen = false,
  paddingX = 4,
  divider = true,
  style,
  testID,
  closeTestID = 'sheet-header-close',
}) => {
  const topInset = useHeaderTopInset();
  const safeTop = fullScreen && Platform.OS === 'android' ? topInset : 0;
  return (
    <View
      style={[
        styles.container,
        { paddingTop: safeTop, paddingHorizontal: spacing[paddingX] },
        divider && styles.divider,
        style,
      ]}
      testID={testID}
    >
      <View style={styles.row} testID={testID ? `${testID}-row` : undefined}>
        <View style={styles.titleWrap}>
          <Text variant="h3" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {onClose ? (
          <IconButton
            icon="close"
            size="md"
            accessibilityLabel={closeLabel ?? 'Close'}
            onPress={onClose}
            testID={closeTestID}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.transparent,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  row: {
    height: headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
});
