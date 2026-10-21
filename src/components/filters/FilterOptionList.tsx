import React, { memo, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckboxIndicator, EmptyState, Input, RadioIndicator, Text, theme } from '@/ui';

export interface FilterOption {
  /** Seçimin karşılaştırma değeri + liste anahtarı. */
  id: string;
  label: string;
  /** Catalog colour swatch (a data hex, e.g. the colour options); drawn before the label. */
  swatch?: string | null;
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
 * Which rows are drawn: a pure rule (tested). With a query, the matches; without one, the first
 * `FILTER_COLLAPSED_COUNT` while collapsed (selected rows outside that slice are appended) and all
 * of them when expanded. At most `FILTER_EXPANDED_MAX` in every case. `selectedIds` is one id for a
 * single-select list and every picked id for a multi-select one.
 */
export function visibleFilterOptions(
  options: ReadonlyArray<FilterOption>,
  query: string,
  expanded: boolean,
  selectedIds: ReadonlyArray<string>,
): { rows: FilterOption[]; truncated: boolean } {
  const q = norm(query);
  const matches = q ? options.filter((o) => norm(o.label).includes(q)) : options;
  if (!q && !expanded) {
    const head = matches.slice(0, FILTER_COLLAPSED_COUNT);
    for (const o of matches) {
      if (selectedIds.includes(o.id) && !head.includes(o)) head.push(o);
    }
    return { rows: head, truncated: false };
  }
  return { rows: matches.slice(0, FILTER_EXPANDED_MAX), truncated: matches.length > FILTER_EXPANDED_MAX };
}

const SWATCH_SIZE = theme.iconSize.sm;

type FilterRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  swatch?: string | null;
  testID?: string;
};

/** Shared row shell: indicator, optional swatch, label; the selected row gets a primary-50 ground. */
function FilterRow({
  role,
  indicator,
  label,
  selected,
  onPress,
  swatch,
  testID,
}: FilterRowProps & { role: 'radio' | 'checkbox'; indicator: React.ReactNode }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      android_ripple={Platform.OS === 'android' ? { color: colors.overlay.black10 } : undefined}
      style={[styles.row, selected && styles.rowSelected]}
    >
      {indicator}
      {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
      <Text variant="body" style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Single-select radio row (web radio list look). */
export const FilterRadioRow = memo(function FilterRadioRow(props: FilterRowProps) {
  return <FilterRow {...props} role="radio" indicator={<RadioIndicator checked={props.selected} />} />;
});

/** Multi-select checkbox row (the colour list). */
export const FilterCheckRow = memo(function FilterCheckRow(props: FilterRowProps) {
  return <FilterRow {...props} role="checkbox" indicator={<CheckboxIndicator checked={props.selected} />} />;
});

interface FilterOptionListProps {
  options: ReadonlyArray<FilterOption>;
  /** Single-select: the picked id. */
  selectedId?: string;
  /** Multi-select (checkbox rows): every picked id; `onSelect` toggles one. Wins over `selectedId`. */
  selectedIds?: ReadonlyArray<string>;
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
export function FilterOptionList({
  options,
  selectedId,
  selectedIds,
  onSelect,
  searchPlaceholder,
  testID,
}: FilterOptionListProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const multiple = selectedIds !== undefined;
  const picked = useMemo(
    () => selectedIds ?? (selectedId ? [selectedId] : []),
    [selectedIds, selectedId],
  );
  const { rows, truncated } = useMemo(
    () => visibleFilterOptions(options, query, expanded, picked),
    [options, query, expanded, picked],
  );
  const Row = multiple ? FilterCheckRow : FilterRadioRow;
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
            <Row
              key={o.id}
              label={o.label}
              swatch={o.swatch}
              selected={picked.includes(o.id)}
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
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: theme.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray[300],
  },
  rowLabel: { flex: 1 },
  hint: { marginTop: spacing[2], paddingHorizontal: spacing[2] },
  toggle: { alignSelf: 'flex-start', marginTop: spacing[2], paddingHorizontal: spacing[2] },
});
