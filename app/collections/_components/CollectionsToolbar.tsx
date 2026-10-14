import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChipTabs, IconButton, Input } from '@/ui';
import { ProductListToolbar } from '@/components/product';
import type { CollectionsBrowseController } from '../_hooks/useCollectionsBrowse';
import type { BrowseTab } from '../_lib/browse';
import { styles } from '../_lib/browseStyles';

/**
 * Tarama listesinin tepesi (web `CollectionsToolbar`): girişliyse "Herkese açık / Benim"
 * sekmeleri, arama kutusu (temizle düğmeli) ve ortak liste araç çubuğu — [Filtreler] kategori
 * sheet'ini açar (yalnız herkese açık sekmede, web gibi), [Sıralama] geçerli sıralamayı gösterir;
 * seçili kategori kaldırılabilir çip olarak altta.
 */
export function CollectionsToolbar({ f }: { f: CollectionsBrowseController }) {
  const { t } = useTranslation();
  const isPublic = f.activeTab === 'public';

  return (
    <View style={styles.header}>
      {f.isAuthenticated ? (
        <ChipTabs<BrowseTab>
          testID="collections-tabs"
          value={f.activeTab}
          onChange={f.setActiveTab}
          items={[
            { key: 'public', label: t('collection.isPublic') },
            { key: 'mine', label: t('collection.myCollections') },
          ]}
        />
      ) : null}
      <ProductListToolbar
        search={
          <Input
            testID="collections-search"
            placeholder={t('collection.searchCollections')}
            value={f.searchQuery}
            onChangeText={f.setSearchQuery}
            returnKeyType="search"
            leftIconName="magnifying-glass"
            rightIcon={
              f.searchQuery ? (
                <IconButton
                  testID="collections-search-clear"
                  icon="x-mark"
                  size="xs"
                  accessibilityLabel={t('common.clear')}
                  onPress={() => f.setSearchQuery('')}
                />
              ) : undefined
            }
          />
        }
        sortLabel={f.sortLabel}
        onSort={f.openSortSheet}
        onFilter={isPublic ? f.openCategorySheet : undefined}
        filterCount={f.categoryId ? 1 : 0}
        chips={f.activeChips}
        onClearFilters={f.clearCategory}
      />
    </View>
  );
}
