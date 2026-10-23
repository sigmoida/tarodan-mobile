import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { Chip, type ChipSize } from './Chip';
import { PAGE_GUTTER } from '../lib/pageLayout';

export interface ChipTabItem<K extends string = string> {
  key: K;
  label: string;
  /**
   * Sekme sayacı → etiketin yanında küçük sayaç rozeti (erişilebilirlik etiketi "Etiket (n)").
   * TEK kural: bir ekranda sayaç varsa TÜM sekmelerde verin (kısmi sayaç tutarsız görünür);
   * hiçbirinde yoksa hiç vermeyin. Sayacı etiket metnine gömmeyin ("İlanlar (20)" çevirisi değil,
   * `label: 'İlanlar', count: 20`).
   */
  count?: number;
  /** Verilmezse `testID` varsa `${testID}-${key}`. */
  testID?: string;
}

export interface ChipTabsProps<K extends string = string> {
  items: ReadonlyArray<ChipTabItem<K>>;
  value: K;
  onChange: (key: K) => void;
  testID?: string;
  size?: ChipSize;
  /**
   * Sayfa kenar boşluğuna taşır (varsayılan): kaydırma alanı ekran kenarlarına kadar uzanır,
   * ilk/son çip yine `PAGE_GUTTER` içeriden başlar/biter (PageShell gövdesi içinde kullanım).
   * Kendi yatay dolgusu olmayan bir kapsayıcıda `false` verin.
   */
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
}

const { spacing } = theme;

/** Etiket + sayaç tek metin biçimi (ChipTabs erişilebilirlik etiketi). */
export function chipTabLabel(label: string, count?: number): string {
  return count == null ? label : `${label} (${count})`;
}

/**
 * Web `Tabs`'ın mobil karşılığı: durum / filtre / içerik sekmeleri — yatay kaydırılan, tek seçimli
 * çip satırı. Uygulamadaki TEK sekme bileşeni: ekranlarda elle `ScrollView horizontal + Chip` ya da
 * `SegmentedButtons` ile sekme kurulmaz (SegmentedButtons yalnız 2–3 seçenekli ayar anahtarıdır).
 * Etiketler ASLA kısaltılmaz: çipler içerik genişliğinde, sığmazsa satır yatay kaydırılır; sayaç
 * etiketin yanında küçük rozettir.
 *
 * Boy sabitliği: RN yatay `ScrollView` varsayılan `flexGrow: 1` taşır; sabit yüksekliksiz bir
 * kapsayıcıda (PageShell `static`/`list`, flex:1 ebeveyn) kalan dikey alanı doldurup içerik
 * satırındaki çipleri `stretch` ile dikeye geriyordu. Burada `flexGrow: 0` (satır içerik kadar) +
 * içerik `alignItems: 'center'` verilir. Büyük yazı ölçeğinde çip kendi boyunda büyüyebilir, satır
 * gerilmez.
 */
export function ChipTabs<K extends string = string>({
  items,
  value,
  onChange,
  testID,
  size = 'sm',
  bleed = true,
  style,
}: ChipTabsProps<K>) {
  const scrollRef = useRef<ScrollView>(null);
  const viewportW = useRef(0);
  const layouts = useRef<Record<string, { x: number; width: number }>>({});

  /** Seçili sekmeyi görünür alana (ortalayarak) kaydır. */
  const revealSelected = useCallback(() => {
    const box = layouts.current[value];
    if (!box || !viewportW.current) return;
    const x = Math.max(0, box.x - (viewportW.current - box.width) / 2);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [value]);

  useEffect(() => {
    revealSelected();
  }, [revealSelected]);

  const onChipLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[key] = { x, width };
    if (key === value) revealSelected();
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
      accessibilityRole="tablist"
      onLayout={(e) => {
        viewportW.current = e.nativeEvent.layout.width;
        revealSelected();
      }}
      style={[styles.scroll, bleed && styles.bleed, style]}
      contentContainerStyle={[styles.content, bleed && styles.contentBleed]}
    >
      {items.map((item) => (
        <Chip
          key={item.key}
          size={size}
          testID={item.testID ?? (testID ? `${testID}-${item.key}` : undefined)}
          label={item.label}
          count={item.count}
          accessibilityLabel={chipTabLabel(item.label, item.count)}
          selected={item.key === value}
          onPress={() => onChange(item.key)}
          onLayout={onChipLayout(item.key)}
          accessibilityRole="tab"
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexGrow: 0 → yatay ScrollView'un varsayılan flexGrow:1'i dikeyde alan doldurmasın.
  scroll: { flexGrow: 0 },
  bleed: { marginHorizontal: -PAGE_GUTTER },
  content: { alignItems: 'center', gap: spacing[2] },
  contentBleed: { paddingHorizontal: PAGE_GUTTER },
});
