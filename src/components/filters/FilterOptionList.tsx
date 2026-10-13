import React, { memo, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState, Input, RadioIndicator, Text, theme } from '@/ui';

export interface FilterOption {
  /** Seçimin karşılaştırma değeri + liste anahtarı. */
  id: string;
  label: string;
}

/** Arama kutusu bu uzunluğun ÜSTÜNDEKİ listelerde çıkar (web `FilterOptionList` SEARCH_AFTER). */
export const FILTER_SEARCH_AFTER = 8;
/** Kapalı liste bu kadar satır gösterir; fazlası "Tümünü göster" ile açılır. */
export const FILTER_COLLAPSED_COUNT = 8;
/**
 * Açık liste / arama sonucu en çok bu kadar satır çizer (filtre paneli tek ScrollView —
 * yüzlerce model satırı birden bağlanmasın); fazlası için aramayı daraltma ipucu gösterilir.
 */
export const FILTER_EXPANDED_MAX = 60;

const { colors, spacing, minTouchTarget } = theme;

/** Türkçe büyük/küçük harf duyarsız eşleşme (İ/ı). */
const norm = (s: string) => s.toLocaleLowerCase('tr').trim();

/**
 * Hangi satırlar çizilir — saf kural (test edilir): arama varsa eşleşenler; yoksa kapalıyken ilk
 * `FILTER_COLLAPSED_COUNT` (seçili satır bu dilimin dışındaysa sona eklenir), açıkken hepsi.
 * Her durumda en çok `FILTER_EXPANDED_MAX`.
 */
export function visibleFilterOptions(
  options: ReadonlyArray<FilterOption>,
  query: string,
  expanded: boolean,
  selectedId: string | undefined,
): { rows: FilterOption[]; truncated: boolean } {
  const q = norm(query);
  const matches = q ? options.filter((o) => norm(o.label).includes(q)) : options;
  if (!q && !expanded) {
    const head = matches.slice(0, FILTER_COLLAPSED_COUNT);
    const selected = selectedId ? matches.find((o) => o.id === selectedId) : undefined;
    if (selected && !head.includes(selected)) head.push(selected);
    return { rows: head, truncated: false };
  }
  return { rows: matches.slice(0, FILTER_EXPANDED_MAX), truncated: matches.length > FILTER_EXPANDED_MAX };
}

/** Tek-seçim radyo satırı (web radio list görünümü): seçili satır primary-50 zemin. */
export const FilterRadioRow = memo(function FilterRadioRow({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      android_ripple={Platform.OS === 'android' ? { color: colors.overlay.black10 } : undefined}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <RadioIndicator checked={selected} />
      <Text variant="body" style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

interface FilterOptionListProps {
  options: ReadonlyArray<FilterOption>;
  selectedId?: string;
  onSelect: (option: FilterOption) => void;
  /** Uzun listede arama kutusu yer tutucusu. */
  searchPlaceholder?: string;
  testID?: string;
}

/**
 * Filtre panelindeki her seçenek listesinin TEK gövdesi (web `FilterOptionList` karşılığı):
 * uzun listede arama kutusu, kapalıyken ilk 8 satır + "Tümünü göster (N)", arama/açık listede
 * en çok 60 satır + daraltma ipucu, eşleşme yoksa `EmptyState`. Arama durumu burada tutulur.
 */
export function FilterOptionList({ options, selectedId, onSelect, searchPlaceholder, testID }: FilterOptionListProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const { rows, truncated } = useMemo(
    () => visibleFilterOptions(options, query, expanded, selectedId),
    [options, query, expanded, selectedId],
  );
  const showSearch = options.length > FILTER_SEARCH_AFTER;
  const canToggle = !query && options.length > FILTER_COLLAPSED_COUNT;

  return (
    <View testID={testID}>
      {showSearch ? (
        <Input
          placeholder={searchPlaceholder ?? t('common.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          leftIconName="magnifying-glass"
          autoCorrect={false}
          testID={testID ? `${testID}-search` : undefined}
        />
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          placement="inline"
          icon="magnifying-glass"
          title={t('common.noResults')}
          subtitle={t('models.emptySearchHint')}
          testID={testID ? `${testID}-empty` : undefined}
        />
      ) : (
        <View style={styles.list}>
          {rows.map((o) => (
            <FilterRadioRow
              key={o.id}
              label={o.label}
              selected={selectedId === o.id}
              onPress={() => onSelect(o)}
            />
          ))}
        </View>
      )}
      {truncated ? (
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('filter.refineSearchHint')}
        </Text>
      ) : null}
      {canToggle ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={spacing[3]}
          accessibilityRole="button"
          style={styles.toggle}
          testID={testID ? `${testID}-toggle` : undefined}
        >
          <Text variant="bodySm" weight="medium" tone="primary">
            {expanded ? t('product.showLess') : t('filter.showAllOptions', { count: options.length })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: minTouchTarget,
    paddingHorizontal: spacing[2],
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  rowSelected: { backgroundColor: colors.primary[50]! },
  rowLabel: { flex: 1 },
  hint: { marginTop: spacing[2], paddingHorizontal: spacing[2] },
  toggle: { alignSelf: 'flex-start', marginTop: spacing[2], paddingHorizontal: spacing[2] },
});
