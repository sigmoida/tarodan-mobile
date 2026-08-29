import { View, FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, Spinner, Text, ScreenHeader } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategory } from './_hooks/useCategory';
import { styles } from './_lib/styles';
import { CategoryFilters } from './_components/CategoryFilters';
import { CategoryProductCard } from './_components/CategoryProductCard';

const { colors } = theme;

export default function CategoryScreen() {
  const { t } = useTranslation();
  const f = useCategory();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={f.category?.name || t('common.category')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <CategoryFilters f={f} />

      {f.isLoading ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : !f.products || f.products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.gray[500]} />
          <Text style={styles.emptyTitle}>{t('product.noProductsFound')}</Text>
          <Text style={styles.emptySubtitle}>{t('product.noProductsInCategory')}</Text>
        </View>
      ) : (
        <FlatList
          data={f.products as any[]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CategoryProductCard item={item} />}
          numColumns={2}
          columnWrapperStyle={styles.productsGrid}
          style={styles.productsContainer}
          contentContainerStyle={styles.productsContent}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {t('product.productsFoundCount', { count: f.products.length })}
            </Text>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
          refreshControl={
            <RefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} colors={[colors.primary[600]!]} />
          }
        />
      )}
    </View>
  );
}
