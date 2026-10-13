import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { BottomSheet, type BottomSheetSize } from './BottomSheet';
import { Button } from './Button';
import { ButtonRow } from './ButtonRow';
import { CheckboxIndicator } from './Checkbox';
import { EmptyState } from './EmptyState';
import { Input } from './Input';
import { RadioIndicator } from './Radio';
import { Text } from './Text';

export interface SelectSheetOption<V extends string = string> {
  value: V;
  label: string;
  /** Etiketin altında küçük açıklama (tek satır). */
  description?: string;
  disabled?: boolean;
}

interface SelectSheetBaseProps<V extends string> {
  isOpen: boolean;
  onClose: () => void;
  /** Sheet tamamen kapandıktan sonra (bkz. `BottomSheet.onClosed`). */
  onClosed?: () => void;
  title: string;
  options: ReadonlyArray<SelectSheetOption<V>>;
  /** Üstte sabit arama kutusu (uzun listeler). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Boş sonuç başlığı/açıklaması (varsayılan: "Sonuç bulunamadı" / "Farklı bir arama deneyin."). */
  emptyTitle?: string;
  emptySubtitle?: string;
  /** Varsayılan: aramalı listede `large` (filtrelerken yükseklik zıplamasın), aksi `fit`. */
  size?: BottomSheetSize;
  closeLabel?: string;
  /** Köke; satırlar `${testID}-option-${value}`, arama `${testID}-search`. */
  testID?: string;
}

export interface SelectSheetSingleProps<V extends string = string> extends SelectSheetBaseProps<V> {
  multiple?: false;
  value?: V | null;
  /** Satıra basınca çağrılır; ardından sheet kapanır (`closeOnSelect`, varsayılan açık). */
  onSelect: (value: V) => void;
  closeOnSelect?: boolean;
}

export interface SelectSheetMultiProps<V extends string = string> extends SelectSheetBaseProps<V> {
  multiple: true;
  value: ReadonlyArray<V>;
  /** Footer'daki [Uygula] ile taslak seçim uygulanır ve sheet kapanır. */
  onApply: (values: V[]) => void;
  clearLabel?: string;
  applyLabel?: string;
}

export type SelectSheetProps<V extends string = string> = SelectSheetSingleProps<V> | SelectSheetMultiProps<V>;

const { colors, spacing, controlHeight } = theme;

/** Türkçe büyük/küçük harf duyarsız arama (İ/ı). */
function normalize(s: string): string {
  return s.toLocaleLowerCase('tr').trim();
}

/**
 * Alttan açılan seçim listesi — tek (radyo) ya da çoklu (checkbox) seçim, opsiyonel arama, sanal
 * liste (FlatList). `BottomSheet` üstünde: Android geri tuşu, sürükle-kapat, güvenli alan aynı.
 * Tek seçimde satıra basınca seçer ve kapanır; çoklu seçimde taslak tutulur, footer
 * [Temizle][Uygula] ile uygulanır. Boş sonuçta `EmptyState placement="inline"`.
 */
export function SelectSheet<V extends string = string>(props: SelectSheetProps<V>) {
  const {
    isOpen,
    onClose,
    onClosed,
    title,
    options,
    searchable = false,
    searchPlaceholder,
    emptyTitle,
    emptySubtitle,
    size,
    closeLabel,
    testID = 'select-sheet',
  } = props;
  const { t } = useTranslation();
  const multiple = props.multiple === true;
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<ReadonlyArray<V>>(multiple ? (props.value as ReadonlyArray<V>) : []);

  // Her açılışta arama sıfırlanır; çoklu seçim taslağı güncel değerden başlar.
  const multiValue = multiple ? (props.value as ReadonlyArray<V>) : undefined;
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    if (multiValue) setDraft(multiValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız açılışta
  }, [isOpen]);

  const visible = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, query]);

  const singleValue = multiple ? undefined : (props as SelectSheetSingleProps<V>).value;
  const isSelected = useCallback(
    (v: V) => (multiple ? draft.includes(v) : singleValue === v),
    [multiple, draft, singleValue],
  );

  const onSelect = multiple ? undefined : (props as SelectSheetSingleProps<V>).onSelect;
  const closeOnSelect = multiple ? false : (props as SelectSheetSingleProps<V>).closeOnSelect !== false;
  const onPressOption = useCallback(
    (v: V) => {
      if (multiple) {
        setDraft((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
        return;
      }
      onSelect?.(v);
      if (closeOnSelect) onClose();
    },
    [multiple, onSelect, closeOnSelect, onClose],
  );

  const renderItem = useCallback<ListRenderItem<SelectSheetOption<V>>>(
    ({ item }) => (
      <SelectSheetRow
        option={item}
        multiple={multiple}
        selected={isSelected(item.value)}
        onPress={onPressOption}
        testID={`${testID}-option-${item.value}`}
      />
    ),
    [multiple, isSelected, onPressOption, testID],
  );

  const footer = multiple ? (
    <ButtonRow>
      <Button
        key="clear"
        variant="outline"
        title={(props as SelectSheetMultiProps<V>).clearLabel ?? t('common.clear')}
        onPress={() => setDraft([])}
        testID={`${testID}-clear`}
      />
      <Button
        key="apply"
        variant="primary"
        title={(props as SelectSheetMultiProps<V>).applyLabel ?? t('common.apply')}
        onPress={() => {
          (props as SelectSheetMultiProps<V>).onApply([...draft]);
          onClose();
        }}
        testID={`${testID}-apply`}
      />
    </ButtonRow>
  ) : undefined;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClosed}
      title={title}
      closeLabel={closeLabel}
      size={size ?? (searchable ? 'large' : 'fit')}
      scrollable={false}
      flushBody
      footer={footer}
      testID={testID}
    >
      {searchable ? (
        <View style={styles.search}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder ?? t('common.searchPlaceholder')}
            leftIconName="magnifying-glass"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            containerStyle={styles.searchInput}
            testID={`${testID}-search`}
          />
        </View>
      ) : null}
      <FlatList
        data={visible as SelectSheetOption<V>[]}
        keyExtractor={(o) => o.value}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        initialNumToRender={16}
        ListEmptyComponent={
          <EmptyState
            placement="inline"
            icon="magnifying-glass"
            title={emptyTitle ?? t('common.noResults')}
            subtitle={emptySubtitle ?? (query ? t('models.emptySearchHint') : t('emptyState.optionsHint'))}
            testID={`${testID}-empty`}
          />
        }
        testID={`${testID}-list`}
      />
    </BottomSheet>
  );
}

interface SelectSheetRowProps<V extends string> {
  option: SelectSheetOption<V>;
  multiple: boolean;
  selected: boolean;
  onPress: (value: V) => void;
  testID: string;
}

function SelectSheetRowInner<V extends string>({ option, multiple, selected, onPress, testID }: SelectSheetRowProps<V>) {
  return (
    <Pressable
      testID={testID}
      disabled={option.disabled}
      onPress={() => onPress(option.value)}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled: !!option.disabled }}
      android_ripple={Platform.OS === 'android' ? { color: colors.overlay.black10 } : undefined}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && Platform.OS === 'ios' && styles.rowPressed,
        option.disabled && styles.rowDisabled,
      ]}
    >
      {multiple ? <CheckboxIndicator checked={selected} /> : <RadioIndicator checked={selected} />}
      <View style={styles.rowText}>
        <Text variant="body" weight={selected ? 'semibold' : 'regular'} numberOfLines={2}>
          {option.label}
        </Text>
        {option.description ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {option.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const SelectSheetRow = React.memo(SelectSheetRowInner) as typeof SelectSheetRowInner;

const styles = StyleSheet.create({
  search: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  searchInput: { marginBottom: 0 },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { paddingVertical: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: controlHeight.lg,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  rowSelected: { backgroundColor: colors.primary[50]! },
  rowPressed: { backgroundColor: colors.surface.alt },
  rowDisabled: { opacity: 0.5 },
  rowText: { flex: 1, minWidth: 0 },
});
