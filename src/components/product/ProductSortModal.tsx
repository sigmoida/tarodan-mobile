import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectSheet } from '@/ui';
import { buildSortOptions } from '@/utils/productFilters';

/**
 * Ürün listelerinin TEK sıralama seçicisi (web ilan başlığındaki sıralama Select'inin karşılığı):
 * Önerilen, En Yeni, En Eski, Popüler, Fiyat, Puan, A-Z, Z-A. Alttan açılan `SelectSheet`
 * (tek seçim): seçince hemen uygular ve kapanır. Arama, ilanlar ve kategori aynı bileşeni kullanır.
 */
export function ProductSortModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (sortBy: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const options = useMemo(() => buildSortOptions(t), [t]);
  return (
    <SelectSheet
      isOpen={visible}
      onClose={onClose}
      title={t('common.sort')}
      options={options}
      value={value}
      onSelect={onSelect}
      testID="product-sort-sheet"
    />
  );
}
