import React, { useCallback, useEffect, useState } from 'react';
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
  /**
   * Alt alta dizilince sıra. `same` (varsayılan): yan yanaki sırayla aynı. `reverse`: ters — web
   * ModalFooter/ConfirmDialog `flex-col-reverse sm:flex-row` düzeni: yan yana [İptal][Onay], alt alta
   * Onay üstte, İptal altta. Çocuklar YAN YANA sırayla verilir.
   */
  stackOrder?: 'same' | 'reverse';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const { spacing } = theme;

/** Ölçüm katmanının genişliği — içeriğin doğal genişliğini kısıtlamayacak kadar büyük. */
const MEASURE_WIDTH = 4000;
/** Ölçüm bu sürede gelmezse düğmeler yine de gösterilir (ms). */
const MEASURE_TIMEOUT_MS = 400;
/** Ölçüm yuvarlama toleransı (pt). */
const EPS = 0.5;

/**
 * Yan yana düğme grubu — ekranlarda elle `flexDirection: 'row'` + düğme dizmek yerine bu kullanılır.
 *
 * Kural (CLAUDE.md §14): düğme etiketi ASLA sarmaz ve kısaltılmaz. Düğmeler yan yana eşit
 * genişlikte durur; en geniş etiket eşit payına sığmazsa grup otomatik alt alta (tam genişlik)
 * dizilir. Doğal genişlikler, görünmez bir ölçüm katmanında (aynı çocukların kopyası; erişilebilirlik
 * ağacında ve testlerde gizli) ölçülür. Ölçüm gelene kadar (en çok 400 ms) satır görünmez yer tutar; bir kez alt alta geçen grup aynı genişlikte yan yana dönmez.
 */
export const ButtonRow: React.FC<ButtonRowProps> = ({
  children,
  gap = spacing[2],
  layout = 'auto',
  stackOrder = 'same',
  style,
  testID,
}) => {
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement[];
  const n = items.length;
  const keys = items.map((c, i) => String(c.key ?? i));
  const [width, setWidth] = useState(0);
  // Doğal genişlikler çocuğun anahtarına göre (sayı/sıra değişince eski girdiler yok sayılır).
  const [natural, setNatural] = useState<Record<string, number>>({});
  // Histerezis: bir kez alt alta geçen grup, aynı kapsayıcı genişliğinde yan yana dönmez
  // (yükleniyor/etiket değişimi zıplatmasın). Genişlik değişince yeniden hesaplanır.
  const [stuckAt, setStuckAt] = useState<number | null>(null);
  // Ölçüm hiç gelmezse (beklenmedik) düğmeler görünmez kalmasın.
  const [gaveUp, setGaveUp] = useState(false);
  const measuring = layout === 'auto' && n > 1;

  useEffect(() => {
    if (!measuring) return;
    const id = setTimeout(() => setGaveUp(true), MEASURE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [measuring]);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - w) > EPS ? w : prev));
  }, []);

  const onNaturalLayout = useCallback((key: string, e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setNatural((prev) => (prev[key] !== undefined && Math.abs(prev[key] - w) <= EPS ? prev : { ...prev, [key]: w }));
  }, []);

  const measured = measuring && keys.every((k) => natural[k] !== undefined);
  const widest = measured ? Math.max(...keys.map((k) => natural[k] ?? 0)) : 0;
  const slot = n > 0 ? (width - gap * (n - 1)) / n : 0;
  const overflowNow = measured && width > 0 && widest > slot + EPS;
  const stackedNow = layout === 'stack' || overflowNow || (stuckAt !== null && stuckAt === width && width > 0);

  useEffect(() => {
    if (overflowNow && stuckAt !== width) setStuckAt(width);
  }, [overflowNow, stuckAt, width]);

  if (n === 0) return null;
  // Tek düğme (koşullu gizlenen eşi): grup değil — kendi doğal genişliğinde kalır.
  if (n === 1) {
    return (
      <View style={style} testID={testID}>
        {items[0]}
      </View>
    );
  }

  const ready = !measuring || (measured && width > 0) || gaveUp;
  const order = items.map((_, i) => i);
  if (stackedNow && stackOrder === 'reverse') order.reverse();

  return (
    <View style={[styles.container, style]} onLayout={onContainerLayout} testID={testID}>
      <ButtonGroupProvider value>
        <View
          testID={testID ? `${testID}-items` : undefined}
          style={[stackedNow ? styles.stack : styles.row, { gap }, !ready && styles.pending]}
        >
          {order.map((i) => (
            <View key={keys[i]} style={stackedNow ? styles.stackItem : styles.rowItem}>
              {items[i]}
            </View>
          ))}
        </View>
      </ButtonGroupProvider>
      {measuring ? (
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
                key={keys[i]}
                testID={testID ? `${testID}-measure-${i}` : undefined}
                style={styles.measureItem}
                onLayout={(e) => onNaturalLayout(keys[i]!, e)}
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
  // Ölçüm gelene dek yerini tutar ama görünmez: ilk karede yan yana → alt alta titremesi olmaz.
  pending: { opacity: 0 },
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
