import { FlatList, View } from 'react-native';
import { Button, EmptyState, Input, SkeletonText, pageListContentStyle } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useAddItems } from './_hooks/useAddItems';
import { styles } from './_lib/styles';
import { ListingPickerRow } from './_components/ListingPickerRow';

/** Koleksiyona ürün ekle — PageShell + arama ve ilan satırları (Ekle/Çıkar). `useAddItems` optimistic mantığın sahibi. */
export default function AddCollectionItemsScreen() {
  const { t } = useTranslation();
  const f = useAddItems();

  return (
    <PageShell
      title={t('collection.addProduct')}
      mode="list"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
    >
      <FlatList
        data={f.isLoading ? [] : f.filtered}
        keyExtractor={(listing) => listing.id}
        renderItem={({ item }) => <ListingPickerRow listing={item} f={f} />}
        contentContainerStyle={[pageListContentStyle, styles.list]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Input
            placeholder={t('collection.searchListingsPlaceholder')}
            value={f.search}
            onChangeText={f.setSearch}
            leftIconName="magnifying-glass"
            autoCorrect={false}
          />
        }
        ListEmptyComponent={
          f.isLoading ? (
            <View testID="add-items-skeleton">
              <SkeletonText lines={6} />
            </View>
          ) : f.listings.length === 0 ? (
            <EmptyState
              icon="cube"
              title={t('collection.noActiveListings')}
              subtitle={t('emptyState.collectionAddListingHint')}
              action={<Button title={t('product.createListing')} onPress={() => router.push('/(tabs)/sell')} />}
            />
          ) : (
            <EmptyState icon="magnifying-glass" title={t('collection.noSearchMatch')} subtitle={t('search.tryDifferent')} />
          )
        }
      />
    </PageShell>
  );
}
