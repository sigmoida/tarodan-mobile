import React, { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { ButtonGroupProvider } from '../lib/buttonGroup';

export interface ButtonRowProps {
  children: React.ReactNode;
  /** Düğmeler arası boşluk (varsayılan `theme.spacing[2]`). */
  gap?: number;
  /**
   * `auto` (varsayılan): yan yana EŞİT genişlik; en geniş etiket bu genişliğe sığmıyorsa alt alta,
   * her biri tam genişlikte. `stack`: her zaman alt alta.
   */
  layout?: 'auto' | 'stack';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const { spacing } = theme;

/** Ölçüm katmanının genişliği — içeriğin doğal genişliğini kısıtlamayacak kadar büyük. */
const MEASURE_WIDTH = 4000;
/** Ölçüm yuvarlama toleransı (pt). */
const EPS = 0.5;

/**
 * Yan yana düğme grubu — ekranlarda elle `flexDirection: 'row'` + düğme dizmek yerine bu kullanılır.
 *
 * Kural (CLAUDE.md §14): düğme etiketi ASLA sarmaz ve kısaltılmaz. Düğmeler yan yana eşit
 * genişlikte durur; en geniş etiket eşit payına sığmazsa grup otomatik alt alta (tam genişlik)
 * dizilir. Doğal genişlikler, görünmez bir ölçüm katmanında (aynı çocukların kopyası; erişilebilirlik
 * ağacında ve testlerde gizli) ölçülür. Ölçüm gelene kadar yan yana çizilir.
 */
export const ButtonRow: React.FC<ButtonRowProps> = ({
  children,
  gap = spacing[2],
  layout = 'auto',
  style,
  testID,
}) => {
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const n = items.length;
  const [width, setWidth] = useState(0);
  const [natural, setNatural] = useState<Record<number, number>>({});

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - w) > EPS ? w : prev));
  }, []);

  const onNaturalLayout = useCallback((index: number, e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setNatural((prev) => (prev[index] !== undefined && Math.abs(prev[index] - w) <= EPS ? prev : { ...prev, [index]: w }));
  }, []);

  if (n === 0) return null;

  const measured = Object.keys(natural).length >= n;
  const widest = measured ? Math.max(...items.map((_, i) => natural[i] ?? 0)) : 0;
  const slot = n > 0 ? (width - gap * (n - 1)) / n : 0;
  const stacked = layout === 'stack' || (n > 1 && measured && width > 0 && widest > slot + EPS);

  return (
    <View style={[styles.container, style]} onLayout={onContainerLayout} testID={testID}>
      <ButtonGroupProvider value>
        <View testID={testID ? `${testID}-items` : undefined} style={[stacked ? styles.stack : styles.row, { gap }]}>
          {items.map((child, i) => (
            <View key={(child as React.ReactElement).key ?? i} style={stacked ? styles.stackItem : styles.rowItem}>
              {child}
            </View>
          ))}
        </View>
      </ButtonGroupProvider>
      {layout === 'auto' && n > 1 ? (
        <ButtonGroupProvider value={false}>
          <View
            pointerEvents="none"
            testID={testID ? `${testID}-measure` : undefined}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.measure}
          >
            {items.map((child, i) => (
              <View
                key={(child as React.ReactElement).key ?? i}
                testID={testID ? `${testID}-measure-${i}` : undefined}
                style={styles.measureItem}
                onLayout={(e) => onNaturalLayout(i, e)}
              >
                {child}
              </View>
            ))}
          </View>
        </ButtonGroupProvider>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  rowItem: { flex: 1, minWidth: 0 },
  stackItem: { alignSelf: 'stretch' },
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: MEASURE_WIDTH,
    flexDirection: 'row',
    alignItems: 'flex-start',
    opacity: 0,
  },
  measureItem: { flexShrink: 0, alignSelf: 'flex-start' },
});
