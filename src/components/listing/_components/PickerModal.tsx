import React, { useCallback, useMemo } from 'react';
import { SelectSheet, type SelectSheetOption } from '@/ui';

/** Marka/model listeleri yüzlerce satır: sabit satır yüksekliği ile sanal liste ölçmeden kayar. */
const PICKER_ROW_HEIGHT = 48;

export interface PickerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  onSelect: (item: any) => void;
  selectedId: string;
  /**
   * Verilirse sheet aranabilir olur. Arama metni sheet'in içinde tutulur (her açılışta sıfırlanır);
   * değer ve `onSearchChange` yalnız "aranabilir mi" bilgisi olarak okunur.
   */
  searchValue?: string;
  onSearchChange?: (t: string) => void;
  keyExtractor: (item: any) => string;
  labelExtractor: (item: any) => string;
  emptyText?: string;
  loading?: boolean;
  modalKey?: string;
  testID?: string;
}

/**
 * Kategori / marka / model / malzeme / üretici / yıl / nitelik seçicisi — `SelectSheet` üstünde
 * ince bir uyarlayıcı (arama + sanal liste, Android geri tuşu, sürükle-kapat). Satıra basınca
 * `onSelect(item)` çağrılır ve sheet kapanır.
 */
export function PickerModal({
  visible,
  onClose,
  title,
  data,
  onSelect,
  selectedId,
  searchValue,
  onSearchChange,
  keyExtractor,
  labelExtractor,
  emptyText,
  loading,
  modalKey,
  testID = 'picker-sheet',
}: PickerModalProps) {
  const searchable = onSearchChange !== undefined || searchValue !== undefined;

  // Kapanış animasyonu sürerken liste boşalmasın diye `visible`'a bağlı değil (map ucuz).
  const { options, byValue } = useMemo(() => {
    const map = new Map<string, any>();
    const list: SelectSheetOption[] = data.map((item) => {
      const value = keyExtractor(item);
      map.set(value, item);
      return { value, label: labelExtractor(item) };
    });
    return { options: list, byValue: map };
  }, [data, keyExtractor, labelExtractor]);

  const handleSelect = useCallback(
    (value: string) => {
      const item = byValue.get(value);
      if (item !== undefined) onSelect(item);
    },
    [byValue, onSelect],
  );

  return (
    <SelectSheet
      key={modalKey}
      isOpen={visible}
      onClose={onClose}
      title={title}
      options={options}
      value={selectedId || null}
      onSelect={handleSelect}
      searchable={searchable}
      emptyTitle={emptyText}
      loading={loading}
      rowHeight={PICKER_ROW_HEIGHT}
      testID={testID}
    />
  );
}
