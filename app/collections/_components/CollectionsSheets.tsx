import { useTranslation } from 'react-i18next';
import { SelectSheet } from '@/ui';
import type { CollectionsBrowseController } from '../_hooks/useCollectionsBrowse';

/**
 * Tarama sheet'leri (web `CollectionsToolbar` seçicileri): sıralama ve aranabilir kategori listesi.
 * PageShell `overlay`ında durur (liste yüklenirken/hata verirken de bağlı kalır).
 */
export function CollectionsSheets({ f }: { f: CollectionsBrowseController }) {
  const { t } = useTranslation();
  return (
    <>
      <SelectSheet
        testID="collections-sort-sheet"
        isOpen={f.sheet === 'sort'}
        onClose={f.closeSheet}
        title={t('common.sort')}
        options={f.sortOptions}
        value={f.sortBy}
        onSelect={f.setSortBy}
      />
      <SelectSheet
        testID="collections-category-sheet"
        isOpen={f.sheet === 'category'}
        onClose={f.closeSheet}
        title={t('common.category')}
        options={f.categoryOptions}
        value={f.categoryId}
        onSelect={f.setCategoryId}
        searchable
        loading={f.categoriesLoading}
      />
    </>
  );
}
